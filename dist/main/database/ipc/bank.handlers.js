"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerBankHandlers = registerBankHandlers;
const electron_1 = require("electron");
const BankAccountRepository_1 = require("../repositories/BankAccountRepository");
const BankReconciliationRepository_1 = require("../repositories/BankReconciliationRepository");
const MoneyTransactionRepository_1 = require("../repositories/MoneyTransactionRepository");
function registerBankHandlers() {
    electron_1.ipcMain.handle('bankAccounts:getAll', () => BankAccountRepository_1.BankAccountRepository.getAll());
    electron_1.ipcMain.handle('bankAccounts:create', (_, payload) => BankAccountRepository_1.BankAccountRepository.create(payload));
    electron_1.ipcMain.handle('bankAccounts:update', (_, payload) => BankAccountRepository_1.BankAccountRepository.update(payload));
    electron_1.ipcMain.handle('bankAccounts:deactivate', (_, id) => BankAccountRepository_1.BankAccountRepository.deactivate(id));
    electron_1.ipcMain.handle('bankAccounts:getPaymentMethodMappings', () => BankAccountRepository_1.BankAccountRepository.getPaymentMethodMappings());
    electron_1.ipcMain.handle('bankAccounts:mapPaymentMethod', (_, paymentMethod, accountId) => BankAccountRepository_1.BankAccountRepository.mapPaymentMethod(paymentMethod, accountId));
    electron_1.ipcMain.handle('moneyTransactions:getAll', () => MoneyTransactionRepository_1.MoneyTransactionRepository.getAll());
    electron_1.ipcMain.handle('moneyTransactions:getByAccount', (_, accountId) => MoneyTransactionRepository_1.MoneyTransactionRepository.getByAccount(accountId));
    electron_1.ipcMain.handle('moneyTransactions:createDeposit', (_, payload) => MoneyTransactionRepository_1.MoneyTransactionRepository.createDeposit(payload));
    electron_1.ipcMain.handle('moneyTransactions:createWithdrawal', (_, payload) => MoneyTransactionRepository_1.MoneyTransactionRepository.createWithdrawal(payload));
    electron_1.ipcMain.handle('moneyTransactions:createTransfer', (_, payload) => MoneyTransactionRepository_1.MoneyTransactionRepository.createTransfer(payload));
    electron_1.ipcMain.handle('moneyTransactions:createBankCharge', (_, payload) => MoneyTransactionRepository_1.MoneyTransactionRepository.createBankCharge(payload));
    electron_1.ipcMain.handle('moneyTransactions:createAdjustment', (_, payload) => MoneyTransactionRepository_1.MoneyTransactionRepository.createAdjustment(payload));
    electron_1.ipcMain.handle('moneyTransactions:markCleared', (_, transactionId, cleared) => MoneyTransactionRepository_1.MoneyTransactionRepository.markCleared(transactionId, cleared));
    electron_1.ipcMain.handle('bankReconciliations:getAll', () => BankReconciliationRepository_1.BankReconciliationRepository.getAll());
    electron_1.ipcMain.handle('bankReconciliations:createWorksheet', (_, payload) => BankReconciliationRepository_1.BankReconciliationRepository.createWorksheet(payload));
    electron_1.ipcMain.handle('bankReconciliations:getItems', (_, reconciliationId) => BankReconciliationRepository_1.BankReconciliationRepository.getItems(reconciliationId));
    electron_1.ipcMain.handle('bankReconciliations:markItemsCleared', (_, reconciliationId, transactionIds) => BankReconciliationRepository_1.BankReconciliationRepository.markItemsCleared(reconciliationId, transactionIds));
}
