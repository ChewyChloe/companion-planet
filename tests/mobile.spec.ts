import { readTimer, setFocusDuration } from "./ui";
import { test, expect } from "@playwright/test";
test.describe.configure({ timeout: 120000 });
test("touch rotation, character tap, timer and mobile keyboard chat work", async ({
  page,
  context,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-frames", /\d+/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await canvas.scrollIntoViewIfNeeded();
  const box = (await canvas.boundingBox())!;
  // Tap the visible actor before rotating: old screen coordinates must not be
  // reused to chase an autonomously walking actor through a moving camera.
  const point = (await canvas.getAttribute("data-screen"))!
    .split(",")
    .map(Number);
  await page.touchscreen.tap(
    box.x + point[0] * box.width,
    box.y + point[1] * box.height,
  );
  await expect(canvas).toHaveAttribute(
    "data-reaction",
    /happy|stretch|listen|idle/,
  );
  const tapReaction = await canvas.getAttribute("data-reaction");

  const before = await canvas.getAttribute("data-camera");
  const x = box.x + box.width * 0.5,
    y = box.y + box.height * 0.3;
  const session = await context.newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y }],
  });
  for (let step = 1; step <= 8; step++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x - step * 8, y: y + step }],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(canvas).not.toHaveAttribute("data-camera", before!);
  const distance = async () => {
    const p = (await canvas.getAttribute("data-camera"))!
      .split(",")
      .map(Number);
    return Math.hypot(p[0], p[1] - 0.2, p[2]);
  };
  const beforeZoom = await distance();
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: x - 30, y, id: 1 },
      { x: x + 30, y, id: 2 },
    ],
  });
  for (let step = 1; step <= 4; step++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: x - 30 - step, y, id: 1 },
        { x: x + 30 + step, y, id: 2 },
      ],
    });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect
    .poll(async () => Math.abs((await distance()) - beforeZoom))
    .toBeGreaterThan(0.1);
  // A pinch must not synthesize a furniture/character click.
  await expect(canvas).toHaveAttribute("data-reaction", tapReaction!);
  await page.screenshot({
    path: `artifacts/${info.project.name}-touch.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "切換為夜晚" }).tap();
  await expect(page.locator("main")).toHaveAttribute("data-time-of-day", "night");
  await page.getByRole("button", { name: "切換為白天" }).tap();
  await setFocusDuration(page, "1");
  await page.getByRole("button", { name: "開始專注", exact: false }).tap();
  await expect(page.locator("main")).toHaveAttribute("data-phase", "focus");
  await page.getByRole("button", { name: "和星雲仔說說話" }).tap();
  // A smaller visual viewport represents keyboard space, while actual native keyboards remain a device check.
  await page.setViewportSize({
    width: info.project.name === "phone-landscape" ? 844 : 360,
    height: 390,
  });
  const input = page.getByLabel("想對星雲仔說的話");
  await input.tap();
  await input.fill("今天好累");
  const send = page.getByRole("button", { name: "送出訊息" });
  await expect(send).toBeInViewport();
  await send.tap();
  await expect(page.locator(".message.assistant")).toHaveText(/\S/);
  await page.screenshot({ path: `artifacts/${info.project.name}-chat.png` });
  await page.getByRole("button", { name: "收合聊天" }).tap();
  expect(errors).toEqual([]);
});

test("touch grabs and drops the resident without moving the camera", async ({
  page,
  context,
}, info) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-frames", /\d+/);
  const camera = await canvas.getAttribute("data-camera");
  const before = await canvas.getAttribute("data-position");
  const box = (await canvas.boundingBox())!;
  const p = (await canvas.getAttribute("data-screen"))!.split(",").map(Number);
  const x = box.x + p[0] * box.width,
    y = box.y + p[1] * box.height;
  const session = await context.newCDPSession(page);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y, id: 0 }],
  });
  for (let i = 1; i <= 8; i++)
    await session.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x - 4 * i, y: y + 3 * i, id: 0 }],
    });
  await expect(canvas).toHaveAttribute("data-held", "true");
  await page.screenshot({
    path: `artifacts/interaction/held-touch-${info.project.name}.png`,
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await expect(canvas).toHaveAttribute("data-held", "false");
  await expect(canvas).not.toHaveAttribute("data-position", before!);
  expect(await canvas.getAttribute("data-camera")).toBe(camera);
  await expect(canvas).toHaveAttribute("data-reaction", "none");
});

test("touch distant planets and the physical lamp while keeping the timer", async ({
  page,
}, info) => {
  await page.goto("/");
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-frames", /\d+/);
  const timer = await readTimer(page),
    box = (await canvas.boundingBox())!;
  await page.touchscreen.tap(box.width * 0.18, box.height * 0.41);
  await expect(page.locator("main")).toHaveAttribute("data-planet", "rose");
  await expect(canvas).toHaveAttribute("data-journey", "idle");
  const lamp = (await canvas.getAttribute("data-lamp-screen"))!
    .split(",")
    .map(Number);
  await page.touchscreen.tap(box.width * lamp[0], box.height * lamp[1]);
  await expect(
    page.getByRole("button", { name: "開啟桌燈", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "照顧花朵", exact: true })).toHaveCount(0);
  const flower = (await canvas.getAttribute("data-flower-screen"))!.split(",").map(Number);
  const flowerBox = (await canvas.boundingBox())!;
  await page.touchscreen.tap(flowerBox.x + flowerBox.width * flower[0], flowerBox.y + flowerBox.height * flower[1]);
  await expect(canvas).toHaveAttribute("data-flowers-bloom", "true");
  await expect.poll(() => readTimer(page)).toBe(timer);
  await page.screenshot({
    path: `artifacts/universe/${info.project.name}-touch-world.png`,
  });
});
