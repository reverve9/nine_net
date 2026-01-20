const { app, BrowserWindow, shell, Tray, Menu, screen, ipcMain, Notification, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;
let messengerWindow;
let chatWindows = new Map();
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

function createMessengerWindow() {
  if (messengerWindow) {
    messengerWindow.show();
    messengerWindow.focus();
    return;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  messengerWindow = new BrowserWindow({
    width: 400,
    height: 600,
    minWidth: 400,
    minHeight: 400,
    x: width - 420,
    y: 80,
    movable: true,
    resizable: true,
    alwaysOnTop: false,
    frame: false,
    transparent: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:ninenet',
    },
    icon: path.join(__dirname, '../public/icon-512.png'),
    title: '메신저',
  });

  messengerWindow.loadURL(baseUrl + '/messenger');
  console.log('Messenger URL:', baseUrl + '/messenger');

  // 에러 핸들러
  messengerWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('Load failed:', errorCode, errorDescription);
  });

  messengerWindow.webContents.on('crashed', () => {
    console.log('Messenger window crashed!');
  });

  messengerWindow.webContents.on('did-finish-load', () => {
    console.log('Messenger loaded successfully');
  });

  // 디버깅용 - 비활성화
  // if (isDev) {
  //   messengerWindow.webContents.openDevTools({ mode: 'detach' });
  // }

  messengerWindow.on('closed', () => {
    messengerWindow = null;
  });
}

function createChatWindow(roomId, roomName) {
  if (chatWindows.has(roomId)) {
    const existingWindow = chatWindows.get(roomId);
    existingWindow.show();
    existingWindow.focus();
    return;
  }

  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const offset = chatWindows.size * 30;

  const chatWindow = new BrowserWindow({
    width: 400,
    height: 550,
    minWidth: 400,
    minHeight: 400,
    x: width - 440 - offset,
    y: 120 + offset,
    movable: true,
    resizable: true,
    alwaysOnTop: false,
    frame: false,
    transparent: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:ninenet',
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

// 모든 창에 로그아웃 브로드캐스트
function broadcastLogout() {
  // 메신저 창 닫기
  if (messengerWindow) {
    messengerWindow.close();
    messengerWindow = null;
  }
  
  // 모든 채팅창 닫기
  chatWindows.forEach((win) => {
    win.close();
  });
  chatWindows.clear();
}

// 모든 창에 로그인 상태 새로고침
function broadcastAuthChange() {
  if (messengerWindow) {
    messengerWindow.webContents.reload();
  }
  
  chatWindows.forEach((win) => {
    win.webContents.reload();
  });
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

// IPC 핸들러
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
      silent: false, // 시스템 알림음 사용
    });
    
    notification.on('click', () => {
      // 알림 클릭 시 해당 창 포커스
      const win = BrowserWindow.fromWebContents(event.sender);
      if (win) {
        win.show();
        win.focus();
      }
    });
    
    notification.show();
  }
});

// 로그아웃 이벤트 - 모든 메신저/채팅창 닫기
ipcMain.on('user-logout', () => {
  broadcastLogout();
});

// 로그인 이벤트 - 메신저/채팅창 새로고침
ipcMain.on('user-login', () => {
  broadcastAuthChange();
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
