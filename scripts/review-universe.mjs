import { chromium, expect } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
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
  worlds: [],
  views: [],
  worldStateRetained: false,
  brand: "同頻星球",
};
await mkdir("artifacts/universe", { recursive: true });
const attach = (page) => {
  page.on("pageerror", (e) => report.errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !/^https:\/\/fonts\.(googleapis|gstatic)\.com/.test(m.location().url)
    )
      report.errors.push(m.text());
  });
};
async function capture(page, name) {
  const observation = await page.evaluate(async () => {
    document.getElementById("qa-render-buffer")?.remove();
    const url = performance
      .getEntriesByType("resource")
      .map((x) => x.name)
      .find((n) => n.includes("/@react-three_fiber.js"));
    const { _roots } = await import(url);
    const s = _roots.get(document.querySelector("canvas")).store.getState();
    s.setFrameloop("never");
    s.gl.setPixelRatio(1);
    s.gl.render(s.scene, s.camera);
    // Save the buffer synchronously before the compositor clears WebGL.
    const saved = document.createElement("img");
    saved.id = "qa-render-buffer";
    saved.src = s.gl.domElement.toDataURL("image/png");
    const rect = s.gl.domElement.getBoundingClientRect();
    Object.assign(saved.style, { position: "fixed", left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px`, pointerEvents: "none", zIndex: "0" });
    s.gl.domElement.parentElement.append(saved);
    await saved.decode();
    const selected = document.querySelector("main").dataset.planet;
    if (!s.scene.getObjectByName(`Garden-${selected}`))
      throw Error("Rendered garden does not match selected planet");
    return {
      planet: selected,
      skinMode: s.gl.domElement.dataset.skinMode,
      softwareFps: s.gl.domElement.dataset.sampleFps,
      position: s.gl.domElement.dataset.position,
      lamp: s.scene.getObjectByName("DeskLampLight")?.intensity,
      drawCalls: s.gl.info.render.calls,
      triangles: s.gl.info.render.triangles,
      fog: s.scene.fog?.isFogExp2,
    };
  });
  await page.screenshot({ path: `artifacts/universe/${name}.png` });
  await page.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .map((x) => x.name)
      .find((n) => n.includes("/@react-three_fiber.js"));
    const { _roots } = await import(url);
    _roots
      .get(document.querySelector("canvas"))
      .store.getState()
      .setFrameloop("always");
  });
  report.views.push({ name, ...observation });
}
try {
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  attach(p);
  await p.goto("http://127.0.0.1:5173");
  await expect(p.locator("canvas")).toHaveAttribute("data-frames", /\d+/, {
    timeout: 60000,
  });
  await p.getByRole("button", { name: "讀書", exact: true }).click();
  await expect(p.locator("canvas")).toHaveAttribute("data-action", "read", {
    timeout: 45000,
  });
  await capture(p, "companion-planet-desk");
  await p.getByRole("button", { name: "關閉桌燈", exact: true }).click();
  await expect(
    p.getByRole("button", { name: "開啟桌燈", exact: true }),
  ).toBeVisible();
  const fadeStart = Number(
    await p.locator("canvas").getAttribute("data-frames"),
  );
  await p.waitForFunction(
    (start) =>
      Number(document.querySelector("canvas")?.dataset.frames) >= start + 12,
    fadeStart,
    { timeout: 30000 },
  );
  await expect
    .poll(
      async () =>
        p.evaluate(async () => {
          const url = performance
            .getEntriesByType("resource")
            .map((e) => e.name)
            .find((n) => n.includes("/@react-three_fiber.js"));
          const { _roots } = await import(url);
          return _roots
            .get(document.querySelector("canvas"))
            .store.getState()
            .scene.getObjectByName("DeskLampLight").intensity;
        }),
      { timeout: 20000 },
    )
    .toBeLessThan(0.05);
  await p.getByRole("button", { name: "讀書", exact: true }).click();
  await expect(p.locator("canvas")).toHaveAttribute("data-action", "read", {
    timeout: 45000,
  });
  await capture(p, "companion-planet-lamp-off");
  await p.getByRole("button", { name: "照顧花朵", exact: true }).click();
  for (const [id, name] of [
    ["rose", "玫瑰花園"],
    ["forest", "微風森林"],
    ["moon", "月光書原"],
  ]) {
    await p
      .getByRole("button", { name: `前往${name}`, exact: true })
      .press("Enter");
    await expect(p.locator("main")).toHaveAttribute("data-planet", id, {
      timeout: 15000,
    });
    await expect(p.locator("canvas")).toHaveAttribute("data-journey", "idle");
    await expect(
      p.getByRole("button", { name: "關閉桌燈", exact: true }),
    ).toBeVisible();
    await expect(
      p.getByRole("button", { name: "照顧花朵", exact: true }),
    ).toHaveAttribute("aria-pressed", "false");
    await capture(p, `world-${id}`);
    report.worlds.push(id);
  }
  await p
    .getByRole("button", { name: "前往同頻星球", exact: true })
    .press("Enter");
  await expect(p.locator("main")).toHaveAttribute("data-planet", "b612");
  await expect(p.locator("canvas")).toHaveAttribute("data-journey", "idle");
  await expect(
    p.getByRole("button", { name: "開啟桌燈", exact: true }),
  ).toBeVisible();
  await expect(
    p.getByRole("button", { name: "照顧花朵", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  report.worldStateRetained = true;
  report.worlds.push("b612");
  if ((await p.locator("body").innerText()).includes("B612"))
    throw Error("Old reference name visible");
  await p.close();
  const phone = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  attach(phone);
  await phone.goto("http://127.0.0.1:5173");
  await expect(phone.locator("canvas")).toHaveAttribute("data-frames", /\d+/, {
    timeout: 60000,
  });
  await phone.getByRole("button", { name: "讀書", exact: true }).tap();
  await expect(phone.locator("canvas")).toHaveAttribute("data-action", "read", {
    timeout: 45000,
  });
  await capture(phone, "phone-companion-planet");
  await phone.close();
} finally {
  await browser.close();
  await writeFile(
    "artifacts/universe/visual-results.json",
    JSON.stringify(report, null, 2),
  );
}
if (report.errors.length || !report.worldStateRetained) process.exitCode = 1;
