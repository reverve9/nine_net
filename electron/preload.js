const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  toggleMessenger: () => ipcRenderer.send('toggle-messenger'),
  openChat: (roomId, roomName) => ipcRenderer.send('open-chat', { roomId, roomName }),
  closeChat: (roomId) => ipcRenderer.send('close-chat', roomId),
});
