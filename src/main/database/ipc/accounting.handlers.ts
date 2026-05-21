import { ipcMain } from 'electron';
import { AccountingRepository } from '../repositories/AccountingRepository';
import { AuthRepository } from '../repositories/AuthRepository';
import { JournalRepository } from '../repositories/JournalRepository';

export function registerAccountingHandlers() {
  ipcMain.handle('accounts:getAll', () => {
    return AccountingRepository.getAllAccounts();
  });

  ipcMain.handle('accounts:create', (_, token: string, account: any) => {
    AuthRepository.requirePermission(token, 'accounting.journal.create');
    return AccountingRepository.createAccount(account);
  });

  ipcMain.handle('accounts:update', (_, token: string, account: any) => {
    AuthRepository.requirePermission(token, 'accounting.journal.create');
    return AccountingRepository.updateAccount(account);
  });

  ipcMain.handle('accounts:deactivate', (_, token: string, id: string) => {
    AuthRepository.requirePermission(token, 'accounting.journal.create');
    return AccountingRepository.deactivateAccount(id);
  });

  ipcMain.handle('journals:getAll', () => {
    return JournalRepository.getAllJournals();
  });

  ipcMain.handle('journals:create', (_, token: string, journal: any) => {
    AuthRepository.requirePermission(token, 'accounting.journal.create');
    return JournalRepository.createJournal(journal);
  });
}
