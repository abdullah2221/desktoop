import type { Account, BankAccount, BankReconciliation, BankReconciliationItem, Branch, Brand, Category, ClassTracking, Expense, Invoice, InvoicePayment, JournalEntry, MoneyTransaction, PaymentMethodAccount, Product, Purchase, Quote, Supplier, SupplierPayment, Unit, User } from './shared/types';

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
    createOrIncrementCredit: (name: string, creditChange: number, purchasesChange: number, date: string) => Promise<boolean>;
    receivePayment: (name: string, payAmt: number, date: string) => Promise<boolean>;
  };
  sales: {
    getAll: () => Promise<Array<{ invoiceNo: string; customerName: string; date: string; total: number; status: 'Paid' | 'Credit' }>>;
    create: (sale: {
      invoiceNo: string;
      customerName: string;
      date: string;
      total: number;
      status: 'Paid' | 'Credit';
      discount: number;
      tax_rate: number;
      items: Array<{ product_id: string; quantity: number; price: number }>;
    }) => Promise<boolean>;
  };
  expenses: {
    getAll: () => Promise<Expense[]>;
    create: (expense: Expense) => Promise<boolean>;
  };
  settings: {
    get: () => Promise<Record<string, string>>;
    update: (key: string, value: string) => Promise<boolean>;
  };
  system: {
    backup: () => Promise<string>;
    getStats: () => Promise<{
      products: number;
      customers: number;
      sales: number;
      expenses: number;
      auditLogs: number;
    }>;
  };
  purchases: {
    getAll: () => Promise<Purchase[]>;
    getById: (id: string) => Promise<Purchase>;
    create: (purchase: Partial<Purchase> & { items: Array<{ product_id: string; quantity: number; unit_cost: number; line_total: number }> }) => Promise<{ success: boolean; id?: string }>;
  };
  stockMovements: {
    getByProduct: (productId: string) => Promise<Array<Record<string, unknown>>>;
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
    create: (journal: Partial<JournalEntry> & { lines: Array<Record<string, unknown>> }) => Promise<{ success: boolean; id?: string }>;
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
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}
export {};
