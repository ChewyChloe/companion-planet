import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const report={generatedAt:new Date().toISOString(),errors:[],views:[],scope:'Nine independent clay models. Approved nebula/fern/mushroom assets unchanged; other six need review. No production integration or animation.',visualApproval:'Needs Human Review'};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:640,height:640}});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 for(const id of ['nebula','sprout','fern','mushroom','aurora','blossom','stardust','water','puff']){
  await page.goto(`http://127.0.0.1:5173/artifacts/clay-review/viewer.html?capture&id=${id}`);
  await expect(page.locator('canvas')).toHaveAttribute('data-ready',id,{timeout:60000});
  for(const [view,angle] of [['front',0],['quarter',Math.PI/4],['side',Math.PI/2],['back',Math.PI]]){
   const data=await page.evaluate(({angle})=>{const s=window.clayReview;s.model.rotation.y=angle;s.render();return {vertices:s.model.getObjectByName('Body').geometry.attributes.position.count,triangles:s.renderer.info.render.triangles,glError:s.renderer.getContext().getError()};},{angle});
   await page.screenshot({path:`artifacts/clay-review/${id}-${view}.png`});report.views.push({id,view,...data});
  }
  await page.evaluate(id=>{const s=window.clayReview;s.model.rotation.y=0;s.model.getObjectByName(`Crown-${id}`).visible=false;s.render();},id);
  await page.screenshot({path:`artifacts/clay-review/${id}-body-only.png`});
  // Verify actual orbit interaction changes the camera, independent of view buttons.
  const before=await page.evaluate(()=>window.clayReview.camera.position.toArray());
  await page.mouse.move(450,320);await page.mouse.down();await page.mouse.move(510,350,{steps:8});await page.mouse.up();
  const after=await page.evaluate(()=>window.clayReview.camera.position.toArray());
  if(JSON.stringify(before)===JSON.stringify(after))throw Error('Orbit rotation did not move camera');
  console.log(id+': real clay front / quarter / side / back / bare body, orbit verified');
 }
}finally{await browser.close();await writeFile('artifacts/clay-review/nine-visual-results.json',JSON.stringify(report,null,2));}
if(report.errors.length||report.views.length!==36||report.views.some(v=>v.glError))process.exitCode=1;
