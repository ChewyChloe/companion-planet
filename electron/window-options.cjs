module.exports = (preload) => ({
  width: 1280,
  height: 800,
  minWidth: 800,
  minHeight: 650,
  transparent: true,
  backgroundColor: "#00000000",
  frame: false,
  show: false,
  webPreferences: {
    preload,
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
  },
});
