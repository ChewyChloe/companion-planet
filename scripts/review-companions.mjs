import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const ids = [
  "nebula",
  "sprout",
  "fern",
  "mushroom",
  "aurora",
  "blossom",
  "stardust",
  "water",
  "puff",
];
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
  residents: [],
};
await mkdir("artifacts/interaction", { recursive: true });
try {
  for (const id of ids) {
    const page = await browser.newPage({
      viewport: { width: 480, height: 540 },
    });
    page.on("console", (m) => {
      if (
        m.type() === "error" &&
        !/^https:\/\/fonts\.(googleapis|gstatic)\.com/.test(m.location().url)
      )
        report.errors.push(`${id}: ${m.text()}`);
    });
    page.on("pageerror", (e) => report.errors.push(`${id}: ${e.message}`));
    await page.goto(`http://127.0.0.1:5173/?art-review&companion=${id}`);
    await page.waitForFunction(
      () => Number(document.querySelector("canvas")?.dataset.frames) > 15,
    );
    const geometry = await page.evaluate(async () => {
      const url = performance
        .getEntriesByType("resource")
        .map((x) => x.name)
        .find((x) => x.includes("/@react-three_fiber.js"));
      const { _roots } = await import(url);
      const s = _roots.get(document.querySelector("canvas")).store.getState();
      s.setFrameloop("never");
      s.gl.setPixelRatio(1);
      s.gl.render(s.scene, s.camera);
      const names = [];
      s.scene.traverse((n) => {
        if (n.name.startsWith("Crown-")) names.push(n.name);
      });
      return {
        id: s.gl.domElement.dataset.companion,
        crowns: names,
        triangles: s.gl.info.render.triangles,
        calls: s.gl.info.render.calls,
      };
    });
    if (
      geometry.id !== id ||
      (id !== "nebula" && !geometry.crowns.includes(`Crown-${id}`))
    )
      throw Error(`Missing live geometry: ${id}`);
    await page.screenshot({ path: `artifacts/interaction/${id}-front.png` });
    report.residents.push(geometry);
    await page.close();
  }
  const world = await browser.newPage({
    viewport: { width: 1366, height: 768 },
  });
  world.on("pageerror", (e) => report.errors.push(`speech: ${e.message}`));
  await world.goto("http://127.0.0.1:5173");
  await world.waitForFunction(
    () => Number(document.querySelector("canvas")?.dataset.frames) > 15,
  );
  await world.evaluate(() => {
    const previous = Math.random;
    try {
      Math.random = () => 0.99;
      document.querySelector(".caption-greeting").click();
    } finally {
      Math.random = previous;
    }
  });
  await world.getByRole("note").waitFor();
  await world.screenshot({ path: "artifacts/interaction/speech-desktop.png" });
  await world.getByRole("button", { name: "體驗迷你陪伴" }).click();
  await world.waitForFunction(
    () => Number(document.querySelector("canvas")?.dataset.frames) > 15,
  );
  await world.screenshot({
    path: "artifacts/interaction/mini-companion.png",
    omitBackground: true,
  });
  await world.close();
} finally {
  await browser.close();
  await writeFile(
    "artifacts/interaction/visual-results.json",
    JSON.stringify(report, null, 2),
  );
}
if (report.errors.length) process.exitCode = 1;
