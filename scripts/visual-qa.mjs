import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const dir = "artifacts/art/after";
await mkdir(dir, { recursive: true });
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
  completed: false,
  generatedAt: new Date().toISOString(),
  errors: [],
  views: {},
  animations: {},
  scenes: {},
};
try {
  const page = await browser.newPage({ viewport: { width: 640, height: 720 } });
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !/^https:\/\/fonts\.(googleapis|gstatic)\.com/.test(m.location().url)
    )
      report.errors.push(m.text());
  });
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
    route.abort(),
  );
  const ready = async () => {
    await page.waitForFunction(
      () => Number(document.querySelector("canvas")?.dataset.frames) > 30,
      { timeout: 30000 },
    );
  };
  const data = () => page.locator("canvas").evaluate((c) => ({ ...c.dataset }));
  // Capture art at DPR 1 from the real renderer; keep adaptive runtime FPS separate.
  const qualityScreenshot = async (name) => {
    await page.evaluate(async () => {
      const url = performance
        .getEntriesByType("resource")
        .map((x) => x.name)
        .find((x) => x.includes("/@react-three_fiber.js"));
      const { _roots } = await import(url);
      const state = _roots
        .get(document.querySelector("canvas"))
        .store.getState();
      const ratio = state.gl.getPixelRatio();
      state.setFrameloop("never");
      await new Promise((r) => setTimeout(r, 300));
      state.gl.setPixelRatio(1);
      state.gl.render(state.scene, state.camera);
      window.__ART_CAPTURE = { state, ratio };
    });
    try {
      await page.screenshot({ path: `${dir}/${name}.png` });
    } finally {
      await page.evaluate(() => {
        const { state, ratio } = window.__ART_CAPTURE;
        state.gl.setPixelRatio(ratio);
        state.gl.render(state.scene, state.camera);
        state.setFrameloop("always");
        delete window.__ART_CAPTURE;
      });
    }
  };
  for (const view of ["front", "side", "back", "quarter"]) {
    await page.goto(`http://127.0.0.1:5173/?art-review&view=${view}`);
    await ready();
    await page.screenshot({ path: `${dir}/${view}.png` });
    report.views[view] = await data();
  }
  for (const action of [
    "idle",
    "walk",
    "read",
    "rest",
    "happy",
    "listen",
    "stretch",
    "approach",
    "return",
  ]) {
    await page.goto(`http://127.0.0.1:5173/?art-review&pose=${action}`);
    await ready();
    const a = await data();
    await page.waitForFunction(
      (previous) => document.querySelector("canvas")?.dataset.pose !== previous,
      a.pose,
      { timeout: 8000 },
    );
    const b = await data();
    await page.screenshot({ path: `${dir}/pose-${action}.png` });
    report.animations[action] = {
      status: "Passed",
      poseA: a.pose,
      poseB: b.pose,
    };
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("http://127.0.0.1:5173/");
  await ready();
  await page.evaluate(() => document.fonts.load("16px Huninn", "同頻星球"));
  await qualityScreenshot("planet");
  // Inspect the actual mounted scene without adding any production debug API.
  const inspect = async () =>
    page.evaluate(async () => {
      const url = performance
        .getEntriesByType("resource")
        .map((x) => x.name)
        .find((x) => x.includes("/@react-three_fiber.js"));
      const m = await import(url);
      const s = m._roots.get(document.querySelector("canvas")).store.getState();
      const nodes = [];
      s.scene.traverse((n) => {
        if (n.isBone || n.isSkinnedMesh)
          nodes.push({ name: n.name, type: n.type });
      });
      return {
        triangles: s.gl.info.render.triangles,
        calls: s.gl.info.render.calls,
        geometryCount: s.gl.info.memory.geometries,
        nodes,
        webgl: s.gl.getContext().getParameter(s.gl.getContext().RENDERER),
        ...s.gl.domElement.dataset,
      };
    });
  report.scenes.planet = await inspect();
  const a = await data(),
    t = Date.now();
  await page.waitForTimeout(8000);
  const b = await data();
  report.scenes.planet.fps =
    ((Number(b.frames) - Number(a.frames)) * 1000) / (Date.now() - t);
  await page.getByRole("button", { name: "開始專注", exact: false }).click();
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.action === "read",
    { timeout: 30000 },
  );
  await page.waitForTimeout(1500);
  await qualityScreenshot("read");
  report.scenes.read = await inspect();
  report.scenes.readContact = await page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .map((x) => x.name)
      .find((x) => x.includes("/@react-three_fiber.js"));
    const { _roots } = await import(url);
    const s = _roots.get(document.querySelector("canvas")).store.getState();
    s.scene.updateMatrixWorld(true);
    const seat = s.scene.getObjectByName("Seat"),
      body = s.scene.getObjectByName("Body");
    seat.geometry.computeBoundingBox();
    const bounds = seat.geometry.boundingBox
      .clone()
      .applyMatrix4(seat.matrixWorld);
    const collisionBounds = ["DeskSurface", "ChairBack"].map((name) => {
      const mesh = s.scene.getObjectByName(name);
      mesh.geometry.computeBoundingBox();
      return {
        name,
        box: mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld),
        count: 0,
      };
    });
    const p = s.camera.position.clone();
    let underside = Infinity;
    for (let i = 0; i < body.geometry.attributes.position.count; i++) {
      body.getVertexPosition(i, p);
      p.applyMatrix4(body.matrixWorld);
      for (const bounds of collisionBounds)
        if (bounds.box.containsPoint(p)) bounds.count++;
      if (Math.abs(p.x - 0.72) < 0.045 && Math.abs(p.z - 0.23) < 0.15)
        underside = Math.min(underside, p.y);
    }
    const view = s.camera.view ? { ...s.camera.view } : null;
    const old = s.camera.position.clone(),
      quaternion = s.camera.quaternion.clone();
    s.setFrameloop("never");
    await new Promise((resolve) => setTimeout(resolve, 300));
    const ratio = s.gl.getPixelRatio();
    s.gl.setPixelRatio(1);
    s.camera.clearViewOffset();
    s.camera.position.set(-2, 1.6, 2.5);
    s.camera.lookAt(0.72, 0.8, 0.23);
    s.gl.render(s.scene, s.camera);
    window.__ART_CAMERA = { s, old, quaternion, ratio, view };
    return {
      intersections: Object.fromEntries(
        collisionBounds.map((b) => [b.name, b.count]),
      ),
      seatTop: bounds.max.y,
      bodyUnderside: underside,
      gap: underside - bounds.max.y,
    };
  });
  await page.locator("canvas").screenshot({ path: `${dir}/read-contact.png` });
  await page.evaluate(() => {
    const { s, old, quaternion, ratio, view } = window.__ART_CAMERA;
    if (view?.enabled)
      s.camera.setViewOffset(
        view.fullWidth,
        view.fullHeight,
        view.offsetX,
        view.offsetY,
        view.width,
        view.height,
      );
    s.gl.setPixelRatio(ratio);
    s.camera.position.copy(old);
    s.camera.quaternion.copy(quaternion);
    s.gl.render(s.scene, s.camera);
    s.setFrameloop("always");
    delete window.__ART_CAMERA;
  });
  await page.getByRole("button", { name: "計時設定" }).click();
  await page.getByRole("button", { name: "重設計時器" }).click();
  await page.getByRole("button", { name: "收合計時設定" }).click();
  await page.waitForTimeout(1000);
  await page.evaluate(async () => {
    const { useWorld } = await import("/src/store.ts");
    useWorld.setState({ reaction: "rest", reactionUntil: Date.now() + 60000 });
  });
  await page.waitForFunction(
    () => document.querySelector("canvas")?.dataset.action === "rest",
    { timeout: 30000 },
  );
  await page.waitForTimeout(1200);
  await qualityScreenshot("rest");
  report.scenes.rest = await inspect();
  await page.getByRole("button", { name: "體驗迷你陪伴" }).click();
  await ready();
  await qualityScreenshot("pet");
  report.scenes.pet = await inspect();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "返回星球" }).click();
  await ready();
  await qualityScreenshot("mobile");
  report.scenes.mobile = await inspect();
  for (const [name, count] of Object.entries(
    report.scenes.readContact.intersections,
  ))
    if (count > 0)
      report.errors.push(`Read body intersects ${name}: ${count} vertices`);
  if (report.errors.length) throw Error(report.errors.join("\n"));
  report.completed = true;
  console.log(
    JSON.stringify(
      {
        views: Object.keys(report.views),
        animations: Object.keys(report.animations),
        scenes: Object.fromEntries(
          Object.entries(report.scenes).map(([k, v]) => [
            k,
            { triangles: v.triangles, calls: v.calls, fps: v.fps },
          ]),
        ),
        errors: report.errors,
      },
      null,
      2,
    ),
  );
} catch (error) {
  report.errors.push(error instanceof Error ? error.message : String(error));
  throw error;
} finally {
  await writeFile(
    "artifacts/art/visual-results.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  await browser.close();
}
