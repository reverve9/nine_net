const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  // 메신저앱 실행
  openMessengerApp: () => ipcRenderer.send('open-messenger-app'),
  // 윈도우 제어
  closeWindow: () => ipcRenderer.send('close-window'),
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  // 알림
  showNotification: (title, body) => ipcRenderer.send('show-notification', { title, body }),
  // 파일 선택
  selectFile: () => ipcRenderer.invoke('select-file'),
  // 파일 경로 열기
  openPath: (filePath) => ipcRenderer.send('open-path', filePath),
  // 업데이트
  checkForUpdate: () => ipcRenderer.send('check-for-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  onUpdateStatus: (callback) => {
    ipcRenderer.on('update-status', (event, data) => callback(data));
  },
  removeUpdateListener: () => {
    ipcRenderer.removeAllListeners('update-status');
  },
});
