import { ipcMain } from 'electron';
import { UnitRepository } from '../repositories/UnitRepository';

export function registerUnitHandlers() {
  ipcMain.handle('units:getAll', () => {
    return UnitRepository.getAll();
  });

  ipcMain.handle('units:create', (event, unit) => {
    return UnitRepository.create(unit);
  });

  ipcMain.handle('units:update', (event, unit) => {
    return UnitRepository.update(unit);
  });

  ipcMain.handle('units:deactivate', (event, id) => {
    return UnitRepository.deactivate(id);
  });
}
