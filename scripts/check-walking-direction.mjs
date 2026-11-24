import {chromium,expect} from '@playwright/test';import {writeFile} from 'node:fs/promises';
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--enable-webgl']});
const report={errors:[],cases:[]};
try{for(const materialQuery of [false,true]){
 const p=await b.newPage({viewport:{width:1100,height:800}});p.on('pageerror',e=>report.errors.push(e.message));await p.goto('http://127.0.0.1:5173/'+(materialQuery?'?nebula-material=mist':''));const canvas=p.locator('canvas');await expect(canvas).toHaveAttribute('data-companion','nebula',{timeout:60000});
 await p.evaluate(async()=>{const {useWorld}=await import('/src/store.ts');useWorld.getState().goTo(-.72,-2.6);});
 await expect.poll(async()=>p.evaluate(()=>{const d=document.querySelector('canvas').dataset,step=d.step?.split(',').map(Number)||[0,0],heading=Number(d.heading),len=Math.hypot(...step);return d.action==='walk'&&len>.0001&&step[1]<0&&(Math.sin(heading)*step[0]+Math.cos(heading)*step[1])/len>.90&&d.faceVisible==='false';}),{timeout:45000}).toBe(true);
 const away=await canvas.evaluate(c=>({...c.dataset}));await p.screenshot({path:`artifacts/motion-review/away-${materialQuery?'material-route':'default'}.png`});
 await p.evaluate(async()=>{const {useWorld}=await import('/src/store.ts');useWorld.getState().goTo(-.72,.15);});
 await expect.poll(async()=>p.evaluate(()=>{const d=document.querySelector('canvas').dataset,step=d.step?.split(',').map(Number)||[0,0],heading=Number(d.heading),len=Math.hypot(...step);return d.action==='walk'&&len>.0001&&step[1]>0&&(Math.sin(heading)*step[0]+Math.cos(heading)*step[1])/len>.90&&d.faceVisible==='true';}),{timeout:45000}).toBe(true);
 const toward=await canvas.evaluate(c=>({...c.dataset}));report.cases.push({materialQuery,away,toward,passed:true});console.log((materialQuery?'Material URL':'Default URL')+': walks forward in either direction; face disappears from rear and returns from front');await p.close();
}}finally{await b.close();await writeFile('artifacts/motion-review/heading-results.json',JSON.stringify(report,null,2));}
if(report.errors.length||report.cases.length!==2)process.exitCode=1;
