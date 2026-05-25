import { getDatabase } from '../connection';
import { JournalRepository } from './JournalRepository';

function getAccountIdByCode(accountCode: string): string {
  const db = getDatabase();
  const account = db.prepare('SELECT id FROM chart_of_accounts WHERE account_code = ?').get(accountCode) as { id: string } | undefined;
  if (!account) {
    throw new Error(`Account mapping missing for code ${accountCode}`);
  }
  return account.id;
}

export class AccountingPostingService {
  static postSale(params: {
    invoiceNo: string;
    date: string;
    total: number;
    status: 'Paid' | 'Credit';
    cogsAmount: number;
    taxAmount?: number;
    branchId?: string;
    classId?: string | null;
  }) {
    const receivableAccount = params.status === 'Paid' ? '1000' : '1100';

    JournalRepository.createJournal({
      entry_no: `AUTO-SALE-${params.invoiceNo}`,
      entry_date: params.date,
      description: `Auto posting for sale ${params.invoiceNo}`,
      reference_type: 'SALE',
      reference_id: params.invoiceNo,
      branch_id: params.branchId || 'B001',
      class_id: params.classId || null,
      lines: [
        { account_id: getAccountIdByCode(receivableAccount), description: 'Sale receipt/receivable', debit: params.total, credit: 0 },
        { account_id: getAccountIdByCode('4000'), description: 'Sales income', debit: 0, credit: params.total - (params.taxAmount || 0) },
        ...(params.taxAmount && params.taxAmount > 0
          ? [{ account_id: getAccountIdByCode('2100'), description: 'Output tax payable', debit: 0, credit: params.taxAmount }]
          : [])
      ]
    });

    if (params.cogsAmount > 0) {
      JournalRepository.createJournal({
        entry_no: `AUTO-COGS-${params.invoiceNo}`,
        entry_date: params.date,
        description: `Auto COGS posting for sale ${params.invoiceNo}`,
        reference_type: 'SALE',
        reference_id: params.invoiceNo,
        branch_id: params.branchId || 'B001',
        class_id: params.classId || null,
        lines: [
          { account_id: getAccountIdByCode('5000'), description: 'COGS', debit: params.cogsAmount, credit: 0 },
          { account_id: getAccountIdByCode('1200'), description: 'Inventory reduction', debit: 0, credit: params.cogsAmount }
        ]
      });
    }
  }

  static postPurchase(params: {
    purchaseId: string;
    date: string;
    grandTotal: number;
    amountPaid: number;
    taxAmount?: number;
    branchId?: string;
    classId?: string | null;
  }) {
    const creditAccount = params.amountPaid >= params.grandTotal ? '1000' : '2000';

    JournalRepository.createJournal({
      entry_no: `AUTO-PUR-${params.purchaseId}`,
      entry_date: params.date,
      description: `Auto posting for purchase ${params.purchaseId}`,
      reference_type: 'PURCHASE',
      reference_id: params.purchaseId,
      branch_id: params.branchId || 'B001',
      class_id: params.classId || null,
      lines: [
        { account_id: getAccountIdByCode('1200'), description: 'Inventory purchase', debit: params.grandTotal - (params.taxAmount || 0), credit: 0 },
        ...(params.taxAmount && params.taxAmount > 0
          ? [{ account_id: getAccountIdByCode('1300'), description: 'Input tax receivable', debit: params.taxAmount, credit: 0 }]
          : []),
        { account_id: getAccountIdByCode(creditAccount), description: 'Payment/payable', debit: 0, credit: params.grandTotal }
      ]
    });
  }

  static postExpense(params: { expenseId: string; date: string; amount: number; taxAmount?: number; branchId?: string; classId?: string | null }) {
    JournalRepository.createJournal({
      entry_no: `AUTO-EXP-${params.expenseId}`,
      entry_date: params.date,
      description: `Auto posting for expense ${params.expenseId}`,
      reference_type: 'EXPENSE',
      reference_id: params.expenseId,
      branch_id: params.branchId || 'B001',
      class_id: params.classId || null,
      lines: [
        { account_id: getAccountIdByCode('6000'), description: 'Operating expense', debit: params.amount - (params.taxAmount || 0), credit: 0 },
        ...(params.taxAmount && params.taxAmount > 0
          ? [{ account_id: getAccountIdByCode('1300'), description: 'Input tax receivable', debit: params.taxAmount, credit: 0 }]
          : []),
        { account_id: getAccountIdByCode('1000'), description: 'Cash outflow', debit: 0, credit: params.amount }
      ]
    });
  }

  static postInvoiceFinalize(params: {
    invoiceId: string;
    invoiceNo: string;
    date: string;
    total: number;
    status: 'Paid' | 'Unpaid';
    cogsAmount: number;
    taxAmount?: number;
  }) {
    const debitAccount = params.status === 'Paid' ? '1000' : '1100';

    JournalRepository.createJournal({
      entry_no: `AUTO-INV-${params.invoiceId}`,
      entry_date: params.date,
      description: `Auto posting for invoice ${params.invoiceNo}`,
      reference_type: 'INVOICE',
      reference_id: params.invoiceId,
      lines: [
        { account_id: getAccountIdByCode(debitAccount), description: 'Invoice debit', debit: params.total, credit: 0 },
        { account_id: getAccountIdByCode('4000'), description: 'Sales income', debit: 0, credit: params.total - (params.taxAmount || 0) },
        ...(params.taxAmount && params.taxAmount > 0
          ? [{ account_id: getAccountIdByCode('2100'), description: 'Output tax payable', debit: 0, credit: params.taxAmount }]
          : [])
      ]
    });

    if (params.cogsAmount > 0) {
      JournalRepository.createJournal({
        entry_no: `AUTO-INV-COGS-${params.invoiceId}`,
        entry_date: params.date,
        description: `Auto COGS posting for invoice ${params.invoiceNo}`,
        reference_type: 'INVOICE',
        reference_id: params.invoiceId,
        lines: [
          { account_id: getAccountIdByCode('5000'), description: 'COGS', debit: params.cogsAmount, credit: 0 },
          { account_id: getAccountIdByCode('1200'), description: 'Inventory reduction', debit: 0, credit: params.cogsAmount }
        ]
      });
    }
  }

  static postInvoicePayment(params: {
    invoiceId: string;
    paymentId: string;
    date: string;
    amount: number;
    method: 'Cash' | 'Bank';
  }) {
    const debitAccount = params.method === 'Bank' ? '1010' : '1000';

    JournalRepository.createJournal({
      entry_no: `AUTO-INV-PAY-${params.paymentId}`,
      entry_date: params.date,
      description: `Payment received for invoice ${params.invoiceId}`,
      reference_type: 'INVOICE_PAYMENT',
      reference_id: params.paymentId,
      lines: [
        { account_id: getAccountIdByCode(debitAccount), description: 'Cash/Bank received', debit: params.amount, credit: 0 },
        { account_id: getAccountIdByCode('1100'), description: 'Accounts receivable reduced', debit: 0, credit: params.amount }
      ]
    });
  }

  static postSalesReturn(params: {
    returnId: string;
    saleId: string;
    date: string;
    total: number;
    refundMethod: 'Cash' | 'Bank' | 'Store Credit';
    cogsAmount: number;
    taxAmount?: number;
    branchId?: string;
    classId?: string | null;
  }) {
    // If credit return (refundMethod is Store Credit or customer balance credit reversal), reverse via Accounts Receivable (1100), otherwise Cash (1000) or Bank (1010)
    let refundAccount = '1000';
    if (params.refundMethod === 'Bank') {
      refundAccount = '1010';
    } else if (params.refundMethod === 'Store Credit') {
      refundAccount = '1100'; // reverse accounts receivable
    }

    JournalRepository.createJournal({
      entry_no: `AUTO-SR-${params.returnId}`,
      entry_date: params.date,
      description: `Auto posting for sales return ${params.returnId} referencing sale ${params.saleId}`,
      reference_type: 'SALES_RETURN',
      reference_id: params.returnId,
      branch_id: params.branchId || 'B001',
      class_id: params.classId || null,
      lines: [
        { account_id: getAccountIdByCode('4000'), description: 'Sales income reversed', debit: params.total - (params.taxAmount || 0), credit: 0 },
        ...(params.taxAmount && params.taxAmount > 0
          ? [{ account_id: getAccountIdByCode('2100'), description: 'Output tax payable reversed', debit: params.taxAmount, credit: 0 }]
          : []),
        { account_id: getAccountIdByCode(refundAccount), description: 'Customer refund/credit adjustment', debit: 0, credit: params.total }
      ]
    });

    if (params.cogsAmount > 0) {
      JournalRepository.createJournal({
        entry_no: `AUTO-SR-COGS-${params.returnId}`,
        entry_date: params.date,
        description: `Auto COGS reversal for sales return ${params.returnId}`,
        reference_type: 'SALES_RETURN',
        reference_id: params.returnId,
        branch_id: params.branchId || 'B001',
        class_id: params.classId || null,
        lines: [
          { account_id: getAccountIdByCode('1200'), description: 'Inventory restoration', debit: params.cogsAmount, credit: 0 },
          { account_id: getAccountIdByCode('5000'), description: 'COGS reduced', debit: 0, credit: params.cogsAmount }
        ]
      });
    }
  }

  static postPurchaseReturn(params: {
    returnId: string;
    purchaseId: string;
    date: string;
    total: number;
    refundMethod: 'Cash' | 'Bank' | 'Store Credit';
    taxAmount?: number;
    branchId?: string;
    classId?: string | null;
  }) {
    // If supplier accounts payable reduction, use 2000, otherwise Cash (1000) or Bank (1010)
    let refundAccount = '1000';
    if (params.refundMethod === 'Bank') {
      refundAccount = '1010';
    } else if (params.refundMethod === 'Store Credit') {
      refundAccount = '2000'; // reduce Accounts Payable
    }

    JournalRepository.createJournal({
      entry_no: `AUTO-PR-${params.returnId}`,
      entry_date: params.date,
      description: `Auto posting for purchase return ${params.returnId} referencing purchase ${params.purchaseId}`,
      reference_type: 'PURCHASE_RETURN',
      reference_id: params.returnId,
      branch_id: params.branchId || 'B001',
      class_id: params.classId || null,
      lines: [
        { account_id: getAccountIdByCode(refundAccount), description: 'Supplier refund/payable reduced', debit: params.total, credit: 0 },
        { account_id: getAccountIdByCode('1200'), description: 'Inventory reduction', debit: 0, credit: params.total - (params.taxAmount || 0) },
        ...(params.taxAmount && params.taxAmount > 0
          ? [{ account_id: getAccountIdByCode('1300'), description: 'Input tax receivable reversed', debit: 0, credit: params.taxAmount }]
          : [])
      ]
    });
  }

  static postKhataPayment(params: {
    paymentId: string;
    customerName: string;
    date: string;
    amount: number;
    method: 'Cash' | 'Bank' | 'EasyPaisa' | 'JazzCash' | 'Card' | 'Cheque';
    branchId?: string;
  }) {
    const debitAccount = params.method === 'Bank' ? '1010' : '1000';
    JournalRepository.createJournal({
      entry_no: `AUTO-KHATA-PAY-${params.paymentId}`,
      entry_date: params.date,
      description: `Khata payment received from ${params.customerName}`,
      reference_type: 'CUSTOMER_PAYMENT',
      reference_id: params.paymentId,
      branch_id: params.branchId || 'B001',
      lines: [
        { account_id: getAccountIdByCode(debitAccount), description: 'Cash/Bank received', debit: params.amount, credit: 0 },
        { account_id: getAccountIdByCode('1100'), description: 'Accounts receivable reduced', debit: 0, credit: params.amount }
      ]
    });
  }

  static postKhataAdjustment(params: {
    adjustmentId: string;
    customerName: string;
    date: string;
    type: 'DEBIT' | 'CREDIT';
    amount: number;
    branchId?: string;
  }) {
    const isDebit = params.type === 'DEBIT';
    JournalRepository.createJournal({
      entry_no: `AUTO-KHATA-ADJ-${params.adjustmentId}`,
      entry_date: params.date,
      description: `Khata adjustment (${params.type}) for ${params.customerName}`,
      reference_type: 'CUSTOMER_ADJUSTMENT',
      reference_id: params.adjustmentId,
      branch_id: params.branchId || 'B001',
      lines: isDebit
        ? [
            { account_id: getAccountIdByCode('1100'), description: 'Accounts receivable increased', debit: params.amount, credit: 0 },
            { account_id: getAccountIdByCode('4000'), description: 'Adjustment income', debit: 0, credit: params.amount }
          ]
        : [
            { account_id: getAccountIdByCode('6000'), description: 'Adjustment expense/write-off', debit: params.amount, credit: 0 },
            { account_id: getAccountIdByCode('1100'), description: 'Accounts receivable reduced', debit: 0, credit: params.amount }
          ]
    });
  }
}
