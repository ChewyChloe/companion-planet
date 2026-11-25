"""Neutral-gray asset-study tools. No website or production assets are touched."""
import bpy,bmesh,math,json
from mathutils import Vector
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
TAU=math.tau
MODEL=None;GUIDES=None;CLAY=None;INSET=None;LIGHT=None
# Authored controls use (x,height,z), converted once into Blender coordinates.
def V(p):return Vector((p[0],-p[2],p[1]))
def setup(name):
 global MODEL,GUIDES,CLAY,INSET,LIGHT
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.preferences.filepaths.save_version=0
 MODEL=bpy.data.collections.new('MODEL_'+name);bpy.context.scene.collection.children.link(MODEL)
 GUIDES=bpy.data.collections.new('Construction_guides');bpy.context.scene.collection.children.link(GUIDES);GUIDES.hide_render=True;GUIDES.hide_viewport=True
 def mat(n,rgb):
  m=bpy.data.materials.new(n);m.diffuse_color=(*rgb,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Roughness'].default_value=.78;return m
 CLAY=mat('Neutral clay',(.48,.46,.51));INSET=mat('Neutral inset',(.28,.27,.31));LIGHT=mat('Neutral edge clay',(.56,.54,.59))
 source=ROOT/'assets/art/planet-rebuild/references/companion-planet/同頻星球.png'
 im=bpy.data.images.load(str(source));im.name='SOURCE_同頻星球_1536x1024';im.use_fake_user=True;im.pack()
 bpy.context.scene.unit_settings.system='METRIC';return empty(name+'_Root')
def move(o,collection):
 for c in list(o.users_collection):c.objects.unlink(o)
 collection.objects.link(o)
def finish(o,name,material=None,parent=None,smooth=True):
 o.name=name;move(o,MODEL)
 if material is not None:o.data.materials.append(material)
 if o.type=='MESH':
  for f in o.data.polygons:f.use_smooth=smooth
 if parent is not None:parent_keep(o,parent)
 return o
def parent_keep(o,p):w=o.matrix_world.copy();o.parent=p;o.matrix_world=w

def empty(name,parent=None):
 o=bpy.data.objects.new(name,None);MODEL.objects.link(o)
 if parent:parent_keep(o,parent)
 return o

def normals(o):
 bm=bmesh.new();bm.from_mesh(o.data);bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces));bm.to_mesh(o.data);bm.free();o.data.update()
def mesh(name,verts,faces,material=None,parent=None,smooth=True):
 g=bpy.data.meshes.new(name+'_Mesh');g.from_pydata([V(p) for p in verts],[],faces);g.update();o=bpy.data.objects.new(name,g);MODEL.objects.link(o);normals(o)
 return finish(o,name,material or CLAY,parent,smooth)
def apply(o,mod):bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.modifier_apply(modifier=mod.name)
def bevel(o,width=.06,segments=3):
 mod=o.modifiers.new('Rounded authored edges','BEVEL');mod.width=width;mod.segments=segments;mod.limit_method='ANGLE';mod.angle_limit=.35;apply(o,mod)
 return o
def box(name,p,size,material=None,parent=None,r=.04):
 bpy.ops.mesh.primitive_cube_add(size=1,location=V(p));o=bpy.context.object;o.scale=(size[0],size[2],size[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);bevel(o,r,4)
 return finish(o,name,material or CLAY,parent)
def ellipsoid(name,p,scale,material=None,parent=None):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=20,radius=1,location=V(p));o=bpy.context.object;o.scale=(scale[0],scale[2],scale[1]);bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 return finish(o,name,material or CLAY,parent)
def curve(name,points,r,radii=None,material=None,parent=None):
 g=bpy.data.curves.new(name+'_Curve','CURVE');g.dimensions='3D';g.resolution_u=12;g.bevel_depth=r;g.bevel_resolution=4;g.use_fill_caps=True;s=g.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for i,(p,b) in enumerate(zip(points,s.bezier_points)):b.co=V(p);b.radius=radii[i] if radii else 1;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
 o=bpy.data.objects.new(name,g);MODEL.objects.link(o);return finish(o,name,material or CLAY,parent)
def rod(name,a,b,r,material=None,parent=None):return curve(name,[a,b],r,material=material,parent=parent)
def convert(o):
 bpy.ops.object.select_all(action='DESELECT');o.select_set(True);bpy.context.view_layer.objects.active=o;bpy.ops.object.convert(target='MESH');return bpy.context.object

def union(parts,name,voxel=.045,parent=None):
 # Curves remain editable in a hidden construction collection.
 for p in parts:
  c=p.copy();c.data=p.data.copy();GUIDES.objects.link(c);c.hide_render=True
 bpy.ops.object.select_all(action='DESELECT')
 for p in parts:p.select_set(True)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.convert(target='MESH');bpy.ops.object.join();o=bpy.context.object;o.name=name
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);m=o.modifiers.new('Continuous welded surface','REMESH');m.mode='VOXEL';m.voxel_size=voxel;m.use_smooth_shade=True;apply(o,m)
 m=o.modifiers.new('Junction relaxation','SMOOTH');m.factor=.55;m.iterations=4;apply(o,m)
 m=o.modifiers.new('Surface finishing','SUBSURF');m.levels=1;m.render_levels=1;apply(o,m)
 if parent:parent_keep(o,parent)
 return o

def difference(o,cutter):
 cutter=convert(cutter);normals(cutter);normals(o);m=o.modifiers.new('Carved volume','BOOLEAN');m.operation='DIFFERENCE';m.solver='EXACT';m.object=cutter;apply(o,m);bpy.data.objects.remove(cutter,do_unlink=True)
 if not o.data.polygons:raise RuntimeError('Boolean removed the complete '+o.name)
 normals(o)
def arch(name,p,w,h,depth,material=None,parent=None):
 pts=[(-w/2,0),(w/2,0)]+[(w/2*math.cos(i*math.pi/32),h-w/2+w/2*math.sin(i*math.pi/32)) for i in range(33)];n=len(pts)
 v=[(p[0]+x,p[1]+y,p[2]+z) for z in [-depth/2,depth/2] for x,y in pts];f=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
 return mesh(name,v,f,material,parent)
def archrim(name,p,w,h,r,parent=None,material=None):
 pts=[(p[0]-w/2,p[1],p[2]),(p[0]-w/2,p[1]+h-w/2,p[2])]+[(p[0]+w/2*math.cos(math.pi-i*math.pi/24),p[1]+h-w/2+w/2*math.sin(math.pi-i*math.pi/24),p[2]) for i in range(25)]+[(p[0]+w/2,p[1],p[2])]
 return curve(name,pts,r,material=material,parent=parent)
def lathe(name,p,profile,material=None,parent=None,n=64):
 v=[(p[0]+r*math.cos(i*TAU/n),p[1]+y,p[2]+r*math.sin(i*TAU/n)) for r,y in profile for i in range(n)];f=[]
 for row in range(len(profile)-1):
  for j in range(n):a=row*n+j;b=row*n+(j+1)%n;f.append((a,b,b+n,a+n))
 f.extend([tuple(reversed(range(n))),tuple((len(profile)-1)*n+i for i in range(n))]);return mesh(name,v,f,material,parent)
def star(name,p,r=.22,parent=None):
 pts=[(p[0]+(r if i%2==0 else r*.48)*math.cos(math.pi/2+i*TAU/10),p[1]+(r if i%2==0 else r*.48)*math.sin(math.pi/2+i*TAU/10),p[2]) for i in range(10)]
 v=[(x,y,z+d) for d in [-.06,.06] for x,y,z in pts];f=[tuple(reversed(range(10))),tuple(range(10,20))]+[(i,(i+1)%10,(i+1)%10+10,i+10) for i in range(10)];return bevel(mesh(name,v,f,CLAY,parent),.035,4)
def bounds():
 bpy.context.view_layer.update();pts=[o.matrix_world@Vector(v) for o in MODEL.objects if o.type in {'MESH','CURVE'} for v in o.bound_box]
 lo=Vector(tuple(min(v[i] for v in pts) for i in range(3)));hi=Vector(tuple(max(v[i] for v in pts) for i in range(3)));return lo,hi

def output(name,notes):
 out=ROOT/'assets/art/planet-rebuild/capability-v1'/name;art=ROOT/'artifacts/planet-rebuild/capability-v1'/name;out.mkdir(parents=True,exist_ok=True);art.mkdir(parents=True,exist_ok=True)
 bpy.context.view_layer.update();lo,hi=bounds();center=(lo+hi)*.5;size=hi-lo
 # Save editable gray mother file before making export-only curve copies.
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=64;scene.cycles.use_denoising=False;scene.render.resolution_x=1100;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA';scene.render.film_transparent=True
 scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=0
 world=bpy.data.worlds.new('Neutral studio');world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.78,.76,.80,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45;scene.world=world
 studio=bpy.data.collections.new('REVIEW_Studio');scene.collection.children.link(studio)
 def area(n,p,power,width):
  d=bpy.data.lights.new(n,'AREA');d.energy=power;d.shape='DISK';d.size=width;o=bpy.data.objects.new(n,d);studio.objects.link(o);o.location=V(p);o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
 area('Key',(-5,9,7),950,5);area('Fill',(6,5,4),550,6);area('Rim',(2,8,-5),1000,4)
 camera=bpy.data.objects.new('Review camera',bpy.data.cameras.new('Orthographic review'));studio.objects.link(camera);scene.camera=camera;camera.data.type='ORTHO';camera.data.lens=50
 model=list(MODEL.objects)
 for label,d in [('quarter',(1,.62,1)),('front',(0,0,1)),('side',(1,0,0)),('back',(0,0,-1))]:
  direction=V(d).normalized();camera.location=center+direction*24;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();bpy.context.view_layer.update()
  inv=camera.matrix_world.inverted();points=[inv@(o.matrix_world@Vector(v)) for o in model if o.type in {'MESH','CURVE'} for v in o.bound_box];w=max(p.x for p in points)-min(p.x for p in points);h=max(p.y for p in points)-min(p.y for p in points);camera.data.ortho_scale=max(w,h*1.1)*1.17
  scene.cycles.samples=96 if label=='quarter' else 64
  scene.render.filepath=str(art/(label+'.png'));bpy.ops.render.render(write_still=True)
 camera.location=center+V((1,.62,1)).normalized()*24;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=max(size.x,size.z,size.y)*1.25
 bpy.ops.wm.save_as_mainfile(filepath=str(out/(name+'.blend')),compress=True)
 # Export duplicates so original curve controls / hierarchy stay editable.
 temp=bpy.data.collections.new('EXPORT_TEMP');scene.collection.children.link(temp);copies={}
 for o in model:
  c=o.copy()
  if o.data:c.data=o.data.copy()
  temp.objects.link(c);copies[o]=c
 for o,c in copies.items():
  w=o.matrix_world.copy();c.parent=copies.get(o.parent);c.matrix_world=w
 bpy.ops.object.select_all(action='DESELECT')
 for c in copies.values():c.select_set(True)
 bpy.context.view_layer.objects.active=next(c for c in copies.values() if c.type=='MESH');bpy.ops.object.convert(target='MESH')
 bpy.ops.object.select_all(action='DESELECT')
 for o in temp.objects:o.select_set(True)
 tris=sum(sum(len(p.vertices)-2 for p in o.data.polygons) for o in temp.objects if o.type=='MESH')
 bpy.ops.export_scene.gltf(filepath=str(out/(name+'.glb')),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_animations=False)
 report={'name':name,'dimensions_blender_xyz':list(size),'triangles':tris,'parts':[{'name':o.name,'type':o.type,'parent':o.parent.name if o.parent else None} for o in model],'methods_and_limits':notes,'source':'references/companion-planet/同頻星球.png','status':'Needs Human Review','gray_only':True,'website_integrated':False,'source_image_packed_in_blend':True,'views':{'quarter':{'azimuth':45,'elevation':math.degrees(math.atan(.62/math.sqrt(2)))},'front':{'azimuth':0,'elevation':0},'side':{'azimuth':90,'elevation':0},'back':{'azimuth':180,'elevation':0}}}
 (out/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('TRIAL_COMPLETE',name,tris,flush=True)
