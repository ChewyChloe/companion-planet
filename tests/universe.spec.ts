import { test, expect, type Page } from "@playwright/test";
async function renderState(page: Page, point?: [number, number]) {
  return page.evaluate(async (point) => {
    const url = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .find((n) => n.includes("/@react-three_fiber.js"))!;
    const { _roots } = await import(url);
    const s = _roots.get(document.querySelector("canvas")).store.getState();
    let screen: number[] = [];
    if (point) {
      const path = "/src/art/terrain.ts";
      const { groundHeight } = await import(path);
      const v = s.camera.position
        .clone()
        .set(point[0], groundHeight(...point) + 0.025, point[1])
        .project(s.camera);
      screen = [(v.x + 1) / 2, (1 - v.y) / 2];
    }
    return {
      screen,
      lamp: s.scene.getObjectByName("DeskLampLight")?.intensity,
      env: s.scene.environment !== null,
      fog: s.scene.fog?.isFogExp2,
      camera: s.camera.position.toArray(),
      tree: !!s.scene.getObjectByName("LittleTree"),
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
  await page.mouse.move(box.width * 0.18, box.height * 0.41);
  await expect(canvas).toHaveCSS("cursor", "pointer");
  await page.mouse.click(box.width * 0.18, box.height * 0.41);
  await expect(page.locator("main")).toHaveAttribute("data-planet", "rose");
  await expect(canvas).toHaveAttribute("data-journey", "idle");
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
  await expect(canvas).toHaveAttribute("data-action", "walk");
  await expect
    .poll(
      async () => {
        const p = (await canvas.getAttribute("data-position"))!
          .split(",")
          .map(Number);
        return Math.hypot(p[0] - 2.5, p[2] - 2.3);
      },
      { timeout: 45000 },
    )
    .toBeLessThan(0.2);
  const p = (await canvas.getAttribute("data-position"))!
    .split(",")
    .map(Number);
  expect(Math.hypot(p[0], p[2])).toBeGreaterThan(3.1);
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
