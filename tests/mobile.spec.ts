import { test, expect } from "@playwright/test";
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
  const before = await canvas.getAttribute("data-camera");
  const x = box.x + box.width * 0.5,
    y = box.y + box.height * 0.45;
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
    return Math.hypot(p[0], p[1] + 1.1, p[2]);
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
  const point = (await canvas.getAttribute("data-screen"))!
    .split(",")
    .map(Number);
  await page.touchscreen.tap(
    box.x + point[0] * box.width,
    box.y + point[1] * box.height,
  );
  await expect(canvas).toHaveAttribute("data-reaction", "happy");
  await page.screenshot({
    path: `artifacts/${info.project.name}-touch.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "開啟設定" }).tap();
  await page.getByLabel("減少動畫").check();
  await page.getByRole("button", { name: "開啟設定" }).tap();
  await page.getByLabel("專注時長").selectOption("1");
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
  await expect(page.locator(".message.assistant")).toContainText("安靜陪你");
  await page.screenshot({ path: `artifacts/${info.project.name}-chat.png` });
  await page.getByRole("button", { name: "收合聊天" }).tap();
  expect(errors).toEqual([]);
});
