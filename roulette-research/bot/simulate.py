"""სატესტო მონაცემები: სამართლიანი დილერები + (სურვილისამებრ) ერთი ხელწერიანი.
ამოწმებს, რომ analyze.py ნამდვილ ხელწერას იპოვის და ცრუს არ იპოვის.

  python simulate.py --out test_fair.csv --sessions 60
  python simulate.py --out test_sig.csv  --sessions 60 --signature 0.35
"""
import argparse
import datetime as dt

import numpy as np

from common import WHEEL, POS, append_spin, color


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--sessions", type=int, default=60)
    ap.add_argument("--dealers", default="Anna,Giorgi,Maria,Luka,Nino")
    ap.add_argument("--signature", type=float, default=0.0, help="Anna-ს სექტორში მოხვედრის ალბათობა (0 = არა)")
    ap.add_argument("--seed", type=int, default=0)
    a = ap.parse_args()
    rng = np.random.default_rng(a.seed)
    dealers = a.dealers.split(",")
    t = dt.datetime(2026, 11, 1)
    prev = int(rng.integers(37))
    for s in range(a.sessions):
        d = dealers[s % len(dealers)]
        for i in range(int(rng.integers(40, 51))):
            if d == dealers[0] and a.signature > 0 and rng.random() < (a.signature - 9 / 37) / (1 - 9 / 37):
                off = int(rng.integers(12, 21))  # ხელწერა: +12..+20 უჯრა წინა ნომრიდან
                n = WHEEL[(POS[prev] + off) % 37]
            else:
                n = int(rng.integers(37))
            t += dt.timedelta(seconds=45)
            append_spin(a.out, dict(timestamp=t.isoformat(), table="test", dealer=d, session_id=s + 1,
                                    spin_in_session=i + 1, number=n, color=color(n), ocr_ok=1))
            prev = n


if __name__ == "__main__":
    main()
