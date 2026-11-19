import random
random.seed(42)
N=5_000_000
RED={1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36}
spins=[random.randrange(37) for _ in range(N)]
def report(name,staked,ret):
    print(f"{name}: bets={staked:,} return={(ret-staked)/staked*100:+.2f}%")
# A: after 5 blacks in a row bet red 1 unit
st=rt=0;blk=0
for s in spins:
    if blk>=5:
        st+=1; rt+= 2 if s in RED else 0
    blk = blk+1 if (s!=0 and s not in RED) else 0
report("A: 5 შავის შემდეგ წითელზე",st,rt)
# B: sleepers absent >=100 spins, 1 unit each
last=[0]*37;st=rt=0
for i,s in enumerate(spins):
    sl=[n for n in range(37) if i-last[n]>=100]
    st+=len(sl); rt+=36 if s in sl else 0
    last[s]=i
report("B: 100+ სპინი არმოსულ ნომრებზე",st,rt)
# C: bet on all 36 numbers except previous
st=rt=0;prev=None
for s in spins:
    if prev is not None:
        st+=36; rt+= 36 if s!=prev else 0
    prev=s
report("C: ყველა ნომერზე წინას გარდა (\"არ განმეორდება\")",st,rt)
# D: martingale on red, base 1, limit 9 doublings (max 512)
st=rt=0;bet=1
for s in spins:
    st+=bet
    if s in RED: rt+=2*bet; bet=1
    else: bet = bet*2 if bet<512 else 1
report("D: მარტინგეილი წითელზე (ლიმიტი 512)",st,rt)
