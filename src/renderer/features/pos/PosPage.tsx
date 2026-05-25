import React, { useState, useEffect, useRef } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Badge } from '../../shared/ui/Badge';
import { 
  CreditCard, 
  Trash2, 
  Scan, 
  Settings, 
  Printer, 
  FolderPlus, 
  FolderSymlink, 
  AlertTriangle, 
  CheckCircle,
  Eye,
  FileText,
  RotateCcw,
  XCircle,
  Percent,
  Coins
} from 'lucide-react';
import { IconActionButton } from '../../shared/ui/IconActionButton';

interface SuspendedCart {
  id: string;
  name: string;
  items: any[];
  customerName: string;
  discount: number;
  taxRate: number;
  paymentType: 'Paid' | 'Credit';
  timestamp: string;
}

export const PosPage: React.FC = () => {
  const {
    products,
    customers,
    cart,
    setCart,
    posCustomerName,
    posDiscount,
    posTaxRate,
    paymentType,
    addToCart,
    removeFromCart,
    updateCartQty,
    setPosCustomerName,
    setPosDiscount,
    setPosTaxRate,
    setPaymentType,
    notify,
    hasPermission,
    activeUser,
    activeBranch,
    setActiveTab
  } = useErp();

  // local states
  const [activeSubTab, setActiveSubTab] = useState<'cart' | 'settings'>('cart');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [suspendedCarts, setSuspendedCarts] = useState<SuspendedCart[]>([]);
  const [suspendNameInput, setSuspendNameInput] = useState('');
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState('');
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('');
  const [customerList, setCustomerList] = useState(customers);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [recentCashierFilter, setRecentCashierFilter] = useState('');
  const [recentDateFilter, setRecentDateFilter] = useState('');
  const [registers, setRegisters] = useState<Array<{ id: string; register_name: string }>>([]);
  const [registerId, setRegisterId] = useState('REG-B001');
  const [activeShift, setActiveShift] = useState<any | null>(null);
  const [openingCashInput, setOpeningCashInput] = useState(0);
  const [shiftOpenNotes, setShiftOpenNotes] = useState('');
  const [dayEndCountedCash, setDayEndCountedCash] = useState(0);
  const [dayEndNotes, setDayEndNotes] = useState('');
  const [showDayEndModal, setShowDayEndModal] = useState(false);
  const [dayEndSummary, setDayEndSummary] = useState<any | null>(null);
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<'percentage' | 'fixed'>('fixed');
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState(0);
  
  // Checkout & Printing States
  const [checkoutSuccessSale, setCheckoutSuccessSale] = useState<any | null>(null);
  const [receiptHtmlPreview, setReceiptHtmlPreview] = useState<string>('');
  
  // Thermal Printer Settings
  const [receiptSettings, setReceiptSettings] = useState({
    paperSize: '80mm',
    showLogo: true,
    footerMessage: 'Thank you for shopping with us!',
    printerName: '',
    autoPrint: false,
    duplicatePrint: false,
    fontSize: 'normal',
  });

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load printer settings & suspended carts on mount
  useEffect(() => {
    if (window.api && window.api.receipts) {
      window.api.receipts.getSettings().then((settings) => {
        if (settings) {
          setReceiptSettings(settings);
        }
      }).catch(console.error);
    }

    const savedCarts = localStorage.getItem('erp_suspended_carts');
    if (savedCarts) {
      try {
        setSuspendedCarts(JSON.parse(savedCarts));
      } catch (e) {
        console.error('Failed to parse suspended carts:', e);
      }
    }
  }, []);

  const loadRecentSales = async () => {
    try {
      const rows = await window.api.sales.getRecent({
        cashier_id: recentCashierFilter || undefined,
        branch_id: activeBranch?.id || undefined,
        date_from: recentDateFilter || undefined,
        date_to: recentDateFilter || undefined,
        limit: 10
      });
      setRecentSales(rows || []);
    } catch (error) {
      console.error('Failed loading recent sales:', error);
    }
  };

  const resolveLineDiscount = (item: any) => {
    const subtotalLine = (item.product.sale_price ?? 0) * item.quantity;
    const type = item.discount_type || 'fixed';
    const value = Number(item.discount_value || 0);
    if (type === 'percentage') {
      const pct = Math.min(100, Math.max(0, value));
      return Math.min(subtotalLine, (subtotalLine * pct) / 100);
    }
    return Math.min(subtotalLine, Math.max(0, value));
  };

  const setLineDiscount = (productId: string, type: 'percentage' | 'fixed', value: number) => {
    const normalized = Math.max(0, value);
    setCart((prev) => prev.map((item) => (
      item.product.id === productId
        ? {
          ...item,
          discount_type: type,
          discount_value: type === 'percentage' ? Math.min(100, normalized) : normalized
        }
        : item
    )));
  };

  const loadShiftContext = async (nextRegisterId?: string) => {
    if (!activeBranch?.id) return;
    const regs = await window.api.cashierShifts.getRegisters(activeBranch.id);
    setRegisters(regs || []);
    const preferredRegister = nextRegisterId || registerId || regs?.[0]?.id || `REG-${activeBranch.id}`;
    setRegisterId(preferredRegister);
    const found = await window.api.cashierShifts.getActiveShift(activeBranch.id, preferredRegister);
    setActiveShift(found || null);
  };

  useEffect(() => {
    setCustomerList(customers);
  }, [customers]);

  useEffect(() => {
    loadRecentSales();
  }, [recentCashierFilter, recentDateFilter, activeBranch?.id]);

  useEffect(() => {
    loadShiftContext().catch((error) => console.error('Shift context load failed:', error));
  }, [activeBranch?.id, activeUser?.id]);

  // Save suspended carts when updated
  const saveSuspendedCarts = (newCarts: SuspendedCart[]) => {
    setSuspendedCarts(newCarts);
    localStorage.setItem('erp_suspended_carts', JSON.stringify(newCarts));
  };

  // Keep barcode search field focused
  useEffect(() => {
    if (activeSubTab === 'cart' && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [activeSubTab, cart]);

  // Handle global keyboard shortcuts for fast cashier checkout workflow
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Prevent shortcut interference if typing in customer dropdown or search fields
      if (document.activeElement?.tagName === 'SELECT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        barcodeInputRef.current?.focus();
      } else if (e.key === 'F2') {
        e.preventDefault();
        setCart([]);
        notify('info', 'Cart cleared successfully.');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setPaymentType(paymentType === 'Paid' ? 'Credit' : 'Paid');
        notify('info', `Payment status changed to ${paymentType === 'Paid' ? 'Udhaar/Credit' : 'Cash Paid'}`);
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (cart.length > 0) {
          triggerCashierCheckout();
        } else {
          notify('error', 'Cart is empty. Scan barcodes to add items.');
        }
      } else if (e.key === 'F6') {
        e.preventDefault();
        if (cart.length > 0) {
          setShowSuspendModal(true);
        } else {
          notify('error', 'Cannot suspend an empty cart.');
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [cart, paymentType, posCustomerName, posDiscount, posTaxRate, receiptSettings]);

  // Cart calculations
  const grossSubtotal = cart.reduce((sum, item) => sum + ((item.product.sale_price ?? 0) * item.quantity), 0);
  const itemDiscountTotal = cart.reduce((sum, item) => sum + resolveLineDiscount(item), 0);
  const subtotalAfterItems = Math.max(0, grossSubtotal - itemDiscountTotal);
  const invoiceDiscountAmount = invoiceDiscountType === 'percentage'
    ? Math.min(subtotalAfterItems, subtotalAfterItems * (Math.min(100, Math.max(0, invoiceDiscountValue)) / 100))
    : Math.min(subtotalAfterItems, Math.max(0, invoiceDiscountValue));
  const subtotal = Math.max(0, subtotalAfterItems - invoiceDiscountAmount);
  const taxAmount = Math.round(subtotal * (posTaxRate / 100));
  const grandTotal = Math.max(0, subtotal + taxAmount);
  const totalDiscountAmount = itemDiscountTotal + invoiceDiscountAmount;

  // Auto-checkout helper
  const triggerCashierCheckout = async () => {
    try {
      if (!activeShift) {
        notify('error', 'Start your day before creating POS sales.');
        return;
      }
      if (grandTotal < 0) {
        notify('error', 'Discount cannot make total negative.');
        return;
      }
      const newInvoiceNo = `INV-${Math.floor(1000 + Math.random() * 9000)}`;
      const currentDate = new Date().toISOString().split('T')[0];
      const salePayload = {
        invoiceNo: newInvoiceNo,
        customerName: posCustomerName,
        date: currentDate,
        subtotal: grossSubtotal,
        discount: totalDiscountAmount,
        discount_type: invoiceDiscountType,
        discount_value: invoiceDiscountValue,
        discount_amount: totalDiscountAmount,
        tax: taxAmount,
        total: grandTotal,
        total_amount: grandTotal,
        paidAmount: paymentType === 'Paid' ? grandTotal : 0,
        status: paymentType,
        items: cart.map(item => ({
          name: item.product.name,
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.product.sale_price ?? 0,
          discount_type: item.discount_type || 'fixed',
          discount_value: Number(item.discount_value || 0),
          discount_amount: resolveLineDiscount(item),
          line_total: Math.max(0, ((item.product.sale_price ?? 0) * item.quantity) - resolveLineDiscount(item))
        })),
        cashierName: activeUser?.full_name || activeUser?.username || 'System Cashier',
        cashierId: activeUser?.id || '',
        branch_name: activeBranch?.branch_name || activeBranch?.branch_code || '',
        shift_id: activeShift.id,
        register_id: registerId,
        payment_method: paymentType === 'Paid' ? 'Cash' : 'Credit',
        sale_time: new Date().toISOString()
      };

      await window.api.sales.create({
        invoiceNo: salePayload.invoiceNo,
        customerName: salePayload.customerName,
        date: salePayload.date,
        subtotal: salePayload.subtotal,
        total: salePayload.total,
        total_amount: salePayload.total_amount,
        status: salePayload.status,
        discount: salePayload.discount,
        discount_type: salePayload.discount_type,
        discount_value: salePayload.discount_value,
        discount_amount: salePayload.discount_amount,
        tax_rate: posTaxRate,
        customer_id: (isRegisteredCustomer ? posCustomerName : null) as any,
        customer_type: isRegisteredCustomer ? 'REGISTERED' : 'WALK_IN',
        payment_method: salePayload.payment_method,
        cashier_id: activeUser?.id || undefined,
        cashier_name: activeUser?.full_name || activeUser?.username || 'System Cashier',
        branch_id: activeBranch?.id || 'B001',
        branch_name: activeBranch?.branch_name || activeBranch?.branch_code || '',
        shift_id: activeShift.id,
        register_id: registerId,
        sale_time: salePayload.sale_time,
        items: salePayload.items.map((i) => ({
          product_id: i.product_id,
          quantity: i.quantity,
          price: i.price,
          discount_type: i.discount_type,
          discount_value: i.discount_value,
          discount_amount: i.discount_amount,
          line_total: i.line_total
        }))
      });

      if (isRegisteredCustomer) {
        const creditIncrement = paymentType === 'Credit' ? grandTotal : 0;
        await window.api.customers.createOrIncrementCredit(posCustomerName, creditIncrement, grandTotal, currentDate);
      }

      setCart([]);
      setInvoiceDiscountValue(0);
      setPosDiscount(0);
      setPosCustomerName('Walk-in Customer');
      await loadRecentSales();
      await loadShiftContext(registerId);

      // Trigger auto silent print if enabled in setting
      if (window.api && window.api.receipts) {
        if (receiptSettings.autoPrint) {
          window.api.receipts.print(salePayload, false);
          if (receiptSettings.duplicatePrint) {
            window.api.receipts.print(salePayload, true);
          }
          notify('success', 'Sale saved & receipt sent silently to thermal printer.');
        } else {
          // Open receipt details preview dialog
          const html = await window.api.receipts.preview(salePayload, false);
          setReceiptHtmlPreview(html);
          setCheckoutSuccessSale(salePayload);
        }
      }
    } catch (e) {
      console.error('POS Checkout process error:', e);
    }
  };

  // Barcode / SKU scan action handler
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = barcodeInput.trim();
    if (!query) return;

    setIsScanning(true);
    try {
      // 1. Try exact barcode query match
      let matchedProduct = await window.api.products.getByBarcode(query);

      // 2. Try SKU exact search or fuzzy name matches as fallback
      if (!matchedProduct) {
        const fallbackResults = await window.api.products.searchByBarcodeOrSku(query);
        if (fallbackResults && fallbackResults.length > 0) {
          matchedProduct = fallbackResults[0];
        }
      }

      // 3. Try fallback name string match from loaded in-memory product list
      if (!matchedProduct) {
        const nameMatch = products.find(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.sku?.toLowerCase() === query.toLowerCase());
        if (nameMatch) matchedProduct = nameMatch;
      }

      if (matchedProduct) {
        const isOutOfStock = (matchedProduct.stock_quantity ?? 0) === 0;
        if (isOutOfStock) {
          notify('error', `Product ${matchedProduct.name} is OUT OF STOCK.`);
        } else {
          addToCart(matchedProduct);
          notify('success', `Added: ${matchedProduct.name} to billing cart.`);
        }
      } else {
        notify('error', `No product resolved for Barcode/SKU: "${query}"`);
      }
    } catch (err: any) {
      notify('error', 'Barcode lookup database failure.');
      console.error(err);
    } finally {
      setBarcodeInput('');
      setIsScanning(false);
      // Ensure search input remains active
      setTimeout(() => barcodeInputRef.current?.focus(), 50);
    }
  };

  // Suspend Cart routine
  const handleSuspendCart = () => {
    if (cart.length === 0) return;
    const name = suspendNameInput.trim() || `Suspended Cart #${suspendedCarts.length + 1}`;
    const newSuspended: SuspendedCart = {
      id: `SUSP-${Date.now()}`,
      name,
      items: [...cart],
      customerName: posCustomerName,
      discount: posDiscount,
      taxRate: posTaxRate,
      paymentType: paymentType,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    saveSuspendedCarts([...suspendedCarts, newSuspended]);
    setCart([]);
    setSuspendNameInput('');
    setShowSuspendModal(false);
    notify('success', `Cart "${name}" put on hold successfully.`);
  };

  // Resume Suspended Cart
  const handleResumeCart = (suspended: SuspendedCart) => {
    // If active cart has items, warn or auto-suspend them? For simplicity, overwrite
    setCart(suspended.items);
    setPosCustomerName(suspended.customerName);
    setPosDiscount(suspended.discount);
    setInvoiceDiscountType('fixed');
    setInvoiceDiscountValue(suspended.discount || 0);
    setPosTaxRate(suspended.taxRate);
    setPaymentType(suspended.paymentType);
    
    // Remove from suspended sessions
    const nextCarts = suspendedCarts.filter(c => c.id !== suspended.id);
    saveSuspendedCarts(nextCarts);
    notify('success', `Resumed session cart: "${suspended.name}"`);
  };

  // Save updated printer settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (window.api && window.api.receipts) {
      await window.api.receipts.updateSettings(receiptSettings);
      notify('success', 'Thermal printer & receipt configuration saved.');
    }
  };

  // Customer dropdown list options
  const customerOptions = [
    { value: 'Walk-in Customer', label: 'Walk-in Customer (No account)' },
    ...customerList.map(cust => ({
      value: cust.name,
      label: `${cust.name} (Phone: ${cust.phone})`
    }))
  ];

  // Tax rate options
  const taxOptions = [
    { value: 0, label: '0% Tax Exempt' },
    { value: 5, label: '5% Service Tax' },
    { value: 17, label: '17% FBR GST' }
  ];

  // Stock Warnings Check
  const hasLowStockWarnings = cart.some(item => item.quantity >= (item.product.stock_quantity ?? 0));
  const isRegisteredCustomer = posCustomerName !== 'Walk-in Customer' && customerList.some((c) => c.name === posCustomerName && String(c.status || 'active') !== 'inactive');
  const currentCashier = activeUser?.full_name || activeUser?.username || 'System Cashier';
  const currentBranch = activeBranch?.branch_name || activeBranch?.branch_code || 'Main Branch';

  const quickAddCustomer = async () => {
    if (!hasPermission('customers.create')) {
      notify('error', 'You do not have permission to create customers.');
      return;
    }
    const name = quickCustomerName.trim();
    if (!name) {
      notify('error', 'Customer name is required.');
      return;
    }
    const ok = await window.api.customers.create({
      name,
      phone: quickCustomerPhone || '',
      status: 'active',
      credit_limit: 0,
      due_days: 0
    });
    if (!ok) {
      notify('error', 'Failed to add customer from POS.');
      return;
    }
    const refreshed = await window.api.customers.getAll();
    setCustomerList(refreshed as any[]);
    setQuickCustomerName('');
    setQuickCustomerPhone('');
    setPosCustomerName(name);
    notify('success', 'Customer added and selected for this sale.');
  };

  const startDay = async () => {
    if (!activeBranch?.id) return;
    if (!registerId) {
      notify('error', 'Please select register.');
      return;
    }
    const result = await window.api.cashierShifts.openShift({
      branch_id: activeBranch.id,
      register_id: registerId,
      opening_cash: openingCashInput,
      notes: shiftOpenNotes
    });
    setActiveShift(result.shift);
    setShiftOpenNotes('');
    notify('success', result.reused ? 'Existing open shift resumed.' : 'Day started successfully.');
  };

  const openDayEnd = async () => {
    if (!activeShift?.id) return;
    const summary = await window.api.cashierShifts.getShiftSummary(activeShift.id);
    setDayEndSummary(summary);
    setDayEndCountedCash(summary.expected_cash);
    setShowDayEndModal(true);
  };

  const closeDay = async () => {
    if (!activeShift?.id) return;
    const closed = await window.api.cashierShifts.closeShift({
      shift_id: activeShift.id,
      counted_cash: dayEndCountedCash,
      notes: dayEndNotes
    });
    setShowDayEndModal(false);
    setDayEndSummary(null);
    setDayEndNotes('');
    notify('success', `Shift closed (${closed.closing_status}).`);
    await loadShiftContext(registerId);
  };

  return (
    <div className="space-y-6">
      
      {/* Tab Switcher Headers */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-3 bg-white p-4 rounded-[8px] shadow-sm">
        <div className="flex gap-2">
          <Button
            variant={activeSubTab === 'cart' ? 'primary' : 'secondary'}
            onClick={() => setActiveSubTab('cart')}
            className="flex items-center gap-2 text-xs font-bold"
          >
            <Scan className="w-4 h-4" />
            <span>POS Billing Station</span>
          </Button>
          <Button
            variant={activeSubTab === 'settings' ? 'primary' : 'secondary'}
            onClick={() => setActiveSubTab('settings')}
            className="flex items-center gap-2 text-xs font-bold text-slate-700"
          >
            <Settings className="w-4 h-4" />
            <span>Printer & Receipt Settings</span>
          </Button>
        </div>

        {/* Live Active suspended session counter */}
        {suspendedCarts.length > 0 && (
          <div className="flex items-center gap-2 bg-warning-light px-3 py-1.5 rounded-[6px] border border-warning-amber/30 text-warning-amber text-[11px] font-bold">
            <FolderSymlink className="w-3.5 h-3.5" />
            <span>{suspendedCarts.length} Suspended Session Cart(s) Active</span>
          </div>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-[8px] p-3 text-xs flex flex-wrap items-center gap-4 shadow-sm">
        <span><b>Cashier:</b> {currentCashier}</span>
        <span><b>Branch:</b> {currentBranch}</span>
        <span><b>Register:</b> {registerId || '-'}</span>
        <span><b>Shift:</b> {activeShift?.id || '-'}</span>
        <span><b>Opening Cash:</b> Rs. {Number(activeShift?.opening_cash || 0).toLocaleString()}</span>
        <span><b>Opened:</b> {activeShift?.opened_at ? new Date(activeShift.opened_at).toLocaleString() : '-'}</span>
        <Badge variant={activeShift ? 'success' : 'warning'}>{activeShift ? 'Shift Open' : 'Shift Required'}</Badge>
        {activeShift && (
          <Button type="button" variant="secondary" onClick={openDayEnd} className="text-[11px]">Day End</Button>
        )}
      </div>

      {!activeShift && (
        <div className="bg-white border border-warning-amber/30 rounded-[8px] p-4 shadow-sm space-y-3">
          <div className="text-sm font-bold text-warning-amber">Start your day before creating POS sales.</div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Select
              label="Register"
              options={(registers.length ? registers : [{ id: `REG-${activeBranch?.id || 'B001'}`, register_name: 'Main Register' }]).map((r) => ({ value: r.id, label: r.register_name }))}
              value={registerId}
              onChange={(e) => {
                const next = e.target.value;
                setRegisterId(next);
                loadShiftContext(next).catch(console.error);
              }}
            />
            <Input label="Opening Cash" type="number" min="0" value={openingCashInput} onChange={(e) => setOpeningCashInput(Number(e.target.value || 0))} />
            <Input label="Notes" value={shiftOpenNotes} onChange={(e) => setShiftOpenNotes(e.target.value)} />
            <div className="flex items-end">
              <Button type="button" variant="primary" onClick={startDay} fullWidth>Start Day</Button>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'cart' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT SECTION: Billing input & cart lists */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Barcode Fast Scanned Search Header */}
            <div className="bg-white p-4 rounded-[8px] border border-slate-200 shadow-sm">
              <form onSubmit={handleBarcodeSubmit} className="flex gap-3 items-center">
                <div className="relative flex-1">
                  <Scan className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="Fast Scan Barcode / Enter SKU / Search Product... [F1 to Refocus]"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="pl-9 font-mono text-sm border-slate-300 focus:border-primary-blue focus:ring-1 focus:ring-primary-blue/30 placeholder-slate-400 py-2.5"
                    disabled={isScanning}
                  />
                </div>
                <Button 
                  type="submit" 
                  variant="primary" 
                  className="px-5 font-bold text-xs py-2.5 flex items-center gap-1.5 uppercase cursor-pointer"
                  disabled={isScanning}
                >
                  {isScanning ? 'Adding...' : 'Search'}
                </Button>
              </form>
            </div>

            {/* Suspended Hold Carts Quick Toolbar */}
            {suspendedCarts.length > 0 && (
              <div className="bg-slate-50 p-3 rounded-[8px] border border-slate-200 flex flex-wrap gap-2 items-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1">
                  <FolderSymlink className="w-3.5 h-3.5 text-warning-amber" /> Hold Sessions:
                </span>
                {suspendedCarts.map((item) => (
                  <div key={item.id} className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-[6px] pl-2.5 pr-1 py-1 text-xs">
                    <span className="font-semibold text-slate-700">{item.name} ({item.timestamp})</span>
                    <button
                      type="button"
                      onClick={() => handleResumeCart(item)}
                      className="ml-1 px-2 py-0.5 bg-primary-light hover:bg-primary-blue hover:text-white transition-all text-[10px] text-primary-blue font-bold rounded-[4px] cursor-pointer"
                    >
                      Resume
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = suspendedCarts.filter(c => c.id !== item.id);
                        saveSuspendedCarts(next);
                        notify('info', 'Suspended session deleted.');
                      }}
                      className="text-slate-400 hover:text-danger-red p-0.5 rounded cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Low-Stock alert bar warning */}
            {hasLowStockWarnings && (
              <div className="bg-danger-light border border-danger-red/20 text-danger-red p-3.5 rounded-[8px] flex items-center gap-3 text-xs">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>
                  <p className="font-bold">Quantity Exceeds Stock Inventory Warning</p>
                  <p className="opacity-90">One or more items in the billing cart is approaching or exceeds available SQLite inventory reserves.</p>
                </div>
              </div>
            )}

            {/* Billing Cart table */}
            <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary-blue" />
                  <span>Billing Invoice Cart ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)</span>
                </h3>
                <div className="flex gap-2">
                  {cart.length > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowSuspendModal(true)}
                        className="text-[10px] font-bold text-warning-amber hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <FolderPlus className="w-3.5 h-3.5" /> Suspend Cart (F6)
                      </button>
                      <span className="text-slate-300">|</span>
                      <button 
                        type="button"
                        onClick={() => {
                          setCart([]);
                          notify('info', 'Cart emptied.');
                        }}
                        className="text-[10px] font-bold text-danger-red hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Empty (F2)
                      </button>
                    </>
                  )}
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                  <p className="font-extrabold text-slate-500 text-sm">Cart is currently empty.</p>
                  <p className="text-slate-400">Scan product barcodes or pick from the catalog menu below to fill invoices.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="erp-table">
                    <thead>
                      <tr>
                        <th>Product Details</th>
                        <th className="text-right">Unit Price</th>
                        <th className="text-center">Quantity</th>
                        <th className="text-center">Discount</th>
                        <th className="text-right">Line Discount</th>
                        <th className="text-right">Total (Rs.)</th>
                        <th className="text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cart.map((item) => {
                        const exceedsStock = item.quantity >= (item.product.stock_quantity ?? 0);
                        const isLowStock = (item.product.stock_quantity ?? 0) <= (item.product.minimum_stock ?? 5);

                        return (
                          <tr key={item.product.id} className={exceedsStock ? 'bg-danger-light/35' : ''}>
                            <td className="py-2.5">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-800 text-xs">{item.product.name}</span>
                                <div className="flex gap-1.5 items-center mt-1">
                                  {item.product.barcode && (
                                    <span className="text-[9px] font-mono bg-slate-100 text-slate-600 px-1 py-0.5 rounded">
                                      Barcode: {item.product.barcode}
                                    </span>
                                  )}
                                  {isLowStock && (
                                    <span className="text-[9px] font-semibold bg-warning-light text-warning-amber px-1 py-0.5 rounded border border-warning-amber/10">
                                      Low: {item.product.stock_quantity} left
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="text-right text-xs">Rs. {item.product.sale_price?.toLocaleString()}</td>
                            <td className="text-center py-2.5">
                              <div className="inline-flex items-center border border-slate-200 rounded-[4px] bg-slate-50">
                                <button 
                                  type="button"
                                  onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                                  className="px-2.5 py-0.5 text-xs font-extrabold text-slate-500 hover:bg-slate-200 rounded-[2px] cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="px-3 text-xs font-bold min-w-6">{item.quantity}</span>
                                <button 
                                  type="button"
                                  onClick={() => addToCart(item.product)}
                                  className="px-2.5 py-0.5 text-xs font-extrabold text-slate-500 hover:bg-slate-200 rounded-[2px] cursor-pointer"
                                  disabled={item.quantity >= (item.product.stock_quantity ?? 0)}
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="text-center py-2.5">
                              <div className="flex items-center justify-center gap-1">
                                <select
                                  className="border border-slate-200 rounded px-1 py-0.5 text-[10px]"
                                  value={item.discount_type || 'fixed'}
                                  onChange={(e) => setLineDiscount(item.product.id, e.target.value as 'fixed' | 'percentage', Number(item.discount_value || 0))}
                                >
                                  <option value="fixed">Rs</option>
                                  <option value="percentage">%</option>
                                </select>
                                <input
                                  className="w-14 border border-slate-200 rounded px-1 py-0.5 text-[10px] text-right"
                                  type="number"
                                  min="0"
                                  max={(item.discount_type || 'fixed') === 'percentage' ? 100 : undefined}
                                  value={item.discount_value || 0}
                                  onChange={(e) => setLineDiscount(item.product.id, (item.discount_type || 'fixed') as 'fixed' | 'percentage', Number(e.target.value || 0))}
                                />
                              </div>
                            </td>
                            <td className="text-right font-semibold text-xs text-danger-red">
                              Rs. {resolveLineDiscount(item).toLocaleString()}
                            </td>
                            <td className="text-right font-bold text-xs">
                              Rs. {Math.max(0, ((item.product.sale_price ?? 0) * item.quantity) - resolveLineDiscount(item)).toLocaleString()}
                            </td>
                            <td className="text-center">
                              <button 
                                type="button"
                                onClick={() => removeFromCart(item.product.id)}
                                className="text-slate-400 hover:text-danger-red transition-all cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Catalog Picker selector Grid */}
            <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Quick Inventory Product Catalog</h4>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Total Loaded: {products.length} Products</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {products.map((prod) => {
                  const isOutOfStock = (prod.stock_quantity ?? 0) === 0;
                  const isLow = (prod.stock_quantity ?? 0) <= (prod.minimum_stock ?? 5);

                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => addToCart(prod)}
                      disabled={isOutOfStock}
                      className="p-3 text-left border border-slate-200 hover:border-primary-blue hover:bg-primary-light rounded-[6px] transition-all flex flex-col justify-between cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{prod.name}</p>
                        <span className="text-[9px] text-slate-500 font-semibold uppercase">{prod.category_name}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs w-full">
                        <span className="font-extrabold text-primary-blue">Rs. {prod.sale_price}</span>
                        <span className={`text-[9px] font-bold ${isOutOfStock ? 'text-danger-red' : isLow ? 'text-warning-amber' : 'text-slate-500'}`}>
                          {isOutOfStock ? 'Out of Stock' : `${prod.stock_quantity} Left`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Global keyboard layout legend panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-[8px] p-4 flex flex-wrap justify-between gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              <span>⌨️ [F1]: Focus Barcode</span>
              <span>[F2]: Clear Cart</span>
              <span>[F3]: Switch Cash/Udhaar</span>
              <span>[F4]: Invoice Checkout & Print</span>
              <span>[F6]: Hold / Suspend Cart</span>
            </div>

          </div>

          {/* RIGHT SECTION: Cart parameters checkout totals */}
          <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm flex flex-col justify-between h-fit">
            <div className="p-5 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide pb-2.5 border-b border-slate-200">
                Billing Parameters
              </h3>

              {/* Customer dropdown */}
              <Select
                label="Customer (Credit / Udhaar Ledger)"
                id="pos-customer"
                options={customerOptions}
                value={posCustomerName}
                onChange={(e) => setPosCustomerName(e.target.value)}
              />
              <div className="grid grid-cols-3 gap-2">
                <Input id="pos-quick-customer-name" placeholder="Quick add customer name" value={quickCustomerName} onChange={(e) => setQuickCustomerName(e.target.value)} />
                <Input id="pos-quick-customer-phone" placeholder="Phone" value={quickCustomerPhone} onChange={(e) => setQuickCustomerPhone(e.target.value)} />
                <Button type="button" variant="secondary" onClick={quickAddCustomer}>Quick Add</Button>
              </div>
              {!isRegisteredCustomer && paymentType === 'Credit' && (
                <div className="text-[11px] text-danger-red bg-danger-light border border-danger-red/20 rounded-[4px] px-2 py-1.5">
                  Credit/khata requires a registered customer. Select one or quick add.
                </div>
              )}

              {/* Calculations summary */}
              <div className="pt-2 divide-y divide-slate-100 space-y-2 text-xs">
                
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">Cart Total Items:</span>
                  <span className="font-bold">{cart.reduce((sum, item) => sum + item.quantity, 0)} Units</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">Gross Subtotal:</span>
                  <span className="font-bold">Rs. {grossSubtotal.toLocaleString()}</span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">Item Discounts:</span>
                  <span className="font-bold text-danger-red">-Rs. {itemDiscountTotal.toLocaleString()}</span>
                </div>

                <div className="py-2 grid grid-cols-2 gap-2">
                  <Select
                    options={[
                      { value: 'fixed', label: 'Invoice Discount (Rs)' },
                      { value: 'percentage', label: 'Invoice Discount (%)' }
                    ]}
                    value={invoiceDiscountType}
                    onChange={(e) => setInvoiceDiscountType((e.target.value as 'percentage' | 'fixed') || 'fixed')}
                  />
                  <Input
                    type="number"
                    min="0"
                    max={invoiceDiscountType === 'percentage' ? 100 : undefined}
                    className="text-right font-bold py-1 px-1.5"
                    value={invoiceDiscountValue}
                    onChange={(e) => setInvoiceDiscountValue(parseFloat(e.target.value) || 0)}
                  />
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">Invoice Discount:</span>
                  <span className="font-bold text-danger-red">-Rs. {invoiceDiscountAmount.toLocaleString()}</span>
                </div>

                {/* Tax Rate */}
                <div className="py-2 flex justify-between items-center">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-slate-400" /> Sales Tax Rate (%):
                  </span>
                  <div className="w-32">
                    <Select
                      options={taxOptions}
                      value={posTaxRate}
                      onChange={(e) => setPosTaxRate(parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>

                {/* Grand Total */}
                <div className="flex justify-between items-center py-3 bg-slate-50 px-2.5 rounded-[4px] border border-slate-200">
                  <span className="text-slate-800 font-bold text-xs">Grand Total Net:</span>
                  <span className="font-extrabold text-base text-primary-blue">
                    Rs. {grandTotal.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">Paid:</span>
                  <span className="font-bold">Rs. {(paymentType === 'Paid' ? grandTotal : 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-500 font-medium">Balance:</span>
                  <span className="font-bold">{paymentType === 'Credit' ? `Rs. ${grandTotal.toLocaleString()}` : 'Rs. 0'}</span>
                </div>

              </div>

              {/* Payment Type */}
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Payment Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentType('Paid')}
                    className={`p-2 border rounded-[4px] text-xs font-bold transition-all cursor-pointer ${
                      paymentType === 'Paid' 
                        ? 'bg-success-light border-success-green text-success-green' 
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Cash Received
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentType('Credit')}
                    className={`p-2 border rounded-[4px] text-xs font-bold transition-all cursor-pointer ${
                      paymentType === 'Credit' 
                        ? 'bg-warning-light border-warning-amber text-warning-amber' 
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    Add to Udhaar
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <Button
                type="button"
                variant="primary"
                fullWidth
                disabled={cart.length === 0 || !activeShift || (paymentType === 'Credit' && !isRegisteredCustomer)}
                onClick={triggerCashierCheckout}
                className="mt-4 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Checkout & Print (F4)</span>
              </Button>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500 font-semibold leading-relaxed">
              * Note: Completing the checkout session decrements the inventory stock count dynamically and updates store accounting logs.
            </div>
          </div>

        </div>
      ) : (
        
        /* THERMAL PRINTER AND RECEIPT CUSTOMIZER PANEL */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Printer configuration form */}
          <div className="lg:col-span-2 bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-200 uppercase tracking-wide flex items-center gap-2">
              <Printer className="w-5 h-5 text-primary-blue" />
              <span>Thermal Receipt Configuration & Setup</span>
            </h3>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Paper Size selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Dual Paper Width</label>
                  <Select
                    options={[
                      { value: '80mm', label: '80mm (Standard Desktop Roll)' },
                      { value: '58mm', label: '58mm (Compact Mobile Roll)' }
                    ]}
                    value={receiptSettings.paperSize}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, paperSize: e.target.value })}
                  />
                </div>

                {/* Font Size multiplier */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Font size preset</label>
                  <Select
                    options={[
                      { value: 'normal', label: 'Normal (12px / legible)' },
                      { value: 'compact', label: 'Compact (10px / paper saver)' }
                    ]}
                    value={receiptSettings.fontSize}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, fontSize: e.target.value })}
                  />
                </div>

                {/* Printer Native Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Active Printer Device Name</label>
                  <Input
                    type="text"
                    placeholder="e.g. POS-80, Thermal Printer (Leave empty for default)"
                    value={receiptSettings.printerName}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, printerName: e.target.value })}
                  />
                </div>

                {/* Footer Custom Message */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600">Receipt Footer Tagline Message</label>
                  <Input
                    type="text"
                    value={receiptSettings.footerMessage}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, footerMessage: e.target.value })}
                  />
                </div>

              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receiptSettings.showLogo}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, showLogo: e.target.checked })}
                    className="rounded border-slate-300 text-primary-blue focus:ring-primary-blue/30"
                  />
                  <span className="text-xs font-semibold text-slate-700">Display Store Logo Icon Header</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receiptSettings.autoPrint}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, autoPrint: e.target.checked })}
                    className="rounded border-slate-300 text-primary-blue focus:ring-primary-blue/30"
                  />
                  <span className="text-xs font-semibold text-slate-700">Silent Auto-Print immediately after sale invoice completion</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={receiptSettings.duplicatePrint}
                    onChange={(e) => setReceiptSettings({ ...receiptSettings, duplicatePrint: e.target.checked })}
                    className="rounded border-slate-300 text-primary-blue focus:ring-primary-blue/30"
                  />
                  <span className="text-xs font-semibold text-slate-700">Double Print (Prints copy for store records)</span>
                </label>

              </div>

              <div className="pt-4 flex gap-3">
                <Button type="submit" variant="primary" className="font-bold text-xs uppercase px-5 py-2">
                  Save Printer Configurations
                </Button>
                
                <Button 
                  type="button" 
                  variant="secondary"
                  onClick={async () => {
                    if (window.api && window.api.receipts) {
                      const testSale = {
                        invoiceNo: 'INV-TEST-88',
                        customerName: 'Ahmad Rafay (Test)',
                        date: new Date().toLocaleString(),
                        subtotal: 1250,
                        discount: 100,
                        tax: 57.5,
                        total: 1207.5,
                        paidAmount: 1250,
                        items: [
                          { name: 'Gourmet Chocolate Bar', quantity: 2, price: 400 },
                          { name: 'Organic Honey 250g', quantity: 1, price: 450 }
                        ]
                      };
                      await window.api.receipts.print(testSale, false);
                      notify('success', 'Test print payload submitted to printer.');
                    }
                  }}
                  className="font-bold text-xs uppercase text-slate-700 px-4 py-2 border-slate-300"
                >
                  Print Test Receipt
                </Button>
              </div>

            </form>
          </div>

          {/* Simulated Real-Time Thermal Receipt Previewer (Wow effect!) */}
          <div className="bg-slate-100 p-5 rounded-[8px] border border-slate-200 flex flex-col items-center">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Live Receipt Layout Preview</span>
            
            {/* The white thermal paper roll wrapper with jagged cut styling */}
            <div className="bg-white p-4 shadow-md w-full max-w-[260px] border border-slate-300 relative text-xs min-h-[350px] font-mono leading-relaxed text-black" style={{ borderBottom: '6px dashed #ccc' }}>
              <div className="text-center font-bold text-sm mb-1">🏢</div>
              <div className="text-center font-bold text-sm">ERP RETAIL STORE</div>
              <div className="text-center text-[10px]">123 Retail Lane, DHA Phase 3</div>
              <div className="text-center text-[10px]">Phone: +92 42-35889900</div>
              
              <div className="border-t border-dashed border-black my-2"></div>
              
              <div>Inv #: INV-TEST-88</div>
              <div>Date: {new Date().toLocaleDateString()}</div>
              <div>Cashier: Cashier 01</div>
              
              <div className="border-t border-dashed border-black my-2"></div>
              
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-dashed border-black">
                    <th className="text-left font-bold pb-1">Item</th>
                    <th className="text-center font-bold pb-1">Qty</th>
                    <th className="text-right font-bold pb-1">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="pt-1">Chocolate Bar</td>
                    <td className="text-center pt-1">2</td>
                    <td className="text-right pt-1">800.00</td>
                  </tr>
                  <tr>
                    <td>Organic Honey</td>
                    <td className="text-center">1</td>
                    <td className="text-right">450.00</td>
                  </tr>
                </tbody>
              </table>

              <div className="border-t border-dashed border-black my-2"></div>

              <div className="space-y-0.5 text-[10px] text-right font-bold">
                <div>Subtotal: Rs. 1,250.00</div>
                <div>Discount: -Rs. 100.00</div>
                <div>Tax: Rs. 57.50</div>
                <div className="text-xs uppercase border-t border-dashed border-black pt-1">Net Grand Total: Rs. 1,207.50</div>
              </div>

              <div className="border-t border-dashed border-black my-2"></div>
              
              <div className="text-center text-[10px] mt-2 italic">
                {receiptSettings.footerMessage}
              </div>
            </div>
          </div>

        </div>

      )}

      {showDayEndModal && dayEndSummary && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[12px] p-6 max-w-lg w-full space-y-4 shadow-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-800">Day End Closing</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>Opening Cash: <b>Rs. {Number(dayEndSummary.opening_cash || 0).toLocaleString()}</b></div>
              <div>Cash Sales: <b>Rs. {Number(dayEndSummary.cash_sales || 0).toLocaleString()}</b></div>
              <div>Refunds: <b>Rs. {Number(dayEndSummary.refunds || 0).toLocaleString()}</b></div>
              <div>Expenses: <b>Rs. {Number(dayEndSummary.expenses || 0).toLocaleString()}</b></div>
              <div className="col-span-2">Expected Cash: <b>Rs. {Number(dayEndSummary.expected_cash || 0).toLocaleString()}</b></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Counted Cash" type="number" min="0" value={dayEndCountedCash} onChange={(e) => setDayEndCountedCash(Number(e.target.value || 0))} />
              <Input label="Difference" value={(dayEndCountedCash - Number(dayEndSummary.expected_cash || 0)).toFixed(2)} disabled />
            </div>
            <Input label="Notes" value={dayEndNotes} onChange={(e) => setDayEndNotes(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowDayEndModal(false)}>Cancel</Button>
              <Button variant="primary" onClick={closeDay}>Close Shift</Button>
            </div>
          </div>
        </div>
      )}

      {/* SUSPEND CART MODAL DIALOG */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[12px] p-6 max-w-sm w-full space-y-4 shadow-xl border border-slate-200">
            <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-warning-amber" />
              <span>Suspend Cart & Hold Session</span>
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Place the current customer's invoice on hold to serve another customer. Give this cart a quick name key so you can easily resume it later.
            </p>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cart/Customer Name Label</label>
              <Input
                type="text"
                placeholder="e.g. Counter 2 Customer, Bilal Qureshi"
                value={suspendNameInput}
                onChange={(e) => setSuspendNameInput(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <Button variant="secondary" className="text-slate-600 text-xs font-bold px-4 py-1.5 border-slate-300" onClick={() => setShowSuspendModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" className="bg-warning-amber hover:bg-amber-600 text-white text-xs font-bold px-4 py-1.5" onClick={handleSuspendCart}>
                Hold Cart (F6)
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">Recent Invoices (Last 10)</h3>
          <div className="flex items-center gap-2">
            <Input id="recent-date" type="date" value={recentDateFilter} onChange={(e) => setRecentDateFilter(e.target.value)} />
            <Input id="recent-cashier" placeholder="Cashier ID filter" value={recentCashierFilter} onChange={(e) => setRecentCashierFilter(e.target.value)} />
            <Button variant="secondary" size="sm" onClick={loadRecentSales}>Refresh</Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="erp-table">
            <thead>
              <tr>
                <th>Invoice</th><th>Time</th><th>Customer</th><th>Cashier</th><th>Branch</th><th>Status</th><th>Total</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentSales.map((row) => (
                <tr key={row.invoiceNo}>
                  <td>{row.invoiceNo}</td>
                  <td>{row.sale_time ? new Date(row.sale_time).toLocaleString() : row.date}</td>
                  <td>{row.customerName || 'Walk-in Customer'}</td>
                  <td>{row.cashier_name || '-'}</td>
                  <td>{row.branch_name || row.branch_id || '-'}</td>
                  <td><Badge variant={row.status === 'Paid' ? 'success' : 'warning'}>{row.status}</Badge></td>
                  <td>Rs. {Number(row.total || 0).toLocaleString()}</td>
                  <td>
                    <div className="flex items-center gap-1">
                    <IconActionButton icon={<Eye className="w-3.5 h-3.5" />} tooltip="View details" variant="primary" onClick={() => notify('info', `Receipt ${row.invoiceNo} - ${row.customerName || 'Walk-in Customer'}`)} />
                    <IconActionButton icon={<Printer className="w-3.5 h-3.5" />} tooltip="Print receipt" onClick={async () => {
                      try {
                        const items = await window.api.sales.getItems(row.invoiceNo);
                        await window.api.receipts.print({ ...row, items }, true);
                        notify('success', `Reprinted ${row.invoiceNo}.`);
                      } catch (error: any) {
                        notify('error', error?.message || 'Failed to reprint receipt.');
                      }
                    }} />
                    <IconActionButton icon={<RotateCcw className="w-3.5 h-3.5" />} tooltip="Create return" onClick={() => setActiveTab('sales_returns')} />
                    </div>
                  </td>
                </tr>
              ))}
              {recentSales.length === 0 && (
                <tr><td colSpan={8} className="text-center text-xs text-slate-500 py-4">No invoices found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PRINT RECEIPT SUCCESS DIALOG MODAL */}
      {checkoutSuccessSale && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[12px] p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200 flex flex-col max-h-[85vh]">
            
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-success-green" />
                <span>Invoice Checkout Successfully Generated!</span>
              </h4>
              <button 
                onClick={() => setCheckoutSuccessSale(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 flex flex-col items-center">
              <p className="text-xs font-bold text-slate-500 mb-4 uppercase tracking-wider text-center">
                Invoice Reference: <span className="text-slate-800 font-mono font-extrabold">{checkoutSuccessSale.invoiceNo}</span>
              </p>

              {/* Real-time HTML preview box */}
              <div 
                className="bg-white p-4 shadow-md w-full max-w-[280px] border border-slate-300 relative text-xs min-h-[380px] font-mono leading-relaxed"
                dangerouslySetInnerHTML={{ __html: receiptHtmlPreview }}
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-2 justify-end">
              <Button 
                variant="secondary"
                onClick={async () => {
                  if (window.api && window.api.receipts) {
                    await window.api.receipts.print(checkoutSuccessSale, true);
                    notify('success', 'Duplicate print job submitted silently.');
                  }
                }}
                className="text-slate-700 text-xs font-bold px-4 py-2 border-slate-300 flex items-center gap-1"
              >
                <FileText className="w-4 h-4" /> Print Duplicate
              </Button>

              <Button 
                variant="primary"
                onClick={async () => {
                  if (window.api && window.api.receipts) {
                    await window.api.receipts.print(checkoutSuccessSale, false);
                    notify('success', 'Receipt print job submitted silently.');
                  }
                }}
                className="text-xs font-bold px-5 py-2 flex items-center gap-1"
              >
                <Printer className="w-4 h-4" /> Print Receipt
              </Button>

              <Button 
                variant="secondary"
                onClick={() => setCheckoutSuccessSale(null)}
                className="text-slate-500 text-xs font-bold px-4 py-2 border-slate-200"
              >
                Close
              </Button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
