import {chromium,expect} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
const report={generatedAt:new Date().toISOString(),errors:[],cases:[]};
async function inspect(p){return p.evaluate(async()=>{
 const url=performance.getEntriesByType('resource').map(x=>x.name).find(n=>n.includes('/@react-three_fiber.js'));const {_roots}=await import(url);const s=_roots.get(document.querySelector('canvas')).store.getState();
 const body=s.scene.getObjectByName('Body'),interior=s.scene.getObjectByName('NebulaInterior');
 return {variant:body.material.userData.variant,vertices:body.geometry.attributes.position.count,transmission:body.material.transmission,interior:!!interior,attachedToBody:interior?.parent?.parent?.name==='BodyControl',bloom:!!s.scene.userData.renderMaterialPreview,glError:s.gl.getContext().getError()};
});}
try{
 for(const mobile of [false,true]){
  const name=mobile?'phone':'desktop',p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
  p.on('pageerror',e=>report.errors.push(e.message));
  p.on('console',m=>{if(m.type()==='error'&&!/fonts\.(googleapis|gstatic)/.test(m.location().url))report.errors.push(m.text());});
  await p.goto('http://127.0.0.1:5173/');
  const canvas=p.locator('canvas');await expect(canvas).toHaveAttribute('data-material','mist',{timeout:60000});await expect(canvas).toHaveAttribute('data-material-test','none');
  await expect(p.getByRole('complementary',{name:'星雲仔材質測試'})).toHaveCount(0);
  const initial=await inspect(p);if(initial.vertices!==24458||!initial.interior||!initial.attachedToBody||!initial.bloom||initial.transmission!==(mobile?0:.58)||initial.glError)throw Error('Default B invalid '+JSON.stringify(initial));
  await p.getByRole('button',{name:'開始專注',exact:false}).click();await expect(p.locator('main')).toHaveAttribute('data-phase','focus');
  await p.getByRole('button',{name:'暫停'}).click();await expect(p.getByRole('button',{name:'繼續專注'})).toBeVisible();
  await p.getByRole('button',{name:'更換角色',exact:true}).click();await p.getByRole('button',{name:'蕨蕨子',exact:true}).click();await expect(canvas).toHaveAttribute('data-material','resident-fern',{timeout:60000});
  const fern=await inspect(p);if(fern.interior||!fern.bloom)throw Error('Fern should have its own material and shared soft Bloom');
  await p.getByRole('button',{name:'更換角色',exact:true}).click();await p.getByRole('button',{name:'星雲仔',exact:true}).click();await expect(canvas).toHaveAttribute('data-material','mist',{timeout:60000});
  await p.getByRole('button',{name:'體驗迷你陪伴'}).click();await expect(p.locator('main')).toHaveClass('app pet');await expect(canvas).toHaveAttribute('data-material','mist',{timeout:60000});
  const pet=await inspect(p);if(pet.bloom||pet.transmission!==0)throw Error('Pet transparency fallback invalid');
  await p.getByRole('button',{name:'返回星球'}).click();await expect(canvas).toHaveAttribute('data-material','mist',{timeout:60000});await expect(p.getByRole('button',{name:'繼續專注'})).toBeVisible();
  await p.evaluate(async()=>{
   const url=performance.getEntriesByType('resource').map(x=>x.name).find(n=>n.includes('/@react-three_fiber.js'));const {_roots}=await import(url);const s=_roots.get(document.querySelector('canvas')).store.getState();s.setFrameloop('never');s.scene.userData.renderMaterialPreview();
   const img=document.createElement('img');img.src=s.gl.domElement.toDataURL();const r=s.gl.domElement.getBoundingClientRect();Object.assign(img.style,{position:'fixed',left:`${r.left}px`,top:`${r.top}px`,width:`${r.width}px`,height:`${r.height}px`,zIndex:'0',pointerEvents:'none'});s.gl.domElement.parentElement.append(img);await img.decode();
  });
  await p.screenshot({path:`artifacts/nebula-default/${name}.png`});
  report.cases.push({name,passed:true,initial,fern,pet,timerStateRetained:true});await p.close();console.log(name+': default B, timer, selection, pet and return passed');
 }
}finally{await browser.close();await writeFile('artifacts/nebula-default/results.json',JSON.stringify(report,null,2));}
if(report.errors.length||report.cases.length!==2)process.exitCode=1;
