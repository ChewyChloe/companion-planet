import { test, expect } from "@playwright/test";
import { setFocusDuration } from "./ui";
test("immersive lakeside keeps corner controls, open center and local Huninn", async ({
  page,
}, info) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (r) =>
    r.abort(),
  );
  const font = page.waitForResponse((r) =>
    r.url().endsWith("/fonts/Huninn-Regular.woff2"),
  );
  await page.goto("/");
  expect((await font).status()).toBe(200);
  await page.evaluate(() => document.fonts.load("16px Huninn", "同頻星球"));
  await expect(page.locator("canvas")).toHaveAttribute("data-frames", /\d+/);
  const result = await page.evaluate(() => {
    const timer = document.querySelector(".focus-hud")!.getBoundingClientRect(),
      tools = document.querySelector(".scene-tools")!.getBoundingClientRect(),
      world = document.querySelector(".world")!.getBoundingClientRect();
    return {
      font: getComputedStyle(document.body).fontFamily,
      fontLoaded: document.fonts.check("16px Huninn", "同頻星球"),
      overflow:
        document.documentElement.scrollWidth > innerWidth ||
        document.documentElement.scrollHeight > innerHeight + 1,
      timerLeft: timer.left / innerWidth,
      timerTop: timer.top / innerHeight,
      toolsRight: tools.right / innerWidth,
      fullCanvas: world.width === innerWidth && world.height === innerHeight,
      center: document.elementFromPoint(innerWidth * 0.5, innerHeight * 0.3)
        ?.tagName,
      emoji: /\p{Extended_Pictographic}/u.test(
        document.querySelector("main")!.innerText,
      ),
    };
  });
  expect(result.font).toContain("Huninn");
  expect(result.fontLoaded).toBe(true);
  expect(result.overflow).toBe(false);
  expect(result.timerLeft).toBeLessThan(0.1);
  expect(result.timerTop).toBeLessThan(0.15);
  expect(result.toolsRight).toBeGreaterThan(0.85);
  expect(result.fullCanvas).toBe(true);
  expect(result.center).toBe("CANVAS");
  expect(result.emoji).toBe(false);
  await page.screenshot({
    path: `artifacts/layout/${info.project.name}-scene.png`,
  });
  await page.getByRole("button", { name: "開啟環境音" }).click();
  await expect(
    page.getByRole("button", { name: "關閉環境音" }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "關閉環境音" }).click();
  await expect(
    page.getByRole("button", { name: "開啟環境音" }),
  ).toHaveAttribute("aria-pressed", "false");
  await setFocusDuration(page, "5");
  await expect(page.getByRole("textbox", { name: "分鐘", exact: true })).toHaveValue("05");
  await page.getByRole("button", { name: "和星雲仔說說話" }).click();
  await page.getByLabel("想對星雲仔說的話").fill("今天好累");
  await page.getByRole("button", { name: "送出訊息" }).click();
  await expect(page.locator(".message.assistant")).toContainText("辛苦");
  await expect(page.getByRole("button", { name: "送出訊息" })).toBeInViewport();
  await page.screenshot({
    path: `artifacts/layout/${info.project.name}-chat.png`,
  });
});
test("timer and controls stay readable when every font download fails", async ({
  page,
}, info) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (r) =>
    r.abort(),
  );
  await page.route("**/fonts/Huninn-Regular.woff2", (r) => r.abort());
  await page.goto("/");
  await expect(page.getByRole("timer")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "同頻星球", exact: true }),
  ).toBeVisible();
  const box = await page.getByRole("timer").boundingBox();
  expect(box!.height).toBeGreaterThan(35);
  expect(box!.width).toBeGreaterThan(75);
  await page.getByRole("button", { name: "開始專注", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "暫停", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `artifacts/layout/${info.project.name}-font-fallback.png`,
  });
});
