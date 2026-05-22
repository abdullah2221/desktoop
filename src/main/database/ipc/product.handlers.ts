import { ipcMain } from 'electron';
import { ProductRepository } from '../repositories/ProductRepository';

export function registerProductHandlers() {
  ipcMain.handle('products:getAll', () => {
    return ProductRepository.getAll();
  });

  ipcMain.handle('products:getById', (_, id: string) => {
    return ProductRepository.getById(id);
  });

  ipcMain.handle('products:getByBarcode', (_, barcode: string) => {
    return ProductRepository.getByBarcode(barcode);
  });

  ipcMain.handle('products:searchByBarcodeOrSku', (_, query: string) => {
    return ProductRepository.searchByBarcodeOrSku(query);
  });


  ipcMain.handle('products:getLowStock', () => {
    return ProductRepository.getLowStock();
  });

  ipcMain.handle('products:create', (_, product: any) => {
    console.log('[IPC Handler] products:create channel triggered with product payload:', product);
    try {
      const result = ProductRepository.create(product);
      return result;
    } catch (err: any) {
      console.error('[IPC Handler] products:create database operation failed:', err.message || err);
      throw err;
    }
  });

  ipcMain.handle('products:update', (_, product: any) => {
    return ProductRepository.update(product);
  });

  ipcMain.handle('products:deactivate', (_, id: string) => {
    return ProductRepository.deactivate(id);
  });

  ipcMain.handle('products:updateStock', (_, id: string, newStock: number) => {
    return ProductRepository.updateStock(id, newStock);
  });
}
