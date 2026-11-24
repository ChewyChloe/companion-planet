"""Stage-one organic sculpture fields, deliberately no radial cross sections.
Run with Python + numpy/scikit-image. Extract true 3D implicit isosurfaces;
Blender imports these surfaces for editable clay-only models and GLB export.
"""
import sys,json,hashlib
from pathlib import Path
import numpy as np
from skimage.measure import marching_cubes
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/art/clay-stage';OUT.mkdir(parents=True,exist_ok=True)
STEP=.010
# Common sampling volume and world scale; no per-model thumbnail normalization.
axes=[np.arange(-.88,.89,STEP,dtype=np.float32),np.arange(-.74,.75,STEP,dtype=np.float32),np.arange(-.10,1.68,STEP,dtype=np.float32)]
x,y,z=np.meshgrid(*axes,indexing='ij');P=np.stack((x,y,z),axis=-1)
def ellipsoid(center,radii,tilt=0):
 q=P-np.array(center,dtype=np.float32);r=np.array(radii,dtype=np.float32)
 if tilt:
  c=np.cos(tilt);sn=np.sin(tilt);qx=q[...,0].copy();q[...,0]=c*qx-sn*q[...,2];q[...,2]=sn*qx+c*q[...,2]
 k0=np.linalg.norm(q/r,axis=-1);k1=np.linalg.norm(q/(r*r),axis=-1)
 return k0*(k0-1)/np.maximum(k1,1e-6)
def union(a,b,k):
 # Polynomial smooth min: C1 continuous blend in physical length units.
 h=np.maximum(k-np.abs(a-b),0)/k
 return np.minimum(a,b)-h*h*k*.25
def curved_limb(points,radii,blend=.07):
 # Swept varying-radius implicit balls; dense samples produce a continuous
 # rounded extrusion instead of visible appended sphere objects.
 field=np.full(x.shape,100,dtype=np.float32)
 for i in range(len(points)-1):
  for t in np.linspace(0,1,9):
   p=np.array(points[i])*(1-t)+np.array(points[i+1])*t
   r=np.array(radii[i])*(1-t)+np.array(radii[i+1])*t
   field=union(field,ellipsoid(p,r),blend)
 return field
reports=[]
requested=[a for a in sys.argv[1:] if a!='--rebuild-approved']
if not requested:raise SystemExit('Specify resident IDs. Approved models require --rebuild-approved.')
for id in requested:
 if id in ['nebula','fern','mushroom'] and (OUT/(id+'.glb')).exists() and '--rebuild-approved' not in sys.argv:raise SystemExit('Approved sculpture protected: '+id)
 assert id in ['nebula','sprout','fern','mushroom','aurora','blossom','stardust','water','puff']
 if id=='nebula':
  # A broad egg-shaped upper volume and forward soft belly. No tapered cap.
  f=union(ellipsoid((0,.015,.66),(.445,.375,.535)),ellipsoid((0,-.035,.43),(.435,.375,.315)),.20)
  for s in [-1,1]:
   limb=curved_limb([(s*.345,0,.67),(s*.455,-.015,.52),(s*.47,-.045,.39)],[(.125,.14,.155),(.113,.13,.14),(.092,.115,.12)])
   f=union(f,limb,.105)
   foot=curved_limb([(s*.205,.015,.275),(s*.22,-.045,.125)],[(.14,.16,.15),(.115,.15,.105)])
   f=union(f,foot,.10)
  face={'z':.82,'spacing':.145,'eye':.034};brief='Full round egg, soft shoulder flippers, tucked short feet, quiet curious face.'
 elif id=='fern':
  # A low, wide mochi with a gently flattened upper dome and succulent paddles.
  f=union(ellipsoid((0,.015,.485),(.535,.425,.365)),ellipsoid((0,-.025,.325),(.49,.40,.23)),.22)
  for s in [-1,1]:
   limb=curved_limb([(s*.40,.005,.46),(s*.545,-.02,.34),(s*.58,-.07,.265)],[(.16,.16,.13),(.145,.15,.12),(.105,.13,.085)])
   f=union(f,limb,.13)
   foot=curved_limb([(s*.28,0,.225),(s*.30,-.04,.085)],[(.15,.16,.125),(.12,.145,.075)])
   f=union(f,foot,.095)
  face={'z':.57,'spacing':.172,'eye':.030};brief='Wide low mochi, thick leaf paddles, broad planted stance, calm small face.'
 elif id=='mushroom':
  # A substantial round bell: rounded shoulders, wide soft lower body,
  # forward-curled mittens and broad almost-hidden stump feet.
  f=union(ellipsoid((0,.025,.60),(.435,.375,.435)),ellipsoid((0,-.01,.335),(.48,.395,.25)),.21)
  for s in [-1,1]:
   limb=curved_limb([(s*.365,-.13,.54),(s*.405,-.265,.43),(s*.305,-.345,.425)],[(.125,.13,.145),(.135,.13,.12),(.105,.105,.10)])
   f=union(f,limb,.105)
   foot=curved_limb([(s*.255,.015,.23),(s*.26,-.04,.08)],[(.165,.17,.14),(.145,.165,.07)])
   f=union(f,foot,.105)
  face={'z':.715,'spacing':.153,'eye':.033};brief='Round squat bell, soft broad base, curled front mittens and short broad feet.'
 elif id=='sprout':
  # A genuine pear: narrow high shoulders flowing into the full lower belly.
  f=union(ellipsoid((0,.015,.82),(.305,.30,.43)),ellipsoid((0,-.02,.425),(.46,.37,.355)),.25)
  for sign in [-1,1]:
   arm=curved_limb([(sign*.30,-.005,.66),(sign*.43,-.015,.60),(sign*.47,-.04,.67 if sign<0 else .49)],[(.115,.13,.16),(.10,.12,.14),(.085,.10,.11)])
   f=union(f,arm,.105)
   foot=curved_limb([(sign*.20,0,.24),(sign*.21,-.04,.105)],[(.13,.15,.14),(.105,.14,.085)])
   f=union(f,foot,.10)
  face={'z':.85,'spacing':.125,'eye':.032};brief='Butter pear with narrow shoulders, generous low belly, one gently lifted mitten.'
 elif id=='aurora':
  # Leaning upper volume and offset hip: asymmetry exists in the actual body.
  f=union(ellipsoid((.075,.01,.73),(.355,.32,.50),.22),ellipsoid((-.04,-.015,.385),(.405,.345,.30),-.12),.22)
  for sign in [-1,1]:
   points=([(-.29,-.01,.66),(-.44,-.02,.77),(-.48,-.055,.87)] if sign<0 else [(.35,0,.62),(.45,-.015,.47),(.48,-.045,.35)])
   arm=curved_limb(points,[(.105,.13,.16),(.095,.12,.14),(.075,.095,.10)])
   f=union(f,arm,.10)
   foot=curved_limb([(sign*.18-.025,0,.24),(sign*.23-.025,-.03,.105)],[(.12,.14,.14),(.10,.13,.085)])
   f=union(f,foot,.095)
  face={'z':.82,'spacing':.125,'eye':.030};brief='Asymmetric leaning bean, raised left flipper, low right flipper and offset hips.'
 elif id=='blossom':
  # Small rounded teardrop with a full face and inward-curled front hands.
  f=union(ellipsoid((0,.015,.72),(.365,.335,.425)),ellipsoid((0,-.025,.40),(.425,.36,.30)),.23)
  for sign in [-1,1]:
   arm=curved_limb([(sign*.30,-.125,.59),(sign*.285,-.29,.47),(sign*.145,-.375,.54)],[(.11,.125,.135),(.10,.115,.115),(.075,.09,.10)],.045)
   f=union(f,arm,.08)
   foot=curved_limb([(sign*.18,.005,.22),(sign*.185,-.025,.08)],[(.12,.135,.13),(.09,.12,.07)])
   f=union(f,foot,.09)
  face={'z':.79,'spacing':.13,'eye':.033};brief='Petite rounded teardrop, soft large face and small hands curling toward chest.'
 elif id=='stardust':
  # Rounded-square superellipsoid, not a width-scaled egg or stacked torso.
  q=np.abs(P-np.array((0,.02,.60),dtype=np.float32))/np.array((.48,.405,.48),dtype=np.float32)
  f=(np.sum(q**3.4,axis=-1)**(1/3.4)-1)*.405
  f=union(f,ellipsoid((0,-.025,.39),(.49,.415,.29)),.15)
  for sign in [-1,1]:
   arm=curved_limb([(sign*.42,0,.69),(sign*.55,-.01,.52),(sign*.56,-.045,.37)],[(.14,.17,.18),(.135,.16,.16),(.11,.14,.12)])
   f=union(f,arm,.115)
   foot=curved_limb([(sign*.27,0,.28),(sign*.29,-.045,.11)],[(.17,.19,.17),(.14,.18,.09)])
   f=union(f,foot,.10)
  face={'z':.785,'spacing':.185,'eye':.033};brief='Heavy rounded-square guardian, broad shoulders, deep chest and substantial paws.'
 elif id=='water':
  # Continuous swept liquid tip; no separate head ornament disguising a blob.
  f=union(ellipsoid((0,-.015,.43),(.44,.355,.36)),ellipsoid((.025,.005,.76),(.30,.285,.43)),.22)
  tip=curved_limb([(.045,0,1.01),(.09,0,1.20),(.175,0,1.35),(.215,0,1.40)],[(.13,.13,.18),(.085,.095,.15),(.055,.065,.10),(.027,.036,.055)],.025)
  f=union(f,tip,.075)
  for sign in [-1,1]:
   arm=curved_limb([(sign*.32,-.01,.49),(sign*.45,-.035,.55),(sign*.49,-.055,.63)],[(.105,.12,.13),(.09,.10,.11),(.06,.075,.085)],.045)
   f=union(f,arm,.095)
   foot=curved_limb([(sign*.21,-.005,.22),(sign*.28,-.045,.085)],[(.125,.145,.13),(.11,.14,.065)])
   f=union(f,foot,.09)
  face={'z':.65,'spacing':.145,'eye':.031};brief='Low round water belly with a continuous curved liquid tip and upturned flowing fins.'
 elif id=='puff':
  # Low cloud-like volume. Overlapping fields create rounded lobes in 3D.
  f=ellipsoid((0,.015,.52),(.465,.40,.39))
  for sign in [-1,1]:
   f=union(f,ellipsoid((sign*.205,0,.57),(.31,.34,.325)),.15)
   arm=curved_limb([(sign*.40,-.015,.43),(sign*.51,-.045,.325)],[(.135,.14,.135),(.10,.12,.095)])
   f=union(f,arm,.115)
   foot=curved_limb([(sign*.225,0,.225),(sign*.24,-.025,.085)],[(.13,.15,.135),(.105,.13,.065)])
   f=union(f,foot,.105)
  face={'z':.635,'spacing':.15,'eye':.031};brief='Low soft cloud, subtle round lobes, little mitten hands and tucked tiny feet.'
 # A smooth support plane prevents toes protruding through the review ground.
 f=np.maximum(f,.015-z)
 vs,fs,normals,_=marching_cubes(f,level=0,spacing=(STEP,STEP,STEP),allow_degenerate=False)
 vs+=np.array([a[0] for a in axes]);np.savez_compressed(OUT/(id+'-surface.npz'),vertices=vs,faces=fs)
 report={'id':id,'method':'ellipsoid signed-distance approximation + smooth union, marching cubes','voxelStep':STEP,'vertices':len(vs),'triangles':len(fs),'geometrySHA256':hashlib.sha256(vs.tobytes()+fs.tobytes()).hexdigest(),'face':face,'brief':brief,'bodyTop':float(vs[:,2].max())}
 (OUT/(id+'-field.json')).write_text(json.dumps(report,indent=2)+'\n');print(id,len(vs),len(fs),flush=True)
