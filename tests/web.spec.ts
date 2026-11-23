import { test, expect } from "@playwright/test";
test("planet renders, camera rotates, character responds, timer and conversation stay synchronized", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    const optionalFont = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(
      m.location().url,
    );
    if (m.type() === "error" && !optionalFont) errors.push(m.text());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: /各自忙碌，\s*也一起發光。/ }),
  ).toBeVisible();
  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("data-frames", /\d+/);
  await page.screenshot({
    path: `artifacts/home-${testInfo.project.name}.png`,
  });
  const pose = await canvas.getAttribute("data-pose");
  await expect(canvas).not.toHaveAttribute("data-pose", pose!);
  const before = await canvas.getAttribute("data-camera");
  const box = await canvas.boundingBox();
  if (!box) throw Error("Missing canvas");
  const x = box.x + box.width * 0.5,
    y = box.y + box.height * 0.46;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 90, y + 20, { steps: 12 });
  await page.mouse.up();
  await expect(canvas).not.toHaveAttribute("data-camera", before!);
  const screen = (await canvas.getAttribute("data-screen"))!
    .split(",")
    .map(Number);
  await page.mouse.click(
    box.x + screen[0] * box.width,
    box.y + screen[1] * box.height,
  );
  await expect(page.locator("main")).toHaveAttribute(
    "data-activity",
    /happy|walk/,
  );
  await page.screenshot({
    path: `artifacts/planet-${testInfo.project.name}.png`,
  });
  await page.getByLabel("專注時長").selectOption("1");
  await page.getByRole("button", { name: "開始專注", exact: false }).click();
  await expect(page.locator("main")).toHaveAttribute("data-phase", "focus");
  await expect(canvas).toHaveAttribute("data-action", "read");
  await page.getByRole("button", { name: "暫停" }).click();
  const paused = await page.getByRole("timer").innerText();
  await page.waitForTimeout(700);
  await expect(page.getByRole("timer")).toHaveText(paused);
  await page.reload();
  await expect(page.getByLabel("專注時長")).toHaveValue("1");
  await expect(page.getByRole("timer")).toHaveText(paused);
  await page.getByRole("button", { name: "繼續專注" }).click();
  await page.getByRole("button", { name: "和星雲仔說說話" }).click();
  await page.getByLabel("想對星雲仔說的話").fill("今天好累");
  await page.getByRole("button", { name: "送出訊息" }).click();
  await expect(page.locator(".message.assistant")).toContainText("安靜陪你");
  await expect(page.locator("main")).toHaveAttribute("data-phase", "focus");
  await page.getByRole("button", { name: "收合聊天" }).click();
  await page.clock.setFixedTime(Date.now() + 61000);
  await expect(page.locator("main")).toHaveAttribute("data-phase", "break", {
    timeout: 18000,
  });
  await expect(page.getByRole("status")).toContainText("完成");
  await expect(canvas).toHaveAttribute("data-action", /rest|stretch|walk/);
  await page.screenshot({
    path: `artifacts/break-${testInfo.project.name}.png`,
  });
  expect(errors).toEqual([]);
});
test("silent mode suppresses completion notices and AI proposals require confirmation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "安靜陪我" }).click();
  await page.getByLabel("專注時長").selectOption(String(1 / 6));
  await page.getByRole("button", { name: "開始專注", exact: false }).click();
  await expect(page.locator("main")).toHaveAttribute("data-phase", "break", {
    timeout: 18000,
  });
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.getByRole("button", { name: "和星雲仔說說話" }).click();
  await page.getByLabel("想對星雲仔說的話").fill("我要開始讀書");
  await page.getByRole("button", { name: "送出訊息" }).click();
  await expect(
    page.getByRole("button", { name: "確認開始專注" }),
  ).toBeVisible();
  await expect(page.locator("main")).toHaveAttribute("data-phase", "break");
  await page.getByRole("button", { name: "確認開始專注" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-phase", "focus");
});
test("offline fallback and mini companion remain operable", async ({
  page,
}) => {
  await page.route("**/api/chat", (route) => route.abort());
  await page.goto("/");
  await page.getByRole("button", { name: "和星雲仔說說話" }).click();
  await page.getByLabel("想對星雲仔說的話").fill("我好累");
  await page.getByRole("button", { name: "送出訊息" }).click();
  await expect(page.locator(".message.assistant")).toContainText("辛苦");
  await page.getByRole("button", { name: "收合聊天" }).click();
  await page.getByRole("button", { name: "體驗迷你陪伴" }).click();
  await expect(page.locator("main")).toHaveClass("app pet");
  await expect(page.locator("canvas")).toHaveAttribute("data-frames", /\d+/);
  await page.getByRole("button", { name: "返回星球" }).click();
  await expect(page.getByRole("heading")).toBeVisible();
});
