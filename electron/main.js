const { app, BrowserWindow, shell, Tray, Menu, screen } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;
let messengerWindow;
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
    },
    titleBarStyle: 'default',
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

function createMessengerWindow() {
  if (messengerWindow) {
    messengerWindow.focus();
    return;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  messengerWindow = new BrowserWindow({
    width: 360,
    height: 500,
    x: width - 380,
    y: height - 520,
    frame: false,
    transparent: false,
    alwaysOnTop: true,
    resizable: true,
    minimizable: false,
    maximizable: false,
    skipTaskbar: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon-512.png'),
    titleBarStyle: 'hidden',
    trafficLightPosition: { x: 10, y: 10 },
  });

  messengerWindow.loadURL(baseUrl + '/messenger-popup');

  messengerWindow.on('closed', () => {
    messengerWindow = null;
  });
}

function toggleMessengerWindow() {
  if (messengerWindow) {
    if (messengerWindow.isVisible()) {
      messengerWindow.hide();
    } else {
      messengerWindow.show();
    }
  } else {
    createMessengerWindow();
  }
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/icon-512.png');
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    { label: '메인 창 열기', click: () => mainWindow?.show() },
    { label: '메신저 열기/닫기', click: toggleMessengerWindow },
    { type: 'separator' },
    { label: '종료', click: () => app.quit() },
  ]);

  tray.setToolTip('Nine Net');
  tray.setContextMenu(contextMenu);
  tray.on('click', toggleMessengerWindow);
}

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
