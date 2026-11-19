"""დამკვირვებელი: ეკრანიდან (ან ხელით) იწერს ყოველ სპინს spins.csv-ში.
რეალურ ფსონს არ დებს. ვირტუალური „არენა“ — რამდენიმე სტრატეგია ერთდროულად ეჯიბრება
ერთმანეთს ერთსა და იმავე ნომრებზე; შედეგი ჩანს ვირტუალურ დაფაზე (board.py).

  python observer.py --table "Crocobet #1"        # ავტომატური (OCR + ბორბლის ვიდეო, თუ მონიშნულია)
  python observer.py --manual --table "Crocobet"  # ხელით შეყვანა
  python board.py                                  # ვირტუალური დაფა ბრაუზერში (ცალკე ფანჯარაში)

ხელით რეჟიმის ბრძანებები:
  0..36       ნომრის ჩაწერა
  d სახელი    დილერის შეცვლა (იწყება ახალი სმენა)
  cw / ccw    ბორბლის მიმართულება მომდევნო სპინებისთვის
  r ნომერი    გაშვების უჯრა მომდევნო სპინისთვის (თუ თვალით დაინახე)
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
from strategy import STAKINGS, Engine, SectorSelector


class Logger:
    def __init__(self, path, table, arena=None, sel=None):
        self.path, self.table = path, table
        self.state_path = os.path.join(os.path.dirname(os.path.abspath(path)), "state.json")
        old = load_spins(path)
        self.session = max([int(r["session_id"]) for r in old if str(r["session_id"]).isdigit()] or [0])
        self.dealer, self.spin_i, self.direction = "", 0, ""
        self.arena, self.sel = arena or {}, sel
        self.recent = [dict(n=r["number"], d=r["dealer"]) for r in old[-30:]]
        self.dealers = {}
        for r in old:
            d = self.dealers.setdefault(r["dealer"], {"spins": 0, "sessions": set()})
            d["spins"] += 1
            d["sessions"].add(r["session_id"])
        if sel:  # პროფილი უკვე ჩაწერილი მონაცემებიდან
            prev, ps = None, None
            for r in old:
                if r["session_id"] != ps:
                    prev, ps = None, r["session_id"]
                sel.observe(r["dealer"], r["session_id"], prev, r["number"], r.get("direction", ""))
                prev = r["number"]
        self.prev, self.pick = None, None
        self.wheel, self.manual_release = None, None
        self.last_spin_t = time.time()
        self.alerts = []
        self.write_state()

    # ------------------------------------------------------------------ მოვლენები
    def set_dealer(self, name):
        if name and name != self.dealer:
            self.dealer, self.session, self.spin_i, self.prev = name, self.session + 1, 0, None
            self.pick = None  # ძველი დილერის ვირტუალური ფსონი ახალზე არ გადადის
            print(f"--- ახალი სმენა #{self.session}: დილერი {name}")
            self.write_state()

    def log(self, n, ok=1):
        self.spin_i += 1
        self.last_spin_t = time.time()
        launch = self.wheel.pop_launch() if self.wheel else None
        direction = (self.wheel.direction if self.wheel and self.wheel.direction else self.direction)
        release = launch["release_number"] if launch else self.manual_release
        self.manual_release = None
        row = dict(timestamp=dt.datetime.now().isoformat(timespec="seconds"), table=self.table,
                   dealer=self.dealer or "?", session_id=self.session or 1, spin_in_session=self.spin_i,
                   number=n, color=color(n), direction=direction, ocr_ok=ok,
                   release_number="" if release is None else release,
                   rotor_speed=launch["rotor_speed"] if launch else "",
                   ball_speed=launch["ball_speed"] if launch else "")
        append_spin(self.path, row)
        d = self.dealers.setdefault(row["dealer"], {"spins": 0, "sessions": set()})
        d["spins"] += 1
        d["sessions"].add(str(row["session_id"]))
        self.recent = (self.recent + [dict(n=n, d=row["dealer"])])[-30:]
        extra = f" | გაშვება {release} | {direction}" if release is not None else (f" | {direction}" if direction else "")
        flag = "" if ok else "  ⚠️ OCR საეჭვოა — შეამოწმე"
        print(f"{dt.datetime.now():%H:%M:%S}  {self.dealer or '?':<14} #{self.spin_i:<3} → {n:>2} {color(n)}{extra}{flag}")
        self._arena(n, direction)
        self.prev = n
        self.last_row = row
        self.write_state()

    def _arena(self, n, direction):
        if not self.sel:
            return
        if self.pick:
            hit = n in self.pick[0]
            for e in self.arena.values():
                e.settle(hit, self.pick[1])
            print(f"      ვირტუალური: {'მოგება ✅' if hit else 'წაგება'} | " +
                  " | ".join(f"{k} {e.bank:.2f}" for k, e in self.arena.items()))
        self.sel.observe(self.dealer or "?", str(self.session), self.prev, n, direction)
        self.pick = self.sel.choose(self.dealer or "?", n, direction)
        if self.pick:
            print(f"      შემდეგი ვირტუალური ფსონი: {sorted(self.pick[0])} (შეფასებული მოხვედრა {self.pick[1]*100:.1f}%)")

    def alert(self, msg):
        print(f"\a🔔 {msg}")
        self.alerts = (self.alerts + [f"{dt.datetime.now():%H:%M:%S} {msg}"])[-10:]
        self.write_state()

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
                w.writerows({k: r.get(k, "") for k in FIELDS} for r in rows)
            self.spin_i = max(0, self.spin_i - 1)
            self.recent = self.recent[:-1]
            print("ბოლო ჩანაწერი წაიშალა (ვირტუალური ბალანსი არ ბრუნდება უკან)")

    # ------------------------------------------------------------------ დაფისთვის
    def write_state(self):
        prof = {}
        if self.sel:
            for d, h in self.sel.hist.items():
                prof[d] = int(h.sum() + self.sel.pending[d].sum())
        w = self.wheel
        st = dict(
            updated=dt.datetime.now().isoformat(timespec="seconds"), table=self.table,
            dealer=self.dealer, session=self.session, spin_i=self.spin_i,
            recent=self.recent,
            wheel=dict(direction=w.direction, rotor_speed=round(abs(w.rotor_speed), 1),
                       frames=w.frames) if w else None,
            last_release=getattr(self, "last_row", {}).get("release_number", ""),
            pick=sorted(self.pick[0]) if self.pick else [], q=round(self.pick[1], 4) if self.pick else None,
            min_profile=self.sel.min_profile if self.sel else None,
            arena={k: dict(bank=round(e.bank, 2), start=e.start, spins=e.spins, wins=e.wins,
                           stopped=e.stopped, history=e.history[-500:]) for k, e in self.arena.items()},
            dealers={d: dict(spins=v["spins"], sessions=len(v["sessions"]), profile=prof.get(d, 0))
                     for d, v in self.dealers.items()},
            alerts=self.alerts, seconds_since_spin=int(time.time() - self.last_spin_t),
        )
        tmp = self.state_path + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(st, f, ensure_ascii=False)
        os.replace(tmp, self.state_path)


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
        elif s.startswith("r ") and s[2:].strip().isdigit() and 0 <= int(s[2:]) <= 36:
            lg.manual_release = int(s[2:])
        elif s.isdigit() and 0 <= int(s) <= 36:
            lg.log(int(s))
        else:
            print("?")


def run_auto(lg, cfg, interval, stable_ticks, alert_min, wheel_fps):
    import mss
    from PIL import Image
    from vision import changed, dominant_color, ocr_number, ocr_text, pytesseract, signature

    if pytesseract is None:
        raise SystemExit("pytesseract არ არის დაყენებული — გამოიყენე --manual ან დააყენე (იხ. README).")
    R = cfg["regions"]
    if "wheel" in R:
        from wheel import run_thread
        lg.wheel = run_thread(R["wheel"], cfg.get("wheel_geom"), wheel_fps)
        print(f"ბორბლის ვიდეოანალიზი ჩართულია ({wheel_fps} კადრი/წმ).")

    def grab(sct, name):
        x, y, w, h = R[name]
        s = sct.grab({"left": x, "top": y, "width": w, "height": h})
        return Image.frombytes("RGB", s.size, s.bgra, "raw", "BGRX")

    with mss.mss() as sct:
        stable = signature(grab(sct, "history"))
        cand, cnt, dealer_reads, last_dealer_poll, last_alert, last_state = None, 0, [], 0, 0, 0
        print("დაკვირვება დაიწყო. Ctrl+C — გაჩერება.")
        while True:
            now = time.time()
            if "dealer" in R and now - last_dealer_poll > 3:  # დილერი: 3 ერთნაირი წაკითხვა ზედიზედ
                last_dealer_poll = now
                name = ocr_text(grab(sct, "dealer"))
                dealer_reads = (dealer_reads + [name])[-3:]
                if len(dealer_reads) == 3 and len(set(dealer_reads)) == 1 and name:
                    lg.set_dealer(name)
            idle = now - lg.last_spin_t
            if idle > alert_min * 60 and now - last_alert > 60:  # გამოგდება / სტრიმი გაჩერდა
                last_alert = now
                lg.alert(f"{int(idle // 60)} წუთია ახალი სპინი არ ჩანს — შეამოწმე, მაგიდიდან ხომ არ გაგაგდეს.")
            if now - last_state > 2:
                last_state = now
                lg.write_state()
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
    ap.add_argument("--alert-min", type=float, default=3, help="გაფრთხილება, თუ ამდენი წუთი სპინი არ ჩანს")
    ap.add_argument("--wheel-fps", type=int, default=15)
    ap.add_argument("--no-arena", action="store_true", help="ვირტუალური არენის გამორთვა")
    ap.add_argument("--stakings", default="flat,oscar,kelly,prog", help="არენის მონაწილეები")
    ap.add_argument("--k", type=int, default=12)
    ap.add_argument("--base", type=float, default=0.20)
    ap.add_argument("--prog", default="1,2,3,3,6,7")
    ap.add_argument("--bankroll", type=float, default=200)
    ap.add_argument("--stop-loss", type=float)
    ap.add_argument("--take-profit", type=float)
    ap.add_argument("--min-profile", type=int, default=300)
    a = ap.parse_args()

    sel, arena = None, {}
    if not a.no_arena:
        prog = [int(x) for x in a.prog.split(",")]
        sel = SectorSelector(a.k, a.min_profile)
        for st in a.stakings.split(","):
            if st in STAKINGS:
                arena[st] = Engine(a.k, a.base, a.bankroll, st, prog, a.stop_loss, a.take_profit)
    lg = Logger(a.csv, a.table, arena, sel)
    if a.manual:
        run_manual(lg)
    else:
        with open(a.config, encoding="utf-8") as f:
            run_auto(lg, json.load(f), a.interval, a.stable_ticks, a.alert_min, a.wheel_fps)


if __name__ == "__main__":
    main()
