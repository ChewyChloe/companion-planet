import { chromium, expect } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
const errors=[];let result;
try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 page.on('pageerror',e=>errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error'&&/Content Security Policy|THREE\.|WebGL/i.test(m.text()))errors.push(m.text());});
 await page.goto(process.env.BASE_URL || 'http://127.0.0.1:3006/');
 const canvas=page.locator('canvas');
 await expect(canvas).toHaveAttribute('data-model-ready','user-nebula',{timeout:90000});
 await expect(canvas).toHaveAttribute('data-planet-finish','storybook-pbr-1',{timeout:60000});
 await expect(canvas).toHaveAttribute('data-supplied-clip','AntennaSway');
 await expect.poll(async()=>Number(await canvas.getAttribute('data-frames')),{timeout:60000}).toBeGreaterThan(3);
 expect(errors).toEqual([]);
 result={passed:true,productionServer:true,mobile:true,model:await canvas.getAttribute('data-model-path'),finish:await canvas.getAttribute('data-planet-finish'),errors};
 await page.screenshot({path:'artifacts/supplied-nebula/production-phone.png'});
}finally{await browser.close();await writeFile('artifacts/supplied-nebula/production.json',JSON.stringify(result||{passed:false,errors},null,2));}
