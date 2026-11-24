"""Create colored, skinned runtime models from approved clay without changing
rest-shape body vertices. Original clay .blend and GLB are never overwritten.
blender -b --factory-startup --python scripts/finish-resident-materials.py -- fern
"""
import bpy,math,json,sys,hashlib
from pathlib import Path
from mathutils import Vector,Matrix
from mathutils.bvhtree import BVHTree
from mathutils.noise import noise
ROOT=Path(__file__).resolve().parents[1];id=sys.argv[sys.argv.index('--')+1]
PALETTE={
'nebula':('#82b6d5','#c1dbeb','#c0d9e6',.50,.18),
'sprout':('#e6d7ae','#fff0cf','#fff0d1',.38,.52),
'fern':('#91b765','#bfd68b','#b4cb7f',.30,.65),
'mushroom':('#e5ca7e','#f4e2a5','#f5df9a',.46,.48),
'aurora':('#8c83c5','#9ad7cb','#aaa7d7',.20,.78),
'blossom':('#ddaabd','#f3ced7','#f1c3ce',.40,.60),
'stardust':('#324a76','#607ca7','#49638d',.32,.58),
'water':('#74bfd9','#c3e7ea','#a5dde8',.10,.90),
'puff':('#e3b99d','#f4dcc6','#f4d8c1',.70,.24)}
assert id in PALETTE
assert id != 'nebula', 'Nebula uses the already approved B runtime asset; do not rebuild it.'
base,accent,belly,rough,transmission=PALETTE[id]
stage=ROOT/'assets/art/clay-stage';bpy.ops.wm.open_mainfile(filepath=str(stage/(id+'.blend')))
body=bpy.data.objects['Body'];oldroot=bpy.data.objects['ClayReview-'+id]
info=json.loads((stage/(id+'-build.json')).read_text());top=info['bodyTop']
def rgb(s):
 def lin(v):return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
 return tuple(lin(int(s[i:i+2],16)/255) for i in (1,3,5))
def mat(name,color,roughness=.5,glow=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb(color),1);m.use_nodes=True;b=m.node_tree.nodes.get('Principled BSDF');b.inputs['Base Color'].default_value=(*rgb(color),1);b.inputs['Roughness'].default_value=roughness;b.inputs['Specular IOR Level'].default_value=.3
 if glow:b.inputs['Emission Color'].default_value=(*rgb(color),1);b.inputs['Emission Strength'].default_value=glow
 return m
skin=mat('SoftSkin-'+id,'#ffffff',rough);bs=skin.node_tree.nodes.get('Principled BSDF');bs.inputs['Subsurface Weight'].default_value=.08;bs.inputs['Transmission Weight'].default_value=transmission;bs.inputs['IOR'].default_value=1.33 if id=='water' else 1.38
colors=body.data.color_attributes.new(name='Col',type='FLOAT_COLOR',domain='POINT')
a=rgb(base);b=rgb(accent);c=rgb(belly)
for i,v in enumerate(body.data.vertices):
 x,y,z=v.co;n=max(.02,min(.80,.24+noise(Vector((x*4+3,y*4,z*4)))*.28));w=math.exp(-((x/.30)**2+((z-top*.49)/.29)**2))*max(0,min(1,(-y-.10)*4))*.32
 colors.data[i].color=(*(a[j]*(1-n)*(1-w)+b[j]*n*(1-w)+c[j]*w for j in range(3)),1)
node=skin.node_tree.nodes.new('ShaderNodeVertexColor');node.layer_name='Col';skin.node_tree.links.new(node.outputs['Color'],bs.inputs['Base Color']);body.data.materials.clear();body.data.materials.append(skin)
leaf=mat('LivingLeaf','#79994f',.60);star=mat('StarWarm','#ffe5a8',.38,.9);petal=mat('RosePetal','#e9aec4',.43,.06);sepal=mat('FlowerSepal','#8da572',.68);aurora=mat('AuroraLeaf','#9bd9c9',.26,.18);horn=mat('CosmicHorn','#8399bb',.38,.08);gold=mat('CosmicGold','#ebca86',.32,.45);stalk=mat('MushroomStem','#e9d8a7',.5,.14);cap=mat('MushroomCap','#f6df96',.4,.45);antenna=mat('AntennaBlue','#9ac8dd',.48);tip=mat('AntennaTip','#c6e7e8',.4,.28);puffmat=mat('DandelionGold','#f4dfba',.7,.42);ink=mat('InkEyes','#222e37',.24);mouth=mat('QuietMouth','#856879',.65)
for o in bpy.context.scene.objects:
 if o.type!='MESH' or o==body:continue
 name=o.name
 material=leaf
 if 'EyeSurface' in name:material=gold if id=='stardust' else ink
 elif name=='Mouth':material=mouth
 elif 'Antenna' in name:material=tip if 'Tip' in name else antenna
 elif id=='sprout':material=star if name=='StarBud' else leaf
 elif id=='mushroom':material=cap if 'Cap' in name else stalk
 elif id=='aurora':material=aurora
 elif id=='blossom':material=star if 'Heart' in name else sepal if 'Sepal' in name else petal
 elif id=='stardust':material=gold if 'Ring' in name else horn
 elif id=='puff':material=puffmat
 o.data.materials.clear();o.data.materials.append(material)
# Species-specific pivots and weights. These are independent of rendering color.
arm_specs={'nebula':(.35,0,.66,.47,-.04,.40),'sprout':(.30,0,.66,.45,-.04,.55),'fern':(.40,0,.46,.58,-.07,.27),'mushroom':(.36,-.13,.54,.31,-.34,.43),'aurora':(.30,0,.66,.46,-.04,.50),'blossom':(.30,-.12,.59,.15,-.37,.54),'stardust':(.43,0,.69,.56,-.04,.38),'water':(.32,0,.49,.49,-.055,.63),'puff':(.40,-.01,.43,.51,-.04,.33)}
arm=arm_specs[id];foot_x={'fern':.30,'mushroom':.26,'stardust':.29,'puff':.24}.get(id,.21)
armdata=bpy.data.armatures.new('ResidentSkeleton-'+id);rig=bpy.data.objects.new('CharacterRoot',armdata);bpy.context.collection.objects.link(rig);bpy.ops.object.select_all(action='DESELECT');bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,head,tail,parent=None):
 o=armdata.edit_bones.new(name);o.head=head;o.tail=tail
 if parent:o.parent=armdata.edit_bones[parent]
bone('MotionRoot',(0,0,0),(0,0,.18));bone('BodyControl',(0,0,.27),(0,0,top),'MotionRoot')
for sign,label in [(-1,'Left'),(1,'Right')]:
 h=(sign*arm[0],arm[1],arm[2]);t=(sign*arm[3],arm[4],arm[5])
 if id=='aurora' and sign<0:t=(-.48,-.055,.87)
 bone(label+'Arm',h,t,'BodyControl');bone(label+'Leg',(sign*foot_x,0,.27),(sign*foot_x,-.04,.065),'MotionRoot')
if id=='water':bone('LiquidTip',(0,0,.95),(.20,0,1.43),'BodyControl')
bpy.ops.object.mode_set(mode='OBJECT')
# All attached facial organs/crowns inherit BodyControl through one preserved root.
bpy.context.view_layer.update();world=oldroot.matrix_world.copy();oldroot.parent=rig;oldroot.parent_type='BONE';oldroot.parent_bone='BodyControl';oldroot.matrix_world=world
body.parent=rig;body.matrix_parent_inverse=Matrix.Identity(4);body.matrix_world=Matrix.Identity(4)
mod=body.modifiers.new('ResidentSoftRig','ARMATURE');mod.object=rig
names=['BodyControl','LeftArm','RightArm','LeftLeg','RightLeg']+(['LiquidTip'] if id=='water' else []);groups={n:body.vertex_groups.new(name=n) for n in names}
def smoothstep(a,b,x):
 t=max(0,min(1,(x-a)/(b-a)));return t*t*(3-2*t)
for v in body.data.vertices:
 x,y,z=v.co
 if id in ['blossom','mushroom']:
  wa=smoothstep(.16,.31,abs(x))*smoothstep(.10,.29,-y)*math.exp(-((z-arm[5])/.17)**4)*.85
 else:wa=smoothstep(arm[0]-.02,arm[3]+.02,abs(x))*math.exp(-((z-arm[5])/.23)**4)*.90
 wl=(1-smoothstep(.12,.28,z))*smoothstep(.05,.16,abs(x))*.94
 wt=smoothstep(.95,1.23,z)*.9 if id=='water' else 0
 total=wa+wl+wt
 if total>.98:wa*=.98/total;wl*=.98/total;wt*=.98/total
 for name,w in [('BodyControl',1-wa-wl-wt),('LeftArm' if x<0 else 'RightArm',wa),('LeftLeg' if x<0 else 'RightLeg',wl)]+([('LiquidTip',wt)] if id=='water' else []):groups[name].add([v.index],w,'REPLACE')
# Seat corrective on the same surface: bend toes forward and support the belly.
body.shape_key_add(name='Basis');seated=body.shape_key_add(name='Seated')
for v in body.data.vertices:
 weights={g.group:g.weight for g in v.groups};p=v.co.copy()
 for sign,label in [(-1,'Left'),(1,'Right')]:
  weight=weights.get(groups[label+'Leg'].index,0);pivot=Vector((sign*foot_x,0,.27));p+=(Matrix.Rotation(-.65,3,'X')@(v.co-pivot)+pivot-v.co)*weight
 support=math.exp(-((p.x/.20)**4+(p.y/.22)**4));p.z+=max(0,.14-p.z)*support;seated.data[v.index].co=p
# Required semantic markers for shared controller; actual cheek patches conform
# to each unique body rather than being floating ellipsoids.
def marker(name,at):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=oldroot;o.location=at;return o
marker('Belly',(0,-.32,.45))
for label in ['Left','Right']:
 if not bpy.data.objects.get(label+'Antenna'):marker(label+'Antenna',(0,0,top))
bvh=BVHTree.FromPolygons([v.co.copy() for v in body.data.vertices],[list(p.vertices) for p in body.data.polygons])
cheekmat=mat('SoftCheeks','#b5c291' if id=='fern' else '#d6a5ae',.9)
for sign,label in [(-1,'Left'),(1,'Right')]:
 centerx=sign*(info['face']['spacing']+.07);centerz=info['face']['z']-.075;verts=[];faces=[]
 for i in range(25):
  a=math.tau*i/24;x=centerx+math.cos(a)*.043;z=centerz+math.sin(a)*.021;p,n,_,_=bvh.ray_cast(Vector((x,-1,z)),Vector((0,1,0)))
  if p is None:raise RuntimeError('Cheek projection missed')
  verts.append(tuple(p+n*.003))
 p,n,_,_=bvh.ray_cast(Vector((centerx,-1,centerz)),Vector((0,1,0)));verts.append(tuple(p+n*.004))
 for i in range(24):faces.append((25,i,i+1))
 me=bpy.data.meshes.new(label+'Cheek');me.from_pydata(verts,[],faces);me.update();o=bpy.data.objects.new(label+'Cheek',me);bpy.context.collection.objects.link(o);o.parent=oldroot;me.materials.append(cheekmat)
rig['resident']=id;rig['art_version']='approved-sdf-color-v1';rig['animation']='Existing procedural controller, no added clips'
# Runtime continues to use the existing procedural controller; no new clips.
out=ROOT/'public/models/residents';source=ROOT/'assets/art/residents-final';out.mkdir(parents=True,exist_ok=True);source.mkdir(parents=True,exist_ok=True)
bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(source/(id+'.blend')))
bpy.ops.export_scene.gltf(filepath=str(out/(id+'.glb')),export_format='GLB',export_yup=True,export_animations=False,export_skins=True,export_morph=True,export_morph_normal=True,export_extras=True)
report={'id':id,'sourceClaySHA256':hashlib.sha256((stage/(id+'.glb')).read_bytes()).hexdigest(),'restBodyVertices':len(body.data.vertices),'restBodyTriangles':len(body.data.polygons),'bones':list(armdata.bones.keys()),'shapeKeys':['Basis','Seated'],'portableClips':[],'color':base,'roughness':rough,'transmission':transmission,'geometryUnchangedFromApprovedClay':True}
(source/(id+'-build.json')).write_text(json.dumps(report,indent=2)+'\n');print('COLORED_RESIDENT',json.dumps(report))
