import { ipcMain } from 'electron';
import { AccountingRepository } from '../repositories/AccountingRepository';
import { JournalRepository } from '../repositories/JournalRepository';

export function registerAccountingHandlers() {
  ipcMain.handle('accounts:getAll', () => {
    return AccountingRepository.getAllAccounts();
  });

  ipcMain.handle('accounts:create', (_, account: any) => {
    return AccountingRepository.createAccount(account);
  });

  ipcMain.handle('accounts:update', (_, account: any) => {
    return AccountingRepository.updateAccount(account);
  });

  ipcMain.handle('accounts:deactivate', (_, id: string) => {
    return AccountingRepository.deactivateAccount(id);
  });

  ipcMain.handle('journals:getAll', () => {
    return JournalRepository.getAllJournals();
  });

  ipcMain.handle('journals:create', (_, journal: any) => {
    return JournalRepository.createJournal(journal);
  });
}
