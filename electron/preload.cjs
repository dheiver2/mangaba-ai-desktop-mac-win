const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mangabaDesktop', {
  version: () => ipcRenderer.invoke('app-version'),
  platform: process.platform,
});
