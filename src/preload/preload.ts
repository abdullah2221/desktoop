import { contextBridge, ipcRenderer } from 'electron';
import type { Account, BankAccount, Brand, Category, Expense, JournalEntry, Product, Purchase, Supplier, SupplierPayment, Unit } from '../renderer/shared/types';

let sessionToken: string | null = null;

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('api', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),

  auth: {
    setSessionToken: (token: string | null) => { sessionToken = token; },
    login: async (username: string, password: string) => {
      const result = await ipcRenderer.invoke('auth:login', username, password);
      sessionToken = result.token;
      return result;
    },
    logout: async () => {
      const result = await ipcRenderer.invoke('auth:logout', sessionToken);
      sessionToken = null;
      return result;
    },
    getCurrentUser: () => ipcRenderer.invoke('auth:getCurrentUser', sessionToken),
    hasPermission: (permission: string) => ipcRenderer.invoke('auth:hasPermission', sessionToken, permission),
  },
  
  // SECURE SQLITE DATABASE APIS
  products: {
    getAll: () => ipcRenderer.invoke('products:getAll'),
    getById: (id: string) => ipcRenderer.invoke('products:getById', id),
    getByBarcode: (barcode: string) => ipcRenderer.invoke('products:getByBarcode', barcode),
    searchByBarcodeOrSku: (query: string) => ipcRenderer.invoke('products:searchByBarcodeOrSku', query),
    getLowStock: () => ipcRenderer.invoke('products:getLowStock'),
    create: (product: Partial<Product>) => ipcRenderer.invoke('products:create', product),
    update: (product: Partial<Product>) => ipcRenderer.invoke('products:update', product),
    deactivate: (id: string) => ipcRenderer.invoke('products:deactivate', id),
    updateStock: (id: string, newStock: number) => ipcRenderer.invoke('products:updateStock', id, newStock),
  },


  categories: {
    getAll: () => ipcRenderer.invoke('categories:getAll'),
    create: (category: Partial<Category>) => ipcRenderer.invoke('categories:create', category),
    update: (category: Partial<Category>) => ipcRenderer.invoke('categories:update', category),
    deactivate: (id: string) => ipcRenderer.invoke('categories:deactivate', id),
  },

  units: {
    getAll: () => ipcRenderer.invoke('units:getAll'),
    create: (unit: Partial<Unit>) => ipcRenderer.invoke('units:create', unit),
    update: (unit: Partial<Unit>) => ipcRenderer.invoke('units:update', unit),
    deactivate: (id: string) => ipcRenderer.invoke('units:deactivate', id),
  },

  brands: {
    getAll: () => ipcRenderer.invoke('brands:getAll'),
    create: (brand: Partial<Brand>) => ipcRenderer.invoke('brands:create', brand),
    update: (brand: Partial<Brand>) => ipcRenderer.invoke('brands:update', brand),
    deactivate: (id: string) => ipcRenderer.invoke('brands:deactivate', id),
  },

  suppliers: {
    getAll: () => ipcRenderer.invoke('suppliers:getAll'),
    getById: (id: string) => ipcRenderer.invoke('suppliers:getById', id),
    create: (supplier: Partial<Supplier>) => ipcRenderer.invoke('suppliers:create', supplier),
    update: (supplier: Partial<Supplier>) => ipcRenderer.invoke('suppliers:update', supplier),
    deactivate: (id: string) => ipcRenderer.invoke('suppliers:deactivate', id),
    getLedger: (id: string) => ipcRenderer.invoke('suppliers:getLedger', id),
  },
  
  customers: {
    getAll: (filters?: any) => ipcRenderer.invoke('customers:getAll', sessionToken, filters || {}),
    create: (payload: unknown) => ipcRenderer.invoke('customers:create', sessionToken, payload),
    update: (payload: unknown) => ipcRenderer.invoke('customers:update', sessionToken, payload),
    deactivate: (name: string) => ipcRenderer.invoke('customers:deactivate', sessionToken, name),
    reactivate: (name: string) => ipcRenderer.invoke('customers:reactivate', sessionToken, name),
    getByName: (name: string) => ipcRenderer.invoke('customers:getByName', sessionToken, name),
    getById: (id: string) => ipcRenderer.invoke('customers:getById', sessionToken, id),
    getByPhone: (phone: string) => ipcRenderer.invoke('customers:getByPhone', sessionToken, phone),
    getStatement: (id: string) => ipcRenderer.invoke('customers:getStatement', sessionToken, id),
    getSales: (id: string) => ipcRenderer.invoke('customers:getSales', sessionToken, id),
    getInvoices: (id: string) => ipcRenderer.invoke('customers:getInvoices', sessionToken, id),
    getPayments: (id: string) => ipcRenderer.invoke('customers:getPayments', sessionToken, id),
    getReturns: (id: string) => ipcRenderer.invoke('customers:getReturns', sessionToken, id),
    getAging: (asOfDate: string) => ipcRenderer.invoke('customers:getAging', sessionToken, asOfDate),
    getOverdue: (asOfDate: string) => ipcRenderer.invoke('customers:getOverdue', sessionToken, asOfDate),
    getCreditLimitWarnings: () => ipcRenderer.invoke('customers:getCreditLimitWarnings', sessionToken),
    createOrIncrementCredit: (name: string, creditChange: number, purchasesChange: number, date: string) =>
      ipcRenderer.invoke('customers:createOrIncrementCredit', sessionToken, name, creditChange, purchasesChange, date),
    receivePayment: (name: string, payAmt: number, date: string) =>
      ipcRenderer.invoke('customers:receivePayment', sessionToken, name, payAmt, date),
  },
  
  sales: {
    getAll: () => ipcRenderer.invoke('sales:getAll', sessionToken),
    getRecent: (filters?: Record<string, unknown>) => ipcRenderer.invoke('sales:getRecent', sessionToken, filters),
    getById: (invoiceNo: string) => ipcRenderer.invoke('sales:getById', sessionToken, invoiceNo),
    getItems: (invoiceNo: string) => ipcRenderer.invoke('sales:getItems', sessionToken, invoiceNo),
    getByCustomer: (customerIdOrName: string) => ipcRenderer.invoke('sales:getByCustomer', sessionToken, customerIdOrName),
    getByShift: (shiftId: string) => ipcRenderer.invoke('sales:getByShift', sessionToken, shiftId),
    getByBranch: (branchId: string) => ipcRenderer.invoke('sales:getByBranch', sessionToken, branchId),
    getHistory: (filters?: Record<string, unknown>) => ipcRenderer.invoke('sales:getHistory', sessionToken, filters),
    getReceiptDetail: (invoiceNo: string) => ipcRenderer.invoke('sales:getReceiptDetail', sessionToken, invoiceNo),
    getAuditTrail: (invoiceNo: string) => ipcRenderer.invoke('sales:getAuditTrail', sessionToken, invoiceNo),
    void: (invoiceNo: string, reason: string) => ipcRenderer.invoke('sales:void', sessionToken, invoiceNo, reason),
    create: (sale: {
      invoiceNo: string;
      customerName: string;
      customer_id?: string | null;
      customer_type?: 'WALK_IN' | 'REGISTERED';
      date: string;
      sale_time?: string;
      total: number;
      status: 'Paid' | 'Credit';
      payment_method?: string;
      cashier_id?: string;
      cashier_name?: string;
      branch_name?: string;
      shift_id?: string;
      register_id?: string;
      discount: number;
      discount_type?: 'percentage' | 'fixed';
      discount_value?: number;
      discount_amount?: number;
      subtotal?: number;
      total_amount?: number;
      tax_rate: number;
      items: Array<{
        product_id: string;
        quantity: number;
        price: number;
        discount_type?: 'percentage' | 'fixed';
        discount_value?: number;
        discount_amount?: number;
        line_total?: number;
      }>;
    }) => ipcRenderer.invoke('sales:create', sessionToken, sale),
  },

  cashierShifts: {
    getRegisters: (branchId?: string) => ipcRenderer.invoke('cashierShifts:getRegisters', sessionToken, branchId),
    getActiveShift: (branchId: string, registerId: string) => ipcRenderer.invoke('cashierShifts:getActiveShift', sessionToken, branchId, registerId),
    openShift: (payload: { branch_id: string; register_id: string; opening_cash: number; notes?: string }) =>
      ipcRenderer.invoke('cashierShifts:openShift', sessionToken, payload),
    getShiftSummary: (shiftId: string) => ipcRenderer.invoke('cashierShifts:getShiftSummary', sessionToken, shiftId),
    closeShift: (payload: { shift_id: string; counted_cash: number; notes?: string }) =>
      ipcRenderer.invoke('cashierShifts:closeShift', sessionToken, payload),
    forceCloseShift: (payload: { shift_id: string; counted_cash?: number; notes?: string }) =>
      ipcRenderer.invoke('cashierShifts:forceCloseShift', sessionToken, payload),
    suspendShift: (shiftId: string, notes?: string) => ipcRenderer.invoke('cashierShifts:suspendShift', sessionToken, shiftId, notes),
    resumeShift: (shiftId: string, notes?: string) => ipcRenderer.invoke('cashierShifts:resumeShift', sessionToken, shiftId, notes),
    getOpenShifts: () => ipcRenderer.invoke('cashierShifts:getOpenShifts', sessionToken),
  },

  dashboard: {
    getOverview: (filters: Record<string, unknown>) => ipcRenderer.invoke('dashboard:getOverview', sessionToken, filters),
    getSalesTrend: (filters: Record<string, unknown>) => ipcRenderer.invoke('dashboard:getSalesTrend', sessionToken, filters),
    getPaymentBreakdown: (filters: Record<string, unknown>) => ipcRenderer.invoke('dashboard:getPaymentBreakdown', sessionToken, filters),
    getTopProducts: (filters: Record<string, unknown>) => ipcRenderer.invoke('dashboard:getTopProducts', sessionToken, filters),
    getRecentActivity: (filters: Record<string, unknown>) => ipcRenderer.invoke('dashboard:getRecentActivity', sessionToken, filters),
    getShiftSummary: (filters: Record<string, unknown>) => ipcRenderer.invoke('dashboard:getShiftSummary', sessionToken, filters),
    getLowStock: (filters: Record<string, unknown>) => ipcRenderer.invoke('dashboard:getLowStock', sessionToken, filters),
    getReceivablesPayables: (filters: Record<string, unknown>) => ipcRenderer.invoke('dashboard:getReceivablesPayables', sessionToken, filters),
    getDateDetail: (date: string, filters: Record<string, unknown>) => ipcRenderer.invoke('dashboard:getDateDetail', sessionToken, date, filters),
    getMetricDetail: (metric: string, filters: Record<string, unknown>) => ipcRenderer.invoke('dashboard:getMetricDetail', sessionToken, metric, filters),
  },
  
  expenses: {
    getAll: () => ipcRenderer.invoke('expenses:getAll'),
    create: (expense: Expense) => ipcRenderer.invoke('expenses:create', expense),
  },
  
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    update: (key: string, value: string) => ipcRenderer.invoke('settings:update', key, value),
  },

  system: {
    backup: () => ipcRenderer.invoke('system:backup'),
    getStats: () => ipcRenderer.invoke('system:getStats'),
    getAppInfo: () => ipcRenderer.invoke('system:getAppInfo'),
    getDiagnostics: () => ipcRenderer.invoke('system:getDiagnostics'),
    getDatabaseStatus: () => ipcRenderer.invoke('system:getDatabaseStatus'),
    getLogStatus: () => ipcRenderer.invoke('system:getLogStatus'),
    getEnvironmentInfo: () => ipcRenderer.invoke('system:getEnvironmentInfo'),
  },

  purchases: {
    getAll: () => ipcRenderer.invoke('purchases:getAll'),
    getById: (id: string) => ipcRenderer.invoke('purchases:getById', id),
    create: (purchase: Partial<Purchase>) => ipcRenderer.invoke('purchases:create', purchase),
  },

  stockMovements: {
    getByProduct: (productId: string) => ipcRenderer.invoke('stockMovements:getByProduct', productId),
  },

  supplierPayments: {
    getBySupplier: (supplierId: string) => ipcRenderer.invoke('supplierPayments:getBySupplier', supplierId),
    create: (payment: Partial<SupplierPayment>) => ipcRenderer.invoke('supplierPayments:create', payment),
  },

  accounts: {
    getAll: () => ipcRenderer.invoke('accounts:getAll'),
    create: (account: Partial<Account>) => ipcRenderer.invoke('accounts:create', sessionToken, account),
    update: (account: Partial<Account>) => ipcRenderer.invoke('accounts:update', sessionToken, account),
    deactivate: (id: string) => ipcRenderer.invoke('accounts:deactivate', sessionToken, id),
  },

  journals: {
    getAll: () => ipcRenderer.invoke('journals:getAll'),
    create: (journal: Partial<JournalEntry> & { lines: unknown[] }) => ipcRenderer.invoke('journals:create', sessionToken, journal),
  },

  quotes: {
    getAll: () => ipcRenderer.invoke('quotes:getAll'),
    getById: (id: string) => ipcRenderer.invoke('quotes:getById', id),
    create: (payload: unknown) => ipcRenderer.invoke('quotes:create', payload),
    update: (payload: unknown) => ipcRenderer.invoke('quotes:update', payload),
    convertToInvoice: (id: string) => ipcRenderer.invoke('quotes:convertToInvoice', id),
  },

  invoices: {
    getAll: () => ipcRenderer.invoke('invoices:getAll', sessionToken),
    getRecent: (filters?: Record<string, unknown>) => ipcRenderer.invoke('invoices:getRecent', sessionToken, filters),
    getById: (id: string) => ipcRenderer.invoke('invoices:getById', sessionToken, id),
    create: (payload: unknown) => ipcRenderer.invoke('invoices:create', sessionToken, payload),
    updateDraft: (payload: unknown) => ipcRenderer.invoke('invoices:updateDraft', sessionToken, payload),
    finalize: (id: string) => ipcRenderer.invoke('invoices:finalize', sessionToken, id),
    void: (id: string) => ipcRenderer.invoke('invoices:void', sessionToken, id),
  },

  invoicePayments: {
    getByInvoice: (invoiceId: string) => ipcRenderer.invoke('invoicePayments:getByInvoice', invoiceId),
    create: (payload: unknown) => ipcRenderer.invoke('invoicePayments:create', payload),
  },

  taxes: {
    getRates: () => ipcRenderer.invoke('taxes:getRates'),
    createRate: (payload: unknown) => ipcRenderer.invoke('taxes:createRate', payload),
    updateRate: (payload: unknown) => ipcRenderer.invoke('taxes:updateRate', payload),
    deactivateRate: (id: string) => ipcRenderer.invoke('taxes:deactivateRate', id),
    getSettings: () => ipcRenderer.invoke('taxes:getSettings'),
    updateSetting: (key: string, value: string) => ipcRenderer.invoke('taxes:updateSetting', key, value),
    calculate: (payload: unknown) => ipcRenderer.invoke('taxes:calculate', payload),
    getOutputReport: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('taxes:getOutputReport', dateFrom, dateTo),
    getInputReport: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('taxes:getInputReport', dateFrom, dateTo),
    getSummaryReport: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('taxes:getSummaryReport', dateFrom, dateTo),
  },

  bankAccounts: {
    getAll: () => ipcRenderer.invoke('bankAccounts:getAll'),
    create: (payload: Partial<BankAccount>) => ipcRenderer.invoke('bankAccounts:create', payload),
    update: (payload: Partial<BankAccount>) => ipcRenderer.invoke('bankAccounts:update', payload),
    deactivate: (id: string) => ipcRenderer.invoke('bankAccounts:deactivate', id),
    getPaymentMethodMappings: () => ipcRenderer.invoke('bankAccounts:getPaymentMethodMappings'),
    mapPaymentMethod: (paymentMethod: string, accountId: string | null) => ipcRenderer.invoke('bankAccounts:mapPaymentMethod', paymentMethod, accountId),
  },

  moneyTransactions: {
    getAll: () => ipcRenderer.invoke('moneyTransactions:getAll'),
    getByAccount: (accountId: string) => ipcRenderer.invoke('moneyTransactions:getByAccount', accountId),
    createDeposit: (payload: unknown) => ipcRenderer.invoke('moneyTransactions:createDeposit', payload),
    createWithdrawal: (payload: unknown) => ipcRenderer.invoke('moneyTransactions:createWithdrawal', payload),
    createTransfer: (payload: unknown) => ipcRenderer.invoke('moneyTransactions:createTransfer', payload),
    createBankCharge: (payload: unknown) => ipcRenderer.invoke('moneyTransactions:createBankCharge', payload),
    createAdjustment: (payload: unknown) => ipcRenderer.invoke('moneyTransactions:createAdjustment', payload),
    markCleared: (transactionId: string, cleared: boolean) => ipcRenderer.invoke('moneyTransactions:markCleared', transactionId, cleared),
  },

  bankReconciliations: {
    getAll: () => ipcRenderer.invoke('bankReconciliations:getAll'),
    createWorksheet: (payload: unknown) => ipcRenderer.invoke('bankReconciliations:createWorksheet', payload),
    getItems: (reconciliationId: string) => ipcRenderer.invoke('bankReconciliations:getItems', reconciliationId),
    markItemsCleared: (reconciliationId: string, transactionIds: string[]) => ipcRenderer.invoke('bankReconciliations:markItemsCleared', reconciliationId, transactionIds),
  },

  reports: {
    profitAndLoss: (dateFrom: string, dateTo: string, branchId?: string, classId?: string) => ipcRenderer.invoke('reports:profitAndLoss', sessionToken, dateFrom, dateTo, branchId, classId),
    balanceSheet: (dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:balanceSheet', sessionToken, dateTo, branchId),
    cashFlow: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:cashFlow', sessionToken, dateFrom, dateTo),
    trialBalance: (dateFrom: string, dateTo: string, branchId?: string, classId?: string) => ipcRenderer.invoke('reports:trialBalance', sessionToken, dateFrom, dateTo, branchId, classId),
    generalLedger: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:generalLedger', sessionToken, dateFrom, dateTo),
    arAging: (dateTo: string) => ipcRenderer.invoke('reports:arAging', sessionToken, dateTo),
    apAging: (dateTo: string) => ipcRenderer.invoke('reports:apAging', sessionToken, dateTo),
    inventoryValuation: () => ipcRenderer.invoke('reports:inventoryValuation', sessionToken),
    taxSummary: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:taxSummary', sessionToken, dateFrom, dateTo),
    salesByCustomerProduct: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:salesByCustomerProduct', sessionToken, dateFrom, dateTo),
    purchasesBySupplierProduct: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:purchasesBySupplierProduct', sessionToken, dateFrom, dateTo),
    expenseSummary: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:expenseSummary', sessionToken, dateFrom, dateTo),
    budgetVsActual: (dateFrom: string, dateTo: string, budgetId?: string, branchId?: string, classId?: string) => ipcRenderer.invoke('reports:budgetVsActual', sessionToken, dateFrom, dateTo, budgetId, branchId, classId),
    classProfitAndLoss: (dateFrom: string, dateTo: string, branchId?: string, classId?: string) => ipcRenderer.invoke('reports:classProfitAndLoss', sessionToken, dateFrom, dateTo, branchId, classId),
    customerBalance: () => ipcRenderer.invoke('reports:customerBalance', sessionToken),
    customerAging: (asOfDate: string) => ipcRenderer.invoke('reports:customerAging', sessionToken, asOfDate),
    paymentCollection: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:paymentCollection', sessionToken, dateFrom, dateTo),
    shiftSummary: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:shiftSummary', sessionToken, dateFrom, dateTo, branchId),
    cashierDiscrepancy: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:cashierDiscrepancy', sessionToken, dateFrom, dateTo, branchId),
    dailySalesSummary: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:dailySalesSummary', sessionToken, dateFrom, dateTo, branchId),
    productSales: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:productSales', sessionToken, dateFrom, dateTo, branchId),
    discountSummary: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:discountSummary', sessionToken, dateFrom, dateTo, branchId),
    returnSummary: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:returnSummary', sessionToken, dateFrom, dateTo, branchId),
    voidSummary: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:voidSummary', sessionToken, dateFrom, dateTo, branchId),
    paymentMethod: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:paymentMethod', sessionToken, dateFrom, dateTo, branchId),
    cashDrawerReconciliation: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:cashDrawerReconciliation', sessionToken, dateFrom, dateTo, branchId),
    branchPerformance: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:branchPerformance', sessionToken, dateFrom, dateTo),
    cashierSales: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:cashierSales', sessionToken, dateFrom, dateTo, branchId),
    hourlySales: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:hourlySales', sessionToken, dateFrom, dateTo, branchId),
    salesInvoices: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:salesInvoices', sessionToken, dateFrom, dateTo, branchId),
    purchaseSummary: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:purchaseSummary', sessionToken, dateFrom, dateTo, branchId),
    purchaseReturns: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:purchaseReturns', sessionToken, dateFrom, dateTo, branchId),
    stockMovement: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:stockMovement', sessionToken, dateFrom, dateTo, branchId),
    lowStock: (branchId?: string) => ipcRenderer.invoke('reports:lowStock', sessionToken, branchId),
    branchStock: (branchId?: string) => ipcRenderer.invoke('reports:branchStock', sessionToken, branchId),
    inventoryAdjustment: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:inventoryAdjustment', sessionToken, dateFrom, dateTo, branchId),
    stockTransfer: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:stockTransfer', sessionToken, dateFrom, dateTo),
    customerStatement: (customerIdOrName: string, dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:customerStatement', sessionToken, customerIdOrName, dateFrom, dateTo),
    supplierPayable: (dateTo: string) => ipcRenderer.invoke('reports:supplierPayable', sessionToken, dateTo),
    supplierLedger: (supplierId: string, dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:supplierLedger', sessionToken, supplierId, dateFrom, dateTo),
    supplierPayment: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:supplierPayment', sessionToken, dateFrom, dateTo, branchId),
    outputTax: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:outputTax', sessionToken, dateFrom, dateTo),
    inputTax: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:inputTax', sessionToken, dateFrom, dateTo),
    bankAccountSummary: () => ipcRenderer.invoke('reports:bankAccountSummary', sessionToken),
    moneyTransaction: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:moneyTransaction', sessionToken, dateFrom, dateTo, branchId),
    bankReconciliation: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:bankReconciliation', sessionToken, dateFrom, dateTo),
    branchProfitAndLoss: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:branchProfitAndLoss', sessionToken, dateFrom, dateTo),
    auditLog: (dateFrom: string, dateTo: string, userId?: string) => ipcRenderer.invoke('reports:auditLog', sessionToken, dateFrom, dateTo, userId),
    backupHistory: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:backupHistory', sessionToken, dateFrom, dateTo),
    notification: (dateFrom: string, dateTo: string, branchId?: string) => ipcRenderer.invoke('reports:notification', sessionToken, dateFrom, dateTo, branchId),
    userActivity: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:userActivity', sessionToken, dateFrom, dateTo),
  },

  budgets: {
    getAll: () => ipcRenderer.invoke('budgets:getAll', sessionToken),
    getById: (id: string) => ipcRenderer.invoke('budgets:getById', sessionToken, id),
    create: (payload: unknown) => ipcRenderer.invoke('budgets:create', sessionToken, payload),
    update: (payload: unknown) => ipcRenderer.invoke('budgets:update', sessionToken, payload),
    deactivate: (id: string) => ipcRenderer.invoke('budgets:deactivate', sessionToken, id),
  },

  recurring: {
    getTemplates: () => ipcRenderer.invoke('recurring:getTemplates', sessionToken),
    getTemplateById: (id: string) => ipcRenderer.invoke('recurring:getTemplateById', sessionToken, id),
    createTemplate: (payload: unknown) => ipcRenderer.invoke('recurring:createTemplate', sessionToken, payload),
    updateTemplate: (payload: unknown) => ipcRenderer.invoke('recurring:updateTemplate', sessionToken, payload),
    deactivateTemplate: (id: string) => ipcRenderer.invoke('recurring:deactivateTemplate', sessionToken, id),
    getRuns: (templateId?: string) => ipcRenderer.invoke('recurring:getRuns', sessionToken, templateId),
    runDue: (runDate?: string) => ipcRenderer.invoke('recurring:runDue', sessionToken, runDate),
  },

  automation: {
    getRules: () => ipcRenderer.invoke('automation:getRules', sessionToken),
    updateRules: (settings: Record<string, string>) => ipcRenderer.invoke('automation:updateRules', sessionToken, settings),
  },

  employees: {
    getAll: () => ipcRenderer.invoke('employees:getAll', sessionToken),
    create: (payload: unknown) => ipcRenderer.invoke('employees:create', sessionToken, payload),
    update: (payload: unknown) => ipcRenderer.invoke('employees:update', sessionToken, payload),
    deactivate: (id: string) => ipcRenderer.invoke('employees:deactivate', sessionToken, id),
  },

  timesheets: {
    getAll: (filters?: Record<string, unknown>) => ipcRenderer.invoke('timesheets:getAll', sessionToken, filters),
    clockIn: (payload: unknown) => ipcRenderer.invoke('timesheets:clockIn', sessionToken, payload),
    clockOut: (id: string, payload?: unknown) => ipcRenderer.invoke('timesheets:clockOut', sessionToken, id, payload),
    createManual: (payload: unknown) => ipcRenderer.invoke('timesheets:createManual', sessionToken, payload),
    approve: (id: string) => ipcRenderer.invoke('timesheets:approve', sessionToken, id),
    summary: (filters?: Record<string, unknown>) => ipcRenderer.invoke('timesheets:summary', sessionToken, filters),
  },

  currencies: {
    getAll: () => ipcRenderer.invoke('currencies:getAll', sessionToken),
    getBase: () => ipcRenderer.invoke('currencies:getBase', sessionToken),
    create: (payload: unknown) => ipcRenderer.invoke('currencies:create', sessionToken, payload),
    update: (payload: unknown) => ipcRenderer.invoke('currencies:update', sessionToken, payload),
    deactivate: (code: string) => ipcRenderer.invoke('currencies:deactivate', sessionToken, code),
  },

  exchangeRates: {
    getAll: () => ipcRenderer.invoke('exchangeRates:getAll', sessionToken),
    create: (payload: unknown) => ipcRenderer.invoke('exchangeRates:create', sessionToken, payload),
    update: (payload: unknown) => ipcRenderer.invoke('exchangeRates:update', sessionToken, payload),
    convert: (amount: number, fromCurrency: string, toCurrency?: string, effectiveDate?: string) => ipcRenderer.invoke('exchangeRates:convert', sessionToken, amount, fromCurrency, toCurrency, effectiveDate),
    gainLossFoundation: (originalAmount: number, bookingRate: number, settlementRate: number) => ipcRenderer.invoke('exchangeRates:gainLossFoundation', sessionToken, originalAmount, bookingRate, settlementRate),
  },

  branchInventory: {
    getAll: (branchId?: string) => ipcRenderer.invoke('branchInventory:getAll', sessionToken, branchId),
    upsert: (payload: unknown) => ipcRenderer.invoke('branchInventory:upsert', sessionToken, payload),
    lowStock: (branchId?: string) => ipcRenderer.invoke('branchInventory:lowStock', sessionToken, branchId),
    valuation: (branchId?: string) => ipcRenderer.invoke('branchInventory:valuation', sessionToken, branchId),
  },

  stockTransfers: {
    getAll: () => ipcRenderer.invoke('stockTransfers:getAll', sessionToken),
    create: (payload: unknown) => ipcRenderer.invoke('stockTransfers:create', sessionToken, payload),
    approve: (id: string) => ipcRenderer.invoke('stockTransfers:approve', sessionToken, id),
    complete: (id: string) => ipcRenderer.invoke('stockTransfers:complete', sessionToken, id),
    reject: (id: string) => ipcRenderer.invoke('stockTransfers:reject', sessionToken, id),
  },

  inventoryAdjustments: {
    getAll: () => ipcRenderer.invoke('inventoryAdjustments:getAll', sessionToken),
    create: (payload: unknown) => ipcRenderer.invoke('inventoryAdjustments:create', sessionToken, payload),
    accountingFoundation: (adjustmentId: string) => ipcRenderer.invoke('inventoryAdjustments:accountingFoundation', sessionToken, adjustmentId),
  },

  users: {
    getAll: () => ipcRenderer.invoke('users:getAll', sessionToken),
    create: (payload: unknown) => ipcRenderer.invoke('users:create', sessionToken, payload),
    update: (payload: unknown) => ipcRenderer.invoke('users:update', sessionToken, payload),
    deactivate: (id: string) => ipcRenderer.invoke('users:deactivate', sessionToken, id),
    resetPassword: (id: string, password: string) => ipcRenderer.invoke('users:resetPassword', sessionToken, id, password),
  },

  roles: {
    getAll: () => ipcRenderer.invoke('roles:getAll', sessionToken),
    getPermissions: () => ipcRenderer.invoke('roles:getPermissions', sessionToken),
    create: (payload: unknown) => ipcRenderer.invoke('roles:create', sessionToken, payload),
    update: (payload: unknown) => ipcRenderer.invoke('roles:update', sessionToken, payload),
  },

  backup: {
    createFull: (options?: any) => ipcRenderer.invoke('backup:createFull', sessionToken, options || {}),
    validateFile: (filePath: string, password?: string) => ipcRenderer.invoke('backup:validateFile', sessionToken, filePath, password),
    restoreFile: (payload: { filePath: string; password?: string; adminPassword: string }) => ipcRenderer.invoke('backup:restoreFile', sessionToken, payload),
    selectBackupFile: () => ipcRenderer.invoke('backup:selectBackupFile', sessionToken),
    selectBackupDestination: () => ipcRenderer.invoke('backup:selectBackupDestination', sessionToken),
    openBackupFolder: (folderPath: string) => ipcRenderer.invoke('backup:openBackupFolder', sessionToken, folderPath),
    getHistory: () => ipcRenderer.invoke('backup:getHistory', sessionToken),
    create: () => ipcRenderer.invoke('backup:create', sessionToken),
    list: () => ipcRenderer.invoke('backup:list', sessionToken),
    restore: (filePath: string) => ipcRenderer.invoke('backup:restore', sessionToken, filePath),
    validate: (filePath: string) => ipcRenderer.invoke('backup:validate', sessionToken, filePath),
    integrityCheck: () => ipcRenderer.invoke('backup:integrityCheck', sessionToken),
    getSettings: () => ipcRenderer.invoke('backup:getSettings', sessionToken),
    updateSettings: (settings: Record<string, string>) => ipcRenderer.invoke('backup:updateSettings', sessionToken, settings),
  },

  branches: {
    getAll: () => ipcRenderer.invoke('branches:getAll', sessionToken),
    getAccessible: () => ipcRenderer.invoke('branches:getAccessible', sessionToken),
    create: (payload: unknown) => ipcRenderer.invoke('branches:create', sessionToken, payload),
    update: (payload: unknown) => ipcRenderer.invoke('branches:update', sessionToken, payload),
    deactivate: (id: string) => ipcRenderer.invoke('branches:deactivate', sessionToken, id),
    setDefault: (id: string) => ipcRenderer.invoke('branches:setDefault', sessionToken, id),
    assignUserBranches: (userId: string, branchIds: string[], defaultBranchId?: string) => ipcRenderer.invoke('branches:assignUserBranches', sessionToken, userId, branchIds, defaultBranchId),
  },

  classes: {
    getAll: () => ipcRenderer.invoke('classes:getAll', sessionToken),
    create: (payload: unknown) => ipcRenderer.invoke('classes:create', sessionToken, payload),
    update: (payload: unknown) => ipcRenderer.invoke('classes:update', sessionToken, payload),
    deactivate: (id: string) => ipcRenderer.invoke('classes:deactivate', sessionToken, id),
  },

  datasync: {
    downloadTemplate: (entityType: string, format: 'csv' | 'xlsx') => ipcRenderer.invoke('datasync:downloadTemplate', sessionToken, entityType, format),
    chooseImportFile: () => ipcRenderer.invoke('datasync:chooseImportFile', sessionToken),
    previewImport: (filePath: string, entityType: string) => ipcRenderer.invoke('datasync:previewImport', sessionToken, filePath, entityType),
    commitImport: (jobId: string, previewRows: any[], atomic: boolean) => ipcRenderer.invoke('datasync:commitImport', sessionToken, jobId, previewRows, atomic),
    exportData: (entityType: string, format: 'csv' | 'xlsx') => ipcRenderer.invoke('datasync:exportData', sessionToken, entityType, format),
    getImportJobs: () => ipcRenderer.invoke('datasync:getImportJobs', sessionToken),
    getExportJobs: () => ipcRenderer.invoke('datasync:getExportJobs', sessionToken),
    getJobErrors: (jobId: string) => ipcRenderer.invoke('datasync:getJobErrors', sessionToken, jobId),
  },

  returns: {
    getSalesHistory: () => ipcRenderer.invoke('returns:getSalesHistory'),
    getSalesReturnById: (id: string) => ipcRenderer.invoke('returns:getSalesReturnById', id),
    getSalesReturnsBySale: (invoiceNo: string) => ipcRenderer.invoke('returns:getSalesReturnsBySale', invoiceNo),
    createSalesReturn: (payload: any) => ipcRenderer.invoke('returns:createSalesReturn', payload),
    getPurchaseHistory: () => ipcRenderer.invoke('returns:getPurchaseHistory'),
    getPurchaseReturnById: (id: string) => ipcRenderer.invoke('returns:getPurchaseReturnById', id),
    getPurchaseReturnsByPurchase: (purchaseId: string) => ipcRenderer.invoke('returns:getPurchaseReturnsByPurchase', purchaseId),
    createPurchaseReturn: (payload: any) => ipcRenderer.invoke('returns:createPurchaseReturn', payload),
  },

  receipts: {
    print: (sale: any, isDuplicate = false) => ipcRenderer.invoke('receipt:print', sale, isDuplicate),
    printReturn: (salesReturn: any, isDuplicate = false) => ipcRenderer.invoke('receipt:printReturn', salesReturn, isDuplicate),
    previewReturn: (salesReturn: any, isDuplicate = false) => ipcRenderer.invoke('receipt:previewReturn', salesReturn, isDuplicate),
    preview: (sale: any, isDuplicate = false) => ipcRenderer.invoke('receipt:preview', sale, isDuplicate),
    fromSale: (invoiceNo: string) => ipcRenderer.invoke('receipt:fromSale', invoiceNo),
    duplicateFromSale: (invoiceNo: string) => ipcRenderer.invoke('receipt:duplicateFromSale', invoiceNo),
    getSettings: () => ipcRenderer.invoke('receipt:getSettings'),
    updateSettings: (settings: any) => ipcRenderer.invoke('receipt:updateSettings', settings),
    printKhataPayment: (payment: any, isDuplicate = false) => ipcRenderer.invoke('receipt:printKhataPayment', payment, isDuplicate),
    previewKhataPayment: (payment: any, isDuplicate = false) => ipcRenderer.invoke('receipt:previewKhataPayment', payment, isDuplicate),
    previewCustomerStatement: (statement: any) => ipcRenderer.invoke('receipt:previewCustomerStatement', statement),
  },

  khata: {
    getCustomers: () => ipcRenderer.invoke('khata:getCustomers', sessionToken),
    getStatement: (customerName: string) => ipcRenderer.invoke('khata:getStatement', sessionToken, customerName),
    getOverdue: (asOfDate: string) => ipcRenderer.invoke('khata:getOverdue', sessionToken, asOfDate),
    getReminders: (asOfDate: string) => ipcRenderer.invoke('khata:getReminders', sessionToken, asOfDate),
    recordPayment: (payload: any) => ipcRenderer.invoke('khata:recordPayment', sessionToken, payload),
    createAdjustment: (payload: any) => ipcRenderer.invoke('khata:createAdjustment', sessionToken, payload),
  },
  
  discounts: {
    getAll: () => ipcRenderer.invoke('discounts:getAll'),
    create: (discount: any) => ipcRenderer.invoke('discounts:create', discount),
    update: (discount: any) => ipcRenderer.invoke('discounts:update', discount),
    deactivate: (id: string) => ipcRenderer.invoke('discounts:deactivate', id),
    getActiveDiscounts: (dateStr?: string) => ipcRenderer.invoke('discounts:getActiveDiscounts', dateStr),
  },

  priceRules: {
    getAll: () => ipcRenderer.invoke('priceRules:getAll'),
    create: (rule: any) => ipcRenderer.invoke('priceRules:create', rule),
    update: (rule: any) => ipcRenderer.invoke('priceRules:update', rule),
    deactivate: (id: string) => ipcRenderer.invoke('priceRules:deactivate', id),
    getActiveRules: (dateStr?: string) => ipcRenderer.invoke('priceRules:getActiveRules', dateStr),
    getPromotionHistory: () => ipcRenderer.invoke('priceRules:getPromotionHistory'),
    calculateLineDiscounts: (items: any[], context?: any) => ipcRenderer.invoke('priceRules:calculateLineDiscounts', items, context),
    calculateInvoiceDiscount: (subtotal: number, discountType: 'fixed' | 'percentage', discountValue: number) => 
      ipcRenderer.invoke('priceRules:calculateInvoiceDiscount', subtotal, discountType, discountValue),
  },

  notifications: {
    getAll: (tab?: string) => ipcRenderer.invoke('notifications:getAll', sessionToken, tab),
    getUnreadCount: () => ipcRenderer.invoke('notifications:getUnreadCount', sessionToken),
    markRead: (id: string) => ipcRenderer.invoke('notifications:markRead', sessionToken, id),
    markAllRead: () => ipcRenderer.invoke('notifications:markAllRead', sessionToken),
    dismiss: (id: string) => ipcRenderer.invoke('notifications:dismiss', sessionToken, id),
    scan: (runDate?: string) => ipcRenderer.invoke('notifications:scan', sessionToken, runDate),
  },

  notificationRules: {
    getRules: () => ipcRenderer.invoke('notificationRules:getRules', sessionToken),
    updateRules: (settings: Record<string, string>) => ipcRenderer.invoke('notificationRules:updateRules', sessionToken, settings),
  }
});
