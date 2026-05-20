"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose safe APIs to the renderer process
electron_1.contextBridge.exposeInMainWorld('api', {
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    // SECURE SQLITE DATABASE APIS
    products: {
        getAll: () => electron_1.ipcRenderer.invoke('products:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('products:getById', id),
        getLowStock: () => electron_1.ipcRenderer.invoke('products:getLowStock'),
        create: (product) => electron_1.ipcRenderer.invoke('products:create', product),
        update: (product) => electron_1.ipcRenderer.invoke('products:update', product),
        deactivate: (id) => electron_1.ipcRenderer.invoke('products:deactivate', id),
        updateStock: (id, newStock) => electron_1.ipcRenderer.invoke('products:updateStock', id, newStock),
    },
    categories: {
        getAll: () => electron_1.ipcRenderer.invoke('categories:getAll'),
        create: (category) => electron_1.ipcRenderer.invoke('categories:create', category),
        update: (category) => electron_1.ipcRenderer.invoke('categories:update', category),
        deactivate: (id) => electron_1.ipcRenderer.invoke('categories:deactivate', id),
    },
    units: {
        getAll: () => electron_1.ipcRenderer.invoke('units:getAll'),
        create: (unit) => electron_1.ipcRenderer.invoke('units:create', unit),
        update: (unit) => electron_1.ipcRenderer.invoke('units:update', unit),
        deactivate: (id) => electron_1.ipcRenderer.invoke('units:deactivate', id),
    },
    brands: {
        getAll: () => electron_1.ipcRenderer.invoke('brands:getAll'),
        create: (brand) => electron_1.ipcRenderer.invoke('brands:create', brand),
        update: (brand) => electron_1.ipcRenderer.invoke('brands:update', brand),
        deactivate: (id) => electron_1.ipcRenderer.invoke('brands:deactivate', id),
    },
    suppliers: {
        getAll: () => electron_1.ipcRenderer.invoke('suppliers:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('suppliers:getById', id),
        create: (supplier) => electron_1.ipcRenderer.invoke('suppliers:create', supplier),
        update: (supplier) => electron_1.ipcRenderer.invoke('suppliers:update', supplier),
        deactivate: (id) => electron_1.ipcRenderer.invoke('suppliers:deactivate', id),
        getLedger: (id) => electron_1.ipcRenderer.invoke('suppliers:getLedger', id),
    },
    customers: {
        getAll: () => electron_1.ipcRenderer.invoke('customers:getAll'),
        createOrIncrementCredit: (name, creditChange, purchasesChange, date) => electron_1.ipcRenderer.invoke('customers:createOrIncrementCredit', name, creditChange, purchasesChange, date),
        receivePayment: (name, payAmt, date) => electron_1.ipcRenderer.invoke('customers:receivePayment', name, payAmt, date),
    },
    sales: {
        getAll: () => electron_1.ipcRenderer.invoke('sales:getAll'),
        create: (sale) => electron_1.ipcRenderer.invoke('sales:create', sale),
    },
    expenses: {
        getAll: () => electron_1.ipcRenderer.invoke('expenses:getAll'),
        create: (expense) => electron_1.ipcRenderer.invoke('expenses:create', expense),
    },
    settings: {
        get: () => electron_1.ipcRenderer.invoke('settings:get'),
        update: (key, value) => electron_1.ipcRenderer.invoke('settings:update', key, value),
    },
    system: {
        backup: () => electron_1.ipcRenderer.invoke('system:backup'),
        getStats: () => electron_1.ipcRenderer.invoke('system:getStats'),
    },
    purchases: {
        getAll: () => electron_1.ipcRenderer.invoke('purchases:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('purchases:getById', id),
        create: (purchase) => electron_1.ipcRenderer.invoke('purchases:create', purchase),
    },
    stockMovements: {
        getByProduct: (productId) => electron_1.ipcRenderer.invoke('stockMovements:getByProduct', productId),
    },
    supplierPayments: {
        getBySupplier: (supplierId) => electron_1.ipcRenderer.invoke('supplierPayments:getBySupplier', supplierId),
        create: (payment) => electron_1.ipcRenderer.invoke('supplierPayments:create', payment),
    },
    accounts: {
        getAll: () => electron_1.ipcRenderer.invoke('accounts:getAll'),
        create: (account) => electron_1.ipcRenderer.invoke('accounts:create', account),
        update: (account) => electron_1.ipcRenderer.invoke('accounts:update', account),
        deactivate: (id) => electron_1.ipcRenderer.invoke('accounts:deactivate', id),
    },
    journals: {
        getAll: () => electron_1.ipcRenderer.invoke('journals:getAll'),
        create: (journal) => electron_1.ipcRenderer.invoke('journals:create', journal),
    },
    quotes: {
        getAll: () => electron_1.ipcRenderer.invoke('quotes:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('quotes:getById', id),
        create: (payload) => electron_1.ipcRenderer.invoke('quotes:create', payload),
        update: (payload) => electron_1.ipcRenderer.invoke('quotes:update', payload),
        convertToInvoice: (id) => electron_1.ipcRenderer.invoke('quotes:convertToInvoice', id),
    },
    invoices: {
        getAll: () => electron_1.ipcRenderer.invoke('invoices:getAll'),
        getById: (id) => electron_1.ipcRenderer.invoke('invoices:getById', id),
        create: (payload) => electron_1.ipcRenderer.invoke('invoices:create', payload),
        updateDraft: (payload) => electron_1.ipcRenderer.invoke('invoices:updateDraft', payload),
        finalize: (id) => electron_1.ipcRenderer.invoke('invoices:finalize', id),
        void: (id) => electron_1.ipcRenderer.invoke('invoices:void', id),
    },
    invoicePayments: {
        getByInvoice: (invoiceId) => electron_1.ipcRenderer.invoke('invoicePayments:getByInvoice', invoiceId),
        create: (payload) => electron_1.ipcRenderer.invoke('invoicePayments:create', payload),
    },
    taxes: {
        getRates: () => electron_1.ipcRenderer.invoke('taxes:getRates'),
        createRate: (payload) => electron_1.ipcRenderer.invoke('taxes:createRate', payload),
        updateRate: (payload) => electron_1.ipcRenderer.invoke('taxes:updateRate', payload),
        deactivateRate: (id) => electron_1.ipcRenderer.invoke('taxes:deactivateRate', id),
        getSettings: () => electron_1.ipcRenderer.invoke('taxes:getSettings'),
        updateSetting: (key, value) => electron_1.ipcRenderer.invoke('taxes:updateSetting', key, value),
        calculate: (payload) => electron_1.ipcRenderer.invoke('taxes:calculate', payload),
        getOutputReport: (dateFrom, dateTo) => electron_1.ipcRenderer.invoke('taxes:getOutputReport', dateFrom, dateTo),
        getInputReport: (dateFrom, dateTo) => electron_1.ipcRenderer.invoke('taxes:getInputReport', dateFrom, dateTo),
        getSummaryReport: (dateFrom, dateTo) => electron_1.ipcRenderer.invoke('taxes:getSummaryReport', dateFrom, dateTo),
    }
});
