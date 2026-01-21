const { app, BrowserWindow, shell, Tray, Menu, ipcMain, Notification, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');

let mainWindow;
let tray;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const baseUrl = isDev ? 'http://localhost:3000' : 'https://nine-net.vercel.app';

// 업데이트 상태
let updateStatus = 'idle'; // idle, checking, available, downloading, ready, error

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
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: white;
      -webkit-app-region: drag;
    }
    .logo {
      font-size: 48px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 30px;
    }
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top-color: white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .status {
      margin-top: 20px;
      font-size: 14px;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="logo">🏢</div>
  <div class="title">Nine Net</div>
  <div class="spinner"></div>
  <div class="status">연결 중...</div>
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
    show: false, // 처음에 숨김
  });

  // 로딩 화면 먼저 표시
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHTML)}`);
  mainWindow.show();

  // 실제 URL 로드
  let loadAttempts = 0;
  const maxAttempts = 3;

  const loadMainUrl = () => {
    loadAttempts++;
    mainWindow.loadURL(baseUrl);
  };

  // 약간의 딜레이 후 메인 URL 로드
  setTimeout(loadMainUrl, 500);

  // 로드 실패 시 재시도
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.log(`로드 실패 (${loadAttempts}/${maxAttempts}):`, errorDescription);
    
    if (loadAttempts < maxAttempts) {
      setTimeout(loadMainUrl, 2000); // 2초 후 재시도
    } else {
      // 최대 시도 후 에러 페이지 표시
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
    }
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
    }, 3000); // 3초 후 확인
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

// ============================================
// 업데이트 관련 IPC
// ============================================

// 수동 업데이트 확인
ipcMain.on('check-for-update', () => {
  if (!isDev) {
    updateStatus = 'checking';
    sendUpdateStatus();
    autoUpdater.checkForUpdates();
  } else {
    // 개발 모드에서는 알림만
    if (mainWindow) {
      mainWindow.webContents.send('update-status', { 
        status: 'dev-mode',
        message: '개발 모드에서는 업데이트를 확인할 수 없습니다.'
      });
    }
  }
});

// 업데이트 설치 (재시작)
ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

// 현재 앱 버전 요청
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// 업데이트 상태 전송
function sendUpdateStatus(data = {}) {
  if (mainWindow) {
    mainWindow.webContents.send('update-status', { status: updateStatus, ...data });
  }
}

// 업데이트 확인 중
autoUpdater.on('checking-for-update', () => {
  updateStatus = 'checking';
  sendUpdateStatus({ message: '업데이트 확인 중...' });
});

// 업데이트 있음
autoUpdater.on('update-available', (info) => {
  updateStatus = 'available';
  sendUpdateStatus({ 
    message: `새 버전 ${info.version}이 있습니다. 다운로드 중...`,
    version: info.version
  });
});

// 업데이트 없음 (최신 버전)
autoUpdater.on('update-not-available', (info) => {
  updateStatus = 'idle';
  sendUpdateStatus({ 
    message: '최신 버전입니다.',
    version: info.version
  });
});

// 다운로드 진행률
autoUpdater.on('download-progress', (progress) => {
  updateStatus = 'downloading';
  sendUpdateStatus({ 
    message: `다운로드 중... ${Math.round(progress.percent)}%`,
    percent: progress.percent
  });
});

// 다운로드 완료
autoUpdater.on('update-downloaded', (info) => {
  updateStatus = 'ready';
  sendUpdateStatus({ 
    message: `버전 ${info.version} 다운로드 완료. 재시작하면 설치됩니다.`,
    version: info.version
  });
  
  // 알림 표시
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

// 업데이트 에러
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
