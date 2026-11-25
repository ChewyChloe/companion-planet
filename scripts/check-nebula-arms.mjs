import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const out='artifacts/nebula-arms';await mkdir(out,{recursive:true});
const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist']});const errors=[],cases=[];
try{const p=await b.newPage({viewport:{width:800,height:800}});p.on('pageerror',e=>errors.push(e.message));
for(const [pose,clip] of [['idle','AntennaSway'],['walk','Walk'],['happy','Bounce'],['listen','Wave']]){
 await p.goto(`http://127.0.0.1:5173/?art-review&companion=nebula&capture&pose=${pose}`);
 const canvas=p.locator('canvas');await expect(canvas).toHaveAttribute('data-model-ready','user-nebula',{timeout:60000});await expect(canvas).toHaveAttribute('data-supplied-clip',clip);
 await expect.poll(async()=>Number(await canvas.getAttribute('data-frames')),{timeout:60000}).toBeGreaterThanOrEqual(15);
 await canvas.screenshot({path:`${out}/${pose}.png`});cases.push({pose,clip,animated:true});console.log('CAPTURED',pose);
}expect(errors).toEqual([]);
}finally{await b.close();await writeFile(`${out}/results.json`,JSON.stringify({cases,errors},null,2));}
