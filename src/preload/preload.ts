import { contextBridge, ipcRenderer } from 'electron';
import type { Account, Brand, Category, Expense, JournalEntry, Product, Purchase, Supplier, SupplierPayment, Unit } from '../renderer/shared/types';

// Expose safe APIs to the renderer process
contextBridge.exposeInMainWorld('api', {
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
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
  }
});
