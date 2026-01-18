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
  // 파일 선택
  selectFile: () => ipcRenderer.invoke('select-file'),
  // 파일 경로 열기
  openPath: (filePath) => ipcRenderer.send('open-path', filePath),
});
