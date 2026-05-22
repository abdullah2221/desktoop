import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { getDatabase } from './database/connection';
import { runSeeds } from './database/seed';
import { registerDatabaseIpc } from './database/ipc/registerDatabaseIpc';
import { AppStartupManager } from './startup';
import { AppUpdaterService } from './updater';
import { logger } from './logger';

let mainWindow: BrowserWindow | null = null;
const isDev = !app.isPackaged;
const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

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
    logger.info('STARTUP', `[Dev Launch] Renderer URL: ${devServerUrl}`);
    mainWindow.loadURL(devServerUrl);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  // Gracefully show window when fully ready
  mainWindow.once('ready-to-show', () => {
    logger.info('STARTUP', 'Main window is ready to show — launching UI.');
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    logger.info('STARTUP', 'Main window closed.');
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  logger.info('STARTUP', `[Phase 1] Electron app ready. Version: ${app.getVersion()} | Packaged: ${app.isPackaged}`);

  // Phase 2: Initialize App Startup Manager (directories, DB, migrations)
  logger.info('STARTUP', '[Phase 2] Running AppStartupManager initialization...');
  const ok = await AppStartupManager.initialize();
  if (!ok) {
    logger.error('STARTUP', '[Phase 2] Fatal: AppStartupManager.initialize() returned false. Aborting.');
    return;
  }
  logger.info('STARTUP', '[Phase 2] AppStartupManager initialized successfully.');

  // Phase 3: Run Seeds
  logger.info('STARTUP', '[Phase 3] Running database seeds...');
  try {
    runSeeds();
    logger.info('STARTUP', '[Phase 3] Database seeds completed.');
  } catch (err) {
    logger.error('STARTUP', '[Phase 3] Seeds failed (non-fatal, continuing)', err);
  }

  // Phase 4: Initialize auto-update service
  logger.info('STARTUP', '[Phase 4] Initializing AutoUpdater service...');
  AppUpdaterService.init();

  // Phase 5: Register IPC handlers
  logger.info('STARTUP', '[Phase 5] Registering IPC database channels...');
  registerDatabaseIpc();
  logger.info('STARTUP', '[Phase 5] IPC channels registered.');

  // Phase 6: Create main window
  logger.info('STARTUP', '[Phase 6] Creating main browser window...');
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });

  logger.info('STARTUP', '[Complete] Enterprise ERP application startup sequence finished successfully.');
});

app.on('window-all-closed', () => {
  logger.info('STARTUP', 'All windows closed. Shutting down process.');
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// App Core Version Handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});
