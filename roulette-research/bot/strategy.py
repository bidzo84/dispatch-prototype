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
STAKINGS = ["flat", "dalembert", "oscar", "kelly", "prog"]


class Engine:
    """ფსონის ზომის მართვა + რისკის ლიმიტები.

    staking:
      flat       — ყოველთვის base ნომერზე (კვლევისთვის საუკეთესო: სუფთა შედეგი)
      dalembert  — წაგებისას +1 ერთეული, მოგებისას −1 (მინ. 1, მაქს. max_units)
      oscar      — Oscar's Grind: ფსონი იზრდება მხოლოდ მოგების შემდეგ; ციკლის მიზანი =
                   1-ლი ერთეულის მოგება; წაგებისას ფსონი არ იზრდება
      kelly      — ფსონი ბიუჯეტის წილია და დამოკიდებულია შეფასებულ უპირატესობაზე q-ზე;
                   უპირატესობა არ არის → ფსონი 0 (kelly_frac = Kelly-ს წილი, ნაგულისხმ. 1/4)
      prog       — ფიქსირებული პროგრესია (მაგ. 1,2,3,3,6,7), როგორც ადრე
    """

    def __init__(self, k, base, bankroll, staking="flat", prog=None, stop_loss=None, take_profit=None,
                 max_units=10, kelly_frac=0.25, min_chip=0.10):
        assert staking in STAKINGS
        self.k, self.base, self.staking = k, base, staking
        self.prog = list(prog or [1])
        self.start = self.bank = bankroll
        self.stop_loss, self.take_profit = stop_loss, take_profit
        self.max_units, self.kelly_frac, self.min_chip = max_units, kelly_frac, min_chip
        self.units, self.level, self.cycle = 1, 0, 0.0
        self.busts = self.wins = self.spins = 0
        self.staked = 0.0
        self.history = [bankroll]
        self.stopped = None
        self.unit_net = base * (PAYOUT - k)  # წმინდა მოგება 1 ერთეულზე

    def next_stake_per_number(self, q=None):
        if self.stopped:
            return 0.0
        st = self.staking
        if st == "flat":
            s = self.base
        elif st in ("dalembert", "oscar"):
            s = self.base * self.units
        elif st == "prog":
            s = self.base * self.prog[self.level]
        else:  # kelly
            q = self.k / 37 if q is None else q
            b = PAYOUT / self.k - 1
            f = (b * q - (1 - q)) / b
            if f <= 0:
                return 0.0
            s = math.floor(self.kelly_frac * f * self.bank / self.k / self.min_chip) * self.min_chip
            if s < self.min_chip:
                return 0.0
        if s * self.k > self.bank:
            self.stopped = "ბიუჯეტი ამოიწურა"
            return 0.0
        return round(s, 2)

    def settle(self, hit: bool, q=None):
        s = self.next_stake_per_number(q)
        if not s:
            return
        self.spins += 1
        self.staked += s * self.k
        net = s * PAYOUT * hit - s * self.k
        self.bank += net
        self.history = (self.history + [round(self.bank, 2)])[-3000:]
        self.wins += hit
        st = self.staking
        if st == "dalembert":
            self.units = max(1, self.units - 1) if hit else min(self.max_units, self.units + 1)
        elif st == "oscar":
            self.cycle += net
            if self.cycle >= self.unit_net - 1e-9:
                self.cycle, self.units = 0.0, 1  # ციკლი დასრულდა მოგებით
            elif hit:
                need = math.ceil((self.unit_net - self.cycle) / self.unit_net - 1e-9)
                self.units = min(self.max_units, self.units + 1, max(1, need))
        elif st == "prog":
            if hit:
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


def monte_carlo(k, base, staking, bankroll, stop_loss, take_profit, max_spins, prog=None, q=None,
                trials=20000, seed=1):
    """q = რეალური მოხვედრის ალბათობა k ნომერზე (ნაგულისხმევად სამართლიანი k/37)."""
    rng = np.random.default_rng(seed)
    q = k / 37 if q is None else q
    res, reasons, staked = [], Counter(), 0.0
    for _ in range(trials):
        e = Engine(k, base, bankroll, staking, prog, stop_loss, take_profit)
        for h in rng.random(max_spins) < q:
            if not e.next_stake_per_number(q):
                if e.stopped:
                    break
                continue
            e.settle(bool(h), q)
        staked += e.staked
        reasons[e.stopped or "სპინების ლიმიტი"] += 1
        res.append(e.bank - bankroll)
    res = np.array(res)
    return dict(mean=res.mean(), median=np.median(res), p_profit=(res > 0).mean(),
                p_big_loss=(res <= -0.5 * bankroll).mean(), worst=res.min(), best=res.max(),
                reasons=reasons, trials=trials, ret_pct=res.sum() / staked * 100 if staked else 0.0)


# ---------------------------------------------------------------- ნომრების ამრჩევი
class SectorSelector:
    """დილერის პროფილიდან: ყველაზე ხშირი მანძილი წინა ნომრიდან → k ნომრიანი სექტორი.
    ფსონს არ დებს, სანამ დილერს `min_profile` სპინი არ დაუგროვდება წინა სმენებიდან."""

    def __init__(self, k, min_profile=300, window=9, z_min=4.0, prior=300):
        self.k, self.min_profile, self.window, self.z_min, self.prior = k, min_profile, window, z_min, prior
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
        pick = sector_numbers(prev, best, self.k, direction)
        # q-ს შეფასება k-ნომრიან სექტორზე, „შეკუმშული“ სამართლიანისკენ (ზედმეტი ოპტიმიზმის წინააღმდეგ)
        hits = h[[(best + j) % 37 for j in range(-(self.k // 2), self.k - self.k // 2)]].sum()
        q_hat = (hits + self.prior * self.k / 37) / (n + self.prior)
        return pick, q_hat


def paper_trade(spins, k, base, staking, bankroll, prog=None, stop_loss=None, take_profit=None,
                min_profile=300, z_min=4.0):
    sel = SectorSelector(k, min_profile, z_min=z_min)
    eng = Engine(k, base, bankroll, staking, prog, stop_loss, take_profit)
    prev, prev_session, bets = None, None, 0
    for r in spins:
        if r["session_id"] != prev_session:
            prev = None
            prev_session = r["session_id"]
        choice = sel.choose(r["dealer"], prev, r.get("direction", ""))
        if choice and not eng.stopped and eng.next_stake_per_number(choice[1]):
            eng.settle(r["number"] in choice[0], choice[1])
            bets += 1
        sel.observe(r["dealer"], r["session_id"], prev, r["number"], r.get("direction", ""))
        prev = r["number"]
    return eng, bets


# ---------------------------------------------------------------- CLI
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd", choices=["table", "suggest", "mc", "compare", "paper"])
    ap.add_argument("--k", type=int, default=12)
    ap.add_argument("--base", type=float, default=0.20)
    ap.add_argument("--staking", choices=STAKINGS, default="flat")
    ap.add_argument("--prog", default="1,2,3,3,6,7")
    ap.add_argument("--levels", type=int, default=6)
    ap.add_argument("--bankroll", type=float, default=100)
    ap.add_argument("--stop-loss", type=float)
    ap.add_argument("--take-profit", type=float)
    ap.add_argument("--max-spins", type=int, default=300)
    ap.add_argument("--q", type=float, help="რეალური მოხვედრის ალბათობა k ნომერზე (სიმულაციისთვის)")
    ap.add_argument("--csv", default="spins.csv")
    ap.add_argument("--min-profile", type=int, default=300)
    ap.add_argument("--z-min", type=float, default=4.0)
    a = ap.parse_args()
    prog = [int(x) for x in a.prog.split(",")]

    def show(name, r):
        print(f"{name:<11} საშუალო {r['mean']:+7.2f} | მედიანა {r['median']:+7.2f} | მოგებით {r['p_profit']*100:5.1f}% "
              f"| ზარალი ≥50% ბიუჯეტის {r['p_big_loss']*100:5.1f}% | უარესი {r['worst']:+8.2f} | დაბრუნება {r['ret_pct']:+.2f}%")

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
        show(a.staking, monte_carlo(a.k, a.base, a.staking, a.bankroll, a.stop_loss, a.take_profit,
                                    a.max_spins, prog, a.q))
    elif a.cmd == "compare":
        q = a.q if a.q else a.k / 37
        print(f"k={a.k}, ბიუჯეტი {a.bankroll}, {a.max_spins} სპინი, მოხვედრა {q*100:.1f}% "
              f"(სამართლიანი {a.k/37*100:.1f}%, ნულოვანი ზღვარი {a.k/36*100:.1f}%)")
        for st in STAKINGS:
            show(st, monte_carlo(a.k, a.base, st, a.bankroll, a.stop_loss, a.take_profit, a.max_spins,
                                 prog, q, trials=5000))
    else:
        spins = load_spins(a.csv)
        eng, bets = paper_trade(spins, a.k, a.base, a.staking, a.bankroll, prog, a.stop_loss,
                                a.take_profit, a.min_profile, a.z_min)
        print(f"სპინები {len(spins)}, ვირტუალური ფსონები {bets}, მოგება {eng.wins}, "
              f"შედეგი {eng.bank - eng.start:+.2f} ({eng.stopped or 'აქტიური'})")


if __name__ == "__main__":
    main()
