"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAccountingHandlers = registerAccountingHandlers;
const electron_1 = require("electron");
const AccountingRepository_1 = require("../repositories/AccountingRepository");
const JournalRepository_1 = require("../repositories/JournalRepository");
function registerAccountingHandlers() {
    electron_1.ipcMain.handle('accounts:getAll', () => {
        return AccountingRepository_1.AccountingRepository.getAllAccounts();
    });
    electron_1.ipcMain.handle('accounts:create', (_, account) => {
        return AccountingRepository_1.AccountingRepository.createAccount(account);
    });
    electron_1.ipcMain.handle('accounts:update', (_, account) => {
        return AccountingRepository_1.AccountingRepository.updateAccount(account);
    });
    electron_1.ipcMain.handle('accounts:deactivate', (_, id) => {
        return AccountingRepository_1.AccountingRepository.deactivateAccount(id);
    });
    electron_1.ipcMain.handle('journals:getAll', () => {
        return JournalRepository_1.JournalRepository.getAllJournals();
    });
    electron_1.ipcMain.handle('journals:create', (_, journal) => {
        return JournalRepository_1.JournalRepository.createJournal(journal);
    });
}
