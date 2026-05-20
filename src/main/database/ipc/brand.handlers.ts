import { ipcMain } from 'electron';
import { BrandRepository } from '../repositories/BrandRepository';

export function registerBrandHandlers() {
  ipcMain.handle('brands:getAll', () => {
    return BrandRepository.getAll();
  });

  ipcMain.handle('brands:create', (event, brand) => {
    return BrandRepository.create(brand);
  });

  ipcMain.handle('brands:update', (event, brand) => {
    return BrandRepository.update(brand);
  });

  ipcMain.handle('brands:deactivate', (event, id) => {
    return BrandRepository.deactivate(id);
  });
}
