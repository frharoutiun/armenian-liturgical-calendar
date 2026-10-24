import json,re,collections,sys
KR='/private/tmp/claude-501/-Users-frharoutiun-Documents-Church-Coding-06---Donatsooyts-Digitization/f457a618-4eee-4857-8a14-609f12cc63bc/scratchpad/krapar/repo/sharagan/data/corpus.json'
AN='/Users/frharoutiun/Documents/Church/Coding/06 - Donatsooyts Digitization/output/sharagnots_anchored/stanzas.json'
K=json.load(open(KR));A=json.load(open(AN))['stanzas']
WORD=re.compile(r'[Ա-Ֆա-և]+')
def words(t): 
    out=[]
    for w in WORD.findall(t or ''):
        w=w.lower().replace('ը','').replace('օ','ո').replace('ւ','').replace('ու','ո').replace('եւ','և')
        w=w.replace('և','եւ')
        out.append(w[:4])
    return out
def bigr(ws): return {(ws[i],ws[i+1]) for i in range(len(ws)-1)} if len(ws)>1 else set(ws)
inv=collections.defaultdict(set); ob=[]
for i,a in enumerate(A):
    b=bigr(words(a['reading'] or a['ours_diplomatic'])); ob.append(b)
    for g in b: inv[g].add(i)
tot=hit=0; sc=[]
for s in K:
    for st in s['stanzas']:
        for v in st['verses']:
            kb=bigr(words(v['text'])); tot+=1
            cnt=collections.Counter()
            for g in kb:
                for i in inv.get(g,()): cnt[i]+=1
            if cnt:
                i,c=cnt.most_common(1)[0]; score=c/max(1,len(kb)); sc.append(score)
                if score>=0.5: hit+=1
print(tot,hit,hit/tot)
import statistics
print(statistics.median(sc), sum(1 for x in sc if x>=0.8))
