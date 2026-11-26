const {
  app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, nativeImage,
  screen, shell, Tray,
} = require("electron");
const { randomBytes } = require("node:crypto");
const { existsSync } = require("node:fs");
const path = require("node:path");

const productName = "同頻星球 Companion Planet";
const shortcut = "Alt+Super+P";
// Keep existing packaged profiles when the display name changes.
if (app.isPackaged) app.setPath("userData", path.join(app.getPath("appData"), "同頻星球"));
const port = 3002; // Keep the renderer origin stable for existing localStorage.
const origin = `http://127.0.0.1:${port}`;
const iconPath = path.join(__dirname, "../dist/icon.png");
let window, server, tray, grab, planetBounds;
let mode = "planet";
let quitting = false;

function fitToDisplay(bounds, area) {
  const width = Math.min(bounds.width, area.width);
  const height = Math.min(bounds.height, area.height);
  return {
    width, height,
    x: Math.round(Math.max(area.x, Math.min(area.x + area.width - width, bounds.x))),
    y: Math.round(Math.max(area.y, Math.min(area.y + area.height - height, bounds.y))),
  };
}

function keepVisible() {
  if (!window || window.isMaximized()) return;
  const bounds = window.getBounds();
  window.setBounds(fitToDisplay(bounds, screen.getDisplayMatching(bounds).workArea));
}

function showWindow() {
  if (!window) return;
  if (window.isMinimized()) window.restore();
  keepVisible();
  window.show();
  window.focus();
}

function switchMode(next) {
  if (!window || !["planet", "pet"].includes(next)) return;
  if (next === mode) {
    showWindow();
    return;
  }
  grab = null;
  if (window.isMinimized()) window.restore();
  const previous = window.getNormalBounds();
  const area = screen.getDisplayMatching(previous).workArea;
  if (next === "pet") {
    planetBounds = previous;
    if (window.isMaximized()) window.unmaximize();
  }
  mode = next;
  const pet = mode === "pet";
  const defaults = { width: pet ? 320 : 1280, height: pet ? 420 : 800 };
  const preferred = pet || !planetBounds ? {
    ...defaults,
    x: area.x + (area.width - defaults.width) / 2,
    y: area.y + (area.height - defaults.height) / 2,
  } : planetBounds;
  const targetArea = pet ? area : screen.getDisplayMatching(preferred).workArea;
  window.setMinimumSize(Math.min(pet ? 300 : 800, targetArea.width),
    Math.min(pet ? 380 : 650, targetArea.height));
  window.setResizable(true);
  window.setBounds(fitToDisplay(preferred, targetArea));
  window.setResizable(!pet);
  window.setAlwaysOnTop(pet);
  window.webContents.send("world:mode", mode);
  showWindow();
}

function hideWindow() {
  if (!window) return;
  if (tray) window.hide();
  else window.minimize();
}

function trusted(event) {
  const frame = event.senderFrame;
  return frame && event.sender === window?.webContents &&
    frame === window.webContents.mainFrame && new URL(frame.url).origin === origin;
}

async function connectRenderer(token) {
  const contents = window.webContents;
  const session = contents.session;
  await session.setProxy({ mode: "direct" });
  contents.setWindowOpenHandler(() => ({ action: "deny" }));
  contents.on("will-frame-navigate", (event) => event.preventDefault());
  contents.on("will-attach-webview", (event) => event.preventDefault());

  // Only this desktop renderer receives the credential for the loopback server.
  session.webRequest.onBeforeSendHeaders({ urls: [`${origin}/*`] }, (details, callback) => {
    const headers = details.requestHeaders;
    if (details.webContentsId === contents.id) headers["X-Companion-Desktop"] = token;
    callback({ requestHeaders: headers });
  });
  session.webRequest.onBeforeRequest({ urls: ["http://*/*", "https://*/*"] }, (details, callback) => {
    callback({ cancel: new URL(details.url).origin !== origin });
  });
  session.setPermissionCheckHandler((sender, permission, requestingOrigin, details) =>
    sender === contents && permission === "notifications" && requestingOrigin === origin &&
      details.isMainFrame === true);
  session.setPermissionRequestHandler((sender, permission, callback, details) => {
    callback(sender === contents && permission === "notifications" && details.isMainFrame === true &&
      new URL(details.requestingUrl).origin === origin);
  });

  ipcMain.handle("world:mode", (event, next) => {
    if (trusted(event)) switchMode(next);
  });
  ipcMain.on("world:google-search", (event, query) => {
    if (!trusted(event) || mode !== "planet" || typeof query !== "string" ||
      query.length > 200 || !query.trim()) return;
    const url = new URL("https://www.google.com/search");
    url.searchParams.set("q", query.trim());
    void shell.openExternal(url.href).catch(() => {});
  });
  ipcMain.on("world:grab", (event, action) => {
    if (!trusted(event) || mode !== "pet") return;
    if (action === "end") {
      grab = null;
    } else if (action === "begin") {
      const cursor = screen.getCursorScreenPoint();
      const [x, y] = window.getPosition();
      grab = { x: cursor.x - x, y: cursor.y - y };
    } else if (action === "move" && grab) {
      const cursor = screen.getCursorScreenPoint();
      const area = screen.getDisplayNearestPoint(cursor).workArea;
      const [width, height] = window.getSize();
      const bounds = fitToDisplay({ x: cursor.x - grab.x, y: cursor.y - grab.y, width, height }, area);
      window.setPosition(bounds.x, bounds.y);
    }
  });
  ipcMain.on("world:hide", (event) => {
    if (trusted(event)) hideWindow();
  });
  ipcMain.on("world:quit", (event) => {
    if (trusted(event)) app.quit();
  });
}

function createTray(shortcutReady) {
  if (process.env.COMPANION_NO_TRAY === "1" && !app.isPackaged) return;
  try {
    tray = new Tray(nativeImage.createFromPath(iconPath).resize({ width: 24, height: 24 }));
    tray.setToolTip(productName);
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: "打開星球", click: () => switchMode("planet") },
      { label: shortcutReady ? "召喚桌寵（Alt + Win + P）" : "召喚桌寵", click: () => switchMode("pet") },
      ...(process.platform === "win32" && !shortcutReady
        ? [{ label: "Alt + Win + P 無法註冊", enabled: false }] : []),
      { type: "separator" },
      { label: "退出", click: () => app.quit() },
    ]));
    tray.on("double-click", showWindow);
  } catch (error) {
    tray?.destroy();
    tray = undefined;
    console.warn("System tray unavailable:", error.message);
  }
}

async function startDesktop() {
  if (!app.isPackaged) {
    const envFile = path.join(app.getAppPath(), ".env");
    if (existsSync(envFile)) process.loadEnvFile(envFile);
  }
  const token = randomBytes(32).toString("hex");
  const { startServer } = await import("../server/index.js");
  server = await startServer({ port, staticFiles: true, desktopToken: token, enableProvider: !app.isPackaged });
  if (process.platform === "win32") app.setAppUserModelId("tw.companionplanet.app");
  window = new BrowserWindow({
    ...require("./window-options.cjs")(path.join(__dirname, "preload.cjs")),
    icon: iconPath,
    title: productName,
  });
  window.removeMenu();
  window.on("page-title-updated", (event) => event.preventDefault());
  window.on("close", (event) => {
    if (!quitting) {
      event.preventDefault();
      hideWindow();
    }
  });
  window.on("blur", () => { grab = null; });
  screen.on("display-removed", keepVisible);
  screen.on("display-metrics-changed", keepVisible);
  await connectRenderer(token);
  await window.loadURL(origin);
  showWindow();

  let shortcutReady = false;
  if (process.platform === "win32") {
    try {
      shortcutReady = globalShortcut.register(shortcut, () => switchMode("pet"));
    } catch (error) {
      console.warn("Desktop shortcut unavailable:", error.message);
    }
  }
  createTray(shortcutReady);
  if (process.platform === "win32" && !shortcutReady) {
    void dialog.showMessageBox(window, {
      type: "info",
      title: productName,
      message: "無法註冊 Alt + Win + P",
      detail: tray ? "你仍可從系統匣選擇「召喚桌寵」，也可以使用星球畫面上的桌寵按鈕。"
        : "你仍可使用星球畫面上的桌寵按鈕。",
    });
  }
}

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on("second-instance", showWindow);
  app.whenReady().then(startDesktop).catch((error) => {
    console.error("Desktop startup failed:", error.message);
    dialog.showErrorBox(productName, error.code === "EADDRINUSE"
      ? "本機連接埠 3002 正被其他程式使用。請關閉占用此連接埠的程式後，再開啟同頻星球。"
      : "同頻星球無法啟動。請重新開啟應用程式，或重新安裝。");
    app.quit();
  });
  app.on("before-quit", () => {
    quitting = true;
    tray?.destroy();
    server?.close();
  });
  app.on("will-quit", () => globalShortcut.unregisterAll());
}
