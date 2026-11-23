import { test, expect } from "@playwright/test";
test("paper design uses local Huninn when Google is unavailable and preserves controls", async ({
  page,
}, info) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
    route.abort(),
  );
  const fontResponse = page.waitForResponse((response) =>
    response.url().endsWith("/fonts/Huninn-Regular.woff2"),
  );
  await page.goto("/");
  expect((await fontResponse).status()).toBe(200);
  await page.evaluate(() => document.fonts.load("16px Huninn", "同頻星球"));
  const result = await page.evaluate(() => {
    const elements = [
      ...document.querySelectorAll<HTMLElement>(
        ".app,.focus-panel,.chat-launch,header button",
      ),
    ];
    return {
      font: getComputedStyle(document.body).fontFamily,
      fontLoaded: document.fonts.check("16px Huninn", "同頻星球"),
      overflow: document.documentElement.scrollWidth > innerWidth,
      unwantedStyles: elements.some((element) => {
        const s = getComputedStyle(element);
        return (
          s.borderRadius !== "0px" ||
          s.backgroundImage !== "none" ||
          s.backdropFilter !== "none"
        );
      }),
      emoji: /\p{Extended_Pictographic}/u.test(
        document.querySelector("main")!.innerText,
      ),
    };
  });
  expect(result.font).toContain("Huninn");
  expect(result.fontLoaded).toBe(true);
  expect(result.overflow).toBe(false);
  expect(result.unwantedStyles).toBe(false);
  expect(result.emoji).toBe(false);
  await expect(page.locator("canvas")).toHaveAttribute("data-frames", /\d+/);
  await page.getByRole("button", { name: "和星雲仔說說話" }).click();
  await page.getByLabel("想對星雲仔說的話").fill("今天好累");
  await page.getByRole("button", { name: "送出訊息" }).click();
  await expect(page.locator(".message.assistant")).toContainText("辛苦");
  await expect(page.getByRole("button", { name: "送出訊息" })).toBeInViewport();
  await page.screenshot({
    path: `artifacts/redesign/${info.project.name}-font-offline.png`,
  });
});
test("text remains visible when all font downloads fail", async ({
  page,
}, info) => {
  await page.route(/^https:\/\/fonts\.(googleapis|gstatic)\.com\//, (route) =>
    route.abort(),
  );
  await page.route("**/fonts/Huninn-Regular.woff2", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "開始專注", exact: false }),
  ).toBeVisible();
  const heading = await page.getByRole("heading", { level: 1 }).boundingBox();
  expect(heading!.height).toBeGreaterThan(30);
  await page.screenshot({
    path: `artifacts/redesign/${info.project.name}-system-font-fallback.png`,
    fullPage: true,
  });
});
