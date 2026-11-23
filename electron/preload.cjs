const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("desktop", {
  setMode: (mode) => ipcRenderer.invoke("world:mode", mode),
  hide: () => ipcRenderer.send("world:hide"),
  quit: () => ipcRenderer.send("world:quit"),
  onMode: (listener) => {
    const handler = (_event, mode) => listener(mode);
    ipcRenderer.on("world:mode", handler);
    return () => ipcRenderer.removeListener("world:mode", handler);
  },
});
