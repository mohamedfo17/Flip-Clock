import { app, BrowserWindow, ipcMain, Tray, Menu, nativeImage, Notification } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let tray = null;
let previousBounds = { width: 1050, height: 720 };
let currentMode = 'standard'; // 'standard' | 'mini' | 'fullscreen'

const DATA_FILE = path.join(app.getPath('userData'), 'flip_clock_data.json');

function createTrayIcon() {
  // Generate a clean 16x16 monochrome clock icon PNG data buffer
  // SVG icon converted to data URI
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
    <rect width="16" height="16" rx="3" fill="#18181b"/>
    <rect x="2" y="2" width="12" height="5.5" rx="1" fill="#27272a"/>
    <rect x="2" y="8.5" width="12" height="5.5" rx="1" fill="#27272a"/>
    <line x1="1" y1="8" x2="15" y2="8" stroke="#09090b" stroke-width="1"/>
    <circle cx="8" cy="8" r="1" fill="#fafafa"/>
  </svg>`;

  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1050,
    height: 720,
    minWidth: 780,
    minHeight: 540,
    backgroundColor: '#09090b',
    frame: false,
    show: false,
    title: 'Minimalist Flip Clock & Productivity',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // Ensures timer accuracy in background
    }
  });

  // Check if dist/index.html exists (production/built) or serve index.html directly
  const distPath = path.join(__dirname, '../dist/index.html');
  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    // Fallback if built file is not yet generated
    mainWindow.loadFile(path.join(__dirname, '../index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-state-changed', { isMaximized: true });
  });

  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-state-changed', { isMaximized: false });
  });

  mainWindow.on('enter-full-screen', () => {
    mainWindow?.webContents.send('window-state-changed', { isFullscreen: true });
  });

  mainWindow.on('leave-full-screen', () => {
    mainWindow?.webContents.send('window-state-changed', { isFullscreen: false });
  });
}

function setupTray() {
  try {
    const icon = createTrayIcon();
    tray = new Tray(icon);
    tray.setToolTip('Flip Clock & Productivity');

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Flip Clock',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Zen Fullscreen',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        }
      },
      {
        label: 'Mini Floating Clock',
        click: () => {
          setWindowMode('mini');
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(contextMenu); https://127.0.0.1:61978/static/artifacts/df6446c8-b3bf-4ffe-b477-3cfa74152c7d/scene_4_mini_widget_1791147830862.jpg?csrf=db72d553-4b26-40cc-b5de-ef5ff92375bd

    tray.on('click', () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          if (mainWindow.isFocused()) {
            mainWindow.hide();
          } else {
            mainWindow.focus();
          }
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });
  } catch (err) {
    console.error('Tray initialization error:', err);
  }
}

function setWindowMode(mode) {
  if (!mainWindow) return;

  if (mode === 'mini') {
    if (currentMode !== 'mini') {
      previousBounds = mainWindow.getBounds();
    }
    currentMode = 'mini';
    if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
    mainWindow.setMinimumSize(320, 130);
    mainWindow.setSize(370, 145);
    mainWindow.setAlwaysOnTop(true, 'floating');
    mainWindow?.webContents.send('window-state-changed', { mode: 'mini' });
  } else if (mode === 'standard') {
    currentMode = 'standard';
    if (mainWindow.isFullScreen()) mainWindow.setFullScreen(false);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setMinimumSize(780, 540);
    mainWindow.setSize(
      Math.max(previousBounds.width, 1000),
      Math.max(previousBounds.height, 680)
    );
    mainWindow.center();
    mainWindow?.webContents.send('window-state-changed', { mode: 'standard' });
  } else if (mode === 'fullscreen') {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
}

// IPC Handlers
ipcMain.handle('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window-maximize', () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.handle('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-toggle-fullscreen', () => {
  if (!mainWindow) return;
  const nextFs = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(nextFs);
  return nextFs;
});

ipcMain.handle('window-set-mode', (_event, mode) => {
  setWindowMode(mode);
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

// Storage IPC
ipcMain.handle('storage-save', async (_event, data) => {
  try {
    await fs.promises.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return { success: true };
  } catch (err) {
    console.error('Failed to save data:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('storage-load', async () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = await fs.promises.readFile(DATA_FILE, 'utf8');
      return JSON.parse(content);
    }
    return null;
  } catch (err) {
    console.error('Failed to load data:', err);
    return null;
  }
});

// Notifications IPC
ipcMain.handle('notification-show', (_event, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: title || 'Flip Clock Focus',
      body: body || '',
      silent: false
    }).show();
  }
});

app.whenReady().then(() => {
  createWindow();
  setupTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
