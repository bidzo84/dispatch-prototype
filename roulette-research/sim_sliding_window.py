import numpy as np
rng=np.random.default_rng(11)
N=10_000_000; W=30
s=rng.integers(0,37,N)
cnt=np.zeros(37,int); uniq=0
for x in s[:W]:
    if cnt[x]==0: uniq+=1
    cnt[x]+=1
res={}
for i in range(W,N):
    x=s[i]; u=uniq
    for k in (17,18,19,20):
        if u<=k:
            r=res.setdefault(k,[0,0,0,0,0])
            r[0]+=1
            # bet unseen: 1 unit each on 37-u numbers
            r[1]+=37-u; r[2]+= 36 if cnt[x]==0 else 0
            # bet seen: 1 unit each on u numbers
            r[3]+=u; r[4]+= 36 if cnt[x]>0 else 0
    # slide
    o=s[i-W]; cnt[o]-=1
    if cnt[o]==0: uniq-=1
    if cnt[x]==0: uniq+=1
    cnt[x]+=1
tot=N-W
for k,(n,su,ru,ss,rs) in sorted(res.items()):
    print(f"unique<={k} in last 30: signal 1 per {tot/n:,.0f} spins | bet UNSEEN {(ru-su)/su*100:+.2f}% | bet SEEN {(rs-ss)/ss*100:+.2f}%")
