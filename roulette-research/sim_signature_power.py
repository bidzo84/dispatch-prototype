import numpy as np
rng=np.random.default_rng(0)
W=9  # sector width (pockets)
def maxwin(d):  # d: counts of distances 0..36
    c=np.concatenate([d,d[:W-1]]); cs=np.cumsum(np.r_[0,c])
    return max(cs[i+W]-cs[i] for i in range(37))
def sample(n,p):
    # with prob p land in window [10..18], else uniform over all 37
    sig=rng.random(n)<(p-W/37)/(1-W/37)
    x=np.where(sig, rng.integers(10,10+W,n), rng.integers(0,37,n))
    return np.bincount(x,minlength=37)
for n in [200,500,1000,2000,4000]:
    null=[maxwin(sample(n,W/37)) for _ in range(2000)]
    thr=np.quantile(null,0.99)
    row=[]
    for p in [0.27,0.30,0.35]:
        det=np.mean([maxwin(sample(n,p))>thr for _ in range(500)])
        row.append(f"p={p:.0%}: {det:.0%}")
    print(n, *row)
