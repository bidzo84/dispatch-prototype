"""დამკვირვებელი: ეკრანიდან (ან ხელით) იწერს ყოველ სპინს spins.csv-ში.
ფსონს არ დებს. --paper რეჟიმში აჩვენებს ვირტუალურ ფსონს და ითვლის ვირტუალურ ბალანსს.

  python observer.py --table "Evolution Auto #1"            # ავტომატური (OCR)
  python observer.py --manual --table "Lightning"           # ხელით შეყვანა
  python observer.py --paper --k 12 --base 0.20 --staking flat

ხელით რეჟიმის ბრძანებები:
  0..36       ნომრის ჩაწერა
  d სახელი    დილერის შეცვლა (იწყება ახალი სმენა)
  cw / ccw    ბორბლის მიმართულება მომდევნო სპინებისთვის
  x           ბოლო ჩანაწერის წაშლა
  q           გასვლა
"""
import argparse
import csv
import datetime as dt
import json
import os
import time

from common import FIELDS, append_spin, color, load_spins
from strategy import Engine, SectorSelector


class Logger:
    def __init__(self, path, table, paper=None):
        self.path, self.table = path, table
        old = load_spins(path)
        self.session = max([int(r["session_id"]) for r in old if str(r["session_id"]).isdigit()] or [0])
        self.dealer, self.spin_i, self.direction = "", 0, ""
        self.paper = paper
        if paper:  # პროფილი ავაგოთ უკვე ჩაწერილი მონაცემებიდან
            prev, ps = None, None
            for r in old:
                if r["session_id"] != ps:
                    prev, ps = None, r["session_id"]
                paper["sel"].observe(r["dealer"], r["session_id"], prev, r["number"], r.get("direction", ""))
                prev = r["number"]
        self.prev, self.pick = None, None

    def set_dealer(self, name):
        if name and name != self.dealer:
            self.dealer, self.session, self.spin_i, self.prev = name, self.session + 1, 0, None
            self.pick = None  # ძველი დილერის ვირტუალური ფსონი ახალზე არ გადადის
            print(f"--- ახალი სმენა #{self.session}: დილერი {name}")

    def log(self, n, ok=1):
        self.spin_i += 1
        append_spin(self.path, dict(timestamp=dt.datetime.now().isoformat(timespec="seconds"), table=self.table,
                                    dealer=self.dealer or "?", session_id=self.session or 1,
                                    spin_in_session=self.spin_i, number=n, color=color(n),
                                    direction=self.direction, ocr_ok=ok))
        flag = "" if ok else "  ⚠️ OCR საეჭვოა — შეამოწმე"
        print(f"{dt.datetime.now():%H:%M:%S}  {self.dealer or '?':<14} #{self.spin_i:<3} → {n:>2} {color(n)}{flag}")
        if self.paper:
            self._paper(n)
        self.prev = n

    def _paper(self, n):
        sel, eng = self.paper["sel"], self.paper["eng"]
        if self.pick:
            hit = n in self.pick[0]
            eng.settle(hit, self.pick[1])
            print(f"      ვირტუალური: {'მოგება ✅' if hit else 'წაგება'} | ბალანსი {eng.bank:.2f}"
                  + (f" | გაჩერდა: {eng.stopped}" if eng.stopped else ""))
        sel.observe(self.dealer or "?", str(self.session), self.prev, n, self.direction)
        self.pick = None if eng.stopped else sel.choose(self.dealer or "?", n, self.direction)
        if self.pick and not eng.next_stake_per_number(self.pick[1]):
            self.pick = None  # (kelly) უპირატესობა საკმარისი არ არის → არ ვდებთ
        if self.pick:
            print(f"      შემდეგი ვირტუალური ფსონი: {sorted(self.pick[0])} × "
                  f"{eng.next_stake_per_number(self.pick[1]):.2f} (შეფასებული მოხვედრა {self.pick[1]*100:.1f}%)")

    def undo(self):
        if not os.path.exists(self.path):
            return
        with open(self.path, encoding="utf-8") as f:
            rows = list(csv.DictReader(f))
        if rows:
            rows.pop()
            with open(self.path, "w", newline="", encoding="utf-8") as f:
                w = csv.DictWriter(f, fieldnames=FIELDS)
                w.writeheader()
                w.writerows(rows)
            self.spin_i = max(0, self.spin_i - 1)
            print("ბოლო ჩანაწერი წაიშალა (ვირტუალური ბალანსი არ ბრუნდება უკან)")


def run_manual(lg):
    print(__doc__.split("ხელით რეჟიმის ბრძანებები:")[1])
    while True:
        s = input("> ").strip()
        if s == "q":
            break
        if s == "x":
            lg.undo()
        elif s in ("cw", "ccw"):
            lg.direction = s
        elif s.startswith("d "):
            lg.set_dealer(s[2:].strip())
        elif s.isdigit() and 0 <= int(s) <= 36:
            lg.log(int(s))
        else:
            print("?")


def run_auto(lg, cfg, interval, stable_ticks):
    import mss
    from PIL import Image
    from vision import changed, dominant_color, ocr_number, ocr_text, pytesseract, signature

    if pytesseract is None:
        raise SystemExit("pytesseract არ არის დაყენებული — გამოიყენე --manual ან დააყენე (იხ. README).")
    R = cfg["regions"]

    def grab(sct, name):
        x, y, w, h = R[name]
        s = sct.grab({"left": x, "top": y, "width": w, "height": h})
        return Image.frombytes("RGB", s.size, s.bgra, "raw", "BGRX")

    with mss.mss() as sct:
        stable = signature(grab(sct, "history"))
        cand, cnt, dealer_reads, last_dealer_poll = None, 0, [], 0
        print("დაკვირვება დაიწყო. Ctrl+C — გაჩერება.")
        while True:
            now = time.time()
            if "dealer" in R and now - last_dealer_poll > 3:  # დილერი: 3 ერთნაირი წაკითხვა ზედიზედ
                last_dealer_poll = now
                name = ocr_text(grab(sct, "dealer"))
                dealer_reads = (dealer_reads + [name])[-3:]
                if len(dealer_reads) == 3 and len(set(dealer_reads)) == 1 and name:
                    lg.set_dealer(name)
            cur = signature(grab(sct, "history"))
            if changed(cur, stable):
                if cand is not None and not changed(cur, cand, thr=4.0):
                    cnt += 1
                else:
                    cand, cnt = cur, 1
                if cnt >= stable_ticks:  # ისტორია შეიცვალა და დასტაბილურდა → ახალი სპინი
                    img = grab(sct, "last_number")
                    n, col = ocr_number(img), dominant_color(img)
                    if n is None:
                        print(f"⚠️ ნომერი ვერ წავიკითხე (ფერი {col}) — შეიყვანე ხელით: ", end="")
                        s = input().strip()
                        if s.isdigit() and 0 <= int(s) <= 36:
                            lg.log(int(s), ok=0)
                    else:
                        lg.log(n, ok=int(color(n) == col))
                    stable, cand, cnt = cur, None, 0
            else:
                cand, cnt = None, 0
            time.sleep(interval)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="spins.csv")
    ap.add_argument("--config", default="config.json")
    ap.add_argument("--table", default="table1")
    ap.add_argument("--manual", action="store_true")
    ap.add_argument("--interval", type=float, default=0.5)
    ap.add_argument("--stable-ticks", type=int, default=3)
    ap.add_argument("--paper", action="store_true")
    ap.add_argument("--k", type=int, default=12)
    ap.add_argument("--base", type=float, default=0.20)
    ap.add_argument("--staking", choices=["flat", "dalembert", "oscar", "kelly", "prog"], default="flat")
    ap.add_argument("--prog", default="1,2,3,3,6,7")
    ap.add_argument("--bankroll", type=float, default=200)
    ap.add_argument("--stop-loss", type=float)
    ap.add_argument("--take-profit", type=float)
    ap.add_argument("--min-profile", type=int, default=300)
    a = ap.parse_args()

    paper = None
    if a.paper:
        prog = [int(x) for x in a.prog.split(",")]
        paper = dict(sel=SectorSelector(a.k, a.min_profile),
                     eng=Engine(a.k, a.base, a.bankroll, a.staking, prog, a.stop_loss, a.take_profit))
    lg = Logger(a.csv, a.table, paper)
    if a.manual:
        run_manual(lg)
    else:
        with open(a.config, encoding="utf-8") as f:
            run_auto(lg, json.load(f), a.interval, a.stable_ticks)


if __name__ == "__main__":
    main()
