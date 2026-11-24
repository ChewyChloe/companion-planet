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
      () => !!document.querySelector("canvas")?.dataset.pose,
    );
    const geometry = await page.evaluate(async () => {
      const url = performance
        .getEntriesByType("resource")
        .map((x) => x.name)
        .find((x) => x.includes("/@react-three_fiber.js"));
      const { _roots } = await import(url);
      const s = _roots.get(document.querySelector("canvas")).store.getState();
      s.setFrameloop("never");
      // Neutral open eyes keep blinking from hiding facial/material comparisons.
      for (const name of ["LeftEye", "RightEye"]) {
        const eye = s.scene.getObjectByName(name);
        if (eye) eye.scale.y = eye.scale.x;
      }
      s.gl.setPixelRatio(1);
      s.gl.render(s.scene, s.camera);
      const names = [];
      s.scene.traverse((n) => {
        if (n.name.startsWith("Crown-")) names.push(n.name);
      });
      return {
        id: s.gl.domElement.dataset.companion,
        skinMode: s.gl.domElement.dataset.skinMode,
        roughness: s.scene.getObjectByName("Body").material.roughness,
        iridescence: s.scene.getObjectByName("Body").material.iridescence,
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
    if (id === "nebula") {
      for (const [view, angle] of [
        ["side", Math.PI / 2],
        ["back", Math.PI],
        ["quarter", Math.PI / 4],
      ]) {
        await page.evaluate(async (angle) => {
          const url = performance
            .getEntriesByType("resource")
            .map((x) => x.name)
            .find((n) => n.includes("/@react-three_fiber.js"));
          const { _roots } = await import(url);
          const s = _roots
            .get(document.querySelector("canvas"))
            .store.getState();
          const figure = s.scene.children.find(
            (n) => n.type === "Group" && n.getObjectByName("Body"),
          );
          figure.rotation.y = angle;
          s.gl.render(s.scene, s.camera);
        }, angle);
        await page.screenshot({
          path: `artifacts/interaction/nebula-${view}.png`,
        });
      }
      report.nebulaAngles = ["front", "side", "back", "quarter"];
    }
    report.residents.push(geometry);
    if (id === "water" || id === "aurora") {
      const physical = await page.evaluate(async () => {
        const url = performance
          .getEntriesByType("resource")
          .map((x) => x.name)
          .find((n) => n.includes("/@react-three_fiber.js"));
        const { _roots } = await import(url);
        const s = _roots.get(document.querySelector("canvas")).store.getState();
        const m = s.scene.getObjectByName("Body").material;
        m.transmission = m.userData.profile.transmission;
        m.opacity = 1;
        m.transparent = false;
        m.needsUpdate = true;
        s.gl.transmissionResolutionScale = 0.35;
        s.gl.render(s.scene, s.camera);
        return {
          transmission: m.transmission,
          iridescence: m.iridescence,
          glError: s.gl.getContext().getError(),
        };
      });
      await page.screenshot({
        path: `artifacts/interaction/${id}-transmission.png`,
      });
      report.residents.at(-1).isolatedPhysical = physical;
      if (physical.glError !== 0)
        report.errors.push(
          `${id}: physical render GL error ${physical.glError}`,
        );
    }
    await page.close();
  }
  const world = await browser.newPage({
    viewport: { width: 1366, height: 768 },
  });
  world.on("pageerror", (e) => report.errors.push(`speech: ${e.message}`));
  await world.goto("http://127.0.0.1:5173");
  await world.waitForFunction(
    () => !!document.querySelector("canvas")?.dataset.pose,
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
    () => !!document.querySelector("canvas")?.dataset.pose,
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
