"""ჩაწერილი სპინების ანალიზი: ყველა ჩვენი ტესტი ერთ ანგარიშში.

გამოყენება:  python analyze.py --csv spins.csv
"""
import argparse
from collections import defaultdict

import numpy as np

from common import distance, load_spins

RNG = np.random.default_rng(12345)
SIMS = 2000


def circ_window_max(counts, w=9):
    c = np.concatenate([counts, counts[: w - 1]])
    cs = np.concatenate([[0], np.cumsum(c)])
    return (cs[w:w + 37] - cs[:37]).max()


def sector_test(dists, w=9):
    """ფაქტი 1: არის თუ არა w-უჯრიანი სექტორი (მანძილი წინა ნომრიდან), სადაც
    ბურთი შემთხვევითზე ხშირად ხვდება. p-მნიშვნელობა სიმულაციით."""
    n = len(dists)
    counts = np.bincount(dists, minlength=37)
    obs = circ_window_max(counts, w)
    null = np.array([circ_window_max(np.bincount(RNG.integers(0, 37, n), minlength=37), w) for _ in range(SIMS)])
    p = (np.sum(null >= obs) + 1) / (SIMS + 1)
    start = int(np.argmax([np.roll(counts, -i)[:w].sum() for i in range(37)]))
    return obs / n, p, start


def chi2_numbers(nums):
    """ბორბლის ბიასი: ნომრების სიხშირე ერთგვაროვანია?"""
    n = len(nums)
    def chi(c):
        e = n / 37
        return ((c - e) ** 2 / e).sum()
    obs = chi(np.bincount(nums, minlength=37))
    null = np.array([chi(np.bincount(RNG.integers(0, 37, n), minlength=37)) for _ in range(SIMS)])
    return obs, (np.sum(null >= obs) + 1) / (SIMS + 1)


def unique_metric(sessions):
    """ფაქტი 8ბ/10: უნიკალური ნომრები სმენაში vs სამართლიანი ბორბალი."""
    obs = np.mean([len(set(s)) for s in sessions])
    lens = [len(s) for s in sessions]
    null = np.array([np.mean([len(set(RNG.integers(0, 37, L))) for L in lens]) for _ in range(500)])
    p_low = (np.sum(null <= obs) + 1) / 501
    return obs, null.mean(), p_low


def dealer_id_test(session_hists, labels, perms=200):
    """ფაქტი 6: შეგვიძლია თუ არა სმენის მიხედვით დილერის ამოცნობა (leave-one-out)."""
    H = np.array(session_hists, float)
    # წრიული გასწორება (±2 უჯრა), რომ მცირე ხმაური არ ჩაითვალოს სხვაობად
    H = sum(np.roll(H, s, axis=1) for s in range(-2, 3))
    labels = np.array(labels)

    def predict(lab):
        out = []
        for i in range(len(H)):
            best, bscore = None, -1e9
            for d in set(lab):
                mask = (lab == d)
                mask[i] = False
                if not mask.any():
                    continue
                prof = H[mask].sum(0)
                prof = prof / (np.linalg.norm(prof) + 1e-12)
                sc = H[i] @ prof / (np.linalg.norm(H[i]) + 1e-12)
                if sc > bscore:
                    best, bscore = d, sc
            out.append(best)
        return np.array(out)

    pred = predict(labels)
    acc = (pred == labels).mean()
    recall = {d: (pred[labels == d] == d).mean() for d in sorted(set(labels))}
    null = np.array([(predict(lp) == lp).mean() for lp in (RNG.permutation(labels) for _ in range(perms))])
    return acc, null.mean(), (np.sum(null >= acc) + 1) / (perms + 1), recall


def sliding_rule(spins, window=30, max_unique=18):
    """ფაქტი 9: ბოლო 30-ში ≤18 უნიკალური → ფსონი მოსულებზე / არმოსულებზე."""
    nums = [r["number"] for r in spins]
    s_seen = r_seen = s_un = r_un = 0
    for i in range(window, len(nums)):
        seen = set(nums[i - window:i])
        if len(seen) <= max_unique:
            s_seen += len(seen); r_seen += 36 if nums[i] in seen else 0
            s_un += 37 - len(seen); r_un += 36 if nums[i] not in seen else 0
    f = lambda s, r: (r - s) / s * 100 if s else float("nan")
    return f(s_seen, r_seen), f(s_un, r_un), s_seen > 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv", default="spins.csv")
    ap.add_argument("--min-spins", type=int, default=100, help="მინ. სპინი დილერზე ანალიზისთვის")
    a = ap.parse_args()
    spins = load_spins(a.csv)
    if not spins:
        print("მონაცემები არ არის.")
        return

    by_session = defaultdict(list)
    for r in spins:
        by_session[(r["dealer"], r["session_id"])].append(r)

    dealer_d = defaultdict(list)
    session_hists, session_labels, session_nums = [], [], []
    for (dealer, sid), rows in by_session.items():
        rows.sort(key=lambda r: r["spin_in_session"])
        ds = [distance(p["number"], c["number"], c.get("direction", "")) for p, c in zip(rows, rows[1:])]
        dealer_d[dealer] += ds
        session_nums.append([r["number"] for r in rows])
        if len(ds) >= 10:
            session_hists.append(np.bincount(ds, minlength=37))
            session_labels.append(dealer)

    nums = np.array([r["number"] for r in spins])
    print(f"=== სულ: {len(spins)} სპინი, {len(by_session)} სმენა, {len(dealer_d)} დილერი ===\n")

    chi, p = chi2_numbers(nums)
    print(f"[ბორბლის ბიასი] ნომრების სიხშირე: χ²={chi:.1f}, p={p:.3f} "
          f"{'⚠️ საეჭვოა' if p < 0.01 else '— ჩანს სამართლიანად'}")

    u, ue, pu = unique_metric(session_nums)
    print(f"[ფაქტი 8ბ/10] უნიკალური სმენაში: {u:.1f} (სამართლიანზე {ue:.1f}), p(ნაკლები)={pu:.3f}")

    ps, pu2, any_sig = sliding_rule(spins)
    if any_sig:
        print(f"[ფაქტი 9] ბოლო 30-ში ≤18: ფსონი მოსულებზე {ps:+.1f}%, არმოსულებზე {pu2:+.1f}% (სამართლიანზე ≈ −2.7%)")

    print("\n[ფაქტი 1] დილერის ხელწერა — 9-უჯრიანი სექტორი (მანძილი წინა ნომრიდან):")
    print(f"  {'დილერი':<18}{'სპინი':>7}{'სექტ.%':>8}{'(24.3%)':>8}{'p':>8}  შედეგი")
    tests = 0
    rows = []
    for d, ds in sorted(dealer_d.items(), key=lambda x: -len(x[1])):
        if len(ds) < a.min_spins:
            print(f"  {d:<18}{len(ds):>7}   — ცოტა მონაცემია (მინ. {a.min_spins})")
            continue
        share, p, start = sector_test(np.array(ds))
        tests += 1
        rows.append((d, len(ds), share, p, start))
    for d, n, share, p, start in rows:
        thr = 0.01 / max(tests, 1)  # ბონფერონის შესწორება — ბევრი დილერის შემოწმებისას
        verdict = "✅ სიგნალი" if p < thr else ("~ სუსტი, საჭიროა მეტი" if p < 0.05 else "— არ ჩანს")
        print(f"  {d:<18}{n:>7}{share*100:>8.1f}{'':>8}{p:>8.3f}  {verdict} (სექტორი +{start}..+{start+8})")

    if len(set(session_labels)) >= 2 and len(session_labels) >= 6:
        acc, base, p, recall = dealer_id_test(session_hists, session_labels)
        print(f"\n[ფაქტი 6] დილერის ამოცნობა სმენით: სიზუსტე {acc*100:.1f}% (შემთხვევით {base*100:.1f}%), p={p:.3f} "
              f"{'✅ ხელწერა არსებობს' if p < 0.01 else '— ამოცნობა შემთხვევითზე უკეთესი არ არის'}")
        print("  ამოცნობა დილერების მიხედვით (შემთხვევით ≈ " + f"{100/len(recall):.0f}%): " +
              ", ".join(f"{d} {r*100:.0f}%" for d, r in recall.items()))
    else:
        print("\n[ფაქტი 6] დილერის ამოცნობა: საჭიროა ≥2 დილერი და ≥6 სმენა.")


if __name__ == "__main__":
    main()
