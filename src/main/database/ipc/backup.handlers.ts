import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { BackupRepository } from '../repositories/BackupRepository';

function requireBackupAccess(token: string) {
  const user = AuthRepository.getCurrentUser(token);
  const allowed = Boolean(
    user?.permissions.includes('backup.manage') ||
    user?.permissions.includes('settings.edit') ||
    user?.permissions.includes('ENTERPRISE_FULL')
  );
  if (!allowed) throw new Error('Unauthorized: backup.manage or settings.edit permission is required.');
  return user;
}

export function registerBackupHandlers() {
  ipcMain.handle('backup:create', (_, token: string) => {
    const user = requireBackupAccess(token);
    return BackupRepository.create('manual', user?.id);
  });
  ipcMain.handle('backup:list', (_, token: string) => {
    requireBackupAccess(token);
    return BackupRepository.list();
  });
  ipcMain.handle('backup:restore', (_, token: string, filePath: string) => {
    const user = requireBackupAccess(token);
    return BackupRepository.restore(filePath, user?.id);
  });
  ipcMain.handle('backup:validate', (_, token: string, filePath: string) => {
    requireBackupAccess(token);
    return BackupRepository.validate(filePath);
  });
  ipcMain.handle('backup:integrityCheck', (_, token: string) => {
    requireBackupAccess(token);
    return BackupRepository.integrityCheck();
  });
  ipcMain.handle('backup:getSettings', (_, token: string) => {
    requireBackupAccess(token);
    return BackupRepository.getSettings();
  });
  ipcMain.handle('backup:updateSettings', (_, token: string, settings: Record<string, string>) => {
    requireBackupAccess(token);
    return BackupRepository.updateSettings(settings);
  });
}
