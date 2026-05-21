import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, Sale, Expense, Customer, User, Supplier, Category, Unit, Brand, Purchase, StockMovement, SupplierPayment, CreatePurchaseInput } from '../../shared/types';

interface ErpContextType {
  // State
  products: Product[];
  sales: Sale[];
  expenses: Expense[];
  customers: Customer[];
  suppliers: Supplier[];
  categories: Category[];
  units: Unit[];
  brands: Brand[];
  purchases: Purchase[];
  cart: CartItem[];
  posCustomerName: string;
  posDiscount: number;
  posTaxRate: number;
  paymentType: 'Paid' | 'Credit';
  checkoutNotification: string | null;
  appNotification: { type: 'success' | 'error'; message: string } | null;
  storeName: string;
  storePhone: string;
  storeAddress: string;
  storeNTN: string;
  appVersion: string;
  activeTab: string;
  activeUser: User | null;
  isAuthenticated: boolean;
  authLoading: boolean;
  
  // Actions
  setActiveTab: (tab: string) => void;
  setPosCustomerName: (name: string) => void;
  setPosDiscount: (discount: number) => void;
  setPosTaxRate: (rate: number) => void;
  setPaymentType: (type: 'Paid' | 'Credit') => void;
  setStoreName: (name: string) => void;
  setStorePhone: (phone: string) => void;
  setStoreAddress: (address: string) => void;
  setStoreNTN: (ntn: string) => void;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
  refreshActiveUser: () => Promise<User | null>;
  
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateCartQty: (productId: string, quantity: number) => void;
  handleCheckout: (e?: React.FormEvent) => void;
  addProduct: (product: Partial<Product>) => Promise<{ success: boolean; message?: string }>;
  updateProduct: (product: Partial<Product>) => Promise<{ success: boolean; message?: string }>;
  deactivateProduct: (id: string) => Promise<boolean>;
  addExpense: (category: string, paidTo: string, amount: number) => boolean;
  receivePayment: (customerName: string, amount: number) => boolean;
  reloadSuppliers: () => Promise<void>;
  reloadProducts: () => Promise<void>;
  reloadCategories: () => Promise<void>;
  reloadUnits: () => Promise<void>;
  reloadBrands: () => Promise<void>;
  addCategory: (category: Partial<Category>) => Promise<boolean>;
  addUnit: (unit: Partial<Unit>) => Promise<boolean>;
  addBrand: (brand: Partial<Brand>) => Promise<boolean>;
  reloadPurchases: () => Promise<void>;
  createPurchase: (payload: CreatePurchaseInput) => Promise<{ success: boolean; id?: string }>;
  getStockMovementsByProduct: (productId: string) => Promise<StockMovement[]>;
  createSupplierPayment: (payload: Partial<SupplierPayment>) => Promise<{ success: boolean; id?: string }>;
}

const ErpContext = createContext<ErpContextType | undefined>(undefined);

export const ErpProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appVersion, setAppVersion] = useState<string>('Loading...');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // DATABASE-BACKED APP STATE
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  // DEFAULT SETTINGS STATES
  const [storeName, setStoreNameState] = useState('Al-Haram Grocery & General Store');
  const [storePhone, setStorePhoneState] = useState('042-35889900');
  const [storeAddress, setStoreAddressState] = useState('Main Bazaar, DHA Phase 3, Lahore, Pakistan');
  const [storeNTN, setStoreNTNState] = useState('NTN-5938472-8');

  // INTERACTIVE POS CHECKOUT STATE
  const [cart, setCart] = useState<CartItem[]>([]);
  const [posCustomerName, setPosCustomerName] = useState<string>('Arsalan Khan');
  const [posDiscount, setPosDiscount] = useState<number>(0);
  const [posTaxRate, setPosTaxRate] = useState<number>(0);
  const [paymentType, setPaymentType] = useState<'Paid' | 'Credit'>('Paid');
  const [checkoutNotification, setCheckoutNotification] = useState<string | null>(null);
  const [appNotification, setAppNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const notify = (type: 'success' | 'error' | 'info', message: string) => {
    setAppNotification({ type, message });
    setTimeout(() => setAppNotification(null), 4000);
  };

  const hasPermission = (permission: string) => {
    return Boolean(activeUser?.permissions?.includes(permission) || activeUser?.permissions?.includes('ENTERPRISE_FULL'));
  };

  const refreshActiveUser = async () => {
    const user = await window.api.auth.getCurrentUser();
    if (user) {
      setActiveUser(user);
      return user;
    }
    localStorage.removeItem('erp_session_token');
    window.api.auth.setSessionToken(null);
    setActiveUser(null);
    return null;
  };

  const login = async (username: string, password: string) => {
    try {
      const result = await window.api.auth.login(username, password);
      localStorage.setItem('erp_session_token', result.token);
      setActiveUser(result.user);
      setActiveTab('dashboard');
      await reloadData();
      return true;
    } catch (err: any) {
      notify('error', err.message || 'Login failed.');
      return false;
    }
  };

  const logout = async () => {
    try {
      await window.api.auth.logout();
    } finally {
      localStorage.removeItem('erp_session_token');
      window.api.auth.setSessionToken(null);
      setActiveUser(null);
      setActiveTab('dashboard');
    }
  };

  // Helper function to reload all database entities in sync
  const reloadData = async () => {
    try {
      if (window.api) {
        const [dbProducts, dbSales, dbExpenses, dbCustomers, dbSuppliers, dbCategories, dbUnits, dbBrands, dbPurchases, dbSettings] = await Promise.all([
          window.api.products.getAll(),
          window.api.sales.getAll(),
          window.api.expenses.getAll(),
          window.api.customers.getAll(),
          window.api.suppliers.getAll(),
          window.api.categories.getAll(),
          window.api.units.getAll(),
          window.api.brands.getAll(),
          window.api.purchases ? window.api.purchases.getAll() : Promise.resolve([]),
          window.api.settings.get()
        ]);
        
        setProducts(dbProducts);
        setSales(dbSales);
        setExpenses(dbExpenses);
        setCustomers(dbCustomers);
        setSuppliers(dbSuppliers);
        setCategories(dbCategories);
        setUnits(dbUnits);
        setBrands(dbBrands);
        setPurchases(dbPurchases);

        if (dbSettings.storeName) setStoreNameState(dbSettings.storeName);
        if (dbSettings.storePhone) setStorePhoneState(dbSettings.storePhone);
        if (dbSettings.storeAddress) setStoreAddressState(dbSettings.storeAddress);
        if (dbSettings.storeNTN) setStoreNTNState(dbSettings.storeNTN);
      }
    } catch (err) {
      console.error('[ErpContext] Failed to reload database entities:', err);
    }
  };

  // APP INITIALIZATION & RECOVERY EFFECTS
  useEffect(() => {
    // 1. Fetch App Version
    if (window.api && window.api.getAppVersion) {
      window.api.getAppVersion()
        .then((version) => setAppVersion(version))
        .catch(() => setAppVersion('Unavailable'));
    } else {
      setAppVersion('Web Mode (Bridge Missing)');
    }

    const restoreSession = async () => {
      try {
        const token = localStorage.getItem('erp_session_token');
      if (token) {
        window.api.auth.setSessionToken(token);
          const user = await window.api.auth.getCurrentUser();
          if (user) {
            setActiveUser(user);
          } else {
            localStorage.removeItem('erp_session_token');
            window.api.auth.setSessionToken(null);
          }
        }
      } finally {
        setAuthLoading(false);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (activeUser) reloadData();
  }, [activeUser?.id]);

  // PERSISTENT SETTINGS MUTATORS
  const setStoreName = (name: string) => {
    setStoreNameState(name);
    if (window.api) window.api.settings.update('storeName', name).catch(console.error);
  };

  const setStorePhone = (phone: string) => {
    setStorePhoneState(phone);
    if (window.api) window.api.settings.update('storePhone', phone).catch(console.error);
  };

  const setStoreAddress = (address: string) => {
    setStoreAddressState(address);
    if (window.api) window.api.settings.update('storeAddress', address).catch(console.error);
  };

  const setStoreNTN = (ntn: string) => {
    setStoreNTNState(ntn);
    if (window.api) window.api.settings.update('storeNTN', ntn).catch(console.error);
  };

  // CART STATE OPERATORS
  const addToCart = (product: Product) => {
    const existingIndex = cart.findIndex(item => item.product.id === product.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { product, quantity: 1 }]);
    }
  };

  const updateCartQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter(item => item.product.id !== productId));
    } else {
      setCart(cart.map(item => item.product.id === productId ? { ...item, quantity: qty } : item));
    }
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
  };

  // PERSISTENT POS TRANSACTION WRITER
  const handleCheckout = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cart.length === 0 || !window.api) return;

    try {
      const subtotal = cart.reduce((sum, item) => sum + ((item.product.sale_price ?? 0) * item.quantity), 0);
      const discountAmount = posDiscount;
      const taxAmount = Math.round((subtotal - discountAmount) * (posTaxRate / 100));
      const grandTotal = subtotal - discountAmount + taxAmount;

      const newInvoiceNo = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
      const currentDate = new Date().toISOString().split('T')[0];

      // 1. Log Transaction Sale to database
      await window.api.sales.create({
        invoiceNo: newInvoiceNo,
        customerName: posCustomerName,
        date: currentDate,
        total: grandTotal,
        status: paymentType,
        discount: discountAmount,
        tax_rate: posTaxRate,
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.sale_price ?? 0
        }))
      });

      // 2. Increment customer credit line (Udhaar) or purchases totals
      const creditIncrement = paymentType === 'Credit' ? grandTotal : 0;
      await window.api.customers.createOrIncrementCredit(
        posCustomerName,
        creditIncrement,
        grandTotal,
        currentDate
      );

      // 3. Reload local memory state from database
      await reloadData();

      // Reset POS cart parameters
      setCart([]);
      setPosDiscount(0);
      setPosCustomerName(customers[0]?.name || 'Arsalan Khan');

      setCheckoutNotification(`Success! ${newInvoiceNo} generated. Total: Rs. ${grandTotal.toLocaleString()}`);
      setTimeout(() => setCheckoutNotification(null), 5000);
    } catch (err) {
      console.error('[ErpContext] POS Checkout transaction failed:', err);
      notify('error', 'Checkout failed. Please verify stock and try again.');
    }
  };

  const addProduct = async (prod: Partial<Product>): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await window.api.products.create(prod);
      if (res.success) {
        await reloadProducts();
        return { success: true };
      }
      return { success: false, message: 'Failed to create product' };
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('UNIQUE constraint failed')) {
        return { success: false, message: 'SKU or Barcode already exists.' };
      }
      return { success: false, message: err.message || 'Database error occurred' };
    }
  };

  const updateProduct = async (prod: Partial<Product>): Promise<{ success: boolean; message?: string }> => {
    try {
      await window.api.products.update(prod);
      await reloadProducts();
      return { success: true };
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('UNIQUE constraint failed')) {
        return { success: false, message: 'SKU or Barcode already exists.' };
      }
      return { success: false, message: err.message || 'Database error occurred' };
    }
  };

  const deactivateProduct = async (id: string) => {
    try {
      await window.api.products.deactivate(id);
      await reloadProducts();
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  // EXPENSE JOURNAL PERSISTENT MUTATOR
  const addExpense = (category: string, paidTo: string, amount: number) => {
    if (!paidTo || amount <= 0 || !window.api) return false;

    const newExp = {
      id: `EXP-${Math.floor(100 + Math.random() * 900)}`,
      date: new Date().toISOString().split('T')[0],
      category,
      amount,
      paidTo,
      status: 'Paid'
    };

    window.api.expenses.create(newExp)
      .then(() => {
        reloadData();
        notify('success', 'Expense logged successfully.');
      })
      .catch(console.error);

    return true;
  };

  // UDHAAR CREDIT RECEIPT JOURNAL PERSISTENT MUTATOR
  const receivePayment = (customerName: string, amount: number) => {
    if (amount <= 0 || !window.api) return false;

    const currentDate = new Date().toISOString().split('T')[0];
    
    window.api.customers.receivePayment(customerName, amount, currentDate)
      .then(() => {
        reloadData();
        notify('success', `Payment received from ${customerName}.`);
      })
      .catch(console.error);

    return true;
  };

  const reloadSuppliers = async () => {
    try {
      if (window.api) {
        const dbSuppliers = await window.api.suppliers.getAll();
        setSuppliers(dbSuppliers);
      }
    } catch (err) {
      console.error('[ErpContext] Failed to load suppliers:', err);
    }
  };

  const reloadProducts = async () => {
    if (window.api) {
      const p = await window.api.products.getAll();
      setProducts(p);
    }
  };

  const reloadCategories = async () => {
    if (window.api) {
      const c = await window.api.categories.getAll();
      setCategories(c);
    }
  };

  const reloadUnits = async () => {
    if (window.api) {
      const u = await window.api.units.getAll();
      setUnits(u);
    }
  };

  const reloadBrands = async () => {
    if (window.api) {
      const b = await window.api.brands.getAll();
      setBrands(b);
    }
  };

  const addCategory = async (cat: Partial<Category>) => {
    if (!window.api) return false;
    const res = await window.api.categories.create(cat);
    if (res.success) await reloadCategories();
    return res.success;
  };

  const addUnit = async (unit: Partial<Unit>) => {
    if (!window.api) return false;
    const res = await window.api.units.create(unit);
    if (res.success) await reloadUnits();
    return res.success;
  };

  const addBrand = async (brand: Partial<Brand>) => {
    if (!window.api) return false;
    const res = await window.api.brands.create(brand);
    if (res.success) await reloadBrands();
    return res.success;
  };

  const reloadPurchases = async () => {
    if (window.api && window.api.purchases) {
      const p = await window.api.purchases.getAll();
      setPurchases(p);
    }
  };

  const createPurchase = async (payload: CreatePurchaseInput) => {
    if (!window.api) return { success: false };
    try {
      const res = await window.api.purchases.create(payload);
      if (res.success) {
        // Full reload of affected entities
        await reloadPurchases();
        await reloadProducts();
        await reloadSuppliers();
      }
      return res;
    } catch (err) {
      console.error(err);
      throw err;
    }
  };

  const getStockMovementsByProduct = async (productId: string) => {
    if (!window.api) return [];
    return window.api.stockMovements.getByProduct(productId);
  };

  const createSupplierPayment = async (payload: Partial<SupplierPayment>) => {
    if (!window.api) return { success: false };
    const res = await window.api.supplierPayments.create(payload);
    if (res.success) {
      await reloadSuppliers();
    }
    return res;
  };

  return (
    <ErpContext.Provider value={{
      products,
      sales,
      expenses,
      customers,
      suppliers,
      categories,
      units,
      brands,
      purchases,
      cart,
      posCustomerName,
      posDiscount,
      posTaxRate,
      paymentType,
      checkoutNotification,
      appNotification,
      storeName,
      storePhone,
      storeAddress,
      storeNTN,
      appVersion,
      activeTab,
      activeUser,
      isAuthenticated: Boolean(activeUser),
      authLoading,
      
      setActiveTab,
      setPosCustomerName,
      setPosDiscount,
      setPosTaxRate,
      setPaymentType,
      setStoreName,
      setStorePhone,
      setStoreAddress,
      setStoreNTN,
      notify,
      login,
      logout,
      hasPermission,
      refreshActiveUser,
      addToCart,
      removeFromCart,
      updateCartQty,
      handleCheckout,
      addProduct,
      updateProduct,
      deactivateProduct,
      addExpense,
      receivePayment,
      reloadSuppliers,
      reloadProducts,
      reloadCategories,
      reloadUnits,
      reloadBrands,
      addCategory,
      addUnit,
      addBrand,
      reloadPurchases,
      createPurchase,
      getStockMovementsByProduct,
      createSupplierPayment
    }}>
      {children}
    </ErpContext.Provider>
  );
};

export const useErp = () => {
  const context = useContext(ErpContext);
  if (context === undefined) {
    throw new Error('useErp must be used within an ErpProvider');
  }
  return context;
};
