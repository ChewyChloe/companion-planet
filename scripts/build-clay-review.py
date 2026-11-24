"""Import true implicit surfaces and author clay-only facial/crown geometry.
No cross-section torso, Subdivision modifier, textures, rigs or animation.
blender -b --factory-startup --python scripts/build-clay-review.py -- nebula
"""
import bpy, math, json, sys, bmesh
import numpy as np
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
ROOT=Path(__file__).resolve().parents[1];OUT=ROOT/'assets/art/clay-stage'
resident=sys.argv[sys.argv.index('--')+1]
if resident in ['nebula','fern','mushroom'] and (OUT/(resident+'.glb')).exists() and '--rebuild-approved' not in sys.argv:raise SystemExit('Approved sculpture protected: '+resident)
assert resident in ['nebula','sprout','fern','mushroom','aurora','blossom','stardust','water','puff']
info=json.loads((OUT/(resident+'-field.json')).read_text());surface=np.load(OUT/(resident+'-surface.npz'))
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def material(name,color,rough=.82):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*color,1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Specular IOR Level'].default_value=.23;return m
clay=material('NeutralClay',(.42,.45,.47));ink=material('ClayFace',(.10,.12,.14),.65)
def empty(name,parent=None,at=(0,0,0)):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;o.location=at;return o
root=empty('ClayReview-'+resident)
me=bpy.data.meshes.new('ImplicitBody-'+resident);me.from_pydata(surface['vertices'].tolist(),[],surface['faces'].tolist());me.update()
body=bpy.data.objects.new('Body',me);bpy.context.collection.objects.link(body);body.parent=root;me.materials.append(clay)
# Normals only express the extracted surface. They are not used to hide a
# stepped input mesh; the continuous field defines the geometry itself.
for p in me.polygons:p.use_smooth=True
# Marching cubes orientation is checked and corrected for export.
bm=bmesh.new();bm.from_mesh(me);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(me);bm.free()
bpy.context.view_layer.objects.active=body;body.select_set(True)
mod=body.modifiers.new('RealtimeTriangleBudget','DECIMATE');mod.ratio=.48;bpy.ops.object.modifier_apply(modifier=mod.name)
bvh=BVHTree.FromPolygons([v.co.copy() for v in me.vertices],[list(p.vertices) for p in me.polygons])
def front(x,z):
 p,n,_,_=bvh.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
 if p is None:raise RuntimeError('Face does not meet body')
 return p,n
face=info['face']
def ellipsoid(name,at,radii,parent=root,mat=clay):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,location=(0,0,0));o=bpy.context.object;o.name=name;o.parent=parent;o.location=at;o.scale=radii;o.data.materials.append(mat)
 for p in o.data.polygons:p.use_smooth=True
 return o
def curve(name,points,radius,parent,mat=clay,radii=None):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.resolution_u=20;c.bevel_depth=radius;c.bevel_resolution=5;c.use_fill_caps=True
 s=c.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for i,(bp,co) in enumerate(zip(s.bezier_points,points)):
  bp.co=co;bp.handle_left_type='AUTO';bp.handle_right_type='AUTO';bp.radius=radii[i] if radii else 1
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.parent=parent;c.materials.append(mat);return o
for side,label in [(-1,'Left'),(1,'Right')]:
 p,n=front(side*face['spacing'],face['z']);pivot=empty(label+'Eye',root,tuple(p+n*.009));eye=ellipsoid(label+'EyeSurface',(0,0,0),(face['eye'],.021,face['eye']*1.18),pivot,ink);eye.rotation_mode='QUATERNION';eye.rotation_quaternion=Vector((0,-1,0)).rotation_difference(n)
points=[]
for x,z in [(-.028,face['z']-.095),(0,face['z']-.105),(.028,face['z']-.095)]:
 p,n=front(x,z);points.append(tuple(p+n*.007))
curve('Mouth',points,.0045,root,ink)
height=info['bodyTop'];crown=empty('Crown-'+resident,root,(0,0,height-.045))
if resident=='nebula':
 for side,label in [(-1,'Left'),(1,'Right')]:
  p=empty(label+'Antenna',crown,(side*.155,0,-.035))
  length=.23 if side<0 else .31;end=(side*(.12 if side<0 else .065),-.01,length)
  curve(label+'AntennaSurface',[(0,0,-.03),(side*.025,0,length*.50),end],.027,p,radii=[1.7,1,.95])
  tip=ellipsoid(label+'AntennaTip',end,(.044,.042,.067),p);tip.rotation_euler.y=side*.4
if resident=='fern':
 def leaf(name,parent,length,width,angle):
  vs=[];fs=[];rows=20;cols=24
  for i in range(rows+1):
   t=i/rows;w=width*(math.sin(math.pi*t)**.75)
   for j in range(cols):
    a=math.tau*j/cols;vs.append((w*math.cos(a),.017*math.sin(math.pi*t)*math.sin(a)-.065*t*t,length*t))
  for i in range(rows):
   for j in range(cols):a=i*cols+j;b=i*cols+(j+1)%cols;fs.append((a,b,b+cols,a+cols))
  me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.parent=parent;o.rotation_euler.y=angle;me.materials.append(clay)
  for p in me.polygons:p.use_smooth=True
  return o
 for branch in range(5):
  pivot=empty('FernFrond'+str(branch),crown);pivot.rotation_euler.y=(branch-2)*.37;pivot.rotation_euler.z=(branch%2)*.4;length=.48-abs(branch-2)*.045
  curve('FernStem'+str(branch),[(0,0,-.03),(0,0,length*.48),(.02,-.04,length)],.011,pivot)
  for i in range(6):
   for side in [-1,1]:
    lp=empty('FernPinna',pivot,(0,-.006,.06+i*.055));leaf('FernLamina',lp,.14-i*.012,.031-i*.002,side*1.05)
  leaf('FernTip',empty('FernTipControl',pivot,(.015,-.025,length-.08)),.12,.023,0)
if resident=='mushroom':
 for i,(x,h,r) in enumerate([(-.19,.16,.115),(0,.32,.17),(.20,.21,.125)]):
  pivot=empty('Mushroom'+str(i),crown,(x,0,-.02));pivot.rotation_euler.y=x*.7
  curve('MushroomStem'+str(i),[(0,0,-.025),(0,0,h*.5),(.01,0,h)],.026,pivot)
  # Spherical cap with a rolled, thick rim; no cone or stacked body layers.
  vs=[];fs=[];rings=30;sides=64
  for k in range(rings+1):
   a=math.pi*k/rings
   for j in range(sides):
    theta=math.tau*j/sides
    rr=r*math.sin(a);z=h+.10*math.cos(a)
    if a>math.pi/2:z=h+.025*math.cos(a)
    vs.append((rr*math.cos(theta),rr*math.sin(theta),z))
  for k in range(rings):
   for j in range(sides):a=k*sides+j;b=k*sides+(j+1)%sides;fs.append((a,b,b+sides,a+sides))
  me=bpy.data.meshes.new('MushroomCap');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('MushroomCap'+str(i),me);bpy.context.collection.objects.link(o);o.parent=pivot;me.materials.append(clay)
  for p in me.polygons:p.use_smooth=True
# Shared organ construction helpers. The body of each creature is already an
# independently authored implicit surface; these helpers only build head organs.
def organ_leaf(name,parent,length,width,angle=0,thickness=.020):
 vs=[];fs=[];rows=24;cols=24
 for i in range(rows+1):
  t=i/rows;w=width*(math.sin(math.pi*t)**.72)
  for j in range(cols):
   a=math.tau*j/cols;vs.append((w*math.cos(a),thickness*math.sin(math.pi*t)*math.sin(a)-.075*t*t,length*t))
 for i in range(rows):
  for j in range(cols):a=i*cols+j;b=i*cols+(j+1)%cols;fs.append((a,b,b+cols,a+cols))
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);o.parent=parent;o.rotation_euler.y=angle;me.materials.append(clay)
 for p in me.polygons:p.use_smooth=True
 return o
if resident=='sprout':
 stem=empty('StarStem',crown)
 curve('StarStemSurface',[(0,0,-.03),(0,0,.15),(.045,0,.30)],.017,stem,radii=[1.3,1,.8])
 for sign in [-1,1]:
  pivot=empty('StarLeaf'+str(sign),stem,(0,0,.09));organ_leaf('StarLeafSurface',pivot,.22,.065,sign*.95)
 pivot=empty('StarGlow',stem,(.045,0,.36))
 vs=[]
 for y in [-.03,.03]:
  for i in range(10):
   a=math.pi/2+i*math.pi/5;r=.13 if i%2==0 else .068;vs.append((r*math.cos(a),y,r*math.sin(a)))
 fs=[tuple(reversed(range(10))),tuple(range(10,20))]+[(i,(i+1)%10,(i+1)%10+10,i+10) for i in range(10)]
 me=bpy.data.meshes.new('StarBud');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('StarBud',me);bpy.context.collection.objects.link(o);o.parent=pivot;me.materials.append(clay)
 bevel=o.modifiers.new('RoundedStarCorners','BEVEL');bevel.width=.015;bevel.segments=4;bpy.context.view_layer.objects.active=o;bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.ops.object.modifier_apply(modifier=bevel.name)
 for p in o.data.polygons:p.use_smooth=True
if resident=='aurora':
 crown.location.x=float(surface['vertices'][np.argmax(surface['vertices'][:,2]),0])
 stem=empty('AuroraStem',crown);curve('AuroraStemSurface',[(0,0,-.025),(0,0,.09),(.025,0,.14)],.018,stem)
 for sign in [-1,1]:
  pivot=empty('AuroraLeaf'+str(sign),stem,(0,0,.07));pivot.rotation_euler.z=sign*.20
  organ_leaf('AuroraLeafSurface',pivot,.33 if sign>0 else .27,.105 if sign>0 else .085,sign*.83,.028)
if resident=='blossom':
 ellipsoid('FlowerHeart',(0,0,.18),(.065,.065,.08),crown)
 for i in range(5):
  a=math.tau*i/5;pivot=empty('PetalControl'+str(i),crown,(math.sin(a)*.045,math.cos(a)*.045,.015));pivot.rotation_euler.z=-a;pivot.rotation_euler.x=-.18
  petal=organ_leaf('BudPetal'+str(i),pivot,.32,.115,0,.032)
 for sign in [-1,1]:organ_leaf('Sepal'+str(sign),crown,.16,.055,sign*1.15)
if resident=='stardust':
 for sign in [-1,1]:
  pivot=empty('StarHorn'+str(sign),crown,(sign*.23,0,-.025))
  curve('CurvedHorn'+str(sign),[(0,0,-.015),(sign*.025,0,.09),(-sign*.06,0,.18),(-sign*.025,0,.26),(sign*.02,0,.285)],.040,pivot,radii=[1.5,1.2,.9,.6,.1])
  for k in range(2):
   bpy.ops.mesh.primitive_torus_add(major_radius=.052-k*.008,minor_radius=.004,major_segments=32,minor_segments=6,location=(0,0,0));o=bpy.context.object;o.name='HornStarRing';o.parent=pivot;o.location=(0,0,.065+k*.115);o.rotation_euler.y=sign*.22;o.data.materials.append(clay)
if resident=='water':
 # The full liquid tip is continuous Body geometry. No leaf or bulb added.
 crown['note']='Liquid tip belongs to Body; this marker is reserved for later controls.'
 empty('LiquidTipControl',crown)
if resident=='puff':
 stem=empty('DandelionStem',crown);curve('DandelionStemSurface',[(0,0,-.02),(0,0,.13),(.025,0,.25)],.014,stem)
 head=empty('DandelionHead',stem,(.025,0,.25));ellipsoid('DandelionCore',(0,0,0),(.06,.06,.06),head)
 vs=[];fs=[]
 def filament(start,end,radius=.0018):
  a=Vector(start);b=Vector(end);d=(b-a).normalized();u=d.cross(Vector((0,0,1)))
  if u.length<.001:u=d.cross(Vector((0,1,0)))
  u.normalize();v=d.cross(u);index=len(vs)
  for p in [a,b]:
   for k in range(4):vs.append(tuple(p+radius*(u*math.cos(k*math.pi/2)+v*math.sin(k*math.pi/2))))
  for k in range(4):fs.append((index+k,index+(k+1)%4,index+(k+1)%4+4,index+k+4))
  fs.append(tuple(index+k for k in reversed(range(4))));fs.append(tuple(index+4+k for k in range(4)))
 for i in range(144):
  zz=1-2*(i+.5)/144;rr=math.sqrt(1-zz*zz);a=i*2.399963;d=Vector((rr*math.cos(a),rr*math.sin(a),zz));end=d*.205
  filament(d*.04,end)
  u=d.cross(Vector((0,0,1))).normalized();v=d.cross(u)
  for k in range(5):filament(end,end+d*.02+(u*math.cos(k*math.tau/5)+v*math.sin(k*math.tau/5))*.024,.0012)
 me=bpy.data.meshes.new('DandelionSeedFilaments');me.from_pydata(vs,[],fs);me.update();o=bpy.data.objects.new('DandelionSeedFilaments',me);bpy.context.collection.objects.link(o);o.parent=head;me.materials.append(clay)
 for p in me.polygons:p.use_smooth=True

# Convert curves to editable meshes for ordinary glTF viewers.
for o in list(bpy.context.scene.objects):
 if o.type=='CURVE':
  bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH')
bm=bmesh.new();bm.from_mesh(body.data);unseen=set(bm.verts);components=0
while unseen:
 components+=1;todo=[unseen.pop()]
 while todo:
  v=todo.pop()
  for edge in v.link_edges:
   other=edge.other_vert(v)
   if other in unseen:unseen.remove(other);todo.append(other)
info.update(bodyComponents=components,nonManifoldEdges=sum(not e.is_manifold for e in bm.edges),exportedBodyTriangles=len(body.data.polygons));bm.free()
assert info['bodyComponents']==1 and info['nonManifoldEdges']==0,info
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(resident+'.blend')))
bpy.ops.export_scene.gltf(filepath=str(OUT/(resident+'.glb')),export_format='GLB',export_yup=True,export_animations=False,export_extras=True)
(OUT/(resident+'-build.json')).write_text(json.dumps(info,indent=2)+'\n');print('CLAY_BUILD',json.dumps(info))
