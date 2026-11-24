// Historical baseline collector for ef9c07d before sculpt replacement.
// For the current asset use scripts/visual-qa.mjs.
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
  ],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  await page.goto("http://127.0.0.1:5173", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () => Number(document.querySelector("canvas")?.dataset.frames) > 30,
  );
  await page.evaluate(() => document.fonts.load("16px Huninn", "同頻星球"));
  await page.screenshot({ path: "artifacts/art/before/planet.png" });
  await page.getByRole("button", { name: "開始專注", exact: false }).click();
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.action === "read",
  );
  await page.screenshot({ path: "artifacts/art/before/read.png" });
  await page.getByRole("button", { name: "重設計時器" }).click();
  await page.getByRole("button", { name: "體驗迷你陪伴" }).click();
  await page.waitForFunction(
    () => Number(document.querySelector("canvas")?.dataset.frames) > 30,
  );
  const info = await page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .map((x) => x.name)
      .find((x) => x.includes("/@react-three_fiber.js"));
    if (!url) throw Error("Fiber module not observed");
    const module = await import(url);
    const state = module._roots
      .get(document.querySelector("canvas"))
      .store.getState();
    state.setFrameloop("never");
    let body;
    state.scene.traverse((obj) => {
      if (obj.geometry?.type === "LatheGeometry" && !body) body = obj;
    });
    if (!body) throw Error("Current body not found");
    const model = body.parent.parent;
    model.rotation.set(0, 0, 0);
    state.gl.setClearColor("#f4f1e8", 1);
    window.__ART_AUDIT = { state, model };
    state.gl.render(state.scene, state.camera);
    return {
      renderer: state.gl
        .getContext()
        .getParameter(state.gl.getContext().RENDERER),
      triangles: state.gl.info.render.triangles,
      calls: state.gl.info.render.calls,
      geometry: body.geometry.type,
      skinned: !!body.isSkinnedMesh,
    };
  });
  for (const [name, angle] of [
    ["front", 0],
    ["side", Math.PI / 2],
    ["back", Math.PI],
    ["quarter", Math.PI / 4],
  ]) {
    await page.evaluate((angle) => {
      const { state, model } = window.__ART_AUDIT;
      model.rotation.y = angle;
      state.gl.render(state.scene, state.camera);
    }, angle);
    await page
      .locator("canvas")
      .screenshot({ path: `artifacts/art/before/${name}.png` });
  }
  await writeFile(
    "artifacts/art/before/metrics.json",
    JSON.stringify(info, null, 2) + "\n",
  );
  console.log(info);
} finally {
  await browser.close();
}
