import common as C
import bpy,bmesh,math
from mathutils import Vector
root=C.setup('island');terrain=C.empty('Upper_terraces',root);rock=C.empty('Suspended_rock_structure',root);lower=C.empty('Lower_platform_and_water',root)
# Hand-drawn footprint: asymmetric bays, shoulders and a broad front lip.
control=[(-4.7,-1.3),(-3.7,-3.0),(-1.1,-3.55),(1.7,-3.35),(4.15,-2.1),(5.0,-.1),(4.65,1.9),(3.05,3.0),(.8,3.40),(-1.65,3.18),(-3.8,2.45),(-5.15,.7)]
def catmull(a,b,c,d,t):return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)
outline=[]
for i in range(len(control)):
 for j in range(10):
  p=catmull(Vector(control[(i-1)%len(control)]),Vector(control[i]),Vector(control[(i+1)%len(control)]),Vector(control[(i+2)%len(control)]),j/10);outline.append(tuple(p))
N=len(outline)
def height(x,z):
 right=math.exp(-(((x-2.0)/1.65)**2+((z+1.7)/1.45)**2)**2)
 left=math.exp(-(((x+2.3)/1.7)**2+((z+.9)/1.5)**2)**2)
 channel=.07*math.exp(-((x+2.2)/.48)**4)*max(0,min(1,(z-1.2)/.6))
 return .18+right*1.02+left*.48+.035*math.sin(x*.9)*math.cos(z*.8)-channel
v=[(0,height(0,0),0)];f=[];RINGS=34
for row in range(1,RINGS+1):
 t=row/RINGS
 for x,z in outline:v.append((x*t,height(x*t,z*t),z*t))
for j in range(N):f.append((0,1+j,1+(j+1)%N))
for row in range(RINGS-1):
 for j in range(N):a=1+row*N+j;b=1+row*N+(j+1)%N;f.append((a,b,b+N,a+N))
C.mesh('Continuous_multilevel_land_surface',v,f,parent=terrain)
# A separately editable, closed irregular rock shell with deliberately offset facets.
coarse=[outline[i*10] for i in range(len(control))];n=len(coarse);v=[];f=[]
for row,(scale,down,dx,dz) in enumerate([(1.0,.025,0,0),(1.0,-.62,.10,.03),(.78,-1.48,-.12,.03),(.48,-2.35,.12,-.05),(.18,-2.70,.05,0)]):
 for j,(x,z) in enumerate(coarse):
  yy=height(x,z)+down if row==0 else (height(x,z)+down if row==1 else down)+.24*math.sin(j*1.35+row)+.13*math.cos(j*2.05-row)
  v.append((x*scale+dx,yy,z*scale+dz))
for row in range(4):
 for j in range(n):a=row*n+j;b=row*n+(j+1)%n;f.append((a,b,b+n,a+n))
f += [tuple(reversed(range(n))),tuple(4*n+j for j in range(n))]
core=C.mesh('Main_cliff_with_undercut',v,f,parent=rock,smooth=False);C.bevel(core,.18,4)
# Carve a real front-facing grotto into the closed volume.
cutter=C.ellipsoid('Grotto_cutter',(2.35,-1.10,2.45),(.85,.70,1.20));C.difference(core,cutter);C.bevel(core,.055,3)
# Attached, individually shaped rocky shoulders. No repeated ring of spheres.
for name,p,size in [('West_hanging_shoulder',(-3.8,-.72,1.8),(1.3,1.15,1.15)),('East_overhang',(3.9,-.55,.75),(1.1,.88,1.12)),('Rear_rock_buttress',(-1.0,-1.45,-2.35),(1.35,.95,1.03))]:
 x,y,z=p;sx,sy,sz=size;pts=[(x+sx*a,y+sy*b,z+sz*c) for a,b,c in [(-.8,.6,-.65),(.65,.7,-.7),(1,.1,.3),(.45,-.85,.7),(-.45,-1,.35),(-1,-.15,.65),(-.2,.8,.65),(.1,-.5,-.9)]]
 g=bpy.data.meshes.new(name);g.from_pydata([C.V(p) for p in pts],[],[]);g.update();bm=bmesh.new();bm.from_mesh(g);bmesh.ops.convex_hull(bm,input=list(bm.verts),use_existing_faces=False);bm.to_mesh(g);bm.free();o=bpy.data.objects.new(name,g);C.MODEL.objects.link(o);C.finish(o,name,C.CLAY,rock,False);C.normals(o);C.bevel(o,.20,5)
# The lower ledge is attached to the underside and extends forward asymmetrically.
ledge=[(-3.1,2.7),(-2.6,3.85),(-.9,4.4),(1.4,4.2),(2.85,3.4),(2.1,2.55),(.2,2.35),(-1.7,2.4)];n=len(ledge)
v=[(x,y,z) for y in [-2.05,-1.72] for x,z in ledge];f=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
platform=C.mesh('Lower_sculpted_ledge',v,f,parent=lower);C.bevel(platform,.22,6)
# Shallow basin inset in the ledge, not a raised bowl around the whole island.
pool=C.ellipsoid('Pool_recess_cutter',(-1.15,-1.65,3.49),(1.25,.15,.66));C.difference(platform,pool)
C.ellipsoid('Neutral_pool_surface',(-1.15,-1.72,3.49),(1.19,.025,.60),C.LIGHT,lower)
path=[(-2.2,height(-2.2,1.75)+.025,1.75),(-2.2,height(-2.2,2.45)+.025,2.45),(-2.2,height(-2.2,3.1)+.02,3.1),(-2.15,-.12,3.40),(-2.12,-.65,3.62),(-2.07,-1.30,3.69),(-2.00,-1.70,3.66)]
points=[]
for i in range(len(path)-1):
 for j in range(12):points.append(catmull(Vector(path[max(0,i-1)]),Vector(path[i]),Vector(path[i+1]),Vector(path[min(len(path)-1,i+2)]),j/12))
points.append(Vector(path[-1]));v=[];f=[];W=20
for i,p in enumerate(points):
 for j in range(W+1):
  u=j/W-.5;v.append((p.x+u*.82,p.y+.018*math.cos(u*math.pi*12),p.z+.026*math.sin(u*math.pi*10)))
for i in range(len(points)-1):
 for j in range(W):a=i*(W+1)+j;f.append((a,a+1,a+W+2,a+W+1))
flow=C.mesh('Sculpted_waterfall_with_rivulets',v,f,C.LIGHT,lower);mod=flow.modifiers.new('Waterfall volume','SOLIDIFY');mod.thickness=.04;C.apply(flow,mod)
for i,(x,z,s) in enumerate([(-1.65,3.84,.18),(-.96,3.91,.21),(-.32,3.65,.17),(.30,3.42,.20)]):C.ellipsoid('Pool_stepping_stone_'+str(i),(x,-1.68,z),(s,.045,s*.70),parent=lower)
crystals=C.empty('Grotto_crystal_cluster',root)
for i,(x,z,h,r) in enumerate([(1.5,3.2,.78,.17),(1.88,3.1,1.07,.21),(2.25,3.1,.58,.15),(1.95,3.47,.50,.15),(1.28,3.48,.35,.13)]):
 crystal=C.lathe('Faceted_crystal_'+str(i),(x,-1.7,z),[(r,0),(r,h*.73),(r*.75,h*.88),(0,h)],parent=crystals,n=6)
 for face in crystal.data.polygons:face.use_smooth=False
 C.bevel(crystal,.008,2)
C.output('island',{'method':'Authored asymmetric plan boundary; continuous sampled terrace height field; closed offset rock-ring topology with broad beveled facets; actual grotto and pool booleans; individually shaped convex shoulders; Catmull-sampled waterfall with modeled rivulets.','limits':['This is the geology study only; no complete planet or buildings have been assembled.','Rock strata and backside bays are inferred from the small alternate views; individual cliff contours are not a scan of the drawing.','The waterfall is static clay geometry, not an animated fluid simulation.']})
