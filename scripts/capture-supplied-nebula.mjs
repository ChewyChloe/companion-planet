import { chromium, expect } from '@playwright/test';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});
try {
 const page=await browser.newPage({viewport:{width:800,height:800}});
 for(const view of ['front','quarter','side','back']){
  await page.goto(`http://127.0.0.1:5173/?art-review&companion=nebula&capture&still&view=${view}`);
  const canvas=page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-model-ready','user-nebula',{timeout:60000});
  await expect.poll(async()=>Number(await canvas.getAttribute('data-frames')),{timeout:60000}).toBeGreaterThanOrEqual(15);
  await canvas.screenshot({path:`artifacts/supplied-nebula/model-${view}.png`});
 }
} finally {await browser.close();}
