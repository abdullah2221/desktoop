import { ipcMain } from 'electron';
import { AuthRepository } from '../repositories/AuthRepository';
import { CustomerRepository } from '../repositories/CustomerRepository';

export function registerKhataHandlers() {
  ipcMain.handle('khata:getCustomers', (_, token: string) => {
    AuthRepository.requirePermission(token, 'khata.view');
    return CustomerRepository.getKhataCustomers();
  });

  ipcMain.handle('khata:getStatement', (_, token: string, customerName: string) => {
    AuthRepository.requirePermission(token, 'khata.view');
    return CustomerRepository.getStatement(customerName);
  });

  ipcMain.handle('khata:getOverdue', (_, token: string, asOfDate: string) => {
    AuthRepository.requirePermission(token, 'khata.view');
    return CustomerRepository.getOverdue(asOfDate);
  });

  ipcMain.handle('khata:getReminders', (_, token: string, asOfDate: string) => {
    AuthRepository.requirePermission(token, 'khata.view');
    return CustomerRepository.getReminders(asOfDate);
  });

  ipcMain.handle('khata:recordPayment', (_, token: string, payload: any) => {
    const user = AuthRepository.getCurrentUser(token);
    AuthRepository.requirePermission(token, 'khata.payment');
    return CustomerRepository.recordPayment({
      ...payload,
      created_by: payload?.created_by || user?.id || null
    });
  });

  ipcMain.handle('khata:createAdjustment', (_, token: string, payload: any) => {
    const user = AuthRepository.getCurrentUser(token);
    AuthRepository.requirePermission(token, 'khata.adjust');
    return CustomerRepository.createAdjustment({
      ...payload,
      created_by: payload?.created_by || user?.id || null
    });
  });
}
