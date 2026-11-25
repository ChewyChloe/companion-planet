"""Continuous cloud clusters, with round shoulder lobes instead of radial spikes."""
import ast
from pathlib import Path
import numpy as np
from skimage.measure import marching_cubes
p=Path(__file__).with_name('treehouse.py');tree=ast.parse(p.read_text());clumps=[]
for node in ast.walk(tree):
 if isinstance(node,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='clumps' for t in node.targets):clumps=ast.literal_eval(node.value)
 if isinstance(node,ast.Expr) and isinstance(node.value,ast.Call) and isinstance(node.value.func,ast.Attribute) and isinstance(node.value.func.value,ast.Name) and node.value.func.value.id=='clumps':clumps.extend(ast.literal_eval(node.value.args[0]))
out={}
for idx,(name,c,scale,phase) in enumerate(clumps):
 st=.045;axes=[np.arange(-1.55,1.55+st,st,dtype=np.float32) for _ in range(3)];x,y,z=np.meshgrid(*axes,indexing='ij',sparse=True);f=np.full((len(axes[0]),)*3,10.,dtype=np.float32)
 # Four broad, overlapping growth lobes; rear lobe rises, front lobe hangs lower.
 for j,(px,py,pz,r) in enumerate([(-.43,-.06,.05,.65),(.04,.23,-.12,.78),(.47,-.05,.01,.62),(.02,-.23,.35,.59)]):
  px+=.05*np.sin(phase+j);py+=.05*np.cos(phase*1.7+j)
  d=(np.sqrt((x-px)**2+(y-py)**2+(z-pz)**2)-r);k=.20;h=np.clip(.5+.5*(d-f)/k,0,1);f=d*(1-h)+f*h-k*h*(1-h)
 v,faces,_,_=marching_cubes(f,0,spacing=(st,)*3);v-=1.55;v=v*np.array(scale)+np.array(c);out[name+'_v']=v;out[name+'_f']=faces
np.savez_compressed(p.with_name('implicit-canopy.npz'),**out)
print('CANOPY',len(clumps),'independent closed sculpted clusters')
