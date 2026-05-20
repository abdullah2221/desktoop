import type { Account, Brand, Category, Expense, Invoice, InvoicePayment, JournalEntry, Product, Purchase, Quote, Supplier, SupplierPayment, Unit } from './shared/types';

export interface IElectronAPI {
  getAppVersion: () => Promise<string>;
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
}

declare global {
  interface Window {
    api: IElectronAPI;
  }
}
export {};
