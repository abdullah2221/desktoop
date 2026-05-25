import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { ProductRepository } from '../repositories/ProductRepository';

export function registerProductHandlers() {
  const canViewProducts = (token: string) => (
    AuthRepository.hasPermission(token, 'inventory.product.edit')
    || AuthRepository.hasPermission(token, 'inventory.view.branch')
    || AuthRepository.hasPermission(token, 'pos.sale.create')
  );

  ipcMain.handle('products:getAll', (_, token: string) => {
    if (!canViewProducts(token)) throw new Error('Unauthorized');
    return ProductRepository.getAll();
  });

  ipcMain.handle('products:getById', (_, token: string, id: string) => {
    if (!canViewProducts(token)) throw new Error('Unauthorized');
    return ProductRepository.getById(id);
  });

  ipcMain.handle('products:getByBarcode', (_, token: string, barcode: string) => {
    if (!canViewProducts(token)) throw new Error('Unauthorized');
    return ProductRepository.getByBarcode(barcode);
  });

  ipcMain.handle('products:searchByBarcodeOrSku', (_, token: string, query: string) => {
    if (!canViewProducts(token)) throw new Error('Unauthorized');
    return ProductRepository.searchByBarcodeOrSku(query);
  });


  ipcMain.handle('products:getLowStock', (_, token: string) => {
    if (!canViewProducts(token)) throw new Error('Unauthorized');
    return ProductRepository.getLowStock();
  });

  ipcMain.handle('products:create', (_, token: string, product: any) => {
    AuthRepository.requirePermission(token, 'inventory.product.edit');
    return ProductRepository.create(product);
  });

  ipcMain.handle('products:update', (_, token: string, product: any) => {
    AuthRepository.requirePermission(token, 'inventory.product.edit');
    return ProductRepository.update(product);
  });

  ipcMain.handle('products:deactivate', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'inventory.product.edit');
    return ProductRepository.deactivate(id);
  });

  ipcMain.handle('products:reactivate', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'inventory.product.edit');
    return ProductRepository.reactivate(id);
  });

  ipcMain.handle('products:updateStock', (_, token: string, id: string, newStock: number) => {
    AuthRepository.requirePermission(token, 'inventory.adjust');
    return ProductRepository.updateStock(id, newStock);
  });

  ipcMain.handle('products:getStockMovements', (_, token: string, productId: string, filters?: any) => {
    if (!canViewProducts(token)) throw new Error('Unauthorized');
    return ProductRepository.getStockMovements(productId, filters || {});
  });

  ipcMain.handle('products:getBranchStock', (_, token: string, productId: string) => {
    if (!canViewProducts(token)) throw new Error('Unauthorized');
    return ProductRepository.getBranchStock(productId);
  });

  ipcMain.handle('products:getAuditTrail', (_, token: string, productId: string) => {
    if (!canViewProducts(token)) throw new Error('Unauthorized');
    return ProductRepository.getAuditTrail(productId);
  });
}
