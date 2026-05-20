import { ipcMain } from 'electron';
import { SettingsRepository } from '../repositories/SettingsRepository';

export function registerSettingsHandlers() {
  ipcMain.handle('settings:get', () => {
    return SettingsRepository.get();
  });

  ipcMain.handle('settings:update', (_, key: string, value: string) => {
    return SettingsRepository.update(key, value);
  });
}
