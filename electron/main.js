const { app, BrowserWindow, shell, Tray, Menu, ipcMain, Notification, dialog, protocol } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

let mainWindow;
let tray;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 업데이트 상태
let updateStatus = 'idle';

// 로딩 HTML
const loadingHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #ffffff;
      height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e5e5e5;
      border-top-color: #5677b0;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
</body>
</html>
`;

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
    show: false,
  });

  // 로딩 화면 먼저 표시
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHTML)}`);
  mainWindow.show();

  // 실제 콘텐츠 로드
  setTimeout(() => {
    if (isDev) {
      mainWindow.loadURL('http://localhost:3000');
    } else {
      // 프로덕션: Vercel URL 사용
      mainWindow.loadURL('https://nine-net.vercel.app');
    }
  }, 500);

  // 로드 실패 시 에러 페이지 표시
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log('로드 실패:', errorDescription);
    mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100vh;
            background: #f5f5f5;
            color: #333;
          }
          h1 { font-size: 24px; margin-bottom: 10px; }
          p { color: #666; margin-bottom: 20px; }
          button {
            padding: 10px 20px;
            background: #5677b0;
            color: white;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 14px;
          }
          button:hover { opacity: 0.9; }
        </style>
      </head>
      <body>
        <h1>연결할 수 없습니다</h1>
        <p>인터넷 연결을 확인해주세요.</p>
        <button onclick="location.reload()">다시 시도</button>
      </body>
      </html>
    `)}`);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 앱 시작 시 자동 업데이트 확인 (프로덕션만)
  if (!isDev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 3000);
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

ipcMain.on('open-path', (event, filePath) => {
  shell.showItemInFolder(filePath);
});

// 업데이트 관련 IPC
ipcMain.on('check-for-update', () => {
  if (!isDev) {
    updateStatus = 'checking';
    sendUpdateStatus();
    autoUpdater.checkForUpdates();
  } else {
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { 
        status: 'dev-mode',
        message: '개발 모드에서는 업데이트를 확인할 수 없습니다.'
      });
    }
  }
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

function sendUpdateStatus(data = {}) {
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { status: updateStatus, ...data });
  }
}

autoUpdater.on('checking-for-update', () => {
  updateStatus = 'checking';
  sendUpdateStatus({ message: '업데이트 확인 중...' });
});

autoUpdater.on('update-available', (info) => {
  updateStatus = 'available';
  sendUpdateStatus({ 
    message: `새 버전 ${info.version}이 있습니다. 다운로드 중...`,
    version: info.version
  });
});

autoUpdater.on('update-not-available', (info) => {
  updateStatus = 'idle';
  sendUpdateStatus({ 
    message: '최신 버전입니다.',
    version: info.version
  });
});

autoUpdater.on('download-progress', (progress) => {
  updateStatus = 'downloading';
  sendUpdateStatus({ 
    message: `다운로드 중... ${Math.round(progress.percent)}%`,
    percent: progress.percent
  });
});

autoUpdater.on('update-downloaded', (info) => {
  updateStatus = 'ready';
  sendUpdateStatus({ 
    message: `버전 ${info.version} 다운로드 완료. 재시작하면 설치됩니다.`,
    version: info.version
  });
  
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: '업데이트 준비 완료',
      body: `Nine Net ${info.version} 버전이 준비되었습니다. 재시작하면 설치됩니다.`,
    });
    notification.on('click', () => {
      mainWindow?.show();
    });
    notification.show();
  }
});

autoUpdater.on('error', (err) => {
  updateStatus = 'error';
  sendUpdateStatus({ 
    message: '업데이트 확인 실패: ' + err.message,
    error: err.message
  });
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
