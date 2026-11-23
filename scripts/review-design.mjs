import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
await mkdir("artifacts/redesign", { recursive: true });
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
const results = [];
try {
  for (const [name, width, height] of [
    ["desktop", 1440, 900],
    ["laptop", 1280, 800],
    ["tablet", 1024, 768],
    ["tablet-portrait", 820, 1180],
    ["phone", 390, 844],
    ["phone-small", 360, 640],
    ["landscape", 844, 390],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:5173", { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => Number(document.querySelector("canvas")?.dataset.frames) > 30,
    );
    await page.evaluate(() => document.fonts.load("16px Huninn", "同頻星球"));
    const details = await page.evaluate(() => ({
      font: getComputedStyle(document.body).fontFamily,
      fontReady: document.fonts.check("16px Huninn", "同頻星球"),
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      background: getComputedStyle(document.querySelector("main"))
        .backgroundColor,
      buttonRadius: getComputedStyle(document.querySelector("button"))
        .borderRadius,
    }));
    await page.screenshot({
      path: `artifacts/redesign/${name}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "和星雲仔說說話" }).click();
    await page.getByLabel("想對星雲仔說的話").fill("今天好累");
    await page.getByRole("button", { name: "送出訊息" }).click();
    await page.locator(".message.assistant").waitFor();
    await page.screenshot({
      path: `artifacts/redesign/${name}-chat.png`,
      fullPage: true,
    });
    results.push({ name, width, height, ...details, errors });
    await page.close();
  }
  await writeFile(
    "artifacts/redesign/visual-review.json",
    JSON.stringify(results, null, 2) + "\n",
  );
  console.log(JSON.stringify(results));
} finally {
  await browser.close();
}
