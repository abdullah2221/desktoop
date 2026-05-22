import { ipcMain, dialog } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { ImportExportRepository } from '../repositories/ImportExportRepository';
import { ImportExportService } from '../repositories/ImportExportService';
import * as fs from 'fs';

function requireImportPermission(token: string) {
  const user = AuthRepository.getCurrentUser(token);
  const allowed = Boolean(
    user?.permissions.includes('data.import') ||
    user?.permissions.includes('ENTERPRISE_FULL')
  );
  if (!allowed) throw new Error('Unauthorized: data.import permission is required.');
  return user;
}

function requireExportPermission(token: string) {
  const user = AuthRepository.getCurrentUser(token);
  const allowed = Boolean(
    user?.permissions.includes('data.export') ||
    user?.permissions.includes('ENTERPRISE_FULL')
  );
  if (!allowed) throw new Error('Unauthorized: data.export permission is required.');
  return user;
}

function requireAnySyncPermission(token: string) {
  const user = AuthRepository.getCurrentUser(token);
  const allowed = Boolean(
    user?.permissions.includes('data.import') ||
    user?.permissions.includes('data.export') ||
    user?.permissions.includes('ENTERPRISE_FULL')
  );
  if (!allowed) throw new Error('Unauthorized: Data Sync permission is required.');
  return user;
}

export function registerImportExportHandlers() {
  // Save template dialog & write
  ipcMain.handle('datasync:downloadTemplate', async (_, token: string, entityType: string, format: 'csv' | 'xlsx') => {
    requireAnySyncPermission(token);

    const defaultName = `${entityType}_template.${format}`;
    const result = await dialog.showSaveDialog({
      title: `Save ${entityType} Template`,
      defaultPath: defaultName,
      filters: [{ name: format.toUpperCase(), extensions: [format] }]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, reason: 'canceled' };
    }

    try {
      const buffer = ImportExportService.getTemplate(entityType, format);
      fs.writeFileSync(result.filePath, buffer);
      return { success: true, filePath: result.filePath };
    } catch (err: any) {
      console.error('[ImportExport IPC] Error saving template:', err);
      return { success: false, reason: err.message };
    }
  });

  // Select file dialog for import
  ipcMain.handle('datasync:chooseImportFile', async (_, token: string) => {
    requireImportPermission(token);

    const result = await dialog.showOpenDialog({
      title: 'Select Import File (CSV or Excel XLSX)',
      properties: ['openFile'],
      filters: [{ name: 'Spreadsheets', extensions: ['csv', 'xlsx'] }]
    });

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  // Preview import file
  ipcMain.handle('datasync:previewImport', async (_, token: string, filePath: string, entityType: string) => {
    requireImportPermission(token);
    try {
      const result = await ImportExportService.previewImport(filePath, entityType);
      return { success: true, result };
    } catch (err: any) {
      console.error('[ImportExport IPC] Error previewing import:', err);
      return { success: false, reason: err.message };
    }
  });

  // Commit validated rows
  ipcMain.handle('datasync:commitImport', async (_, token: string, jobId: string, previewRows: any[], atomic: boolean) => {
    requireImportPermission(token);
    try {
      const result = ImportExportService.commitImport(jobId, previewRows, atomic);
      return { success: true, result };
    } catch (err: any) {
      console.error('[ImportExport IPC] Error committing import:', err);
      return { success: false, reason: err.message };
    }
  });

  // Export data dialog and write
  ipcMain.handle('datasync:exportData', async (_, token: string, entityType: string, format: 'csv' | 'xlsx') => {
    requireExportPermission(token);

    const defaultName = `${entityType}_export_${Date.now()}.${format}`;
    const result = await dialog.showSaveDialog({
      title: `Export ${entityType} Data`,
      defaultPath: defaultName,
      filters: [{ name: format.toUpperCase(), extensions: [format] }]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, reason: 'canceled' };
    }

    try {
      const jobId = ImportExportService.exportData(entityType, format, result.filePath);
      return { success: true, jobId, filePath: result.filePath };
    } catch (err: any) {
      console.error('[ImportExport IPC] Error exporting data:', err);
      return { success: false, reason: err.message };
    }
  });

  // History logs
  ipcMain.handle('datasync:getImportJobs', (_, token: string) => {
    requireAnySyncPermission(token);
    return ImportExportRepository.getImportJobs();
  });

  ipcMain.handle('datasync:getExportJobs', (_, token: string) => {
    requireAnySyncPermission(token);
    return ImportExportRepository.getExportJobs();
  });

  ipcMain.handle('datasync:getJobErrors', (_, token: string, jobId: string) => {
    requireAnySyncPermission(token);
    return ImportExportRepository.getJobErrors(jobId);
  });
}
