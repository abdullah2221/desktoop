import { getDatabase } from './connection';
import { SettingsRepository } from './repositories/SettingsRepository';
import { BrowserWindow } from 'electron';
import { SaleRepository } from './repositories/SaleRepository';

export class ReceiptService {
  static getSettings() {
    const settings = SettingsRepository.get();
    return {
      paperSize: settings['receipt_paper_size'] || '80mm',
      showLogo: settings['receipt_show_logo'] !== 'false', // default to true
      footerMessage: settings['receipt_footer_message'] || 'Thank you for shopping with us!',
      printerName: settings['receipt_printer_name'] || '',
      autoPrint: settings['receipt_auto_print'] === 'true',
      duplicatePrint: settings['receipt_duplicate_print'] === 'true',
      fontSize: settings['receipt_font_size'] || 'normal',
    };
  }

  static updateSettings(receiptSettings: any) {
    SettingsRepository.update('receipt_paper_size', receiptSettings.paperSize || '80mm');
    SettingsRepository.update('receipt_show_logo', receiptSettings.showLogo ? 'true' : 'false');
    SettingsRepository.update('receipt_footer_message', receiptSettings.footerMessage || '');
    SettingsRepository.update('receipt_printer_name', receiptSettings.printerName || '');
    SettingsRepository.update('receipt_auto_print', receiptSettings.autoPrint ? 'true' : 'false');
    SettingsRepository.update('receipt_duplicate_print', receiptSettings.duplicatePrint ? 'true' : 'false');
    SettingsRepository.update('receipt_font_size', receiptSettings.fontSize || 'normal');
    return { success: true };
  }

  static generateHtml(sale: any, settings: any, isDuplicate = false) {
    const width = settings.paperSize === '58mm' ? '58mm' : '80mm';
    const fontSize = settings.fontSize === 'compact' ? '10px' : '12px';
    const padding = settings.paperSize === '58mm' ? '2mm' : '4mm';

    // Format currencies
    const fmt = (num: number) => typeof num === 'number' ? num.toFixed(2) : '0.00';

    const itemsHtml = (sale.items || []).map((item: any) => `
      <tr style="border-bottom: 1px dashed #eee;">
        <td style="padding: 4px 0; font-size: ${fontSize};">${item.name || item.product_name || 'Product'}</td>
        <td style="padding: 4px 0; text-align: center; font-size: ${fontSize};">${item.quantity}</td>
        <td style="padding: 4px 0; text-align: right; font-size: ${fontSize};">${fmt(item.price)}</td>
        <td style="padding: 4px 0; text-align: right; font-size: ${fontSize};">${fmt(item.price * item.quantity)}</td>
      </tr>
    `).join('');

    const watermark = sale.status === 'VOIDED'
      ? '<div class="watermark">** VOIDED **</div>'
      : (isDuplicate ? '<div class="watermark">** DUPLICATE COPY **</div>' : '');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page {
            size: auto;
            margin: 0mm;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: ${width};
            margin: 0;
            padding: ${padding};
            box-sizing: border-box;
            background-color: #ffffff;
            color: #000000;
            font-size: ${fontSize};
            line-height: 1.4;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .watermark {
            border: 2px solid #000;
            padding: 4px;
            margin: 10px 0;
            text-align: center;
            font-weight: bold;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th {
            border-bottom: 1px dashed #000;
            font-weight: bold;
            font-size: ${fontSize};
          }
        </style>
      </head>
      <body>
        ${watermark}
        
        <div class="center">
          ${settings.showLogo ? '<div style="font-size: 24px; margin-bottom: 4px;">🏢</div>' : ''}
          <div style="font-size: 16px; font-weight: bold;">${sale.branch_name || 'ERP RETAIL OUTLET'}</div>
          <div>${sale.branch_address || '123 Retail Lane, Business City'}</div>
          <div>Phone: ${sale.branch_phone || '+1 555-0199'}</div>
          ${sale.ntn_gst ? `<div>NTN/GST: ${sale.ntn_gst}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div>
          <div><strong>Invoice #:</strong> ${sale.invoiceNo}</div>
          <div><strong>Date/Time:</strong> ${sale.sale_time ? new Date(sale.sale_time).toLocaleString() : (sale.date || new Date().toLocaleString())}</div>
          <div><strong>Cashier:</strong> ${sale.cashierName || 'Cashier'}</div>
          <div><strong>Branch:</strong> ${sale.branch_name || sale.branch_id || 'Main Branch'}</div>
          <div><strong>Register:</strong> ${sale.register_id || 'REG-1'}</div>
          <div><strong>Shift:</strong> ${sale.shift_id || '-'}</div>
          <div><strong>Payment:</strong> ${sale.payment_method || 'Cash'}</div>
          <div><strong>Customer:</strong> ${sale.customerName || 'Walk-in Customer'}</div>
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left; padding-bottom: 4px;">Item</th>
              <th style="text-align: center; padding-bottom: 4px;">Qty</th>
              <th style="text-align: right; padding-bottom: 4px;">Price</th>
              <th style="text-align: right; padding-bottom: 4px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <table style="margin-left: auto; width: 80%;">
          <tr>
            <td style="font-size: ${fontSize};">Subtotal:</td>
            <td class="right" style="font-size: ${fontSize};">${fmt(sale.subtotal || sale.total)}</td>
          </tr>
          ${sale.discount ? `
          <tr>
            <td style="font-size: ${fontSize};">Discount:</td>
            <td class="right" style="font-size: ${fontSize};">-${fmt(sale.discount)}</td>
          </tr>` : ''}
          ${sale.tax ? `
          <tr>
            <td style="font-size: ${fontSize};">Tax:</td>
            <td class="right" style="font-size: ${fontSize};">${fmt(sale.tax)}</td>
          </tr>` : ''}
          <tr style="font-weight: bold;">
            <td style="font-size: ${fontSize};">GRAND TOTAL:</td>
            <td class="right" style="font-size: ${fontSize};">${fmt(sale.total)}</td>
          </tr>
          <tr>
            <td style="font-size: ${fontSize};">Paid Amount:</td>
            <td class="right" style="font-size: ${fontSize};">${fmt(sale.paidAmount || sale.total)}</td>
          </tr>
          <tr>
            <td style="font-size: ${fontSize};">Balance:</td>
            <td class="right" style="font-size: ${fontSize};">${fmt((sale.paidAmount || sale.total) - sale.total)}</td>
          </tr>
        </table>

        <div class="divider"></div>

        <div class="center" style="font-size: ${fontSize}; margin-top: 10px;">
          <div>${settings.footerMessage}</div>
          <div style="margin-top: 4px;">Return policy: exchange within 7 days with receipt.</div>
          <div style="margin-top: 6px; font-weight: bold;">*** THANK YOU ***</div>
        </div>
      </body>
      </html>
    `;
  }

  static buildReceiptPayloadFromSale(invoiceNo: string) {
    const sale = SaleRepository.getById(invoiceNo) as any;
    if (!sale) throw new Error('Sale not found.');
    const items = SaleRepository.getItems(invoiceNo) as any[];
    return {
      ...sale,
      customerName: sale.customerName || 'Walk-in Customer',
      subtotal: sale.subtotal || sale.total,
      tax: sale.tax_amount || 0,
      paidAmount: sale.status === 'Paid' ? sale.total : 0,
      items: items.map((item) => ({
        ...item,
        name: item.product_name || item.name || item.product_id
      }))
    };
  }

  static buildDuplicateReceiptPayload(invoiceNo: string) {
    return this.buildReceiptPayloadFromSale(invoiceNo);
  }

  static printReceipt(sale: any, isDuplicate = false) {
    const settings = this.getSettings();
    const htmlContent = this.generateHtml(sale, settings, isDuplicate);

    try {
      // In electron environment, use BrowserWindow for silent printing
      const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true } });
      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      
      win.webContents.on('did-finish-load', () => {
        const printOptions: any = {
          silent: true,
          printBackground: true,
          margins: { marginType: 'none' }
        };
        if (settings.printerName) {
          printOptions.deviceName = settings.printerName;
        }
        win.webContents.print(printOptions, (success, errorType) => {
          if (!success) {
            console.error('[Receipt Service] Printing failed:', errorType);
          }
          win.close();
        });
      });
      return { success: true };
    } catch (err: any) {
      console.warn('[Receipt Service] Electron native printing skipped (non-GUI or headless):', err.message);
      return { success: true, printedOffline: true };
    }
  }

  static generateReturnHtml(salesReturn: any, settings: any, isDuplicate = false) {
    const width = settings.paperSize === '58mm' ? '58mm' : '80mm';
    const fontSize = settings.fontSize === 'compact' ? '10px' : '12px';
    const padding = settings.paperSize === '58mm' ? '2mm' : '4mm';
    const fmt = (num: number) => typeof num === 'number' ? num.toFixed(2) : '0.00';

    const itemsHtml = (salesReturn.items || []).map((item: any) => `
      <tr style="border-bottom: 1px dashed #eee;">
        <td style="padding: 4px 0; font-size: ${fontSize};">${item.product_name || 'Product'}</td>
        <td style="padding: 4px 0; text-align: center; font-size: ${fontSize};">${item.quantity}</td>
        <td style="padding: 4px 0; text-align: right; font-size: ${fontSize};">${fmt(item.unit_price || item.unit_cost)}</td>
        <td style="padding: 4px 0; text-align: right; font-size: ${fontSize};">${fmt(item.total)}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          @page { size: auto; margin: 0mm; }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: ${width};
            margin: 0;
            padding: ${padding};
            box-sizing: border-box;
            background-color: #ffffff;
            color: #000000;
            font-size: ${fontSize};
            line-height: 1.4;
          }
          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .watermark {
            border: 2px solid #000;
            padding: 4px;
            margin: 10px 0;
            text-align: center;
            font-weight: bold;
            text-transform: uppercase;
          }
          table { width: 100%; border-collapse: collapse; }
          th { border-bottom: 1px dashed #000; font-weight: bold; font-size: ${fontSize}; }
        </style>
      </head>
      <body>
        ${isDuplicate ? '<div class="watermark">** DUPLICATE COPY **</div>' : ''}
        
        <div class="center">
          ${settings.showLogo ? '<div style="font-size: 24px; margin-bottom: 4px;">🏢</div>' : ''}
          <div style="font-size: 16px; font-weight: bold;">${salesReturn.branch_name || 'ERP RETAIL OUTLET'}</div>
          <div>Return Credit Note</div>
        </div>

        <div class="divider"></div>

        <div>
          <div><strong>Return #:</strong> ${salesReturn.id}</div>
          <div><strong>Ref Invoice:</strong> ${salesReturn.sale_id}</div>
          <div><strong>Date:</strong> ${salesReturn.created_at || new Date().toLocaleString()}</div>
          ${salesReturn.customer_id ? `<div><strong>Customer:</strong> ${salesReturn.customer_id}</div>` : ''}
          ${salesReturn.return_reason ? `<div><strong>Reason:</strong> ${salesReturn.return_reason}</div>` : ''}
          <div><strong>Refund Method:</strong> ${salesReturn.refund_method}</div>
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr>
              <th style="text-align: left; padding-bottom: 4px;">Item</th>
              <th style="text-align: center; padding-bottom: 4px;">Qty</th>
              <th style="text-align: right; padding-bottom: 4px;">Price</th>
              <th style="text-align: right; padding-bottom: 4px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>

        <div class="divider"></div>

        <table style="margin-left: auto; width: 80%;">
          <tr style="font-weight: bold;">
            <td style="font-size: ${fontSize};">TOTAL REFUNDED:</td>
            <td class="right" style="font-size: ${fontSize};">${fmt(salesReturn.total_amount)}</td>
          </tr>
        </table>

        <div class="divider"></div>

        <div class="center" style="font-size: ${fontSize}; margin-top: 10px;">
          <div>${settings.footerMessage}</div>
          <div style="margin-top: 6px; font-weight: bold;">*** RETURN PROCESSED ***</div>
        </div>
      </body>
      </html>
    `;
  }

  static printReturnReceipt(salesReturn: any, isDuplicate = false) {
    const settings = this.getSettings();
    const htmlContent = this.generateReturnHtml(salesReturn, settings, isDuplicate);

    try {
      const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true } });
      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      
      win.webContents.on('did-finish-load', () => {
        const printOptions: any = {
          silent: true,
          printBackground: true,
          margins: { marginType: 'none' }
        };
        if (settings.printerName) {
          printOptions.deviceName = settings.printerName;
        }
        win.webContents.print(printOptions, (success, errorType) => {
          if (!success) {
            console.error('[Receipt Service] Return Printing failed:', errorType);
          }
          win.close();
        });
      });
      return { success: true };
    } catch (err: any) {
      console.warn('[Receipt Service] Return printing skipped (non-GUI or headless):', err.message);
      return { success: true, printedOffline: true };
    }
  }

  static generateKhataPaymentHtml(payment: any, settings: any, isDuplicate = false) {
    const width = settings.paperSize === '58mm' ? '58mm' : '80mm';
    const fontSize = settings.fontSize === 'compact' ? '10px' : '12px';
    const padding = settings.paperSize === '58mm' ? '2mm' : '4mm';
    const fmt = (num: number) => typeof num === 'number' ? num.toFixed(2) : '0.00';
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><style>
        @page { size:auto; margin:0mm; }
        body { font-family:'Courier New', monospace; width:${width}; margin:0; padding:${padding}; box-sizing:border-box; font-size:${fontSize}; color:#000; }
        .center { text-align:center; } .right { text-align:right; } .divider { border-top:1px dashed #000; margin:8px 0; }
      </style></head>
      <body>
        ${isDuplicate ? '<div class="center"><b>** DUPLICATE COPY **</b></div>' : ''}
        <div class="center">
          <div style="font-size:16px;font-weight:bold;">${payment.branch_name || 'ERP RETAIL OUTLET'}</div>
          <div>Khata Payment Receipt</div>
        </div>
        <div class="divider"></div>
        <div><strong>Receipt #:</strong> ${payment.id}</div>
        <div><strong>Date:</strong> ${payment.payment_date || new Date().toISOString().split('T')[0]}</div>
        <div><strong>Customer:</strong> ${payment.customer_name}</div>
        <div><strong>Method:</strong> ${payment.payment_method || 'Cash'}</div>
        <div><strong>Reference:</strong> ${payment.reference_no || '-'}</div>
        <div class="divider"></div>
        <table style="width:100%;"><tr><td><strong>Amount Received:</strong></td><td class="right"><strong>${fmt(Number(payment.amount || 0))}</strong></td></tr></table>
        ${payment.notes ? `<div style="margin-top:6px;"><strong>Notes:</strong> ${payment.notes}</div>` : ''}
        <div class="divider"></div>
        <div class="center">${settings.footerMessage}</div>
      </body></html>
    `;
  }

  static printKhataPaymentReceipt(payment: any, isDuplicate = false) {
    const settings = this.getSettings();
    const htmlContent = this.generateKhataPaymentHtml(payment, settings, isDuplicate);
    try {
      const win = new BrowserWindow({ show: false, webPreferences: { nodeIntegration: true } });
      win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
      win.webContents.on('did-finish-load', () => {
        const printOptions: any = { silent: true, printBackground: true, margins: { marginType: 'none' } };
        if (settings.printerName) printOptions.deviceName = settings.printerName;
        win.webContents.print(printOptions, () => win.close());
      });
      return { success: true };
    } catch (err: any) {
      console.warn('[Receipt Service] Khata payment printing skipped:', err.message);
      return { success: true, printedOffline: true };
    }
  }
}
