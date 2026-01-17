const { app, BrowserWindow, shell, Tray, Menu, screen, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;
let messengerWindow;
let chatWindows = new Map(); // 여러 채팅창 관리
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
    messengerWindow.show();
    messengerWindow.focus();
    return;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  messengerWindow = new BrowserWindow({
    width: 320,
    height: 500,
    x: width - 340,
    y: 100,
    movable: true,
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon-512.png'),
    title: '메신저',
  });

  messengerWindow.loadURL(baseUrl + '/messenger');

  messengerWindow.on('closed', () => {
    messengerWindow = null;
  });
}

function createChatWindow(roomId, roomName) {
  // 이미 열린 채팅창이 있으면 포커스
  if (chatWindows.has(roomId)) {
    const existingWindow = chatWindows.get(roomId);
    existingWindow.show();
    existingWindow.focus();
    return;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // 창 위치를 약간씩 다르게 (겹치지 않게)
  const offset = chatWindows.size * 30;

  const chatWindow = new BrowserWindow({
    width: 360,
    height: 500,
    x: width - 400 - offset,
    y: 150 + offset,
    movable: true,
    resizable: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    icon: path.join(__dirname, '../public/icon-512.png'),
    title: roomName || '채팅',
  });

  chatWindow.loadURL(baseUrl + '/chat/' + roomId);

  chatWindows.set(roomId, chatWindow);

  chatWindow.on('closed', () => {
    chatWindows.delete(roomId);
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
  const trayIconPath = path.join(__dirname, '../public/tray-iconTemplate.png');
  
  tray = new Tray(trayIconPath);

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

// IPC 통신
ipcMain.on('toggle-messenger', () => {
  toggleMessengerWindow();
});

ipcMain.on('open-chat', (event, { roomId, roomName }) => {
  createChatWindow(roomId, roomName);
});

ipcMain.on('close-chat', (event, roomId) => {
  if (chatWindows.has(roomId)) {
    chatWindows.get(roomId).close();
  }
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
