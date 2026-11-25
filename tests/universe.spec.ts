import { test, expect, type Page } from "@playwright/test";
async function renderState(page: Page, point?: [number, number]) {
  return page.evaluate(async (point) => {
    const url = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .find((n) => n.includes("/@react-three_fiber.js"))!;
    const { _roots } = await import(url);
    const s = _roots.get(document.querySelector("canvas")).store.getState();
    let screen: number[] = [], landing: number[] = [];
    if (point) {
      const path = "/src/art/terrain.ts";
      const { groundHeight } = await import(path);
      const placementPath="/src/art/placement.ts";
      const {safeDrop}=await import(placementPath);
      landing=safeDrop(...point);
      const v = s.camera.position
        .clone()
        .set(landing[0], groundHeight(...landing) + 0.025, landing[1])
        .project(s.camera);
      screen = [(v.x + 1) / 2, (1 - v.y) / 2];
    }
    return {
      screen,
      landing,
      lamp: s.scene.getObjectByName("DeskLampLight")?.intensity,
      env: s.scene.environment !== null,
      fog: s.scene.fog?.isFogExp2,
      camera: s.camera.position.toArray(),
      tree: !!s.scene.getObjectByName("UserIsland-" + document.querySelector("main")!.dataset.planet),
    };
  }, point);
}
test("real distant-planet raycasting travels between worlds and the lamp toggles smoothly", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !/^https:\/\/fonts\.(googleapis|gstatic)\.com/.test(m.location().url)
    )
      errors.push(m.text());
  });
  test.setTimeout(120000);
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-frames", /\d+/);
  expect((await renderState(page)).fog).toBe(true);
  expect((await renderState(page)).env).toBe(true);
  const timer = await page.getByRole("timer").innerText();
  const box = (await canvas.boundingBox())!;
  await expect(canvas).toHaveAttribute("data-planet0", /^rose,/);
  const destination = (await canvas.getAttribute("data-planet0"))!.split(",").slice(1).map(Number);
  await page.mouse.move(box.width * destination[0], box.height * destination[1]);
  await expect(canvas).toHaveCSS("cursor", "pointer");
  await page.mouse.click(box.width * destination[0], box.height * destination[1]);
  await expect(page.locator("main")).toHaveAttribute("data-planet", "rose");
  await expect(canvas).toHaveAttribute("data-journey", "idle");
  await expect(canvas).toHaveAttribute("data-planet-model", "user-world-rose",{timeout:60000});
  await expect(page.getByRole("timer")).toHaveText(timer);
  await page.screenshot({
    path: `artifacts/universe/${info.project.name}-rose.png`,
  });
  const lamp = (await canvas.getAttribute("data-lamp-screen"))!
    .split(",")
    .map(Number);
  await page.mouse.click(box.width * lamp[0], box.height * lamp[1]);
  await expect(
    page.getByRole("button", { name: "開啟桌燈", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await expect
    .poll(async () => (await renderState(page)).lamp)
    .toBeLessThan(0.07);
  await page.screenshot({
    path: `artifacts/universe/${info.project.name}-lamp-off.png`,
  });
  await page.getByRole("button", { name: "開啟桌燈", exact: true }).click();
  await expect
    .poll(async () => (await renderState(page)).lamp)
    .toBeGreaterThan(0.8);
  for (const [id, name] of [
    ["forest", "微風森林"],
    ["moon", "月光書原"],
    ["b612", "同頻星球"],
  ]) {
    await page
      .getByRole("button", { name: `前往${name}`, exact: true })
      .press("Enter");
    await expect(page.locator("main")).toHaveAttribute("data-planet", id);
    await expect(canvas).toHaveAttribute("data-journey", "idle");
  }
  await page.reload();
  await expect(canvas).toHaveAttribute("data-planet", "b612");
  expect(errors).toEqual([]);
});
test("far ground walking, larger drag range and flower/book interactions coexist", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-frames", /\d+/);
  const box = (await canvas.boundingBox())!,
    target = await renderState(page, [2.5, 2.3]);
  await page.mouse.click(
    target.screen[0] * box.width,
    target.screen[1] * box.height,
  );
  // On slow software WebGL the click may return after travel has finished.
  // Assert the actual destination below instead of a transient animation label.
  await expect
    .poll(
      async () => {
        const p = (await canvas.getAttribute("data-position"))!
          .split(",")
          .map(Number);
        return Math.hypot(p[0] - target.landing[0], p[2] - target.landing[1]);
      },
      { timeout: 45000 },
    )
    .toBeLessThan(0.2);
  const p = (await canvas.getAttribute("data-position"))!
    .split(",")
    .map(Number);
  expect(Math.hypot(p[0]-target.landing[0], p[2]-target.landing[1])).toBeLessThan(.2);
  await page.getByRole("button", { name: "照顧花朵", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "照顧花朵", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.screenshot({
    path: `artifacts/universe/${info.project.name}-exploring.png`,
  });
  await page.getByRole("button", { name: "讀書", exact: true }).click();
  await expect(canvas).toHaveAttribute("data-action", "read", {
    timeout: 45000,
  });
});
