import { ipcMain } from 'electron';
import { CustomerRepository } from '../repositories/CustomerRepository';

export function registerCustomerHandlers() {
  ipcMain.handle('customers:getAll', () => {
    return CustomerRepository.getAll();
  });
  ipcMain.handle('customers:create', (_, payload: any) => {
    return CustomerRepository.create(payload);
  });
  ipcMain.handle('customers:update', (_, payload: any) => {
    return CustomerRepository.update(payload);
  });
  ipcMain.handle('customers:deactivate', (_, name: string) => {
    return CustomerRepository.deactivate(name);
  });
  ipcMain.handle('customers:getByName', (_, name: string) => {
    return CustomerRepository.getByName(name);
  });
  ipcMain.handle('customers:getById', (_, id: string) => {
    return CustomerRepository.getById(id);
  });
  ipcMain.handle('customers:getStatement', (_, id: string) => {
    return CustomerRepository.getStatement(id);
  });
  ipcMain.handle('customers:getSales', (_, id: string) => {
    return CustomerRepository.getSales(id);
  });
  ipcMain.handle('customers:getInvoices', (_, id: string) => {
    return CustomerRepository.getInvoices(id);
  });
  ipcMain.handle('customers:getPayments', (_, id: string) => {
    return CustomerRepository.getPayments(id);
  });

  ipcMain.handle('customers:createOrIncrementCredit', (_, name: string, creditChange: number, purchasesChange: number, date: string) => {
    return CustomerRepository.createOrIncrementCredit(name, creditChange, purchasesChange, date);
  });

  ipcMain.handle('customers:receivePayment', (_, name: string, payAmt: number, date: string) => {
    return CustomerRepository.receivePayment(name, payAmt, date);
  });
}
