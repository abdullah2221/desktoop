import { ipcMain } from 'electron';
import { SupplierPaymentRepository } from '../repositories/SupplierPaymentRepository';

export function registerSupplierPaymentHandlers() {
  ipcMain.handle('supplierPayments:getBySupplier', (_, supplierId: string) => {
    return SupplierPaymentRepository.getBySupplier(supplierId);
  });

  ipcMain.handle('supplierPayments:create', (_, payload: any) => {
    return SupplierPaymentRepository.create(payload);
  });
}
