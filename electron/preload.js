const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  toggleMessenger: () => ipcRenderer.send('toggle-messenger'),
  openChat: (roomId, roomName) => ipcRenderer.send('open-chat', { roomId, roomName }),
  closeChat: (roomId) => ipcRenderer.send('close-chat', roomId),
  closeWindow: () => ipcRenderer.send('close-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  // 인증 관련
  onLogout: () => ipcRenderer.send('user-logout'),
  onLogin: () => ipcRenderer.send('user-login'),
  // 알림
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
});
