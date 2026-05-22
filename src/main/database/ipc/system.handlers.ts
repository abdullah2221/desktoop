import { ipcMain } from 'electron';
import { BackupService } from '../backup';
import { DatabaseInspector } from '../inspector';
import { SystemRepository } from '../repositories/SystemRepository';
import { logger } from '../../logger';

export function registerSystemHandlers() {
  // Database backup IPC handler
  ipcMain.handle('system:backup', () => {
    try {
      logger.info('IPC', 'Handling system:backup IPC trigger');
      return BackupService.backup();
    } catch (err: any) {
      logger.error('IPC', 'Failed to execute database backup', err);
      throw err;
    }
  });

  // Database stats inspector IPC handler
  ipcMain.handle('system:getStats', () => {
    try {
      return DatabaseInspector.getStats();
    } catch (err: any) {
      logger.error('IPC', 'Failed to get database stats', err);
      throw err;
    }
  });

  // Get App Metadata Info
  ipcMain.handle('system:getAppInfo', () => {
    try {
      return SystemRepository.getAppInfo();
    } catch (err: any) {
      logger.error('IPC', 'Failed to get App info', err);
      throw err;
    }
  });

  // Get System Diagnostics
  ipcMain.handle('system:getDiagnostics', () => {
    try {
      return SystemRepository.getDiagnostics();
    } catch (err: any) {
      logger.error('IPC', 'Failed to get diagnostics', err);
      throw err;
    }
  });

  // Get Database Status details
  ipcMain.handle('system:getDatabaseStatus', () => {
    try {
      return SystemRepository.getDatabaseStatus();
    } catch (err: any) {
      logger.error('IPC', 'Failed to get Database status', err);
      throw err;
    }
  });

  // Get rotating log system lines/status
  ipcMain.handle('system:getLogStatus', () => {
    try {
      return SystemRepository.getLogStatus();
    } catch (err: any) {
      logger.error('IPC', 'Failed to get Log status', err);
      throw err;
    }
  });

  // Get current execution environment info
  ipcMain.handle('system:getEnvironmentInfo', () => {
    try {
      return {
        environment: SystemRepository.getAppInfo().environment,
        platform: process.platform,
        arch: process.arch,
      };
    } catch (err: any) {
      logger.error('IPC', 'Failed to get Environment info', err);
      throw err;
    }
  });
}
