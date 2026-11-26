import getWindowOptions from "../electron/window-options.cjs";
import { test, expect, _electron as electron } from "@playwright/test";
import path from "node:path";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
test("desktop shares state, transparent topmost pet switches back and quits", async ({
  playwright,
}, testInfo) => {
  void playwright;
  test.setTimeout(250000);
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
    await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(850, 650));
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await expect(page.getByRole("heading")).toBeVisible();
    await expect(page.locator("canvas")).toHaveAttribute("data-frames", /\d+/, { timeout: 85000 });
    await page.getByRole("button", { name: "開始專注", exact: false }).click();
    await page.evaluate(() => window.desktop!.setMode("pet"));
    await expect(page.locator("main")).toHaveClass("app pet");
    const config = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return {
        top: win.isAlwaysOnTop(),
        bounds: win.getBounds(),
        background: win.getBackgroundColor(),
      };
    });
    await page.getByRole("button", { name: "暫停", exact: true }).click();
    const seconds = page.getByRole("textbox", { name: "秒鐘", exact: true });
    await expect(seconds).toBeVisible();
    await seconds.fill("35");
    await seconds.press("Enter");
    await expect(seconds).toHaveValue("35");
    await page.getByRole("button", { name: "番茄鐘設定與紀錄" }).click();
    await expect(page.getByRole("region", { name: "計時設定與紀錄" })).toBeVisible();
    await page.getByRole("button", { name: "番茄鐘設定與紀錄" }).click();
    await page.getByRole("button", { name: "繼續專注" }).click();
    expect(config.top).toBe(true);
    expect(config.bounds.width).toBe(320);
    const options = getWindowOptions("preload");
    expect(options.transparent).toBe(true);
    expect(options.backgroundColor).toBe("#00000000");
    expect(await page.evaluate(() => typeof (window as any).require)).toBe(
      "undefined",
    );
    await expect(page.locator("canvas")).toHaveAttribute("data-frames", /\d+/, { timeout: 85000 });
    // Exercise the real preload IPC and native window with a controlled OS cursor.
    // Pointer capture itself is exercised by the browser/touch suites.
    await app.evaluate(({ screen }) => {
      (globalThis as any).originalCursor = screen.getCursorScreenPoint;
      screen.getCursorScreenPoint = () => ({ x: 600, y: 400 });
    });
    await page.evaluate(() => window.desktop!.beginGrab());
    await app.evaluate(({ screen }) => {
      screen.getCursorScreenPoint = () => ({ x: 650, y: 430 });
    });
    await page.evaluate(() => window.desktop!.moveGrab());
    await expect
      .poll(() =>
        app.evaluate(
          ({ BrowserWindow }) =>
            BrowserWindow.getAllWindows()[0].getPosition()[0],
        ),
      )
      .toBe(config.bounds.x + 50);
    await page.evaluate(() => window.desktop!.endGrab());
    await app.evaluate(({ screen }) => {
      screen.getCursorScreenPoint = (globalThis as any).originalCursor;
      delete (globalThis as any).originalCursor;
    });
    await page.getByRole("button", { name: "更換角色", exact: true }).click();
    const next = page.getByRole("button", { name: "下一個角色" });
    await next.click();
    await next.click();
    await expect(page.getByRole("heading", { name: "小星草" })).toBeVisible();
    await expect(page.getByRole("button", { name: "選擇小星草" })).toBeEnabled();
    await next.click();
    await expect(page.getByRole("button", { name: "開發中" })).toBeDisabled();
    await page.getByRole("button", { name: "關閉角色選擇" }).click();
    await expect(page.locator("canvas")).toHaveAttribute(
      "data-companion",
      "nebula",
    );
    const frames = await page.locator("canvas").getAttribute("data-frames");
    await expect(page.locator("canvas")).not.toHaveAttribute(
      "data-frames",
      frames!,
    );
    await expect(page.locator("main")).toHaveAttribute("data-phase", "focus");
    await page.screenshot({
      path: "artifacts/desktop-pet.png",
      omitBackground: true,
    });
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
    await page.evaluate(() => window.desktop!.setMode("pet"));
    const closed = app.waitForEvent("close");
    await Promise.all([
      closed,
      page
        .getByRole("button", { name: "退出應用程式" })
        .click({ noWaitAfter: true })
        .catch((error) => {
          if (
            !page.isClosed() ||
            !String(error).includes(
              "Target page, context or browser has been closed",
            )
          )
            throw error;
        }),
    ]);
    await expect.poll(() => child.exitCode).toBe(0);
  } finally {
    if (child.exitCode === null && child.signalCode === null) await app.close();
  }
});
