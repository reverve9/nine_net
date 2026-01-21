const { app, BrowserWindow, shell, Tray, Menu, ipcMain, Notification, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;
let tray;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const baseUrl = isDev ? 'http://localhost:3000' : 'https://nine-net.vercel.app';

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:ninenet',
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 12, y: 14 },
    frame: true,
    transparent: false,
    icon: path.join(__dirname, '../public/icon-512.png'),
  });

  mainWindow.loadURL(baseUrl);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
}

function createTray() {
  const trayIconPath = path.join(__dirname, '../public/tray-iconTemplate.png');
  
  tray = new Tray(trayIconPath);

  const contextMenu = Menu.buildFromTemplate([
    { label: '메인 창 열기', click: () => mainWindow?.show() },
    { label: '메신저 열기', click: () => openMessengerApp() },
    { type: 'separator' },
    { label: '종료', click: () => app.quit() },
  ]);

  tray.setToolTip('Nine Net');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

// 메신저앱 실행
function openMessengerApp() {
  shell.openExternal('ninenet-messenger://');
}

// IPC 핸들러
ipcMain.on('open-messenger-app', () => {
  openMessengerApp();
});

ipcMain.on('close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.close();
});

ipcMain.on('minimize-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) win.minimize();
});

// 알림 표시
ipcMain.on('show-notification', (event, { title, body }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title,
      body: body,
      silent: false,
    });
    
    notification.on('click', () => {
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        win.show();
        win.focus();
      }
    });
    
    notification.show();
  }
});

// 파일 선택 다이얼로그
ipcMain.handle('select-file', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = await dialog.showOpenDialog(win, {
    properties: ['openFile'],
    title: '파일 선택',
  });
  
  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  
  return result.filePaths[0];
});

// 파일 경로 열기 (Finder/Explorer)
ipcMain.on('open-path', (event, filePath) => {
  shell.showItemInFolder(filePath);
});

autoUpdater.on('update-available', () => {
  console.log('업데이트가 있습니다. 다운로드 중...');
});

autoUpdater.on('update-downloaded', () => {
  console.log('업데이트 다운로드 완료. 재시작 시 설치됩니다.');
});

autoUpdater.on('error', (err) => {
  console.error('업데이트 에러:', err);
});

app.whenReady().then(() => {
  createMainWindow();
  createTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

app.on('before-quit', () => {
  if (tray) tray.destroy();
});
