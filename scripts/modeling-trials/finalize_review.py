"""Pack the actual source sheet and render a true 45-degree inspection view."""
import bpy,sys,json,math
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2];name=sys.argv[sys.argv.index('--')+1];base=ROOT/'assets/art/planet-rebuild/capability-v1'/name
bpy.ops.wm.open_mainfile(filepath=str(base/(name+'.blend')));bpy.context.preferences.filepaths.save_version=0
source=ROOT/'assets/art/planet-rebuild/references/companion-planet/同頻星球.png';im=bpy.data.images.load(str(source),check_existing=True);im.name='SOURCE_同頻星球_1536x1024';im.use_fake_user=True;im.pack()
model=bpy.data.collections['MODEL_'+name];points=[o.matrix_world@Vector(v) for o in model.objects if o.type in {'MESH','CURVE'} for v in o.bound_box];lo=Vector(tuple(min(p[i] for p in points) for i in range(3)));hi=Vector(tuple(max(p[i] for p in points) for i in range(3)));center=(lo+hi)/2
camera=bpy.context.scene.camera;camera.location=center+Vector((1,-1,.62)).normalized()*24;camera.rotation_euler=(center-camera.location).to_track_quat('-Z','Y').to_euler();bpy.context.view_layer.update();inv=camera.matrix_world.inverted();view=[inv@p for p in points];camera.data.ortho_scale=max(max(p.x for p in view)-min(p.x for p in view),(max(p.y for p in view)-min(p.y for p in view))*1.1)*1.17
scene=bpy.context.scene;scene.cycles.samples=96;scene.cycles.use_denoising=False;scene.render.filepath=str(ROOT/'artifacts/planet-rebuild/capability-v1'/name/'quarter.png');bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str(base/(name+'.blend')),compress=True)
r=json.loads((base/'report.json').read_text());r['views']={'quarter':{'azimuth':45,'elevation':math.degrees(math.atan(.62/math.sqrt(2)))},'front':{'azimuth':0,'elevation':0},'side':{'azimuth':90,'elevation':0},'back':{'azimuth':180,'elevation':0}};r['source_image_packed_in_blend']=True;(base/'report.json').write_text(json.dumps(r,ensure_ascii=False,indent=2))
print('FINAL_VIEW',name,flush=True)
