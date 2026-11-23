const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
} = require("electron");
const path = require("node:path");
let window,
  server,
  tray,
  mode = "planet";
const icon = () =>
  nativeImage
    .createFromPath(path.join(__dirname, "../dist/icon.png"))
    .resize({ width: 24, height: 24 });
function switchMode(next) {
  if (!["planet", "pet"].includes(next) || !window) return;
  mode = next;
  window.hide();
  window.setAlwaysOnTop(mode === "pet");
  window.setResizable(mode !== "pet");
  window.setMinimumSize(mode === "pet" ? 300 : 800, mode === "pet" ? 380 : 650);
  window.setSize(mode === "pet" ? 320 : 1280, mode === "pet" ? 420 : 800);
  window.center();
  window.webContents.send("world:mode", mode);
  window.show();
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", () => {
    window?.show();
    window?.focus();
  });
  app
    .whenReady()
    .then(async () => {
      if (!app.isPackaged) {
        const envFile = path.join(app.getAppPath(), ".env");
        if (require("node:fs").existsSync(envFile))
          process.loadEnvFile(envFile);
      }
      const { startServer } = await import("../server/index.js");
      server = await startServer({ port: 3002, staticFiles: true });
      window = new BrowserWindow(
        require("./window-options.cjs")(path.join(__dirname, "preload.cjs")),
      );
      window.setMenuBarVisibility(false);
      window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      window.webContents.on("will-navigate", (event) => event.preventDefault());
      window.webContents.on("render-process-gone", (_event, details) =>
        console.error("Renderer stopped:", details.reason),
      );
      window.webContents.session.setPermissionRequestHandler(
        (_contents, _permission, callback) => callback(false),
      );
      ipcMain.handle("world:mode", (event, next) => {
        if (event.sender === window.webContents) switchMode(next);
      });
      ipcMain.on("world:hide", (event) => {
        if (event.sender === window.webContents) {
          if (tray) window.hide();
          else window.minimize();
        }
      });
      ipcMain.on("world:quit", (event) => {
        if (event.sender === window.webContents) app.quit();
      });
      if (process.env.COMPANION_NO_TRAY !== "1")
        try {
          tray = new Tray(icon());
          tray.setToolTip("同頻星球");
          tray.setContextMenu(
            Menu.buildFromTemplate([
              { label: "打開星球", click: () => switchMode("planet") },
              { label: "桌寵模式", click: () => switchMode("pet") },
              { label: "退出", click: () => app.quit() },
            ]),
          );
          tray.on("double-click", () => window.show());
        } catch {
          /* Hide falls back to minimizing when no tray is available. */
        }
      await window.loadURL(`http://127.0.0.1:${server.address().port}`);
      window.show();
    })
    .catch((error) => {
      console.error("Desktop startup failed:", error.message);
      app.quit();
    });
  app.on("window-all-closed", () => app.quit());
  app.on("before-quit", () => {
    tray?.destroy();
    server?.close();
  });
}
