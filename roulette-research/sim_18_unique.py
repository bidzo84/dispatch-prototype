import numpy as np, math
rng=np.random.default_rng(7)
p=18/37
print("P(35 black in a row) = %.2e"%(p**35))
for N in [1e6,1e8,1e9,1e10]:
    print("expected longest color streak in %.0e spins ≈ %.1f"%(N, math.log(N*(1-p))/math.log(1/p)))
# L = number of spins while at most 18 distinct numbers have appeared (start fresh)
T=200000
L=np.empty(T,int)
for t in range(T):
    seen=set();n=0
    while True:
        x=rng.integers(37)
        if x not in seen and len(seen)==18: break
        seen.add(x); n+=1
    L[t]=n
print("L mean %.1f median %d"%(L.mean(),np.median(L)))
for a,b in [(18,22),(23,35),(36,44),(45,54),(55,999)]:
    print(f"L in {a}-{b}: {np.mean((L>=a)&(L<=b))*100:.2f}%")
print("P(L>=35) %.3f%%  P(L>=55) %.4f%%"%(np.mean(L>=35)*100,np.mean(L>=55)*100))
# unique in 35 spins
U=np.array([len(set(rng.integers(0,37,35))) for _ in range(200000)])
print("unique in 35 spins: mean %.1f, P(<=18)=%.2f%%"%(U.mean(),np.mean(U<=18)*100))
# strategy: once L reaches >=30 (still 18 distinct), bet 1 unit on each of the 19 unseen numbers, until a new number hits
st=rt=0
spins=rng.integers(0,37,20_000_000)
seen=set();run=0
for x in spins:
    if len(seen)==18 and run>=30:
        st+=19; rt+=36 if x not in seen else 0
    if x not in seen and len(seen)==18:
        seen={int(x)};run=1
    else:
        seen.add(int(x)); run+=1
print(f"strategy bets={st:,} return={(rt-st)/st*100:+.2f}%")
