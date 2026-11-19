"""სტრატეგიის ძრავა: k ნომერი, საბაზისო ფსონი ნომერზე, პროგრესია, რისკის კონტროლი.

გამოყენება:
  python strategy.py table  --k 12 --base 0.20 --prog 1,2,3,3,6,7
  python strategy.py suggest --k 15 --base 0.20 --levels 6
  python strategy.py mc     --k 12 --base 0.20 --prog 1,2,3,3,6,7 --bankroll 100 \
                            --stop-loss 50 --take-profit 20 --max-spins 300
  python strategy.py paper  --csv spins.csv --k 12 --base 0.20 --prog 1,2,3,3,6,7 \
                            --selector sector --min-profile 300
"""
import argparse
import math
from collections import Counter, defaultdict

import numpy as np

from common import WHEEL, distance, load_spins, sector_numbers

PAYOUT = 36  # ნომერზე მოგებისას ბრუნდება 36 × ფსონი (35:1 + ფსონი)


# ---------------------------------------------------------------- პროგრესია
def level_table(k, base, prog):
    """თითო საფეხურზე: ფსონი, დაგროვილი დანახარჯი, წმინდა შედეგი თუ ამ საფეხურზე მოიგო."""
    rows, cum = [], 0.0
    for i, m in enumerate(prog, 1):
        stake = k * base * m
        win_net = PAYOUT * base * m - stake - cum  # ამ საფეხურზე მოგება მინუს წინა წაგებები
        cum += stake
        rows.append(dict(level=i, mult=m, stake=stake, cum=cum, win_net=win_net))
    return rows


def cycle_stats(k, base, prog):
    p = k / 37
    rows = level_table(k, base, prog)
    bust_p = (1 - p) ** len(prog)
    bust_loss = rows[-1]["cum"]
    ev = sum((1 - p) ** i * p * r["win_net"] for i, r in enumerate(rows)) - bust_p * bust_loss
    staked = sum((1 - p) ** i * r["stake"] for i, r in enumerate(rows))
    return dict(p=p, bust_p=bust_p, bust_loss=bust_loss, ev=ev, staked=staked,
                ev_pct=ev / staked * 100, rows=rows)


def suggest(k, base, levels, target=None):
    """მინიმალური მთელი მამრავლები, რომ ყოველ საფეხურზე მოგება ფარავდეს წინა
    წაგებებს და მაინც მოგცეს `target` (ნაგულისხმევად = 1-ლი საფეხურის მოგება)."""
    unit_net = base * (PAYOUT - k)
    target = unit_net if target is None else target
    prog, cum = [], 0.0
    for _ in range(levels):
        m = max(1, math.ceil((cum + target) / unit_net - 1e-9))
        prog.append(m)
        cum += k * base * m
    return prog


# ---------------------------------------------------------------- სესიის ძრავა
class Engine:
    """ერთი სესიის ფსონების მართვა რისკის ლიმიტებით."""

    def __init__(self, k, base, prog, bankroll, stop_loss=None, take_profit=None):
        self.k, self.base, self.prog = k, base, list(prog)
        self.start = self.bank = bankroll
        self.stop_loss, self.take_profit = stop_loss, take_profit
        self.level = 0
        self.busts = self.wins = self.spins = 0
        self.stopped = None

    def next_stake_per_number(self):
        if self.stopped:
            return 0.0
        s = self.base * self.prog[self.level]
        if s * self.k > self.bank:
            self.stopped = "ბიუჯეტი ამოიწურა"
            return 0.0
        return s

    def settle(self, hit: bool):
        s = self.next_stake_per_number()
        if not s:
            return
        self.spins += 1
        self.bank -= s * self.k
        if hit:
            self.bank += s * PAYOUT
            self.wins += 1
            self.level = 0
        else:
            self.level += 1
            if self.level >= len(self.prog):
                self.busts += 1
                self.level = 0
        pnl = self.bank - self.start
        if self.stop_loss is not None and pnl <= -self.stop_loss:
            self.stopped = "stop-loss"
        elif self.take_profit is not None and pnl >= self.take_profit:
            self.stopped = "take-profit"


def monte_carlo(k, base, prog, bankroll, stop_loss, take_profit, max_spins, trials=20000, seed=1):
    rng = np.random.default_rng(seed)
    p = k / 37
    res, reasons, staked = [], Counter(), 0.0
    for _ in range(trials):
        e = Engine(k, base, prog, bankroll, stop_loss, take_profit)
        hits = rng.random(max_spins) < p
        for h in hits:
            s = e.next_stake_per_number()
            if not s:
                break
            staked += s * k
            e.settle(bool(h))
        reasons[e.stopped or "სპინების ლიმიტი"] += 1
        res.append(e.bank - bankroll)
    res = np.array(res)
    return dict(mean=res.mean(), median=np.median(res), p_profit=(res > 0).mean(),
                worst=res.min(), best=res.max(), reasons=reasons, trials=trials,
                ret_pct=res.sum() / staked * 100)


# ---------------------------------------------------------------- ნომრების ამრჩევი
class SectorSelector:
    """დილერის პროფილიდან: ყველაზე ხშირი მანძილი წინა ნომრიდან → k ნომრიანი სექტორი.
    ფსონს არ დებს, სანამ დილერს `min_profile` სპინი არ დაუგროვდება წინა სმენებიდან."""

    def __init__(self, k, min_profile=300, window=9, z_min=4.0):
        self.k, self.min_profile, self.window, self.z_min = k, min_profile, window, z_min
        self.hist = defaultdict(lambda: np.zeros(37))  # dealer -> distance counts (წინა სმენები)
        self.pending = defaultdict(lambda: np.zeros(37))  # მიმდინარე სმენა
        self.cur_session = {}

    def observe(self, dealer, session, prev, cur, direction=""):
        if self.cur_session.get(dealer) != session:  # სმენა დასრულდა → პროფილში გადავიტანოთ
            self.hist[dealer] += self.pending[dealer]
            self.pending[dealer] = np.zeros(37)
            self.cur_session[dealer] = session
        if prev is not None:
            self.pending[dealer][distance(prev, cur, direction)] += 1

    def choose(self, dealer, prev, direction=""):
        h = self.hist[dealer]
        if prev is None or h.sum() < self.min_profile:
            return None
        w = self.window
        circ = np.array([h[[(i + j) % 37 for j in range(-(w // 2), w - w // 2)]].sum() for i in range(37)])
        best = int(circ.argmax())
        # ფსონი მხოლოდ მაშინ, თუ ხელწერა სტატისტიკურად ძლიერია (z ≥ z_min);
        # სამართლიან დილერზე ყოველთვის იქნება „საუკეთესო“ სექტორი — ეს ხმაურია.
        n, p0 = h.sum(), w / 37
        z = (circ[best] / n - p0) / math.sqrt(p0 * (1 - p0) / n)
        if z < self.z_min:
            return None
        return sector_numbers(prev, best, self.k, direction)


def paper_trade(spins, k, base, prog, bankroll, stop_loss=None, take_profit=None, min_profile=300, z_min=4.0):
    sel = SectorSelector(k, min_profile, z_min=z_min)
    eng = Engine(k, base, prog, bankroll, stop_loss, take_profit)
    prev, prev_session, bets = None, None, 0
    for r in spins:
        if r["session_id"] != prev_session:
            prev = None
            prev_session = r["session_id"]
        pick = sel.choose(r["dealer"], prev, r.get("direction", ""))
        if pick and not eng.stopped:
            eng.settle(r["number"] in pick)
            bets += 1
        sel.observe(r["dealer"], r["session_id"], prev, r["number"], r.get("direction", ""))
        prev = r["number"]
    return eng, bets


# ---------------------------------------------------------------- CLI
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["table", "suggest", "mc", "paper"])
    ap.add_argument("--k", type=int, default=12)
    ap.add_argument("--base", type=float, default=0.20)
    ap.add_argument("--prog", default="1,2,3,3,6,7")
    ap.add_argument("--levels", type=int, default=6)
    ap.add_argument("--bankroll", type=float, default=100)
    ap.add_argument("--stop-loss", type=float)
    ap.add_argument("--take-profit", type=float)
    ap.add_argument("--max-spins", type=int, default=300)
    ap.add_argument("--csv", default="spins.csv")
    ap.add_argument("--min-profile", type=int, default=300)
    ap.add_argument("--z-min", type=float, default=4.0)
    a = ap.parse_args()
    prog = [int(x) for x in a.prog.split(",")]

    if a.cmd == "table":
        st = cycle_stats(a.k, a.base, prog)
        print(f"k={a.k} ნომერი, {a.base:.2f} ნომერზე, პროგრესია {prog}")
        print(f"{'საფეხ.':>6} {'×':>3} {'ფსონი':>8} {'დაგროვ.':>8} {'მოგება თუ აქ მოიგო':>20}")
        for r in st["rows"]:
            flag = "  ⚠️ ნული" if abs(r["win_net"]) < 1e-9 else ("  ⚠️ ზარალი" if r["win_net"] < 0 else "")
            print(f"{r['level']:>6} {r['mult']:>3} {r['stake']:>8.2f} {r['cum']:>8.2f} {r['win_net']:>20.2f}{flag}")
        print(f"ყველა საფეხურის წაგება: {st['bust_p']*100:.2f}% (≈ 1/{1/st['bust_p']:.0f} ციკლი) → −{st['bust_loss']:.2f}")
        print(f"მოსალოდნელი შედეგი ციკლზე: {st['ev']:+.3f} ({st['ev_pct']:+.2f}% დადებულიდან)")
    elif a.cmd == "suggest":
        print(suggest(a.k, a.base, a.levels))
    elif a.cmd == "mc":
        r = monte_carlo(a.k, a.base, prog, a.bankroll, a.stop_loss, a.take_profit, a.max_spins)
        print(f"საშუალო {r['mean']:+.2f} | მედიანა {r['median']:+.2f} | მოგებით დასრულება {r['p_profit']*100:.1f}% "
              f"| უარესი {r['worst']:+.2f} | საუკეთესო {r['best']:+.2f} | დაბრუნება {r['ret_pct']:+.2f}%")
        for k, v in r["reasons"].most_common():
            print(f"  {k}: {v/r['trials']*100:.1f}%")
    else:
        spins = load_spins(a.csv)
        eng, bets = paper_trade(spins, a.k, a.base, prog, a.bankroll, a.stop_loss, a.take_profit, a.min_profile, a.z_min)
        print(f"სპინები {len(spins)}, ვირტუალური ფსონები {bets}, მოგება {eng.wins}, "
              f"სრული წაგება {eng.busts}, შედეგი {eng.bank - eng.start:+.2f} ({eng.stopped or 'აქტიური'})")


if __name__ == "__main__":
    main()
