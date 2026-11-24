import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const report={generatedAt:new Date().toISOString(),errors:[],views:[],scope:'Nebula material test only, approved shape; no new animations.'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-webgl']});
async function capture(page,name,world){
 const data=await page.evaluate(async world=>{
  const url=performance.getEntriesByType('resource').map(x=>x.name).find(n=>n.includes('/@react-three_fiber.js'));const {_roots}=await import(url);const s=_roots.get(document.querySelector('canvas')).store.getState();s.setFrameloop('never');s.gl.setPixelRatio(1);
  if(world){
    const {groundHeight}=await import('/src/art/terrain.ts');
    const placement=s.scene.getObjectByName('CharacterPlacement'),facing=s.scene.getObjectByName('CharacterFacing');
    placement.position.set(-.72,groundHeight(-.72,.12),.12);placement.quaternion.identity();facing.quaternion.identity();
    s.camera.position.set(6,4.2,10);s.camera.lookAt(0,-.6,0);
    s.scene.traverse(n=>{if(n.isAmbientLight)n.intensity=.32;if(n.isHemisphereLight)n.intensity=.55;if(n.name==='DeskLampLight')n.intensity=1.3;});
  } else {s.camera.position.set(0,1,4.1);s.camera.lookAt(0,.92,0);}
  s.scene.updateMatrixWorld(true);s.gl.shadowMap.needsUpdate=true;
  if(s.scene.userData.renderMaterialPreview)s.scene.userData.renderMaterialPreview();else s.gl.render(s.scene,s.camera);
  if(world){const img=document.createElement('img');img.id='saved-render';img.src=s.gl.domElement.toDataURL();const r=s.gl.domElement.getBoundingClientRect();Object.assign(img.style,{position:'fixed',left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`,zIndex:'0',pointerEvents:'none'});s.gl.domElement.parentElement.append(img);await img.decode();}
  const mesh=s.scene.getObjectByName('Body'),m=mesh.material;
  const interior=s.scene.getObjectByName('NebulaInterior');
  return {camera:s.camera.position.toArray(),pose:s.gl.domElement.dataset.pose,spatialStars:interior?.userData.spatialStars,bloom:!!s.scene.userData.renderMaterialPreview,variant:m.userData.variant,transmission:m.transmission,roughness:m.roughness,thickness:m.thickness,opacity:m.opacity,skinMode:s.gl.domElement.dataset.skinMode,glError:s.gl.getContext().getError(),bodyVertices:mesh.geometry.attributes.position.count,model:s.scene.getObjectByName('CharacterRoot').userData.resident};
 },world);
 await page.screenshot({path:`artifacts/nebula-material/${name}.png`});report.views.push({name,...data});
}
try{
 for(const variant of ['soft','mist','gel']){
  for(const world of [false,true]){
   const page=await browser.newPage({viewport:world?{width:1440,height:900}:{width:960,height:760}});
   page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!/fonts\.(googleapis|gstatic)/.test(m.location().url))report.errors.push(m.text());});
   await page.goto(`http://127.0.0.1:5173/?${world?'':'art-review&'}nebula-material=${variant}&still`);
   await expect(page.locator('canvas')).toHaveAttribute('data-material-test',variant,{timeout:60000});
   await page.waitForFunction(()=>!!document.querySelector('canvas')?.dataset.pose,null,{timeout:60000});
   await capture(page,`${variant}-${world?'planet':'close'}`,world);await page.close();
  }
  const probe=await browser.newPage({viewport:{width:960,height:760}});
  probe.on('pageerror',e=>report.errors.push(e.message));
  await probe.goto(`http://127.0.0.1:5173/?art-review&nebula-material=${variant}&material-probe&still`);
  await expect(probe.locator('canvas')).toHaveAttribute('data-material-test',variant,{timeout:60000});
  await probe.waitForFunction(()=>!!document.querySelector('canvas')?.dataset.pose,null,{timeout:60000});
  await capture(probe,`${variant}-transmission-probe`,false);await probe.close();
  console.log(variant+': actual R3F closeup and live planet rendered');
 }
 const phone=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});phone.on('pageerror',e=>report.errors.push(e.message));
 await phone.goto('http://127.0.0.1:5173/?nebula-material=mist&still');await expect(phone.locator('canvas')).toHaveAttribute('data-material-test','mist',{timeout:60000});await phone.waitForFunction(()=>!!document.querySelector('canvas')?.dataset.pose,null,{timeout:60000});await capture(phone,'mist-phone',true);await phone.close();
}finally{await browser.close();await writeFile('artifacts/nebula-material/visual-results.json',JSON.stringify(report,null,2));}
if(report.errors.length||report.views.length!==10||report.views.some(v=>v.glError!==0))process.exitCode=1;
