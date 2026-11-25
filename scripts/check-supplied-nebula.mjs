import { chromium, expect } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const folder='artifacts/supplied-nebula';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
const report={cases:[],errors:[]};
async function simulate(page,seconds) {
 return page.evaluate(async seconds=>{
  const url=performance.getEntriesByType('resource').map(x=>x.name).find(n=>n.includes('/@react-three_fiber.js'));
  const {_roots}=await import(url);const s=_roots.get(document.querySelector('canvas')).store.getState();
  // Advance only the real character controller and animation callbacks. Do not
  // run the software renderer thousands of times during deterministic sampling.
  const handlers=s.internal.subscribers.filter(x=>/supportTilt|suppliedClip/.test(x.ref.current.toString()));
  if(handlers.length!==2)throw Error('Character frame callbacks not found');
  let maxTilt=0;
  for(let i=0;i<seconds*60;i++){for(const x of handlers)x.ref.current(s,1/60);maxTilt=Math.max(maxTilt,Number(document.querySelector('canvas').dataset.supportTilt));}
  return {maxTilt,position:document.querySelector('canvas').dataset.position};
 },seconds);
}
async function inspect(page){return page.evaluate(async()=>{
 const url=performance.getEntriesByType('resource').map(x=>x.name).find(n=>n.includes('/@react-three_fiber.js'));const {_roots}=await import(url);const s=_roots.get(document.querySelector('canvas')).store.getState();s.scene.updateMatrixWorld(true);
 const {contactFloor}=await import('/src/art/world-collision.ts');
 const root=s.scene.getObjectByName('SuppliedNebula');let body;root.traverse(n=>{if(n.isSkinnedMesh)body=n;});body.skeleton.update();
 let mesh;s.scene.getObjectByName('UserIsland-'+document.querySelector('main').dataset.planet).traverse(n=>{if(n.isMesh)mesh=n;});
 const source=mesh;
 const colliders=[source];s.scene.getObjectByName('ReadingChair')?.traverse(n=>{if(n.isMesh)colliders.push(n);});
 const mats=colliders.flatMap(m=>Array.isArray(m.material)?m.material:[m.material]),sides=mats.map(m=>m.side);mats.forEach(m=>m.side=2);
 const ray=new s.raycaster.constructor(),v=s.camera.position.clone();ray.ray.direction.set(1,0,0);let inside=0,ambiguous=0,samples=0,minY=Infinity,maxY=-Infinity;const points=[],details=[];
 for(let i=0;i<body.geometry.attributes.position.count;i+=Math.max(1,Math.floor(body.geometry.attributes.position.count/200))){body.getVertexPosition(i,v);body.localToWorld(v);minY=Math.min(minY,v.y);maxY=Math.max(maxY,v.y);ray.ray.origin.copy(v);ray.ray.direction.set(1,0,0);let penetrates=false;
 for(const collider of colliders){const hits=ray.intersectObject(collider,false).filter(h=>h.distance>.003);const unique=hits.filter((h,j)=>!j||Math.abs(h.distance-hits[j-1].distance)>.0001);if(unique.length%2)penetrates=true;}
 if(penetrates){
   let votes=1;
   for(const direction of [[0,1,0],[0,0,1]]){
     ray.ray.direction.set(...direction);let hitAny=false;
     for(const collider of colliders){const hits=ray.intersectObject(collider,false).filter(h=>h.distance>.003);const unique=hits.filter((h,j)=>!j||Math.abs(h.distance-hits[j-1].distance)>.0001);if(unique.length%2)hitAny=true;}
     if(hitAny)votes++;
   }
   if(votes>=2){inside++;points.push(v.toArray());}else ambiguous++;
   details.push({index:i,point:v.toArray(),rawY:body.geometry.attributes.position.getY(i),votes,floor:contactFloor(document.querySelector('main').dataset.planet,v)});
 }samples++;}
 mats.forEach((m,i)=>m.side=sides[i]);return {inside,ambiguous,samples,minY,maxY,points,details,rootY:s.scene.getObjectByName("CharacterPlacement").position.y,footLift:document.querySelector("canvas").dataset.footCorrection,clip:document.querySelector('canvas').dataset.suppliedClip};
});}
try{for(const mobile of (process.env.DESKTOP_ONLY? [false]:[false,true])){const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1200,height:850},hasTouch:mobile,isMobile:mobile});page.on('pageerror',e=>report.errors.push(e.message));
 for(const id of (process.env.WORLDS?process.env.WORLDS.split(','):(mobile?['b612']:['b612','moon','rose','forest']))){
 await page.addInitScript(id=>localStorage.setItem('companion-planet-v1',JSON.stringify({planetId:id,reduced:true})),id);await page.goto('http://127.0.0.1:5173/');const canvas=page.locator('canvas');await expect(canvas).toHaveAttribute('data-model-ready','user-nebula',{timeout:90000});await expect(canvas).toHaveAttribute('data-planet-model',`user-world-${id}`,{timeout:90000});
 const spawn=await inspect(page);await page.screenshot({path:`${folder}/${mobile?'phone':'desktop'}-${id}.png`});
 await page.getByRole('button',{name:'讀書',exact:true}).click();let maxTilt=0;
 for(let i=0;i<3;i++){maxTilt=Math.max(maxTilt,(await simulate(page,5)).maxTilt);await page.waitForTimeout(100);}
 const position=(await canvas.getAttribute('data-position')).split(',').map(Number);expect(Math.hypot(position[0]-.72,position[2]-.23),id).toBeLessThan(.08);
 const reading=await inspect(page);await page.screenshot({path:`${folder}/${mobile?'phone':'desktop'}-${id}-reading.png`});
 await page.evaluate(async()=>{const {useWorld}=await import('/src/store.ts');useWorld.getState().goTo(-1,1);});
 for(let i=0;i<3;i++){maxTilt=Math.max(maxTilt,(await simulate(page,5)).maxTilt);await page.waitForTimeout(100);}
 const walking=await inspect(page);await page.screenshot({path:`${folder}/${mobile?'phone':'desktop'}-${id}-walking.png`});expect(maxTilt).toBeLessThanOrEqual(8.001);
 report.cases.push({id,mobile,maxTilt,spawn,reading,walking});console.log(id,mobile?'phone':'desktop','inside',spawn.inside,reading.inside,walking.inside);await writeFile(`${folder}/results.json`,JSON.stringify(report,null,2));
 }
 await page.close();}
}finally{await browser.close();await writeFile(`${folder}/results.json`,JSON.stringify(report,null,2));}
if(report.errors.length||report.cases.some(c=>c.spawn.inside||c.reading.inside||c.walking.inside))process.exitCode=1;
