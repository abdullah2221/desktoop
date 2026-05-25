export type ReportCategory =
  | 'Financial Reports'
  | 'Sales Reports'
  | 'Purchase Reports'
  | 'Inventory Reports'
  | 'Customer / Khata Reports'
  | 'Supplier Reports'
  | 'Tax Reports'
  | 'Banking Reports'
  | 'Shift / Cashier Reports'
  | 'Branch / Class Reports'
  | 'Operational Reports';

export type ReportFilter = 'dateFrom' | 'dateTo' | 'branch' | 'class' | 'cashier' | 'customer' | 'supplier' | 'user' | 'asOfDate';

export interface ReportColumn {
  key: string;
  label: string;
}

export interface ReportSummaryCard {
  key: string;
  label: string;
}

export type ReportKey =
  | 'profitAndLoss'
  | 'balanceSheet'
  | 'cashFlow'
  | 'trialBalance'
  | 'generalLedger'
  | 'dailySalesSummary'
  | 'salesInvoices'
  | 'salesByCustomerProduct'
  | 'productSales'
  | 'returnSummary'
  | 'discountSummary'
  | 'paymentMethod'
  | 'purchaseSummary'
  | 'purchasesBySupplierProduct'
  | 'purchaseReturns'
  | 'inventoryValuation'
  | 'stockMovement'
  | 'lowStock'
  | 'branchStock'
  | 'inventoryAdjustment'
  | 'stockTransfer'
  | 'customerBalance'
  | 'customerAging'
  | 'customerStatement'
  | 'paymentCollection'
  | 'supplierPayable'
  | 'supplierLedger'
  | 'supplierPayment'
  | 'taxSummary'
  | 'outputTax'
  | 'inputTax'
  | 'bankAccountSummary'
  | 'moneyTransaction'
  | 'bankReconciliation'
  | 'shiftSummary'
  | 'cashierSales'
  | 'cashDrawerReconciliation'
  | 'cashierDiscrepancy'
  | 'branchProfitAndLoss'
  | 'classProfitAndLoss'
  | 'budgetVsActual'
  | 'branchPerformance'
  | 'auditLog'
  | 'backupHistory'
  | 'notification'
  | 'userActivity';

export interface ReportDefinition {
  key: ReportKey;
  label: string;
  category: ReportCategory;
  description: string;
  requiredPermission: string;
  supportedFilters: ReportFilter[];
  apiMethod: ReportKey;
  columns: ReportColumn[];
  summaryCards: ReportSummaryCard[];
  exportEnabled: boolean;
}

export const reportRegistry: ReportDefinition[] = [
  { key: 'profitAndLoss', label: 'Profit & Loss', category: 'Financial Reports', description: 'Income, expense, and net income.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch', 'class'], apiMethod: 'profitAndLoss', columns: [{ key: 'Account', label: 'Account' }, { key: 'Amount', label: 'Amount' }], summaryCards: [{ key: 'totalIncome', label: 'Income' }, { key: 'totalExpenses', label: 'Expenses' }, { key: 'netIncome', label: 'Net Income' }], exportEnabled: false },
  { key: 'balanceSheet', label: 'Balance Sheet', category: 'Financial Reports', description: 'Assets, liabilities and equity position.', requiredPermission: 'reports.view', supportedFilters: ['dateTo', 'branch'], apiMethod: 'balanceSheet', columns: [{ key: 'Account', label: 'Account' }, { key: 'Balance', label: 'Balance' }], summaryCards: [{ key: 'totalAssets', label: 'Assets' }, { key: 'totalLiabilities', label: 'Liabilities' }, { key: 'totalEquity', label: 'Equity' }], exportEnabled: false },
  { key: 'cashFlow', label: 'Cash Flow', category: 'Financial Reports', description: 'Cash movement by activity type.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo'], apiMethod: 'cashFlow', columns: [{ key: 'Section', label: 'Section' }, { key: 'Amount', label: 'Amount' }], summaryCards: [{ key: 'netCashFlow', label: 'Net Cash Flow' }], exportEnabled: false },
  { key: 'trialBalance', label: 'Trial Balance', category: 'Financial Reports', description: 'Debit/credit closing balances.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch', 'class'], apiMethod: 'trialBalance', columns: [{ key: 'Account', label: 'Account' }, { key: 'Debit', label: 'Debit' }, { key: 'Credit', label: 'Credit' }], summaryCards: [{ key: 'totalDebit', label: 'Total Debit' }, { key: 'totalCredit', label: 'Total Credit' }], exportEnabled: false },
  { key: 'generalLedger', label: 'General Ledger', category: 'Financial Reports', description: 'Journal line-by-line ledger.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo'], apiMethod: 'generalLedger', columns: [{ key: 'Date', label: 'Date' }, { key: 'Account', label: 'Account' }, { key: 'Debit', label: 'Debit' }, { key: 'Credit', label: 'Credit' }, { key: 'Balance', label: 'Balance' }], summaryCards: [], exportEnabled: false },
  { key: 'dailySalesSummary', label: 'POS Sales Summary', category: 'Sales Reports', description: 'Daily POS totals and counts.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'dailySalesSummary', columns: [{ key: 'Date', label: 'Date' }, { key: 'Branch', label: 'Branch' }, { key: 'Paid Sales', label: 'Paid Sales' }], summaryCards: [], exportEnabled: false },
  { key: 'salesInvoices', label: 'Sales Invoices Report', category: 'Sales Reports', description: 'Invoice register with paid and due.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'salesInvoices', columns: [{ key: 'Invoice', label: 'Invoice' }, { key: 'Customer', label: 'Customer' }, { key: 'Status', label: 'Status' }, { key: 'Total', label: 'Total' }, { key: 'Due', label: 'Due' }], summaryCards: [], exportEnabled: false },
  { key: 'salesByCustomerProduct', label: 'Sales by Customer', category: 'Sales Reports', description: 'Customer sales ranking.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo'], apiMethod: 'salesByCustomerProduct', columns: [{ key: 'Customer', label: 'Customer' }, { key: 'Sales', label: 'Sales' }], summaryCards: [], exportEnabled: false },
  { key: 'productSales', label: 'Sales by Product', category: 'Sales Reports', description: 'Product sales, discounts, and margin estimate.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'productSales', columns: [{ key: 'Product', label: 'Product' }, { key: 'Qty', label: 'Qty' }, { key: 'Net Sales', label: 'Net Sales' }, { key: 'Profit', label: 'Profit' }], summaryCards: [], exportEnabled: false },
  { key: 'returnSummary', label: 'Sales Returns Report', category: 'Sales Reports', description: 'Sales return transactions.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'returnSummary', columns: [{ key: 'Return', label: 'Return' }, { key: 'Sale', label: 'Sale' }, { key: 'Method', label: 'Method' }, { key: 'Amount', label: 'Amount' }], summaryCards: [{ key: 'total_returns', label: 'Total Returns' }, { key: 'total_amount', label: 'Total Amount' }], exportEnabled: false },
  { key: 'discountSummary', label: 'Discount Summary', category: 'Sales Reports', description: 'Invoice and item level discounts.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'discountSummary', columns: [{ key: 'Invoice', label: 'Invoice' }, { key: 'Cashier', label: 'Cashier' }, { key: 'Discount', label: 'Discount' }], summaryCards: [], exportEnabled: false },
  { key: 'paymentMethod', label: 'Payment Method Summary', category: 'Sales Reports', description: 'Payment channel mix for paid sales.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'paymentMethod', columns: [{ key: 'Method', label: 'Method' }, { key: 'Transactions', label: 'Transactions' }, { key: 'Amount', label: 'Amount' }], summaryCards: [{ key: 'totalAmount', label: 'Total Amount' }], exportEnabled: false },
  { key: 'purchaseSummary', label: 'Purchase Summary', category: 'Purchase Reports', description: 'Purchase register and payables.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'purchaseSummary', columns: [{ key: 'Purchase', label: 'Purchase' }, { key: 'Supplier', label: 'Supplier' }, { key: 'Total', label: 'Total' }, { key: 'Payable', label: 'Payable' }], summaryCards: [], exportEnabled: false },
  { key: 'purchasesBySupplierProduct', label: 'Purchases by Supplier', category: 'Purchase Reports', description: 'Supplier and product purchase totals.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo'], apiMethod: 'purchasesBySupplierProduct', columns: [{ key: 'Supplier', label: 'Supplier' }, { key: 'Purchases', label: 'Purchases' }], summaryCards: [], exportEnabled: false },
  { key: 'purchaseReturns', label: 'Purchase Returns Report', category: 'Purchase Reports', description: 'Purchase return transactions.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'purchaseReturns', columns: [{ key: 'Return', label: 'Return' }, { key: 'Supplier', label: 'Supplier' }, { key: 'Amount', label: 'Amount' }], summaryCards: [], exportEnabled: false },
  { key: 'inventoryValuation', label: 'Inventory Valuation', category: 'Inventory Reports', description: 'On-hand stock value report.', requiredPermission: 'reports.view', supportedFilters: [], apiMethod: 'inventoryValuation', columns: [{ key: 'SKU', label: 'SKU' }, { key: 'Product', label: 'Product' }, { key: 'Qty', label: 'Qty' }, { key: 'Value', label: 'Value' }], summaryCards: [{ key: 'totalQuantity', label: 'Total Qty' }, { key: 'totalValue', label: 'Total Value' }], exportEnabled: false },
  { key: 'stockMovement', label: 'Stock Movement Report', category: 'Inventory Reports', description: 'Inventory inflow/outflow trail.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'stockMovement', columns: [{ key: 'Date', label: 'Date' }, { key: 'Product', label: 'Product' }, { key: 'Type', label: 'Type' }, { key: 'In', label: 'In' }, { key: 'Out', label: 'Out' }], summaryCards: [], exportEnabled: false },
  { key: 'lowStock', label: 'Low Stock Report', category: 'Inventory Reports', description: 'Items at or below minimum level.', requiredPermission: 'reports.view', supportedFilters: ['branch'], apiMethod: 'lowStock', columns: [{ key: 'Product', label: 'Product' }, { key: 'Stock', label: 'Stock' }, { key: 'Min', label: 'Min' }], summaryCards: [], exportEnabled: false },
  { key: 'branchStock', label: 'Branch Stock Report', category: 'Inventory Reports', description: 'Branch-wise inventory balances.', requiredPermission: 'reports.view', supportedFilters: ['branch'], apiMethod: 'branchStock', columns: [{ key: 'Branch', label: 'Branch' }, { key: 'Product', label: 'Product' }, { key: 'On Hand', label: 'On Hand' }, { key: 'Value', label: 'Value' }], summaryCards: [], exportEnabled: false },
  { key: 'inventoryAdjustment', label: 'Inventory Adjustment Report', category: 'Inventory Reports', description: 'Posted stock adjustments.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'inventoryAdjustment', columns: [{ key: 'Adjustment', label: 'Adjustment' }, { key: 'Type', label: 'Type' }, { key: 'Value Change', label: 'Value Change' }], summaryCards: [], exportEnabled: false },
  { key: 'stockTransfer', label: 'Stock Transfer Report', category: 'Inventory Reports', description: 'Inter-branch stock transfer performance.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo'], apiMethod: 'stockTransfer', columns: [{ key: 'Transfer', label: 'Transfer' }, { key: 'Source', label: 'Source' }, { key: 'Destination', label: 'Destination' }, { key: 'Status', label: 'Status' }], summaryCards: [], exportEnabled: false },
  { key: 'customerBalance', label: 'Customer Balance Report', category: 'Customer / Khata Reports', description: 'Outstanding customer balances.', requiredPermission: 'reports.view', supportedFilters: [], apiMethod: 'customerBalance', columns: [{ key: 'Customer', label: 'Customer' }, { key: 'Balance', label: 'Balance' }], summaryCards: [{ key: 'totalOutstanding', label: 'Total Outstanding' }], exportEnabled: false },
  { key: 'customerAging', label: 'Customer Aging Report', category: 'Customer / Khata Reports', description: 'Receivable aging by customer.', requiredPermission: 'reports.view', supportedFilters: ['asOfDate'], apiMethod: 'customerAging', columns: [{ key: 'Customer', label: 'Customer' }, { key: 'Balance', label: 'Balance' }, { key: 'Overdue', label: 'Overdue Days' }], summaryCards: [{ key: 'total', label: 'Total' }], exportEnabled: false },
  { key: 'customerStatement', label: 'Customer Statement Report', category: 'Customer / Khata Reports', description: 'Customer transaction statement.', requiredPermission: 'reports.view', supportedFilters: ['customer', 'dateFrom', 'dateTo'], apiMethod: 'customerStatement', columns: [{ key: 'Date', label: 'Date' }, { key: 'Source', label: 'Source' }, { key: 'Reference', label: 'Reference' }, { key: 'Debit', label: 'Debit' }, { key: 'Credit', label: 'Credit' }], summaryCards: [], exportEnabled: false },
  { key: 'paymentCollection', label: 'Payment Collection Report', category: 'Customer / Khata Reports', description: 'Khata and invoice collections.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo'], apiMethod: 'paymentCollection', columns: [{ key: 'Customer', label: 'Customer' }, { key: 'Khata', label: 'Khata' }, { key: 'Invoice', label: 'Invoice' }, { key: 'Total', label: 'Total' }], summaryCards: [{ key: 'total_collected', label: 'Total Collected' }], exportEnabled: false },
  { key: 'supplierPayable', label: 'Supplier Payable Report', category: 'Supplier Reports', description: 'Outstanding supplier liabilities.', requiredPermission: 'reports.view', supportedFilters: ['asOfDate'], apiMethod: 'supplierPayable', columns: [{ key: 'Supplier', label: 'Supplier' }, { key: 'Payable', label: 'Payable' }], summaryCards: [], exportEnabled: false },
  { key: 'supplierLedger', label: 'Supplier Ledger Report', category: 'Supplier Reports', description: 'Detailed ledger per supplier.', requiredPermission: 'reports.view', supportedFilters: ['supplier', 'dateFrom', 'dateTo'], apiMethod: 'supplierLedger', columns: [{ key: 'Date', label: 'Date' }, { key: 'Type', label: 'Type' }, { key: 'Debit', label: 'Debit' }, { key: 'Credit', label: 'Credit' }, { key: 'Balance', label: 'Balance' }], summaryCards: [], exportEnabled: false },
  { key: 'supplierPayment', label: 'Supplier Payment Report', category: 'Supplier Reports', description: 'Supplier payment register.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'supplierPayment', columns: [{ key: 'Date', label: 'Date' }, { key: 'Supplier', label: 'Supplier' }, { key: 'Method', label: 'Method' }, { key: 'Amount', label: 'Amount' }], summaryCards: [], exportEnabled: false },
  { key: 'taxSummary', label: 'GST/VAT Summary', category: 'Tax Reports', description: 'Output vs input tax and net payable.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo'], apiMethod: 'taxSummary', columns: [{ key: 'Tax', label: 'Tax' }], summaryCards: [{ key: 'outputTax', label: 'Output Tax' }, { key: 'inputTax', label: 'Input Tax' }, { key: 'netPayable', label: 'Net Payable' }], exportEnabled: false },
  { key: 'outputTax', label: 'Output Tax Report', category: 'Tax Reports', description: 'Sales-side tax breakdown.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo'], apiMethod: 'outputTax', columns: [{ key: 'Code', label: 'Code' }, { key: 'Tax', label: 'Tax' }, { key: 'Net', label: 'Net' }], summaryCards: [], exportEnabled: false },
  { key: 'inputTax', label: 'Input Tax Report', category: 'Tax Reports', description: 'Purchase-side tax breakdown.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo'], apiMethod: 'inputTax', columns: [{ key: 'Code', label: 'Code' }, { key: 'Tax', label: 'Tax' }, { key: 'Net', label: 'Net' }], summaryCards: [], exportEnabled: false },
  { key: 'bankAccountSummary', label: 'Bank Account Summary', category: 'Banking Reports', description: 'Bank/cash account balances.', requiredPermission: 'reports.view', supportedFilters: [], apiMethod: 'bankAccountSummary', columns: [{ key: 'Code', label: 'Code' }, { key: 'Account', label: 'Account' }, { key: 'Balance', label: 'Balance' }], summaryCards: [], exportEnabled: false },
  { key: 'moneyTransaction', label: 'Money Transaction Report', category: 'Banking Reports', description: 'Deposits/withdrawals/transfers log.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'moneyTransaction', columns: [{ key: 'Date', label: 'Date' }, { key: 'Account', label: 'Account' }, { key: 'Type', label: 'Type' }, { key: 'Amount', label: 'Amount' }], summaryCards: [], exportEnabled: false },
  { key: 'bankReconciliation', label: 'Bank Reconciliation Report', category: 'Banking Reports', description: 'Reconciliation worksheet history.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo'], apiMethod: 'bankReconciliation', columns: [{ key: 'Account', label: 'Account' }, { key: 'Start', label: 'Start' }, { key: 'End', label: 'End' }, { key: 'Difference', label: 'Difference' }, { key: 'Status', label: 'Status' }], summaryCards: [], exportEnabled: false },
  { key: 'shiftSummary', label: 'Shift Summary Report', category: 'Shift / Cashier Reports', description: 'Shift opening/closing and variance.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'shiftSummary', columns: [{ key: 'Shift', label: 'Shift' }, { key: 'Cashier', label: 'Cashier' }, { key: 'Expected', label: 'Expected' }, { key: 'Counted', label: 'Counted' }, { key: 'Difference', label: 'Difference' }], summaryCards: [{ key: 'shifts', label: 'Shifts' }], exportEnabled: false },
  { key: 'cashierSales', label: 'Cashier Sales Report', category: 'Shift / Cashier Reports', description: 'Cashier sales and control metrics.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'cashierSales', columns: [{ key: 'Cashier', label: 'Cashier' }, { key: 'Paid Sales', label: 'Paid Sales' }, { key: 'Voids', label: 'Voids' }], summaryCards: [], exportEnabled: false },
  { key: 'cashDrawerReconciliation', label: 'Cash Drawer Reconciliation Report', category: 'Shift / Cashier Reports', description: 'Drawer expected vs counted by shift.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'cashDrawerReconciliation', columns: [{ key: 'Shift', label: 'Shift' }, { key: 'Opening', label: 'Opening' }, { key: 'Expected', label: 'Expected' }, { key: 'Counted', label: 'Counted' }, { key: 'Difference', label: 'Difference' }], summaryCards: [], exportEnabled: false },
  { key: 'cashierDiscrepancy', label: 'Cashier Discrepancy Report', category: 'Shift / Cashier Reports', description: 'Short/over pattern by cashier.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'cashierDiscrepancy', columns: [{ key: 'Cashier', label: 'Cashier' }, { key: 'Short', label: 'Short' }, { key: 'Over', label: 'Over' }, { key: 'Suspicious', label: 'Suspicious' }], summaryCards: [], exportEnabled: false },
  { key: 'branchProfitAndLoss', label: 'Branch Profit & Loss', category: 'Branch / Class Reports', description: 'P&L comparison across branches.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo'], apiMethod: 'branchProfitAndLoss', columns: [{ key: 'Branch', label: 'Branch' }, { key: 'Income', label: 'Income' }, { key: 'Expenses', label: 'Expenses' }, { key: 'Net', label: 'Net' }], summaryCards: [], exportEnabled: false },
  { key: 'classProfitAndLoss', label: 'Class / Department Profit & Loss', category: 'Branch / Class Reports', description: 'Class-wise profitability.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch', 'class'], apiMethod: 'classProfitAndLoss', columns: [{ key: 'Class', label: 'Class' }, { key: 'Income', label: 'Income' }, { key: 'COGS', label: 'COGS' }, { key: 'Expenses', label: 'Expenses' }, { key: 'Net', label: 'Net' }], summaryCards: [], exportEnabled: false },
  { key: 'budgetVsActual', label: 'Budget vs Actual', category: 'Branch / Class Reports', description: 'Budget variance by account.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch', 'class'], apiMethod: 'budgetVsActual', columns: [{ key: 'Account', label: 'Account' }, { key: 'Budget', label: 'Budget' }, { key: 'Actual', label: 'Actual' }, { key: 'Variance', label: 'Variance' }], summaryCards: [], exportEnabled: false },
  { key: 'branchPerformance', label: 'Branch Performance Report', category: 'Branch / Class Reports', description: 'Sales, returns, and discount by branch.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo'], apiMethod: 'branchPerformance', columns: [{ key: 'Branch', label: 'Branch' }, { key: 'Sales', label: 'Sales' }, { key: 'Returns', label: 'Returns' }, { key: 'Discount', label: 'Discount' }], summaryCards: [], exportEnabled: false },
  { key: 'auditLog', label: 'Audit Log Report', category: 'Operational Reports', description: 'Action-level audit events.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'user'], apiMethod: 'auditLog', columns: [{ key: 'Time', label: 'Time' }, { key: 'User', label: 'User' }, { key: 'Action', label: 'Action' }, { key: 'Details', label: 'Details' }], summaryCards: [], exportEnabled: false },
  { key: 'backupHistory', label: 'Backup History Report', category: 'Operational Reports', description: 'Backup job and integrity history.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo'], apiMethod: 'backupHistory', columns: [{ key: 'Time', label: 'Time' }, { key: 'File', label: 'File' }, { key: 'Type', label: 'Type' }, { key: 'Status', label: 'Status' }], summaryCards: [], exportEnabled: false },
  { key: 'notification', label: 'Notification Report', category: 'Operational Reports', description: 'Operational alerts and states.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo', 'branch'], apiMethod: 'notification', columns: [{ key: 'Time', label: 'Time' }, { key: 'Category', label: 'Category' }, { key: 'Severity', label: 'Severity' }, { key: 'Status', label: 'Status' }], summaryCards: [], exportEnabled: false },
  { key: 'userActivity', label: 'User Activity Report', category: 'Operational Reports', description: 'User activity volume and recency.', requiredPermission: 'reports.view', supportedFilters: ['dateFrom', 'dateTo'], apiMethod: 'userActivity', columns: [{ key: 'User', label: 'User' }, { key: 'Activities', label: 'Activities' }, { key: 'Last Activity', label: 'Last Activity' }], summaryCards: [], exportEnabled: false }
];

export const reportRegistryByKey = Object.fromEntries(reportRegistry.map((r) => [r.key, r])) as Record<ReportKey, ReportDefinition>;
