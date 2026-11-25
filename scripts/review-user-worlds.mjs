import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const folder='artifacts/user-worlds';await mkdir(folder,{recursive:true});
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});const errors=[];
try {
 const page=await browser.newPage({viewport:{width:1100,height:900}});page.on('pageerror',e=>errors.push(e.message));
 for(const id of ['b612','moon','rose','forest'])for(const view of ['quarter','side','back']) {
  await page.goto(`http://127.0.0.1:5173/?world-model-review&world=${id}&view=${view}`);
  await expect(page.locator('canvas')).toHaveAttribute('data-user-model-ready','true',{timeout:60000});await page.waitForTimeout(500);
  await page.screenshot({path:`${folder}/${id}-${view}.png`});console.log('CAPTURED',id,view);
 }
}finally{await browser.close();await writeFile(`${folder}/render-check.json`,JSON.stringify({errors,passed:!errors.length},null,2));}
if(errors.length)process.exitCode=1;
