import type { Account, BankAccount, BankReconciliation, BankReconciliationItem, Branch, BranchInventory, Brand, Budget, Category, ClassTracking, Currency, Employee, ExchangeRate, Expense, InventoryAdjustment, Invoice, InvoicePayment, JournalEntry, JournalEntryLine, MoneyTransaction, NotificationItem, PaymentMethodAccount, Product, Purchase, Quote, RecurringRun, RecurringTemplate, StockMovement, StockTransfer, Supplier, SupplierPayment, Timesheet, Unit, User } from './shared/types';

export interface IElectronAPI {
  getAppVersion: () => Promise<string>;
  auth: {
    setSessionToken: (token: string | null) => void;
    login: (username: string, password: string) => Promise<{ token: string; expires_at: string; user: User }>;
    logout: () => Promise<boolean>;
    getCurrentUser: () => Promise<User | null>;
    hasPermission: (permission: string) => Promise<boolean>;
  };
  products: {
    getAll: () => Promise<Product[]>;
    getById: (id: string) => Promise<Product>;
    getByBarcode: (barcode: string) => Promise<Product | null>;
    searchByBarcodeOrSku: (query: string) => Promise<Product[]>;
    getLowStock: () => Promise<Product[]>;
    create: (product: Partial<Product>) => Promise<{ success: boolean; id?: string }>;
    update: (product: Partial<Product>) => Promise<boolean>;
    deactivate: (id: string) => Promise<boolean>;
    updateStock: (id: string, newStock: number) => Promise<boolean>;
  };
  categories: {
    getAll: () => Promise<Category[]>;
    create: (category: Partial<Category>) => Promise<{ success: boolean; id?: string }>;
    update: (category: Partial<Category>) => Promise<boolean>;
    deactivate: (id: string) => Promise<boolean>;
  };
  units: {
    getAll: () => Promise<Unit[]>;
    create: (unit: Partial<Unit>) => Promise<{ success: boolean; id?: string }>;
    update: (unit: Partial<Unit>) => Promise<boolean>;
    deactivate: (id: string) => Promise<boolean>;
  };
  brands: {
    getAll: () => Promise<Brand[]>;
    create: (brand: Partial<Brand>) => Promise<{ success: boolean; id?: string }>;
    update: (brand: Partial<Brand>) => Promise<boolean>;
    deactivate: (id: string) => Promise<boolean>;
  };
  suppliers: {
    getAll: () => Promise<Supplier[]>;
    getById: (id: string) => Promise<Supplier>;
    create: (supplier: Partial<Supplier>) => Promise<{ success: boolean; id?: string }>;
    update: (supplier: Partial<Supplier>) => Promise<boolean>;
    deactivate: (id: string) => Promise<boolean>;
    getLedger: (id: string) => Promise<any[]>;
  };
  customers: {
    getAll: () => Promise<any[]>;
    create: (payload: any) => Promise<boolean>;
    update: (payload: any) => Promise<boolean>;
    deactivate: (name: string) => Promise<boolean>;
    getByName: (name: string) => Promise<any>;
    getById: (id: string) => Promise<any>;
    getStatement: (id: string) => Promise<any>;
    getSales: (id: string) => Promise<any[]>;
    getInvoices: (id: string) => Promise<any[]>;
    getPayments: (id: string) => Promise<any[]>;
    createOrIncrementCredit: (name: string, creditChange: number, purchasesChange: number, date: string) => Promise<boolean>;
    receivePayment: (name: string, payAmt: number, date: string) => Promise<boolean>;
  };
  sales: {
    getAll: () => Promise<Array<{ invoiceNo: string; customerName: string; customer_id?: string | null; customer_type?: 'WALK_IN' | 'REGISTERED'; date: string; sale_time?: string; total: number; status: 'Paid' | 'Credit'; payment_method?: string; cashier_id?: string | null; cashier_name?: string | null; branch_id?: string; branch_name?: string; shift_id?: string | null; register_id?: string | null }>>;
    getRecent: (filters?: Record<string, unknown>) => Promise<Array<Record<string, any>>>;
    getById: (invoiceNo: string) => Promise<Record<string, any> | null>;
    getItems: (invoiceNo: string) => Promise<Array<Record<string, any>>>;
    getByCustomer: (customerIdOrName: string) => Promise<Array<Record<string, any>>>;
    getByShift: (shiftId: string) => Promise<Array<Record<string, any>>>;
    getByBranch: (branchId: string) => Promise<Array<Record<string, any>>>;
    getHistory: (filters?: Record<string, unknown>) => Promise<Array<Record<string, any>>>;
    getReceiptDetail: (invoiceNo: string) => Promise<Record<string, any> | null>;
    getAuditTrail: (invoiceNo: string) => Promise<Array<Record<string, any>>>;
    void: (invoiceNo: string, reason: string) => Promise<{ success: boolean }>;
    create: (sale: {
      invoiceNo: string;
      branch_id?: string;
      class_id?: string | null;
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
    }) => Promise<boolean>;
  };
  cashierShifts: {
    getRegisters: (branchId?: string) => Promise<Array<{ id: string; branch_id: string; register_name: string; status: string }>>;
    getActiveShift: (branchId: string, registerId: string) => Promise<any | null>;
    openShift: (payload: { branch_id: string; register_id: string; opening_cash: number; notes?: string }) => Promise<{ success: boolean; shift: any; reused?: boolean }>;
    getShiftSummary: (shiftId: string) => Promise<any>;
    closeShift: (payload: { shift_id: string; counted_cash: number; notes?: string }) => Promise<any>;
    getOpenShifts: () => Promise<any[]>;
  };
  expenses: {
    getAll: () => Promise<Expense[]>;
    create: (expense: Expense & { branch_id?: string; class_id?: string | null }) => Promise<boolean>;
  };
  settings: {
    get: () => Promise<Record<string, string>>;
    update: (key: string, value: string) => Promise<boolean>;
  };
  system: {
    backup: () => Promise<any>;
    getStats: () => Promise<{
      products: number;
      customers: number;
      sales: number;
      expenses: number;
      auditLogs: number;
    }>;
    diagnoseSystem: () => Promise<any>;
    getAppInfo: () => Promise<any>;
    getDiagnostics: () => Promise<any>;
    getDatabaseStatus: () => Promise<any>;
    getLogStatus: () => Promise<any>;
    getEnvironmentInfo: () => Promise<any>;
  };
  purchases: {
    getAll: () => Promise<Purchase[]>;
    getById: (id: string) => Promise<Purchase>;
    create: (purchase: Partial<Purchase> & { items: Array<{ product_id: string; quantity: number; unit_cost: number; line_total: number }> }) => Promise<{ success: boolean; id?: string }>;
  };
  stockMovements: {
    getByProduct: (productId: string) => Promise<StockMovement[]>;
  };
  supplierPayments: {
    getBySupplier: (supplierId: string) => Promise<SupplierPayment[]>;
    create: (payment: Partial<SupplierPayment>) => Promise<{ success: boolean; id?: string }>;
  };
  accounts: {
    getAll: () => Promise<Account[]>;
    create: (account: Partial<Account>) => Promise<{ success: boolean; id?: string }>;
    update: (account: Partial<Account>) => Promise<boolean>;
    deactivate: (id: string) => Promise<boolean>;
  };
  journals: {
    getAll: () => Promise<JournalEntry[]>;
    create: (journal: Partial<Omit<JournalEntry, 'lines'>> & { lines: Array<Pick<JournalEntryLine, 'account_id'> & Partial<JournalEntryLine>> }) => Promise<{ success: boolean; id?: string }>;
  };
  quotes: {
    getAll: () => Promise<Quote[]>;
    getById: (id: string) => Promise<Quote>;
    create: (payload: unknown) => Promise<{ success: boolean; id?: string }>;
    update: (payload: unknown) => Promise<boolean>;
    convertToInvoice: (id: string) => Promise<{ success: boolean; id?: string }>;
  };
  invoices: {
    getAll: () => Promise<Invoice[]>;
    getRecent: (filters?: Record<string, unknown>) => Promise<Invoice[]>;
    getById: (id: string) => Promise<Invoice>;
    create: (payload: unknown) => Promise<{ success: boolean; id?: string }>;
    updateDraft: (payload: unknown) => Promise<boolean>;
    finalize: (id: string) => Promise<boolean>;
    void: (id: string) => Promise<boolean>;
  };
  invoicePayments: {
    getByInvoice: (invoiceId: string) => Promise<InvoicePayment[]>;
    create: (payload: unknown) => Promise<{ success: boolean; id?: string }>;
  };
  taxes: {
    getRates: () => Promise<Array<Record<string, unknown>>>;
    createRate: (payload: unknown) => Promise<{ success: boolean; id?: string }>;
    updateRate: (payload: unknown) => Promise<boolean>;
    deactivateRate: (id: string) => Promise<boolean>;
    getSettings: () => Promise<Record<string, string>>;
    updateSetting: (key: string, value: string) => Promise<boolean>;
    calculate: (payload: unknown) => Promise<{ netAmount: number; taxAmount: number; grossAmount: number }>;
    getOutputReport: (dateFrom: string, dateTo: string) => Promise<Array<Record<string, unknown>>>;
    getInputReport: (dateFrom: string, dateTo: string) => Promise<Array<Record<string, unknown>>>;
    getSummaryReport: (dateFrom: string, dateTo: string) => Promise<{ outputTax: number; inputTax: number; netPayable: number }>;
  };
  bankAccounts: {
    getAll: () => Promise<BankAccount[]>;
    create: (payload: Partial<BankAccount>) => Promise<{ success: boolean; id?: string }>;
    update: (payload: Partial<BankAccount>) => Promise<boolean>;
    deactivate: (id: string) => Promise<boolean>;
    getPaymentMethodMappings: () => Promise<PaymentMethodAccount[]>;
    mapPaymentMethod: (paymentMethod: string, accountId: string | null) => Promise<boolean>;
  };
  moneyTransactions: {
    getAll: () => Promise<MoneyTransaction[]>;
    getByAccount: (accountId: string) => Promise<MoneyTransaction[]>;
    createDeposit: (payload: unknown) => Promise<{ success: boolean; id?: string }>;
    createWithdrawal: (payload: unknown) => Promise<{ success: boolean; id?: string }>;
    createTransfer: (payload: unknown) => Promise<{ success: boolean; id?: string }>;
    createBankCharge: (payload: unknown) => Promise<{ success: boolean; id?: string }>;
    createAdjustment: (payload: unknown) => Promise<{ success: boolean; id?: string }>;
    markCleared: (transactionId: string, cleared: boolean) => Promise<boolean>;
  };
  bankReconciliations: {
    getAll: () => Promise<BankReconciliation[]>;
    createWorksheet: (payload: unknown) => Promise<{ success: boolean; id?: string; book_balance: number; difference: number }>;
    getItems: (reconciliationId: string) => Promise<BankReconciliationItem[]>;
    markItemsCleared: (reconciliationId: string, transactionIds: string[]) => Promise<boolean>;
  };
  reports: {
    profitAndLoss: (dateFrom: string, dateTo: string, branchId?: string, classId?: string) => Promise<Record<string, any>>;
    balanceSheet: (dateTo: string, branchId?: string) => Promise<Record<string, any>>;
    cashFlow: (dateFrom: string, dateTo: string) => Promise<Record<string, any>>;
    trialBalance: (dateFrom: string, dateTo: string, branchId?: string, classId?: string) => Promise<Record<string, any>>;
    generalLedger: (dateFrom: string, dateTo: string) => Promise<Array<Record<string, any>>>;
    arAging: (dateTo: string) => Promise<Record<string, any>>;
    apAging: (dateTo: string) => Promise<Record<string, any>>;
    inventoryValuation: () => Promise<Record<string, any>>;
    taxSummary: (dateFrom: string, dateTo: string) => Promise<Record<string, any>>;
    salesByCustomerProduct: (dateFrom: string, dateTo: string) => Promise<Record<string, any>>;
    purchasesBySupplierProduct: (dateFrom: string, dateTo: string) => Promise<Record<string, any>>;
    expenseSummary: (dateFrom: string, dateTo: string) => Promise<Record<string, any>>;
    budgetVsActual: (dateFrom: string, dateTo: string, budgetId?: string, branchId?: string, classId?: string) => Promise<Record<string, any>>;
    classProfitAndLoss: (dateFrom: string, dateTo: string, branchId?: string, classId?: string) => Promise<Record<string, any>>;
    customerBalance: () => Promise<Record<string, any>>;
    customerAging: (asOfDate: string) => Promise<Record<string, any>>;
    paymentCollection: (dateFrom: string, dateTo: string) => Promise<Record<string, any>>;
  };
  budgets: {
    getAll: () => Promise<Budget[]>;
    getById: (id: string) => Promise<Budget>;
    create: (payload: Partial<Budget>) => Promise<{ success: boolean; id?: string }>;
    update: (payload: Partial<Budget>) => Promise<boolean>;
    deactivate: (id: string) => Promise<boolean>;
  };
  recurring: {
    getTemplates: () => Promise<RecurringTemplate[]>;
    getTemplateById: (id: string) => Promise<RecurringTemplate>;
    createTemplate: (payload: Partial<RecurringTemplate>) => Promise<{ success: boolean; id?: string }>;
    updateTemplate: (payload: Partial<RecurringTemplate>) => Promise<boolean>;
    deactivateTemplate: (id: string) => Promise<boolean>;
    getRuns: (templateId?: string) => Promise<RecurringRun[]>;
    runDue: (runDate?: string) => Promise<Record<string, any>>;
  };
  automation: {
    getRules: () => Promise<Record<string, string>>;
    updateRules: (settings: Record<string, string>) => Promise<Record<string, string>>;
  };
  employees: {
    getAll: () => Promise<Employee[]>;
    create: (payload: Partial<Employee>) => Promise<{ success: boolean; id?: string }>;
    update: (payload: Partial<Employee>) => Promise<boolean>;
    deactivate: (id: string) => Promise<boolean>;
  };
  timesheets: {
    getAll: (filters?: Record<string, unknown>) => Promise<Timesheet[]>;
    clockIn: (payload: Partial<Timesheet>) => Promise<{ success: boolean; id?: string }>;
    clockOut: (id: string, payload?: Partial<Timesheet>) => Promise<boolean>;
    createManual: (payload: Partial<Timesheet>) => Promise<{ success: boolean; id?: string }>;
    approve: (id: string) => Promise<boolean>;
    summary: (filters?: Record<string, unknown>) => Promise<Record<string, any>>;
  };
  currencies: {
    getAll: () => Promise<Currency[]>;
    getBase: () => Promise<Currency>;
    create: (payload: Partial<Currency>) => Promise<{ success: boolean; code?: string }>;
    update: (payload: Partial<Currency>) => Promise<boolean>;
    deactivate: (code: string) => Promise<boolean>;
  };
  exchangeRates: {
    getAll: () => Promise<ExchangeRate[]>;
    create: (payload: Partial<ExchangeRate>) => Promise<{ success: boolean; id?: string }>;
    update: (payload: Partial<ExchangeRate>) => Promise<boolean>;
    convert: (amount: number, fromCurrency: string, toCurrency?: string, effectiveDate?: string) => Promise<Record<string, any>>;
    gainLossFoundation: (originalAmount: number, bookingRate: number, settlementRate: number) => Promise<Record<string, any>>;
  };
  branchInventory: {
    getAll: (branchId?: string) => Promise<BranchInventory[]>;
    upsert: (payload: Partial<BranchInventory>) => Promise<boolean>;
    lowStock: (branchId?: string) => Promise<BranchInventory[]>;
    valuation: (branchId?: string) => Promise<Record<string, any>>;
  };
  stockTransfers: {
    getAll: () => Promise<StockTransfer[]>;
    create: (payload: Partial<StockTransfer>) => Promise<{ success: boolean; id?: string }>;
    approve: (id: string) => Promise<boolean>;
    complete: (id: string) => Promise<boolean>;
    reject: (id: string) => Promise<boolean>;
  };
  inventoryAdjustments: {
    getAll: () => Promise<InventoryAdjustment[]>;
    create: (payload: Partial<InventoryAdjustment>) => Promise<{ success: boolean; id?: string }>;
    accountingFoundation: (adjustmentId: string) => Promise<Record<string, any>>;
  };
  users: {
    getAll: () => Promise<User[]>;
    create: (payload: unknown) => Promise<{ success: boolean; id?: string }>;
    update: (payload: unknown) => Promise<boolean>;
    deactivate: (id: string) => Promise<boolean>;
    resetPassword: (id: string, password: string) => Promise<boolean>;
  };
  roles: {
    getAll: () => Promise<Array<Record<string, any>>>;
    getPermissions: () => Promise<Array<Record<string, any>>>;
    create: (payload: unknown) => Promise<{ success: boolean; id?: string }>;
    update: (payload: unknown) => Promise<boolean>;
  };
  backup: {
    create: () => Promise<Record<string, any>>;
    list: () => Promise<Array<Record<string, any>>>;
    restore: (filePath: string) => Promise<Record<string, any>>;
    validate: (filePath: string) => Promise<Record<string, any>>;
    integrityCheck: () => Promise<Record<string, any>>;
    getSettings: () => Promise<Record<string, string>>;
    updateSettings: (settings: Record<string, string>) => Promise<Record<string, string>>;
  };
  branches: {
    getAll: () => Promise<Branch[]>;
    getAccessible: () => Promise<Branch[]>;
    create: (payload: Partial<Branch>) => Promise<{ success: boolean; id?: string }>;
    update: (payload: Partial<Branch>) => Promise<boolean>;
    deactivate: (id: string) => Promise<boolean>;
    setDefault: (id: string) => Promise<boolean>;
    assignUserBranches: (userId: string, branchIds: string[], defaultBranchId?: string) => Promise<boolean>;
  };
  classes: {
    getAll: () => Promise<ClassTracking[]>;
    create: (payload: Partial<ClassTracking>) => Promise<{ success: boolean; id?: string }>;
    update: (payload: Partial<ClassTracking>) => Promise<boolean>;
    deactivate: (id: string) => Promise<boolean>;
  };
  datasync: {
    downloadTemplate: (entityType: string, format: 'csv' | 'xlsx') => Promise<{ success: boolean; filePath?: string; reason?: string }>;
    chooseImportFile: () => Promise<string | null>;
    previewImport: (filePath: string, entityType: string) => Promise<{ success: boolean; result?: any; reason?: string }>;
    commitImport: (jobId: string, previewRows: any[], atomic: boolean) => Promise<{ success: boolean; result?: any; reason?: string }>;
    exportData: (entityType: string, format: 'csv' | 'xlsx') => Promise<{ success: boolean; jobId?: string; filePath?: string; reason?: string }>;
    getImportJobs: () => Promise<any[]>;
    getExportJobs: () => Promise<any[]>;
    getJobErrors: (jobId: string) => Promise<any[]>;
  };
  returns: {
    getSalesHistory: () => Promise<any[]>;
    getSalesReturnById: (id: string) => Promise<any>;
    getSalesReturnsBySale: (invoiceNo: string) => Promise<any[]>;
    createSalesReturn: (payload: any) => Promise<{ success: boolean; returnId?: string; error?: string }>;
    getPurchaseHistory: () => Promise<any[]>;
    getPurchaseReturnById: (id: string) => Promise<any>;
    getPurchaseReturnsByPurchase: (purchaseId: string) => Promise<any[]>;
    createPurchaseReturn: (payload: any) => Promise<{ success: boolean; returnId?: string; error?: string }>;
  };
  receipts: {
    print: (sale: any, isDuplicate?: boolean) => Promise<{ success: boolean; printedOffline?: boolean }>;
    printReturn: (salesReturn: any, isDuplicate?: boolean) => Promise<{ success: boolean; printedOffline?: boolean }>;
    previewReturn: (salesReturn: any, isDuplicate?: boolean) => Promise<string>;
    preview: (sale: any, isDuplicate?: boolean) => Promise<string>;
    fromSale: (invoiceNo: string) => Promise<any>;
    duplicateFromSale: (invoiceNo: string) => Promise<any>;
    getSettings: () => Promise<{
      paperSize: string;
      showLogo: boolean;
      footerMessage: string;
      printerName: string;
      autoPrint: boolean;
      duplicatePrint: boolean;
      fontSize: string;
    }>;
    updateSettings: (settings: any) => Promise<{ success: boolean }>;
    printKhataPayment: (payment: any, isDuplicate?: boolean) => Promise<{ success: boolean; printedOffline?: boolean }>;
    previewKhataPayment: (payment: any, isDuplicate?: boolean) => Promise<string>;
  };
  khata: {
    getCustomers: () => Promise<any[]>;
    getStatement: (customerName: string) => Promise<any>;
    getOverdue: (asOfDate: string) => Promise<any[]>;
    getReminders: (asOfDate: string) => Promise<any[]>;
    recordPayment: (payload: any) => Promise<{ success: boolean; id?: string; new_balance?: number }>;
    createAdjustment: (payload: any) => Promise<{ success: boolean; id?: string; new_balance?: number }>;
  };
  discounts: {
    getAll: () => Promise<any[]>;
    create: (discount: any) => Promise<{ success: boolean; id?: string }>;
    update: (discount: any) => Promise<boolean>;
    deactivate: (id: string) => Promise<boolean>;
    getActiveDiscounts: (dateStr?: string) => Promise<any[]>;
  };
  priceRules: {
    getAll: () => Promise<any[]>;
    create: (rule: any) => Promise<{ success: boolean; id?: string }>;
    update: (rule: any) => Promise<boolean>;
    deactivate: (id: string) => Promise<boolean>;
    getActiveRules: (dateStr?: string) => Promise<any[]>;
    getPromotionHistory: () => Promise<any[]>;
    calculateLineDiscounts: (items: any[], context?: any) => Promise<any[]>;
    calculateInvoiceDiscount: (subtotal: number, discountType: 'fixed' | 'percentage', discountValue: number) => Promise<number>;
  };
  notifications: {
    getAll: (tab?: string) => Promise<NotificationItem[]>;
    getUnreadCount: () => Promise<number>;
    markRead: (id: string) => Promise<boolean>;
    markAllRead: () => Promise<number>;
    dismiss: (id: string) => Promise<boolean>;
    scan: (runDate?: string) => Promise<{ success: boolean; generated: number }>;
  };
  notificationRules: {
    getRules: () => Promise<Record<string, string>>;
    updateRules: (settings: Record<string, string>) => Promise<Record<string, string>>;
  };
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}
export {};
