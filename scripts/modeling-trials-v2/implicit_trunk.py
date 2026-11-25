"""Authored smooth-union implicit volume; execute with system Python before Blender."""
import numpy as np
from scipy.interpolate import CubicSpline
from skimage.measure import marching_cubes
from pathlib import Path
step=.032
origin=np.array([-2.25,-.15,-1.75]);stop=np.array([2.15,3.95,1.65])
axes=[np.arange(a,b+step,step,dtype=np.float32) for a,b in zip(origin,stop)]
field=np.full(tuple(map(len,axes)),10.,dtype=np.float32)
def ellipsoid(center,radii,k=.16):
 c=np.array(center);r=np.array(radii);lo=np.maximum(0,np.floor((c-r-k*2-origin)/step).astype(int));hi=np.minimum(field.shape,np.ceil((c+r+k*2-origin)/step).astype(int)+1)
 sl=tuple(slice(a,b) for a,b in zip(lo,hi));q=np.meshgrid(*[axes[i][sl[i]] for i in range(3)],indexing='ij',sparse=True)
 d=(np.sqrt(sum(((q[i]-c[i])/r[i])**2 for i in range(3)))-1)*min(r)
 old=field[sl];h=np.clip(.5+.5*(d-old)/k,0,1);field[sl]=d*(1-h)+old*h-k*h*(1-h)
def sweep(points,radii,flatten=1,k=.14):
 t=np.linspace(0,1,len(points));curve=CubicSpline(t,np.array(points),axis=0);rad=CubicSpline(t,np.array(radii))
 for u in np.linspace(0,1,max(20,len(points)*9)):
  r=float(rad(u));ellipsoid(curve(u),(r,r*flatten,r*.85),k)
# Broad living trunk, flanked by two winding growth columns. Roots are tapered continuations.
ellipsoid((-.12,1.22,-.12),(.64,1.00,.53),.20)
sweep([(-1.75,.35,.65),(-1.08,.47,.46),(-.56,.72,.21),(-.45,1.35,.03),(-.22,1.95,-.02),(-.58,2.39,-.08),(-1.21,2.76,-.13),(-1.95,3.30,-.17)],[.045,.18,.34,.36,.32,.30,.22,.055],k=.18)
sweep([(1.56,.34,.66),(.97,.47,.43),(.48,.80,.10),(.34,1.48,-.05),(.23,2.05,-.11),(.65,2.46,-.13),(1.25,2.87,-.15),(1.97,3.42,-.14)],[.04,.17,.30,.34,.31,.28,.20,.055],k=.18)
sweep([(-1.70,.34,-.94),(-1.10,.44,-.60),(-.37,.68,-.31),(-.18,1.55,-.39),(-.30,2.20,-.63),(-.41,2.92,-.85),(-.62,3.54,-.95)],[.04,.19,.32,.34,.27,.18,.045],k=.16)
sweep([(.99,.34,-1.24),(.65,.45,-.83),(.21,.67,-.35),(-.15,1.58,-.25)],[.035,.17,.26,.30],k=.16)
sweep([(-.69,2.39,-.10),(-.91,2.93,-.55),(-1.30,3.54,-.72)],[.24,.15,.04],k=.14)
sweep([(.64,2.46,-.12),(.69,3.02,.22),(1.01,3.57,.35)],[.24,.15,.04],k=.14)
v,f,_,_=marching_cubes(field,0,spacing=(step,)*3);v+=origin
out=Path(__file__).resolve().parent/'implicit-trunk.npz';np.savez_compressed(out,vertices=v,faces=f)
print('Implicit trunk',len(v),'vertices',len(f),'triangles',out)
