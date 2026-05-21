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
    getAll: () => ipcRenderer.invoke('customers:getAll'),
    createOrIncrementCredit: (name: string, creditChange: number, purchasesChange: number, date: string) => 
      ipcRenderer.invoke('customers:createOrIncrementCredit', name, creditChange, purchasesChange, date),
    receivePayment: (name: string, payAmt: number, date: string) => 
      ipcRenderer.invoke('customers:receivePayment', name, payAmt, date),
  },
  
  sales: {
    getAll: () => ipcRenderer.invoke('sales:getAll'),
    create: (sale: {
      invoiceNo: string;
      customerName: string;
      date: string;
      total: number;
      status: 'Paid' | 'Credit';
      discount: number;
      tax_rate: number;
      items: Array<{ product_id: string; quantity: number; price: number }>;
    }) => ipcRenderer.invoke('sales:create', sale),
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
    create: (account: Partial<Account>) => ipcRenderer.invoke('accounts:create', account),
    update: (account: Partial<Account>) => ipcRenderer.invoke('accounts:update', account),
    deactivate: (id: string) => ipcRenderer.invoke('accounts:deactivate', id),
  },

  journals: {
    getAll: () => ipcRenderer.invoke('journals:getAll'),
    create: (journal: Partial<JournalEntry> & { lines: unknown[] }) => ipcRenderer.invoke('journals:create', journal),
  },

  quotes: {
    getAll: () => ipcRenderer.invoke('quotes:getAll'),
    getById: (id: string) => ipcRenderer.invoke('quotes:getById', id),
    create: (payload: unknown) => ipcRenderer.invoke('quotes:create', payload),
    update: (payload: unknown) => ipcRenderer.invoke('quotes:update', payload),
    convertToInvoice: (id: string) => ipcRenderer.invoke('quotes:convertToInvoice', id),
  },

  invoices: {
    getAll: () => ipcRenderer.invoke('invoices:getAll'),
    getById: (id: string) => ipcRenderer.invoke('invoices:getById', id),
    create: (payload: unknown) => ipcRenderer.invoke('invoices:create', payload),
    updateDraft: (payload: unknown) => ipcRenderer.invoke('invoices:updateDraft', payload),
    finalize: (id: string) => ipcRenderer.invoke('invoices:finalize', id),
    void: (id: string) => ipcRenderer.invoke('invoices:void', id),
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
    profitAndLoss: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:profitAndLoss', sessionToken, dateFrom, dateTo),
    balanceSheet: (dateTo: string) => ipcRenderer.invoke('reports:balanceSheet', sessionToken, dateTo),
    cashFlow: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:cashFlow', sessionToken, dateFrom, dateTo),
    trialBalance: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:trialBalance', sessionToken, dateFrom, dateTo),
    generalLedger: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:generalLedger', sessionToken, dateFrom, dateTo),
    arAging: (dateTo: string) => ipcRenderer.invoke('reports:arAging', sessionToken, dateTo),
    apAging: (dateTo: string) => ipcRenderer.invoke('reports:apAging', sessionToken, dateTo),
    inventoryValuation: () => ipcRenderer.invoke('reports:inventoryValuation', sessionToken),
    taxSummary: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:taxSummary', sessionToken, dateFrom, dateTo),
    salesByCustomerProduct: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:salesByCustomerProduct', sessionToken, dateFrom, dateTo),
    purchasesBySupplierProduct: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:purchasesBySupplierProduct', sessionToken, dateFrom, dateTo),
    expenseSummary: (dateFrom: string, dateTo: string) => ipcRenderer.invoke('reports:expenseSummary', sessionToken, dateFrom, dateTo),
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
  }
});
