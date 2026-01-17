const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  isPopup: window.location.pathname.includes('messenger-popup'),
});
