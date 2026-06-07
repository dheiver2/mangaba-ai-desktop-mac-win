const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mangabaDesktop', {
  version: () => ipcRenderer.invoke('app-version'),
  platform: process.platform,
  // Recebe atualizações de status da tela de carregamento
  onStatus: (cb) => ipcRenderer.on('mangaba-status', (_e, msg) => cb(msg)),
});
