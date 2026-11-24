"""Build an editable, continuous skinned sculpture; no downloaded model assets.
Run: blender -b --factory-startup --python scripts/build-character.py
Blender Z-up / -Y front is exported to glTF Y-up / +Z front.
"""
import bpy, math, json
from pathlib import Path
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.noise import noise
ROOT=Path(__file__).resolve().parents[1]
cfg=json.loads((ROOT/'assets/art/character-look.json').read_text())
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def linear(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def rgb(value):return tuple(linear(int(value[i:i+2],16)/255) for i in (1,3,5))
def mat(name,color,rough=.5):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb(color),1);m.use_nodes=True
 bs=m.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(*rgb(color),1);bs.inputs['Roughness'].default_value=rough;bs.inputs['Specular IOR Level'].default_value=.25
 return m
skin=mat('NebulaSkin','#8bbbd4',cfg['surfaceRoughness']);eye_mat=mat('InkEyes','#273d50',.24);cheek_mat=mat('SoftCheeks','#b8b6c6',.8);mouth_mat=mat('QuietMouth','#587e95',.62)
antenna_skin=mat('AntennaSkin','#96bfd6',cfg['surfaceRoughness'])
parts=[]
def ellipsoid(name,location,scale,material=None,segments=40,rings=24):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=location);o=bpy.context.object;o.name=name;o.scale=scale;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 if material:o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 return o
roundness=cfg['bodyRoundness'];depth=cfg['bodyDepth']
parts.append(ellipsoid('SculptMain',(0,.015,.70),(.48+.025*roundness,.37*depth,.55)))
parts.append(ellipsoid('SculptLower',(0,-.015,.42),(.46,.36*depth,.32)))
arm=cfg['armLength'];leg=cfg['legLength']
for side in (-1,1):
 parts.append(ellipsoid('ArmBlend',(side*(.42+arm*.20),-.045,.53),(.135,.17,.18)))
 parts.append(ellipsoid('ArmTip',(side*(.44+arm*.5),-.09,.425),(.105,.14,.135)))
 parts.append(ellipsoid('LegBlend',(side*.22,-.005,leg*.82),(.125,.16,leg*.85)))
 parts.append(ellipsoid('FootBlend',(side*.22,-.065,.075),(.13,.17,.075)))
bpy.ops.object.select_all(action='DESELECT')
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();body=bpy.context.object;body.name='Body'
remesh=body.modifiers.new('ContinuousSculpt','REMESH');remesh.mode='VOXEL';remesh.voxel_size=.018;remesh.use_smooth_shade=True;bpy.ops.object.modifier_apply(modifier=remesh.name)
smooth=body.modifiers.new('SculptRelax','SMOOTH');smooth.factor=.9;smooth.iterations=10;bpy.ops.object.modifier_apply(modifier=smooth.name)
decimate=body.modifiers.new('MobileTopology','DECIMATE');decimate.ratio=.55;bpy.ops.object.modifier_apply(modifier=decimate.name)
for v in body.data.vertices:
 if v.co.z<.04:v.co.z=.023+(v.co.z-.023)*.3
for p in body.data.polygons:p.use_smooth=True
body.data.materials.clear();body.data.materials.append(skin)
colors=body.data.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT')
base=rgb('#6997be');cloud=rgb('#b5d5e7');belly=rgb('#b4d0e0')
for i,v in enumerate(body.data.vertices):
 x,y,z=v.co;neb=max(.05,min(.90,.48+noise(Vector((x*4.5+3,y*4.5,z*4.5)))*.47+noise(Vector((x*13,y*13+5,z*13)))*.16))
 w=math.exp(-((x/.28)**2+((z-.52)/.28)**2))*max(0,min(1,(-y-.12)*6))*.28
 colors.data[i].color=(*(base[j]*(1-neb)*(1-w)+cloud[j]*neb*(1-w)+belly[j]*w for j in range(3)),1)
vertex_node=skin.node_tree.nodes.new('ShaderNodeVertexColor');vertex_node.layer_name='Col';skin.node_tree.links.new(vertex_node.outputs['Color'],skin.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
bpy.ops.object.select_all(action='DESELECT');armdata=bpy.data.armatures.new('NebulaSkeleton');rig=bpy.data.objects.new('CharacterRoot',armdata);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
 b=armdata.edit_bones.new(name);b.head=head;b.tail=tail
 if parent:b.parent=armdata.edit_bones[parent]
 return b
bone('MotionRoot',(0,0,0),(0,0,.2));bone('BodyControl',(0,0,.28),(0,0,1.25),'MotionRoot')
for side,label in [(-1,'Left'),(1,'Right')]:
 bone(label+'Arm',(side*.40,0,.58),(side*.57,-.1,.36),'BodyControl')
 bone(label+'Leg',(side*.19,0,.31),(side*.21,-.04,.055),'MotionRoot')
bpy.ops.object.mode_set(mode='OBJECT');body.parent=rig;mod=body.modifiers.new('SoftSkinRig','ARMATURE');mod.object=rig
names=['BodyControl','LeftArm','RightArm','LeftLeg','RightLeg'];groups={n:body.vertex_groups.new(name=n) for n in names}
def smoothstep(a,b,v):
 t=max(0,min(1,(v-a)/(b-a)));return t*t*(3-2*t)
for v in body.data.vertices:
 x,y,z=v.co;wa=smoothstep(.40,.58,abs(x))*math.exp(-((z-.48)/.23)**4)*.98
 wl=(1-smoothstep(.17,.36,z))*smoothstep(.035,.16,abs(x))*.98
 if wa+wl>1:wl=1-wa
 groups['LeftArm' if x<0 else 'RightArm'].add([v.index],wa,'REPLACE');groups['LeftLeg' if x<0 else 'RightLeg'].add([v.index],wl,'REPLACE');groups['BodyControl'].add([v.index],1-wa-wl,'REPLACE')
# Authored seated corrective: smooth the bent-leg silhouette and compress the
# underside against the seat, rather than asking linear skinning to bend 70 deg.
body.shape_key_add(name='Basis')
seated=body.shape_key_add(name='Seated')
original=[v.co.copy() for v in body.data.vertices]
positions=[]
for v in body.data.vertices:
 weights={g.group:g.weight for g in v.groups}
 point=v.co.copy()
 for side,label in [(-1,'Left'),(1,'Right')]:
  weight=weights.get(groups[label+'Leg'].index,0)
  pivot=Vector((side*.19,0,.31))
  point+=(Matrix.Rotation(-.7,3,'X')@(v.co-pivot)+pivot-v.co)*weight
 positions.append(point)
neighbors=[set() for _ in positions]
for edge in body.data.edges:
 a,b=edge.vertices;neighbors[a].add(b);neighbors[b].add(a)
for _ in range(8):
 relaxed=[]
 for i,p in enumerate(positions):
  amount=.35*(1-smoothstep(.27,.48,original[i].z))
  average=sum((positions[j] for j in neighbors[i]),Vector())/max(1,len(neighbors[i]))
  relaxed.append(p.lerp(average,amount))
 positions=relaxed
for i,p in enumerate(positions):
 support=math.exp(-((p.x/.16)**4+(p.y/.19)**4))
 p.z+=max(0,.14-p.z)*support
 seated.data[i].co=p

def parent_body(o):
 bpy.context.view_layer.update();m=o.matrix_world.copy();o.parent=rig;o.parent_type='BONE';o.parent_bone='BodyControl';o.matrix_world=m;return o
def empty(name,location):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.location=location;return o
# The Belly marker locates a vertex-painted region of the same continuous skin.
parent_body(empty('Belly',(0,-.32,.52)))
bvh=BVHTree.FromPolygons([v.co.copy() for v in body.data.vertices],[list(p.vertices) for p in body.data.polygons])
def surface(x,z):
 hit,normal,_,_=bvh.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
 if hit is None:raise RuntimeError('Face projection missed sculpture')
 return hit,normal
for side,label in [(-1,'Left'),(1,'Right')]:
 p,n=surface(side*.15,.91);pivot=empty(label+'Eye',p+n*.008);parent_body(pivot)
 eyeball=ellipsoid(label+'EyeSurface',(0,0,0),(.031,.018,.044),eye_mat,32,20);eyeball.parent=pivot;eyeball.matrix_parent_inverse=Matrix.Identity(4);eyeball.location=(0,0,0)
 eyeball.rotation_mode='QUATERNION';eyeball.rotation_quaternion=Vector((0,-1,0)).rotation_difference(n)
 glint=ellipsoid(label+'EyeGlint',(0,0,0),(.007,.004,.009),mat(label+'Glint','#dce6e8',.3),12,8);glint.parent=pivot;glint.matrix_parent_inverse=Matrix.Identity(4);glint.location=(side*-.008,-.021,.015)
 # Cheeks conform to the actual remeshed face instead of floating ellipsoids.
 verts=[];faces=[]
 for i in range(25):
  a=2*math.pi*i/24;px=side*.255+math.cos(a)*.05;pz=.805+math.sin(a)*.022;pos,norm=surface(px,pz);verts.append(tuple(pos+norm*.003))
 center,norm=surface(side*.255,.805);verts.append(tuple(center+norm*.004))
 for i in range(24):faces.append((25,i,i+1))
 mesh=bpy.data.meshes.new(label+'CheekSurface');mesh.from_pydata(verts,[],faces);mesh.update();cheek=bpy.data.objects.new(label+'Cheek',mesh);bpy.context.collection.objects.link(cheek);mesh.materials.append(cheek_mat);parent_body(cheek)
 # Short bent antenna; blue spherical ends, no leaf/ear additions.
 basepoint=Vector((side*.16,.015,1.17));pivot=empty(label+'Antenna',basepoint);parent_body(pivot)
 curve=bpy.data.curves.new(label+'AntennaCurve','CURVE');curve.dimensions='3D';curve.resolution_u=16;curve.bevel_depth=.024;curve.bevel_resolution=4
 spline=curve.splines.new('BEZIER');spline.bezier_points.add(2)
 curvature=cfg['antennaCurvature']
 for bp,co in zip(spline.bezier_points,[(0,0,-.035),(side*.025*curvature,.015,.115),(side*.095*curvature,-.005,.24)]):bp.co=co;bp.handle_left_type='AUTO';bp.handle_right_type='AUTO'
 stem=bpy.data.objects.new(label+'AntennaSurface',curve);bpy.context.collection.objects.link(stem);stem.parent=pivot;stem.location=(0,0,0);curve.materials.append(antenna_skin)
 tip=ellipsoid(label+'AntennaTip',(0,0,0),(.044,.039,.074),antenna_skin,24,16);tip.parent=pivot;tip.matrix_parent_inverse=Matrix.Identity(4);tip.location=(side*.095*curvature,-.005,.24);tip.rotation_euler.y=side*.3
# Tiny curve smile projected on the face.
curve=bpy.data.curves.new('MouthSurface','CURVE');curve.dimensions='3D';curve.bevel_depth=.005;curve.bevel_resolution=3;spline=curve.splines.new('BEZIER');spline.bezier_points.add(2)
for bp,(x,z) in zip(spline.bezier_points,[(-.032,.785),(0,.773),(.032,.785)]):
 pos,n=surface(x,z);bp.co=pos+n*.005;bp.handle_left_type='AUTO';bp.handle_right_type='AUTO'
mouth=bpy.data.objects.new('Mouth',curve);bpy.context.collection.objects.link(mouth);curve.materials.append(mouth_mat);parent_body(mouth)
rig['art_version']='sculpt-v1';rig['axis']='glTF Y-up, +Z front';rig['animation']='Procedural bone blending in src/art/character-animation.ts'
for o in bpy.context.scene.objects:
 if o.type=='MESH':
  for face in o.data.polygons:face.use_smooth=True
out=ROOT/'public/models';out.mkdir(parents=True,exist_ok=True);(ROOT/'assets/art').mkdir(parents=True,exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'assets/art/nebula-sculpt.blend'))
bpy.ops.export_scene.gltf(filepath=str(out/'nebula-sculpt.glb'),export_format='GLB',export_yup=True,export_animations=False,export_skins=True,export_morph=True,export_morph_normal=True,export_extras=True)
band=[v.co for v in body.data.vertices if .78<v.co.z<.88]
torso_width=max(v.x for v in band)-min(v.x for v in band)
torso_depth=max(v.y for v in band)-min(v.y for v in band)
report={'bodyVertices':len(body.data.vertices),'bodyTriangles':sum(len(p.vertices)-2 for p in body.data.polygons),'continuousSkin':True,'torsoWidth':torso_width,'torsoDepth':torso_depth,'torsoDepthToWidth':torso_depth/torso_width,'shapeKeys':['Basis','Seated'],'bones':list(armdata.bones.keys()),'requiredNodes':['CharacterRoot','Body','Belly','LeftEye','RightEye','Mouth','LeftCheek','RightCheek','LeftAntenna','RightAntenna','LeftArm','RightArm','LeftLeg','RightLeg'],'sourceConfig':cfg}
(ROOT/'assets/art/model-build.json').write_text(json.dumps(report,indent=2)+'\n');print('ART_BUILD',json.dumps(report))
