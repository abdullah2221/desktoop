import { ipcMain } from 'electron';
import { BackupService } from '../backup';
import { DatabaseInspector } from '../inspector';

export function registerSystemHandlers() {
  // Database backup IPC handler
  ipcMain.handle('system:backup', () => {
    try {
      return BackupService.backup();
    } catch (err: any) {
      console.error('[System Handler] Failed to execute database backup:', err);
      throw err;
    }
  });

  // Database stats inspector IPC handler
  ipcMain.handle('system:getStats', () => {
    try {
      return DatabaseInspector.getStats();
    } catch (err: any) {
      console.error('[System Handler] Failed to get database stats:', err);
      throw err;
    }
  });
}
