import { ipcMain } from 'electron';
import { CategoryRepository } from '../repositories/CategoryRepository';

export function registerCategoryHandlers() {
  ipcMain.handle('categories:getAll', () => {
    return CategoryRepository.getAll();
  });

  ipcMain.handle('categories:create', (event, category) => {
    return CategoryRepository.create(category);
  });

  ipcMain.handle('categories:update', (event, category) => {
    return CategoryRepository.update(category);
  });

  ipcMain.handle('categories:deactivate', (event, id) => {
    return CategoryRepository.deactivate(id);
  });
}
