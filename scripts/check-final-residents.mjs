import {chromium,expect} from '@playwright/test';import {writeFile} from 'node:fs/promises';
const ids=['nebula','sprout','fern','mushroom','aurora','blossom','stardust','water','puff'],names=['星雲仔','小星草','蕨蕨子','菇菇獸','極光仔','花苞寶','星塵獸','水球仔','蓬蓬仔'];
const report={generatedAt:new Date().toISOString(),errors:[],cases:[]};
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
async function state(p){return p.evaluate(async()=>{const url=performance.getEntriesByType('resource').map(x=>x.name).find(n=>n.includes('/@react-three_fiber.js'));const {_roots}=await import(url);const s=_roots.get(document.querySelector('canvas')).store.getState(),body=s.scene.getObjectByName('Body');return {id:s.gl.domElement.dataset.companion,model:s.gl.domElement.dataset.modelPath,vertices:body.geometry.attributes.position.count,transmission:body.material.transmission,faceAlpha:s.scene.getObjectByName('LeftEyeSurface').material.opacity,glError:s.gl.getContext().getError(),bloom:!!s.scene.userData.renderMaterialPreview,booster:!!s.scene.getObjectByName('ResidentSeatCushion')};});}
try{for(const mobile of [false,true]){
 const platform=mobile?'phone':'desktop',p=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});p.on('pageerror',e=>report.errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts\.(googleapis|gstatic)/.test(m.location().url))report.errors.push(m.text());});
 await p.goto('http://127.0.0.1:5173/');const canvas=p.locator('canvas');await expect(canvas).toHaveAttribute('data-model-version','approved-sdf-color-v1',{timeout:60000});
 await p.getByRole('button',{name:'開始專注',exact:false}).click();await expect(p.locator('main')).toHaveAttribute('data-phase','focus');await p.getByRole('button',{name:'暫停',exact:true}).click();
 const selected=[];
 for(let i=0;i<ids.length;i++){
  await p.getByRole('button',{name:'更換角色',exact:true}).click();await p.getByRole('button',{name:names[i],exact:true}).click();await expect(canvas).toHaveAttribute('data-companion',ids[i],{timeout:60000});
  const r=await state(p);if(r.faceAlpha!==1||r.glError||!r.bloom||r.transmission<0||(!mobile&&r.transmission<=0)||(mobile&&r.transmission!==0))throw Error('Invalid resident '+JSON.stringify(r));
  if((ids[i]==='fern'||ids[i]==='puff')&&!r.booster)throw Error('Missing short-resident seat support');
  selected.push(r);await expect(p.getByRole('button',{name:'繼續專注'})).toBeVisible();
 }
 await p.reload();await expect(canvas).toHaveAttribute('data-companion','puff',{timeout:60000});await expect(p.getByRole('button',{name:'繼續專注'})).toBeVisible();
 // Actual model hit test after a drag, for the shortest body rather than an old shared-sphere proxy.
 await expect(canvas).toHaveAttribute('data-screen',/\d/);const rect=await canvas.boundingBox(),uv=(await canvas.getAttribute('data-screen')).split(',').map(Number),x=rect.x+rect.width*uv[0],y=rect.y+rect.height*uv[1];
 if(!mobile){await p.mouse.move(x,y);await p.mouse.down();await p.mouse.move(x-30,y+20,{steps:8});await expect(canvas).toHaveAttribute('data-held','true');await p.mouse.up();await expect(canvas).toHaveAttribute('data-held','false');}
 await p.getByRole('button',{name:'打個招呼',exact:false}).click();await expect(canvas).not.toHaveAttribute('data-reaction','none');
 await p.getByRole('button',{name:'體驗迷你陪伴'}).click();await expect(p.locator('main')).toHaveClass('app pet');await expect(canvas).toHaveAttribute('data-companion','puff',{timeout:60000});const pet=await state(p);if(pet.bloom||pet.transmission!==0)throw Error('Pet alpha pipeline invalid');
 await p.getByRole('button',{name:'返回星球'}).click();await expect(canvas).toHaveAttribute('data-companion','puff',{timeout:60000});await p.getByRole('button',{name:'更換角色',exact:true}).click();await p.screenshot({path:`artifacts/resident-final/picker-${platform}.png`});await p.getByRole('button',{name:'關閉角色選擇'}).click();
 report.cases.push({platform,selected,pet,passed:true,selectionAndTimerPersisted:true});console.log(platform+': nine distinct residents, opacity, timer, reload, greeting and pet verified');await p.close();
}}finally{await browser.close();await writeFile('artifacts/resident-final/interaction-results.json',JSON.stringify(report,null,2));}
if(report.errors.length||report.cases.length!==2)process.exitCode=1;
