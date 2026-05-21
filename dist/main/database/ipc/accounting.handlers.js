"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerAccountingHandlers = registerAccountingHandlers;
const electron_1 = require("electron");
const AccountingRepository_1 = require("../repositories/AccountingRepository");
const AuthRepository_1 = require("../repositories/AuthRepository");
const JournalRepository_1 = require("../repositories/JournalRepository");
function registerAccountingHandlers() {
    electron_1.ipcMain.handle('accounts:getAll', () => {
        return AccountingRepository_1.AccountingRepository.getAllAccounts();
    });
    electron_1.ipcMain.handle('accounts:create', (_, token, account) => {
        AuthRepository_1.AuthRepository.requirePermission(token, 'accounting.journal.create');
        return AccountingRepository_1.AccountingRepository.createAccount(account);
    });
    electron_1.ipcMain.handle('accounts:update', (_, token, account) => {
        AuthRepository_1.AuthRepository.requirePermission(token, 'accounting.journal.create');
        return AccountingRepository_1.AccountingRepository.updateAccount(account);
    });
    electron_1.ipcMain.handle('accounts:deactivate', (_, token, id) => {
        AuthRepository_1.AuthRepository.requirePermission(token, 'accounting.journal.create');
        return AccountingRepository_1.AccountingRepository.deactivateAccount(id);
    });
    electron_1.ipcMain.handle('journals:getAll', () => {
        return JournalRepository_1.JournalRepository.getAllJournals();
    });
    electron_1.ipcMain.handle('journals:create', (_, token, journal) => {
        AuthRepository_1.AuthRepository.requirePermission(token, 'accounting.journal.create');
        return JournalRepository_1.JournalRepository.createJournal(journal);
    });
}
