import { ipcMain } from 'electron';
import { ReceiptService } from '../ReceiptService';

export function registerReceiptHandlers() {
  ipcMain.handle('receipt:print', (_, sale: any, isDuplicate = false) => {
    return ReceiptService.printReceipt(sale, isDuplicate);
  });

  ipcMain.handle('receipt:printReturn', (_, salesReturn: any, isDuplicate = false) => {
    return ReceiptService.printReturnReceipt(salesReturn, isDuplicate);
  });

  ipcMain.handle('receipt:previewReturn', (_, salesReturn: any, isDuplicate = false) => {
    const settings = ReceiptService.getSettings();
    return ReceiptService.generateReturnHtml(salesReturn, settings, isDuplicate);
  });

  ipcMain.handle('receipt:preview', (_, sale: any, isDuplicate = false) => {
    const settings = ReceiptService.getSettings();
    return ReceiptService.generateHtml(sale, settings, isDuplicate);
  });

  ipcMain.handle('receipt:getSettings', () => {
    return ReceiptService.getSettings();
  });

  ipcMain.handle('receipt:updateSettings', (_, settings: any) => {
    return ReceiptService.updateSettings(settings);
  });

  ipcMain.handle('receipt:fromSale', (_, invoiceNo: string) => {
    return ReceiptService.buildReceiptPayloadFromSale(invoiceNo);
  });

  ipcMain.handle('receipt:duplicateFromSale', (_, invoiceNo: string) => {
    return ReceiptService.buildDuplicateReceiptPayload(invoiceNo);
  });

  ipcMain.handle('receipt:printKhataPayment', (_, payment: any, isDuplicate = false) => {
    return ReceiptService.printKhataPaymentReceipt(payment, isDuplicate);
  });

  ipcMain.handle('receipt:previewKhataPayment', (_, payment: any, isDuplicate = false) => {
    const settings = ReceiptService.getSettings();
    return ReceiptService.generateKhataPaymentHtml(payment, settings, isDuplicate);
  });
}
