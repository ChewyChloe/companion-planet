import { chromium, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const destination="artifacts/nebula-expressions";
await mkdir(destination,{recursive:true});
const browser=await chromium.launch({
  executablePath:process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args:["--no-sandbox","--use-gl=angle","--use-angle=swiftshader"],
});
const base=process.env.BASE_URL || "http://127.0.0.1:5173";
const cases = {
  calm:"0,0,0,0,0", happy:"1,1,1,1,1", shy:"1,1,0,0,0",
  surprised:"3,3,1,1,2", curious:"0,0,2,2,4", sad:"4,4,3,3,3",
  pout:"4,4,3,3,4", sleepy:"2,2,0,0,0", proud:"0,0,1,1,0",
  spaced:"0,0,0,0,2", angry:"0,0,4,4,4", giggle:"1,1,2,2,0",
};
try {
  const page=await browser.newPage({viewport:{width:530,height:615}});
  const errors=[];
  page.on("pageerror",error=>errors.push(error.message));
  page.on("console",m=>{if(m.type()==="error" && /THREE|shader/i.test(m.text()))errors.push(m.text());});
  await page.goto(base+"/?nebula-expressions&still");
  const canvas=page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-model-ready","user-nebula",{timeout:90000});
  for(const [name,face] of Object.entries(cases)){
    await page.getByLabel("表情預設").selectOption(name);
    await expect(canvas).toHaveAttribute("data-face",face);
    await expect(canvas).toHaveAttribute("data-face-blend","1.00");
    await canvas.screenshot({path:`${destination}/${name}.png`});
    console.log("Captured",name);
  }
  await page.getByLabel("左眼",{exact:true}).selectOption("2");
  await expect(canvas).toHaveAttribute("data-face","2,1,2,2,0");
  await page.getByLabel("右眉",{exact:true}).selectOption("4");
  await page.getByLabel("嘴巴",{exact:true}).selectOption("3");
  await expect(canvas).toHaveAttribute("data-face","2,1,2,4,3");
  await page.getByLabel("表情預設").selectOption("calm");
  for (const angle of ["front","side","bottom"]){
    await page.getByLabel("視角").selectOption(angle);
    await expect(canvas).toHaveAttribute("data-model-ready","user-nebula",{timeout:90000});
    await canvas.screenshot({path:`${destination}/feet-${angle}.png`});
  }
  await page.getByLabel("姿勢").selectOption("read");
  await expect.poll(async()=>Number(await canvas.getAttribute("data-seated-pose")),{timeout:30000}).toBeGreaterThan(.98);
  await canvas.screenshot({path:`${destination}/feet-seated.png`});
  await page.goto(base+"/?nebula-expressions&view=side&pose=walk");
  await expect(canvas).toHaveAttribute("data-supplied-clip","Walk",{timeout:90000});
  await canvas.screenshot({path:`${destination}/feet-walk.png`});
  await page.getByLabel("表情預設").selectOption("happy");
  await page.getByLabel("視角").selectOption("front");
  await page.getByLabel("姿勢").selectOption("happy");
  await expect(canvas).toHaveAttribute("data-supplied-clip","Bounce",{timeout:90000});
  await canvas.screenshot({path:`${destination}/happy-bounce.png`});
  expect(errors).toEqual([]);
} finally { await browser.close(); }
