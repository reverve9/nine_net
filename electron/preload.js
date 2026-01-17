const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  openMessenger: () => ipcRenderer.send('open-messenger'),
  closeMessenger: () => ipcRenderer.send('close-messenger'),
  toggleMessenger: () => ipcRenderer.send('toggle-messenger'),
});
