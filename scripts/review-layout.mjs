import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("artifacts/layout", { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
  args: [
    "--no-sandbox",
    "--use-gl=angle",
    "--use-angle=swiftshader",
    "--enable-webgl",
    "--ignore-gpu-blocklist",
  ],
});
const report = {
  generatedAt: new Date().toISOString(),
  errors: [],
  views: {},
  screenshotDpr: 1,
};
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["wide", 1824, 1361],
    ["tablet", 1024, 768],
    ["phone", 390, 844],
    ["small-phone", 360, 640],
    ["landscape", 844, 390],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    page.on("pageerror", (e) => report.errors.push(e.message));
    page.on("console", (m) => {
      if (
        m.type() === "error" &&
        !/^https:\/\/fonts\.(googleapis|gstatic)\.com/.test(m.location().url)
      )
        report.errors.push(m.text());
    });
    await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (r) =>
      r.abort(),
    );
    await page.goto("http://127.0.0.1:5173");
    await page.waitForFunction(
      () => Number(document.querySelector("canvas")?.dataset.frames) > 30,
    );
    await page.evaluate(() => document.fonts.load("16px Huninn", "同頻星球"));
    await page.getByRole("button", { name: "開始專注", exact: true }).click();
    await page.waitForFunction(
      () => document.querySelector("canvas")?.dataset.action === "read",
      undefined,
      { timeout: 30000 },
    );
    report.views[name] = await page.evaluate(async () => {
      const url = performance
        .getEntriesByType("resource")
        .map((x) => x.name)
        .find((x) => x.includes("/@react-three_fiber.js"));
      const { _roots } = await import(url);
      const s = _roots.get(document.querySelector("canvas")).store.getState();
      s.setFrameloop("never");
      await new Promise((r) => setTimeout(r, 300));
      s.gl.setPixelRatio(1);
      s.gl.render(s.scene, s.camera);
      const hud = document.querySelector(".focus-hud").getBoundingClientRect();
      const point = s.gl.domElement.dataset.screen.split(",").map(Number);
      const center = document.elementFromPoint(
        point[0] * innerWidth,
        point[1] * innerHeight,
      );
      return {
        width: innerWidth,
        height: innerHeight,
        overflow:
          document.documentElement.scrollWidth > innerWidth ||
          document.documentElement.scrollHeight > innerHeight + 1,
        hud: { x: hud.x, y: hud.y, width: hud.width, height: hud.height },
        actorScreen: point,
        actorUncovered: center?.tagName === "CANVAS",
        lakePresent: !!s.scene.getObjectByName("Lake"),
        shorelinePresent: !!s.scene.getObjectByName("TerrainRock"),
        ...s.gl.domElement.dataset,
      };
    });
    await page.screenshot({ path: `artifacts/layout/${name}.png` });
    await page.close();
  }
  if (report.errors.length) throw Error(report.errors.join("\n"));
  for (const [name, v] of Object.entries(report.views))
    if (v.overflow || !v.actorUncovered || !v.lakePresent)
      throw Error(`Invalid layout: ${name}`);
  report.completed = true;
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.errors.push(error.message);
  throw error;
} finally {
  await writeFile(
    "artifacts/layout/visual-results.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
