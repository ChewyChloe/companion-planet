import {chromium} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
await mkdir('artifacts',{recursive:true});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
try{
 const page=await browser.newPage({viewport:{width:1366,height:768}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:5173');await page.waitForFunction(()=>Number(document.querySelector('canvas')?.dataset.frames)>30);
 await page.screenshot({path:'artifacts/planet-overview.png'});
 const measurement=await page.evaluate(async()=>{
  const canvas=document.querySelector('canvas');const gl=canvas.getContext('webgl2');const ext=gl.getExtension('WEBGL_debug_renderer_info');const renderer=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);const intervals=[];let previous=performance.now(),running=true;const start=previous;
  await new Promise(resolve=>{setTimeout(()=>{running=false;resolve(null);},3000);const frame=now=>{if(!running)return;intervals.push(now-previous);previous=now;requestAnimationFrame(frame);};requestAnimationFrame(frame);});
  intervals.sort((a,b)=>a-b);return {renderer,seconds:(performance.now()-start)/1000,frames:intervals.length,averageFps:intervals.length/((performance.now()-start)/1000),p95FrameMs:intervals[Math.floor(intervals.length*.95)],dpr:devicePixelRatio,viewport:[innerWidth,innerHeight],note:'Headless software-rendered observation; not representative of Windows GPU performance.'};
 });
 await page.getByRole('button',{name:'開始專注',exact:false}).click();await page.waitForFunction(()=>document.querySelector('canvas')?.dataset.action==='read');await page.waitForFunction(()=>document.querySelector('main')?.dataset.activity==='read');await page.screenshot({path:'artifacts/focus-reading.png'});
 await page.getByRole('button',{name:'和星雲仔說說話'}).click();await page.getByLabel('想對星雲仔說的話').fill('今天報告好多，好累');await page.getByRole('button',{name:'送出訊息'}).click();await page.locator('.message.assistant').waitFor();await page.screenshot({path:'artifacts/focus-chat.png'});
 await writeFile('artifacts/performance.json',JSON.stringify({...measurement,errors,observedAt:new Date().toISOString()},null,2)+'\n');console.log(JSON.stringify({averageFps:measurement.averageFps,renderer:measurement.renderer,errors}));
}finally{await browser.close();}
