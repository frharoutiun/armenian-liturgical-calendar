"""Exhaustive search of all page images for the end-of-canon labels «Ճաշու :» / «Համբարձի :» (label glyphs cut from p372, normalised cross-correlation).
   python3 tools/cue_label_scan.py   (about 3 minutes; prints the pages with a score above 0.62; numpy + Pillow only)"""
import numpy as np, sys, json
from PIL import Image
import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P=os.path.join(ROOT,'pages','p%03d.jpg')
def load(p):
    a=np.array(Image.open(P%p).convert('L')).astype(np.float32)
    return (a<150).astype(np.float32)
def ncc(I,T):
    th,tw=T.shape
    H,W=I.shape
    n=th*tw
    Tm=T-T.mean()
    # correlation via FFT
    sh=(H+th,W+tw)
    F=np.fft.rfft2(I,sh); G=np.fft.rfft2(Tm[::-1,::-1],sh)
    corr=np.fft.irfft2(F*G,sh)[th-1:H,tw-1:W]
    # local sums
    S=np.cumsum(np.cumsum(np.pad(I,((1,0),(1,0))),0),1)
    S2=np.cumsum(np.cumsum(np.pad(I*I,((1,0),(1,0))),0),1)
    def box(Sx):
        return Sx[th:,tw:]-Sx[:-th,tw:]-Sx[th:,:-tw]+Sx[:-th,:-tw]
    s=box(S)[:H-th+1,:W-tw+1]; s2=box(S2)[:H-th+1,:W-tw+1]
    var=s2-s*s/n
    den=np.sqrt(np.maximum(var,1e-6))*np.sqrt((Tm*Tm).sum())
    return corr[:var.shape[0],:var.shape[1]]/den
def template(box):
    I=load(372)
    x0,y0,x1,y1=box
    return I[y0:y1,x0:x1]
if __name__=='__main__':
    T1=template((304,731,362,750))
    T2=template((292,800,384,820))
    res={}
    for p in range(1,514):
        I=load(p)
        out={}
        for name,T in (('chashu',T1),('hamb',T2)):
            r=ncc(I,T)
            ys,xs=np.where(r>0.62)
            if len(ys):
                best=np.argmax(r[ys,xs])
                out[name]=(float(r[ys[best],xs[best]]),int(xs[best]),int(ys[best]))
        if out: res[p]=out
    for p,o in res.items(): print(p,o)
