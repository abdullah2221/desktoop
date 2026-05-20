import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { getDatabase } from './database/connection';
import { runMigrations } from './database/migrations';
import { runSeeds } from './database/seed';
import { registerDatabaseIpc } from './database/ipc/registerDatabaseIpc';

let mainWindow: BrowserWindow | null = null;
const isDev = !app.isPackaged;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    title: 'POS & Inventory ERP',
    webPreferences: {
      preload: path.join(__dirname, '../preload/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    show: false, // Prevents white flash before load
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Gracefully show window when fully ready
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize Database instance & run SQLite scripts
  console.log('[App Startup] Initializing database engine...');
  getDatabase();
  runMigrations();
  runSeeds();

  // Register Consolidative database IPC handlers
  registerDatabaseIpc();

  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// App Core Version Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});
