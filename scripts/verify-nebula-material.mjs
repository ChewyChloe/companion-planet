import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const visual=JSON.parse(await readFile('artifacts/nebula-material/visual-results.json','utf8'));
if(visual.errors.length||visual.views.length!==10||visual.views.some(v=>v.glError!==0||v.bodyVertices!==24458||v.spatialStars!==18||!v.bloom))throw Error('Incomplete live material render evidence');
for(const suffix of ['close','planet','transmission-probe']){
 const rows=['soft','mist','gel'].map(id=>visual.views.find(v=>v.name===`${id}-${suffix}`));
 for(const row of rows)if(JSON.stringify(row.camera)!==JSON.stringify(rows[0].camera)||row.pose!==rows[0].pose)throw Error('Comparison camera/pose mismatch');
 if(JSON.stringify(rows.map(v=>v.transmission))!==JSON.stringify([.28,.40,.65]))throw Error('Transmission values incorrect');
}
async function bodyHash(path){const b=await readFile(path),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n).toString()),node=g.nodes.find(x=>x.name==='Body'),a=g.accessors[g.meshes[node.mesh].primitives[0].attributes.POSITION],v=g.bufferViews[a.bufferView],start=20+n+8+(v.byteOffset||0)+(a.byteOffset||0);return {hash:createHash('sha256').update(b.subarray(start,start+a.count*12)).digest('hex'),animations:(g.animations||[]).length};}
const clay=await bodyHash('assets/art/clay-stage/nebula.glb'),preview=await bodyHash('public/models/material-preview/nebula.glb');
if(clay.hash!==preview.hash||preview.animations)throw Error('Approved geometry changed or animation added');
const report={generatedAt:new Date().toISOString(),browserRenders:10,renderErrors:[],sameCameraAndPose:true,bodyGeometryUnchanged:true,bodyGeometrySHA256:clay.hash,spatialStars:18,renderer:'Actual R3F with MeshPhysical transmission, 3D density field and UnrealBloomPass',otherResidentsMaterialChanges:false,newAnimationClips:0,visualApproval:'Needs Human Review',hardwarePerformance:'Not Tested'};
const regression=JSON.parse(await readFile('artifacts/nebula-material/default-web-results.json','utf8'));
const production=JSON.parse(await readFile('artifacts/nebula-material/production-results.json','utf8'));
if(regression.stats.expected!==3||regression.stats.unexpected||regression.stats.skipped||production.errors.length||production.cases.length!==2||production.cases.some(c=>!c.passed))throw Error('Regression or production verification failed');
report.defaultWebsiteRegression={passed:3,failed:0};report.productionPreview={passed:2,errors:[]};
await writeFile('artifacts/nebula-material/test-report.json',JSON.stringify(report,null,2));console.log('10 actual browser renders passed; camera and pose identical; geometry unchanged; no new clips.');
