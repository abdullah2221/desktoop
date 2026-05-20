import { ipcMain } from 'electron';
import { ExpenseRepository } from '../repositories/ExpenseRepository';

export function registerExpenseHandlers() {
  ipcMain.handle('expenses:getAll', () => {
    return ExpenseRepository.getAll();
  });

  ipcMain.handle('expenses:create', (_, expense: any) => {
    return ExpenseRepository.create(expense);
  });
}
