"""Read-only source/GLB round-trip and integrity checks, not an aesthetic test."""
import bpy,bmesh,sys,json,math,hashlib,struct
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];results=[]
def bbox(objects):
 bpy.context.view_layer.update();pts=[o.matrix_world@Vector(v) for o in objects if o.type in {'MESH','CURVE'} for v in o.bound_box]
 return [min(v[i] for v in pts) for i in range(3)]+[max(v[i] for v in pts) for i in range(3)]
def components(o):
 bm=bmesh.new();bm.from_mesh(o.data);seen=set();count=0
 for vertex in bm.verts:
  if vertex in seen:continue
  count+=1;stack=[vertex];seen.add(vertex)
  while stack:
   at=stack.pop()
   for edge in at.link_edges:
    other=edge.other_vert(at)
    if other not in seen:seen.add(other);stack.append(other)
 result={'components':count,'non_manifold_edges':sum(not e.is_manifold for e in bm.edges)};bm.free();return result
for name in ['treehouse','island','observatory']:
 p=ROOT/'assets/art/planet-rebuild/capability-v1'/name;bpy.ops.wm.open_mainfile(filepath=str(p/(name+'.blend')));objects=list(bpy.data.collections['MODEL_'+name].objects);before=bbox(objects)
 finite=all(math.isfinite(c) for o in objects if o.type=='MESH' for v in o.data.vertices for c in v.co)
 connected={o.name:components(o) for o in objects if o.name=='Continuous_sculpted_root_trunk_branches'}
 packed=any(im.packed_file and im.size[:]==(1536,1024) for im in bpy.data.images)
 b=(p/(name+'.glb')).read_bytes();n=struct.unpack_from('<I',b,12)[0];g=json.loads(b[20:20+n]);embedded=all('uri' not in x for x in g.get('buffers',[]));animation_count=len(g.get('animations',[]))
 bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(p/(name+'.glb')));after=bbox(bpy.context.scene.objects);delta=max(abs(a-c) for a,c in zip(before,after));import_finite=all(math.isfinite(c) for o in bpy.context.scene.objects if o.type=='MESH' for v in o.data.vertices for c in v.co)
 row={'name':name,'finite_source_vertices':finite,'finite_imported_vertices':import_finite,'source_reference_packed':packed,'glb_embedded_buffers':embedded,'glb_animation_count':animation_count,'roundtrip_bbox_max_error_m':delta,'source_bbox':before,'import_bbox':after,'source_trunk_topology':connected,'source_sha256':hashlib.sha256((p/(name+'.blend')).read_bytes()).hexdigest(),'glb_sha256':hashlib.sha256(b).hexdigest()}
 row['technical_pass']=finite and import_finite and packed and embedded and animation_count==0 and delta<.02 and all(v['components']==1 for v in connected.values());results.append(row);print('VALIDATED',name,row['technical_pass'],delta,flush=True)
out=ROOT/'artifacts/planet-rebuild/capability-v1/technical-validation.json';out.write_text(json.dumps(results,indent=2));
if not all(x['technical_pass'] for x in results):raise RuntimeError('A technical check failed; see report')
