import { ipcMain } from 'electron';
import { CustomerRepository } from '../repositories/CustomerRepository';

export function registerCustomerHandlers() {
  ipcMain.handle('customers:getAll', () => {
    return CustomerRepository.getAll();
  });

  ipcMain.handle('customers:createOrIncrementCredit', (_, name: string, creditChange: number, purchasesChange: number, date: string) => {
    return CustomerRepository.createOrIncrementCredit(name, creditChange, purchasesChange, date);
  });

  ipcMain.handle('customers:receivePayment', (_, name: string, payAmt: number, date: string) => {
    return CustomerRepository.receivePayment(name, payAmt, date);
  });
}
