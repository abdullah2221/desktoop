import { dialog, ipcMain, shell } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { BackupRepository } from '../repositories/BackupRepository';

function requirePerm(token: string, perm: string) {
  const user = AuthRepository.getCurrentUser(token);
  if (!user) throw new Error('Unauthorized');
  const allowed = Boolean(user.permissions?.includes(perm) || user.permissions?.includes('ENTERPRISE_FULL'));
  if (!allowed) throw new Error(`Unauthorized: ${perm} permission is required.`);
  return user;
}

export function registerBackupHandlers() {
  ipcMain.handle('backup:createFull', (_, token: string, options: any = {}) => {
    const user = requirePerm(token, 'backup.create');
    return BackupRepository.createFull({
      destinationDir: options.destinationDir,
      password: options.password,
      notes: options.notes,
      actorId: user.id,
      storeName: options.storeName,
      appVersion: options.appVersion
    });
  });

  ipcMain.handle('backup:validateFile', (_, token: string, filePath: string, password?: string) => {
    requirePerm(token, 'backup.view');
    return BackupRepository.validateFile(filePath, password);
  });

  ipcMain.handle('backup:restoreFile', (_, token: string, payload: { filePath: string; password?: string; adminPassword: string }) => {
    const user = requirePerm(token, 'backup.restore');
    if (user.role_id !== 'R001' && !user.permissions?.includes('users.manage') && !user.permissions?.includes('ENTERPRISE_FULL')) {
      throw new Error('Only Admin/Owner can restore backup.');
    }
    // Admin password confirmation
    const login = AuthRepository.login(user.username, payload.adminPassword);
    AuthRepository.logout(login.token);
    return BackupRepository.restoreFile(payload.filePath, { password: payload.password, actorId: user.id });
  });

  ipcMain.handle('backup:selectBackupDestination', async (_, token: string) => {
    requirePerm(token, 'backup.export');
    const selected = await dialog.showOpenDialog({ properties: ['openDirectory', 'createDirectory'] });
    return selected.canceled ? null : selected.filePaths[0];
  });

  ipcMain.handle('backup:selectBackupFile', async (_, token: string) => {
    requirePerm(token, 'backup.import');
    const selected = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'ERP Backup', extensions: ['erpbackup'] }]
    });
    return selected.canceled ? null : selected.filePaths[0];
  });

  ipcMain.handle('backup:openBackupFolder', (_, token: string, folderPath: string) => {
    requirePerm(token, 'backup.view');
    if (!folderPath) return false;
    shell.openPath(folderPath);
    return true;
  });

  ipcMain.handle('backup:getHistory', (_, token: string) => {
    requirePerm(token, 'backup.view');
    return BackupRepository.list();
  });

  ipcMain.handle('backup:getSettings', (_, token: string) => {
    requirePerm(token, 'backup.view');
    return BackupRepository.getSettings();
  });

  ipcMain.handle('backup:updateSettings', (_, token: string, settings: Record<string, string>) => {
    const user = requirePerm(token, 'backup.manage');
    const result = BackupRepository.updateSettings(settings);
    BackupRepository.updateSetting('last_settings_update_by', user.id);
    return result;
  });

  ipcMain.handle('backup:create', (_, token: string) => {
    const user = requirePerm(token, 'backup.create');
    return BackupRepository.create('manual', user?.id);
  });
  ipcMain.handle('backup:list', (_, token: string) => {
    requirePerm(token, 'backup.view');
    return BackupRepository.list();
  });
  ipcMain.handle('backup:restore', (_, token: string, filePath: string) => {
    const user = requirePerm(token, 'backup.restore');
    return BackupRepository.restore(filePath, user?.id);
  });
  ipcMain.handle('backup:validate', (_, token: string, filePath: string) => {
    requirePerm(token, 'backup.view');
    return BackupRepository.validate(filePath);
  });
  ipcMain.handle('backup:integrityCheck', (_, token: string) => {
    requirePerm(token, 'backup.view');
    return BackupRepository.integrityCheck();
  });
}
