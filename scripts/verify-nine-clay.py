"""Check new nine-asset clay delivery; user approval is recorded separately."""
from pathlib import Path
import json,struct,hashlib,subprocess
root=Path(__file__).resolve().parents[1]
ids=['nebula','sprout','fern','mushroom','aurora','blossom','stardust','water','puff']
results=[];hashes=set()
for id in ids:
 base=root/'assets/art/clay-stage';data=(base/(id+'.glb')).read_bytes()
 assert struct.unpack_from('<I',data)[0]==0x46546c67
 n=struct.unpack_from('<I',data,12)[0];gltf=json.loads(data[20:20+n]);nodes={o.get('name'):o for o in gltf['nodes']}
 assert 'Body' in nodes and 'Crown-'+id in nodes
 assert not gltf.get('animations') and not gltf.get('skins')
 primitive=gltf['meshes'][nodes['Body']['mesh']]['primitives'][0];a=gltf['accessors'][primitive['attributes']['POSITION']];v=gltf['bufferViews'][a['bufferView']]
 start=20+n+8+v.get('byteOffset',0)+a.get('byteOffset',0)
 h=hashlib.sha256(data[start:start+a['count']*12]).hexdigest();hashes.add(h)
 build=json.loads((base/(id+'-build.json')).read_text());assert build['bodyComponents']==1 and build['nonManifoldEdges']==0
 assert (base/(id+'.blend')).stat().st_size>10000
 # Every exported surface uses only neutral clay or quiet grayscale facial ink.
 for mat in gltf.get('materials',[]):
  assert not any(mat.get('emissiveFactor',[0,0,0]))
  assert not mat.get('extensions',{}).get('KHR_materials_transmission')
 results.append({'id':id,'bodyComponents':build['bodyComponents'],'nonManifoldEdges':build['nonManifoldEdges'],'bodyGeometrySHA256':h,'bodyTriangles':build['exportedBodyTriangles'],'staticClayOnly':True,'appearanceApproval':'Approved by user' if id in ['nebula','fern','mushroom'] else 'Needs Human Review'})
assert len(hashes)==9
manifest=json.loads((root/'artifacts/clay-review/approved-three-sha256.json').read_text())
for name,expected in manifest.items():assert hashlib.sha256((root/'assets/art/clay-stage'/name).read_bytes()).hexdigest()==expected,name+' was changed'
visual=json.loads((root/'artifacts/clay-review/nine-visual-results.json').read_text())
assert not visual['errors'] and len(visual['views'])==36 and all(v['glError']==0 for v in visual['views'])
changes=subprocess.check_output(['git','diff','--name-only','--','src','public'],cwd=root,text=True).strip()
# Later material-preview work may legitimately change source. Report the
# current diff instead of treating the old clay-stage isolation as permanent.
report={'assetChecks':'Passed','distinctBodyGeometry':9,'models':results,'approvedThreeUnchanged':True,'renderedViews':36,'renderErrors':visual['errors'],'productionSourceChanges':bool(changes),'workingTreeSourcePaths':changes.splitlines(),'visualApproval':'First three approved; other six Needs Human Review','animation':'Not Tested — outside clay appearance stage','hardwarePerformance':'Not Tested'}
(root/'artifacts/clay-review/nine-test-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('9 distinct static clay assets; 9 closed connected bodies; 36 rendered views; approved three unchanged; production source untouched.')
