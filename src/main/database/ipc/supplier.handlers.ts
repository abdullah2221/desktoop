import { ipcMain } from 'electron';
import { SupplierRepository } from '../repositories/SupplierRepository';

export function registerSupplierHandlers() {
  console.log('[IPC Registration] Registering supplier handlers...');
  ipcMain.handle('suppliers:getAll', () => {
    return SupplierRepository.getAll();
  });

  ipcMain.handle('suppliers:getById', (_, id: string) => {
    return SupplierRepository.getById(id);
  });

  ipcMain.handle('suppliers:create', (_, supplier: any) => {
    try {
      return SupplierRepository.create(supplier);
    } catch (err: any) {
      console.error('[IPC Handler] suppliers:create database operation failed:', err.message || err);
      throw err;
    }
  });

  ipcMain.handle('suppliers:update', (_, supplier: any) => {
    return SupplierRepository.update(supplier);
  });

  ipcMain.handle('suppliers:deactivate', (_, id: string) => {
    return SupplierRepository.deactivate(id);
  });

  ipcMain.handle('suppliers:getLedger', (_, supplierId: string) => {
    return SupplierRepository.getLedger(supplierId);
  });
  console.log('[IPC Registration] Supplier handlers registered successfully.');
}
