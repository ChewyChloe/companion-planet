"""Bake true static ambient occlusion for supplied landscapes. Does not change their meshes."""
import bpy,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
ids=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else ['b612','moon','rose','forest']
for key in ids:
 bpy.ops.wm.read_factory_settings(use_empty=True)
 bpy.ops.import_scene.gltf(filepath=str(ROOT/f'public/models/user-worlds/{key}.glb'))
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 image=bpy.data.images.new('WorldAO',width=1024,height=1024,alpha=False);image.generated_color=(1,1,1,1)
 for o in meshes:
  for m in o.data.materials:
   m.use_nodes=True;n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=image;m.node_tree.nodes.active=n
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.render.threads_mode='FIXED';scene.render.threads=4
 scene.render.bake.margin=12;scene.render.bake.use_clear=True;scene.world=bpy.data.worlds.new('Neutral AO')
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0]
 bpy.ops.object.bake(type='AO')
 out=ROOT/f'assets/art/world-color/{key}-ao.png';image.filepath_raw=str(out);image.file_format='PNG';image.save();print('BAKED_AO',key,flush=True)
