import {chromium,expect} from '@playwright/test';import {writeFile} from 'node:fs/promises';
const ids=['nebula','sprout','fern','mushroom','aurora','blossom','stardust','water','puff'];
const report={generatedAt:new Date().toISOString(),errors:[],residents:[],expressions:[]};
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-webgl']});
async function snapshot(p,path){const data=await p.evaluate(async()=>{
 const url=performance.getEntriesByType('resource').map(x=>x.name).find(n=>n.includes('/@react-three_fiber.js'));const {_roots}=await import(url);const s=_roots.get(document.querySelector('canvas')).store.getState();s.setFrameloop('never');s.scene.updateMatrixWorld(true);s.scene.traverse(n=>{if(n.material?.uniforms?.cameraLocal)n.material.uniforms.cameraLocal.value.copy(n.worldToLocal(s.camera.position.clone()));});const body=s.scene.getObjectByName('Body');body.skeleton.update();
 const pos=body.geometry.attributes.position,idx=body.geometry.attributes.skinIndex,w=body.geometry.attributes.skinWeight,control=s.scene.getObjectByName('BodyControl'),centroids={};
 for(const name of ['LeftArm','RightArm','LeftLeg','RightLeg']){
  const bone=body.skeleton.bones.findIndex(n=>n.name===name);let weight=0,peak=0;const sum=control.position.clone().set(0,0,0);
  for(let i=0;i<pos.count;i++){let amount=0;for(let j=0;j<4;j++)if(idx.getComponent(i,j)===bone)amount+=w.getComponent(i,j);peak=Math.max(peak,amount);if(amount<.35)continue;const v=control.position.clone().fromBufferAttribute(pos,i);body.applyBoneTransform(i,v);v.applyMatrix4(body.matrixWorld);control.worldToLocal(v);sum.addScaledVector(v,amount);weight+=amount;}
  centroids[name]={point:sum.divideScalar(Math.max(.001,weight)).toArray(),weight,peak};
 }
 s.scene.userData.renderMaterialPreview();
 return {centroids,faceVisible:s.gl.domElement.dataset.faceVisible,expression:s.gl.domElement.dataset.expression,pose:s.gl.domElement.dataset.pose,transmission:body.material.transmission,glError:s.gl.getContext().getError()};
});await p.screenshot({path});return data;}
try{const p=await b.newPage({viewport:{width:960,height:760}});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts\.(googleapis|gstatic)/.test(m.location().url))report.errors.push(m.text());});
 for(const id of ids){const phases=[];
  for(const time of [.22,.66]){await p.goto(`http://127.0.0.1:5173/?art-review&capture&companion=${id}&pose=walk&pose-time=${time}`);await expect(p.locator('canvas')).toHaveAttribute('data-companion',id,{timeout:60000});await expect(p.locator('canvas')).toHaveAttribute('data-expression',/calm|curious/,{timeout:60000});phases.push(await snapshot(p,`artifacts/motion-review/${id}-walk-${time}.png`));}
  const movement={};for(const name of Object.keys(phases[0].centroids)){const a=phases[0].centroids[name],c=phases[1].centroids[name];movement[name]=Math.hypot(...a.point.map((v,i)=>v-c.point[i]));if(a.weight<1||movement[name]<.025)throw Error(`${id} ${name} barely deforms: ${movement[name]}`);}
  await p.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(x=>x.name).find(n=>n.includes('/@react-three_fiber.js'));const {_roots}=await import(url);const s=_roots.get(document.querySelector('canvas')).store.getState();s.scene.getObjectByName('ReviewTurntable').rotation.y=Math.PI;s.setFrameloop('always');});await expect(p.locator('canvas')).toHaveAttribute('data-face-visible','false',{timeout:30000});const rear=await snapshot(p,`artifacts/motion-review/${id}-back.png`);
  report.residents.push({id,phases,movement,rear});console.log(id+': actual skinned four-limb displacement and rear-face occlusion verified');
 }
 for(const action of ['idle','happy','listen','rest','stretch']){await p.goto(`http://127.0.0.1:5173/?art-review&capture&companion=nebula&pose=${action}&pose-time=.5`);await expect(p.locator('canvas')).toHaveAttribute('data-companion','nebula',{timeout:60000});await expect(p.locator('canvas')).toHaveAttribute('data-expression',/happy|open|sleepy|curious|calm/,{timeout:60000});const data=await snapshot(p,`artifacts/motion-review/nebula-${action}.png`);report.expressions.push({action,...data});}
}finally{await b.close();await writeFile('artifacts/motion-review/visual-results.json',JSON.stringify(report,null,2));}
if(report.errors.length||report.residents.length!==9||report.residents.some(r=>r.phases.some(p=>p.glError)||r.rear.glError)||report.expressions.some(e=>e.glError))process.exitCode=1;
