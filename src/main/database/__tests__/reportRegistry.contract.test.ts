import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { reportRegistry } from '../../../renderer/features/reports/reportRegistry';

const root = process.cwd();
const reportRepositoryPath = path.resolve(root, 'src/main/database/repositories/ReportRepository.ts');
const reportHandlersPath = path.resolve(root, 'src/main/database/ipc/report.handlers.ts');
const preloadPath = path.resolve(root, 'src/preload/preload.ts');

function methodNameForKey(key: string) {
  const map: Record<string, string> = {
    profitAndLoss: 'profitAndLoss',
    balanceSheet: 'balanceSheet',
    cashFlow: 'cashFlow',
    trialBalance: 'trialBalance',
    generalLedger: 'generalLedger',
    dailySalesSummary: 'dailySalesSummaryReport',
    salesInvoices: 'salesInvoicesReport',
    salesByCustomerProduct: 'salesByCustomerProduct',
    productSales: 'productSalesReport',
    returnSummary: 'returnSummaryReport',
    discountSummary: 'discountSummaryReport',
    paymentMethod: 'paymentMethodReport',
    purchaseSummary: 'purchaseSummaryReport',
    purchasesBySupplierProduct: 'purchasesBySupplierProduct',
    purchaseReturns: 'purchaseReturnsReport',
    inventoryValuation: 'inventoryValuation',
    stockMovement: 'stockMovementReport',
    lowStock: 'lowStockReport',
    branchStock: 'branchStockReport',
    inventoryAdjustment: 'inventoryAdjustmentReport',
    stockTransfer: 'stockTransferReport',
    customerBalance: 'customerBalanceReport',
    customerAging: 'customerAgingReport',
    customerStatement: 'customerStatementReport',
    paymentCollection: 'paymentCollectionReport',
    supplierPayable: 'supplierPayableReport',
    supplierLedger: 'supplierLedgerReport',
    supplierPayment: 'supplierPaymentReport',
    taxSummary: 'taxSummary',
    outputTax: 'outputTaxReport',
    inputTax: 'inputTaxReport',
    bankAccountSummary: 'bankAccountSummaryReport',
    moneyTransaction: 'moneyTransactionReport',
    bankReconciliation: 'bankReconciliationReport',
    shiftSummary: 'shiftSummaryReport',
    cashierSales: 'cashierSalesReport',
    cashDrawerReconciliation: 'cashDrawerReconciliationReport',
    cashierDiscrepancy: 'cashierDiscrepancyReport',
    branchProfitAndLoss: 'branchProfitAndLossReport',
    classProfitAndLoss: 'classProfitAndLoss',
    budgetVsActual: 'budgetVsActual',
    branchPerformance: 'branchPerformanceReport',
    auditLog: 'auditLogReport',
    backupHistory: 'backupHistoryReport',
    notification: 'notificationReport',
    userActivity: 'userActivityReport'
  };
  return map[key] || key;
}

describe('Report Registry Contracts', () => {
  it('should keep report keys unique', () => {
    const keys = reportRegistry.map((r) => r.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('should have backend repository implementation for every registry report', () => {
    const src = fs.readFileSync(reportRepositoryPath, 'utf8');
    for (const report of reportRegistry) {
      const method = methodNameForKey(report.key);
      expect(src.includes(`static ${method}(`)).toBe(true);
    }
  });

  it('should have IPC handler and preload method for every registry report', () => {
    const handlers = fs.readFileSync(reportHandlersPath, 'utf8');
    const preload = fs.readFileSync(preloadPath, 'utf8');

    for (const report of reportRegistry) {
      expect(handlers.includes(`reports:${report.key}`)).toBe(true);
      expect(preload.includes(`${report.key}:`)).toBe(true);
    }
  });

  it('should keep dropdown registry entries fully defined', () => {
    for (const report of reportRegistry) {
      expect(report.label.length).toBeGreaterThan(0);
      expect(report.category.length).toBeGreaterThan(0);
      expect(report.requiredPermission.length).toBeGreaterThan(0);
      expect(Array.isArray(report.columns)).toBe(true);
    }
  });
});
