import { ipcMain } from 'electron';
import { BankAccountRepository } from '../repositories/BankAccountRepository';
import { BankReconciliationRepository } from '../repositories/BankReconciliationRepository';
import { MoneyTransactionRepository } from '../repositories/MoneyTransactionRepository';

export function registerBankHandlers() {
  ipcMain.handle('bankAccounts:getAll', () => BankAccountRepository.getAll());
  ipcMain.handle('bankAccounts:create', (_, payload) => BankAccountRepository.create(payload));
  ipcMain.handle('bankAccounts:update', (_, payload) => BankAccountRepository.update(payload));
  ipcMain.handle('bankAccounts:deactivate', (_, id: string) => BankAccountRepository.deactivate(id));
  ipcMain.handle('bankAccounts:getPaymentMethodMappings', () => BankAccountRepository.getPaymentMethodMappings());
  ipcMain.handle('bankAccounts:mapPaymentMethod', (_, paymentMethod, accountId) => BankAccountRepository.mapPaymentMethod(paymentMethod, accountId));

  ipcMain.handle('moneyTransactions:getAll', () => MoneyTransactionRepository.getAll());
  ipcMain.handle('moneyTransactions:getByAccount', (_, accountId: string) => MoneyTransactionRepository.getByAccount(accountId));
  ipcMain.handle('moneyTransactions:createDeposit', (_, payload) => MoneyTransactionRepository.createDeposit(payload));
  ipcMain.handle('moneyTransactions:createWithdrawal', (_, payload) => MoneyTransactionRepository.createWithdrawal(payload));
  ipcMain.handle('moneyTransactions:createTransfer', (_, payload) => MoneyTransactionRepository.createTransfer(payload));
  ipcMain.handle('moneyTransactions:createBankCharge', (_, payload) => MoneyTransactionRepository.createBankCharge(payload));
  ipcMain.handle('moneyTransactions:createAdjustment', (_, payload) => MoneyTransactionRepository.createAdjustment(payload));
  ipcMain.handle('moneyTransactions:markCleared', (_, transactionId: string, cleared: boolean) => MoneyTransactionRepository.markCleared(transactionId, cleared));

  ipcMain.handle('bankReconciliations:getAll', () => BankReconciliationRepository.getAll());
  ipcMain.handle('bankReconciliations:createWorksheet', (_, payload) => BankReconciliationRepository.createWorksheet(payload));
  ipcMain.handle('bankReconciliations:getItems', (_, reconciliationId: string) => BankReconciliationRepository.getItems(reconciliationId));
  ipcMain.handle('bankReconciliations:markItemsCleared', (_, reconciliationId: string, transactionIds: string[]) => BankReconciliationRepository.markItemsCleared(reconciliationId, transactionIds));
}
