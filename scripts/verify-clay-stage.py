"""Check real clay files; shape quality remains human approval."""
from pathlib import Path
import json,struct,hashlib
root=Path(__file__).resolve().parents[1]
results=[];hashes=set()
for id in ['nebula','fern','mushroom']:
 base=root/'assets/art/clay-stage';data=(base/(id+'.glb')).read_bytes()
 assert struct.unpack_from('<I',data)[0]==0x46546c67
 n=struct.unpack_from('<I',data,12)[0];gltf=json.loads(data[20:20+n])
 nodes={o.get('name'):o for o in gltf['nodes']}
 assert 'Body' in nodes and 'Crown-'+id in nodes
 assert not gltf.get('animations') and not gltf.get('skins')
 primitive=gltf['meshes'][nodes['Body']['mesh']]['primitives'][0]
 a=gltf['accessors'][primitive['attributes']['POSITION']];v=gltf['bufferViews'][a['bufferView']]
 start=20+n+8+v.get('byteOffset',0)+a.get('byteOffset',0)
 h=hashlib.sha256(data[start:start+a['count']*12]).hexdigest();hashes.add(h)
 build=json.loads((base/(id+'-build.json')).read_text())
 assert build['bodyComponents']==1 and build['nonManifoldEdges']==0
 assert (base/(id+'.blend')).stat().st_size>10000
 results.append({'id':id,'bodyComponents':build['bodyComponents'],'nonManifoldEdges':build['nonManifoldEdges'],'bodyGeometrySHA256':h,'bodyTriangles':build['exportedBodyTriangles'],'staticClayOnly':True})
assert len(hashes)==3
visual=json.loads((root/'artifacts/clay-review/visual-results.json').read_text())
assert not visual['errors'] and len(visual['views'])==9 and all(v['glError']==0 for v in visual['views'])
report={'assetChecks':'Passed','distinctBodyGeometry':3,'models':results,'renderedViews':9,'renderErrors':visual['errors'],'productionSourceChanges':False,'visualApproval':'Needs Human Review','animation':'Not Tested — outside this stage','otherSix':'Not Started — awaiting shape approval'}
(root/'artifacts/clay-review/test-report.json').write_text(json.dumps(report,indent=2)+'\n')
print('3 distinct static clay assets; 3 connected closed body meshes; 9 actual rendered views; no WebGL errors.')
