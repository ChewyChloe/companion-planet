import {chromium,expect} from '@playwright/test';import {writeFile,readFile} from 'node:fs/promises';
const allIds=['nebula','sprout','fern','mushroom','aurora','blossom','stardust','water','puff'];const ids=process.argv.length>2?process.argv.slice(2):allIds;if(ids.some(id=>!allIds.includes(id)))throw Error('Unknown resident ID');
const report={generatedAt:new Date().toISOString(),errors:[],views:[],scope:'Approved nine distinct clay shapes, colored with Nebula B as family reference; existing controller retained, no new clips.'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-webgl']});
if(ids.length<9){const previous=JSON.parse(await readFile('artifacts/resident-final/visual-results.json','utf8'));report.views=previous.views.filter(v=>!ids.includes(v.id));report.errors=previous.errors;}
try{const p=await browser.newPage({viewport:{width:960,height:760}});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts\.(googleapis|gstatic)/.test(m.location().url))report.errors.push(m.text());});
 for(const id of ids){
  await p.goto(`http://127.0.0.1:5173/?art-review&still&capture&companion=${id}`);
  await expect(p.locator('canvas')).toHaveAttribute('data-model-version','approved-sdf-color-v1',{timeout:60000});
  await expect(p.locator('canvas')).toHaveAttribute('data-companion',id,{timeout:60000});
  for(const [view,angle] of [['front',0],['quarter',Math.PI/4],['side',Math.PI/2],['back',Math.PI]]){
   const data=await p.evaluate(async angle=>{const url=performance.getEntriesByType('resource').map(x=>x.name).find(n=>n.includes('/@react-three_fiber.js'));const {_roots}=await import(url);const s=_roots.get(document.querySelector('canvas')).store.getState();s.setFrameloop('never');const turn=s.scene.getObjectByName('ReviewTurntable');turn.rotation.y=angle;s.scene.updateMatrixWorld(true);s.scene.traverse(n=>{if(n.material?.uniforms?.cameraLocal)n.material.uniforms.cameraLocal.value.copy(n.worldToLocal(s.camera.position.clone()));});const body=s.scene.getObjectByName('Body');body.skeleton.update();s.scene.userData.renderMaterialPreview();return {vertices:body.geometry.attributes.position.count,roughness:body.material.roughness,transmission:body.material.transmission,glError:s.gl.getContext().getError(),model:s.gl.domElement.dataset.modelPath};},angle);
   await p.screenshot({path:`artifacts/resident-final/${id}-${view}.png`});report.views.push({id,view,...data});
  }
  console.log(id+': four actual R3F material views');
 }
}finally{await browser.close();await writeFile('artifacts/resident-final/visual-results.json',JSON.stringify(report,null,2));}
if(report.errors.length||report.views.length!==36||report.views.some(v=>v.glError))process.exitCode=1;
