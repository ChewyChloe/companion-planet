import getWindowOptions from "../electron/window-options.cjs";
import { test, expect, _electron as electron } from "@playwright/test";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
test("desktop shares state, transparent topmost pet switches back and quits", async ({
  playwright,
}, testInfo) => {
  void playwright;
  test.skip(
    testInfo.project.name === "mobile",
    "Electron has its own native window size",
  );
  const app = await electron.launch({
    args: [
      "--no-sandbox",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-webgl",
      path.resolve("electron/main.cjs"),
    ],
    env: {
      ...process.env,
      COMPANION_NO_TRAY: "1",
      XDG_CONFIG_HOME: mkdtempSync(path.join(tmpdir(), "companion-electron-")),
    },
  });
  const child = app.process();
  try {
    const page = await app.firstWindow();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await expect(page.getByRole("heading")).toBeVisible();
    await expect(page.locator("canvas")).toHaveAttribute("data-frames", /\d+/);
    await page.getByRole("button", { name: "開始專注", exact: false }).click();
    await page.getByRole("button", { name: "切換桌寵模式" }).click();
    await expect(page.locator("main")).toHaveClass("app pet");
    const config = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return {
        top: win.isAlwaysOnTop(),
        bounds: win.getBounds(),
        background: win.getBackgroundColor(),
      };
    });
    expect(config.top).toBe(true);
    expect(config.bounds.width).toBe(320);
    const options = getWindowOptions("preload");
    expect(options.transparent).toBe(true);
    expect(options.backgroundColor).toBe("#00000000");
    expect(await page.evaluate(() => typeof (window as any).require)).toBe(
      "undefined",
    );
    await expect(page.locator("canvas")).toHaveAttribute("data-frames", /\d+/);
    const frames = await page.locator("canvas").getAttribute("data-frames");
    await expect(page.locator("canvas")).not.toHaveAttribute(
      "data-frames",
      frames!,
    );
    await expect(page.locator("main")).toHaveAttribute("data-phase", "focus");
    await page.screenshot({ path: "artifacts/desktop-pet.png",omitBackground:true });
    await page.getByRole("button", { name: "隱藏桌寵" }).click();
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].restore(),
    );
    await page.getByRole("button", { name: "返回星球" }).click();
    await expect(page.getByRole("heading")).toBeVisible();
    expect(
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0].isAlwaysOnTop(),
      ),
    ).toBe(false);
    expect(errors).toEqual([]);
    await page.getByRole("button", { name: "切換桌寵模式" }).click();
    await page.getByRole("button", { name: "退出應用程式" }).click();
    await expect.poll(() => child.exitCode).not.toBeNull();
  } finally {
    if (child.exitCode === null && child.signalCode === null) await app.close();
  }
});
