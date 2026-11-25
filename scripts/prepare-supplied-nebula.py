"""Run in Blender: derive a web-sized copy from the user's rigged GLB."""
import bpy,json,zipfile,tempfile,struct,math,hashlib
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parents[1]
with zipfile.ZipFile(root/'assets/art/user-models/星雲仔.zip') as z:
    with tempfile.TemporaryDirectory() as tmp:
        path=Path(tmp)/'nebula.glb'
        original=z.read('星雲仔.glb');blob=bytearray(original)
        length=struct.unpack_from('<I',blob,12)[0];g=json.loads(blob[20:20+length])
        repairs=[]
        for clip in g.get('animations',[]):
            for channel in clip['channels']:
                target=channel['target'];kind=target['path']
                if kind!='rotation':continue
                sampler=clip['samplers'][channel['sampler']]
                a=g['accessors'][sampler['output']];v=g['bufferViews'][a['bufferView']]
                offset=28+length+v.get('byteOffset',0)+a.get('byteOffset',0)
                repaired=0
                for i in range(a['count']):
                    at=offset+i*v.get('byteStride',16);q=struct.unpack_from('<4f',blob,at)
                    if not all(math.isfinite(x) for x in q) or sum(x*x for x in q)<1e-12:
                        fallback=g['nodes'][target['node']].get('rotation',[0,0,0,1])
                        struct.pack_into('<4f',blob,at,*fallback);repaired+=1
                if repaired:repairs.append({'clip':clip['name'],'node':g['nodes'][target['node']].get('name'),'invalidQuaternionKeys':repaired})
        path.write_bytes(blob)
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(path))
# Imported rig bone-display helpers are not character geometry.
for o in list(bpy.context.scene.objects):
    if o.type=='MESH' and not any(m.type=='ARMATURE' for m in o.modifiers):
        bpy.data.objects.remove(o, do_unlink=True)
report={'meshes':[], 'sourceSha256':hashlib.sha256(original).hexdigest(), 'animationRepairs':repairs}
for o in bpy.context.scene.objects:
    if o.type!='MESH':continue
    before=len(o.data.polygons)
    bpy.context.view_layer.objects.active=o
    mod=o.modifiers.new('Web silhouette reduction','DECIMATE');mod.ratio=.025
    bpy.ops.object.modifier_apply(modifier=mod.name)
    report['meshes'].append({'name':o.name,'beforeFaces':before,'afterFaces':len(o.data.polygons),'vertices':len(o.data.vertices)})
# Animation-free rest bounds, preserving the source rig transforms and orientation.
for o in bpy.context.scene.objects:
    if o.animation_data:o.animation_data.action=None
bpy.context.scene.frame_set(1)
bpy.context.view_layer.update()
pts=[o.matrix_world@Vector(c) for o in bpy.context.scene.objects if o.type=='MESH' for c in [v.co for v in o.data.vertices]]
report['boundsBlender']=[[min(p[i] for p in pts) for i in range(3)],[max(p[i] for p in pts) for i in range(3)]]
report['actions']=[a.name for a in bpy.data.actions]
# Export every imported action without baking a camera or lighting rig.
out=root/'public/models/user-residents/nebula.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_cameras=False,export_lights=False)
import runpy
runpy.run_path(str(root/'scripts/repair-nebula-arms.py'))['repair'](out)
report['armTracks']='rest-relative-v1'
report['bytes']=out.stat().st_size
(root/'assets/art/user-models/NEBULA_RUNTIME.json').write_text(json.dumps(report,indent=2)+'\n')
