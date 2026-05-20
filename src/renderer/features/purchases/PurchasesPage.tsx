import React, { useState, useMemo } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Search, Plus, Trash2, Save, ShoppingBag, ArrowRight } from 'lucide-react';
import { PurchaseItem } from '../../shared/types';

export const PurchasesPage: React.FC = () => {
  const { suppliers, products, createPurchase, purchases, notify } = useErp();
  
  const [supplierId, setSupplierId] = useState('');
  const [purchaseInvoiceNo, setPurchaseInvoiceNo] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(query) || 
      (p.sku && p.sku.toLowerCase().includes(query)) ||
      (p.barcode && p.barcode.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.line_total, 0);
  }, [items]);

  const grandTotal = useMemo(() => {
    return subtotal - discount + tax;
  }, [subtotal, discount, tax]);

  const remainingPayable = useMemo(() => {
    return Math.max(0, grandTotal - amountPaid);
  }, [grandTotal, amountPaid]);

  const addItem = (product: any) => {
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      updateItemQuantity(product.id, existing.quantity + 1);
    } else {
      setItems([...items, {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        cost: product.purchase_cost || 0,
        unit_cost: product.purchase_cost || 0,
        line_total: product.purchase_cost || 0
      }]);
    }
    setSearchQuery('');
  };

  const updateItemQuantity = (productId: string, qty: number) => {
    setItems(items.map(item => {
      if (item.product_id === productId) {
        const q = Math.max(1, qty);
        return { ...item, quantity: q, line_total: q * item.unit_cost };
      }
      return item;
    }));
  };

  const updateItemCost = (productId: string, cost: number) => {
    setItems(items.map(item => {
      if (item.product_id === productId) {
        const c = Math.max(0, cost);
        return { ...item, unit_cost: c, cost: c, line_total: item.quantity * c };
      }
      return item;
    }));
  };

  const removeItem = (productId: string) => {
    setItems(items.filter(i => i.product_id !== productId));
  };

  const handleSave = async () => {
    if (!supplierId) {
      notify('error', 'Please select a supplier.');
      return;
    }
    if (items.length === 0) {
      notify('error', 'Please add at least one item.');
      return;
    }

    let paymentStatus: 'Paid' | 'Partial' | 'Credit' = 'Credit';
    if (amountPaid >= grandTotal && grandTotal > 0) paymentStatus = 'Paid';
    else if (amountPaid > 0) paymentStatus = 'Partial';

    try {
      await createPurchase({
        supplier_id: supplierId,
        purchase_invoice_no: purchaseInvoiceNo,
        date,
        total: subtotal,
        status: 'Completed',
        payment_status: paymentStatus,
        discount,
        tax,
        grand_total: grandTotal,
        amount_paid: amountPaid,
        remaining_payable: remainingPayable,
        payment_method: paymentMethod,
        notes,
        items
      });
      
      // Reset form
      setSupplierId('');
      setPurchaseInvoiceNo('');
      setItems([]);
      setDiscount(0);
      setTax(0);
      setAmountPaid(0);
      setNotes('');
      notify('success', 'Purchase recorded successfully.');
    } catch (err) {
      notify('error', 'Failed to record purchase.');
    }
  };

  return (
    <div className="h-full flex overflow-hidden bg-slate-50">
      {/* Left Pane - Entry Form */}
      <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-200">
        <div className="p-6 bg-white border-b border-slate-200 flex-shrink-0">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <ShoppingBag className="w-6 h-6 text-primary-blue" />
                New Purchase Entry
              </h1>
              <p className="text-slate-500 text-sm mt-1">Record incoming stock and supplier invoices.</p>
            </div>
            <button 
              onClick={handleSave}
              disabled={items.length === 0 || !supplierId}
              className="px-6 py-2 bg-primary-blue text-white rounded-[4px] font-semibold text-sm hover:bg-[#015481] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Purchase
            </button>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Supplier *</label>
              <select 
                value={supplierId}
                onChange={e => setSupplierId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-[4px] text-sm focus:border-primary-blue focus:ring-1 focus:ring-primary-blue outline-none"
              >
                <option value="">Select Supplier</option>
                {suppliers.filter(s => s.status !== 'inactive').map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Invoice Number</label>
              <input 
                type="text" 
                value={purchaseInvoiceNo}
                onChange={e => setPurchaseInvoiceNo(e.target.value)}
                placeholder="Optional"
                className="w-full p-2 border border-slate-300 rounded-[4px] text-sm focus:border-primary-blue focus:ring-1 focus:ring-primary-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Date *</label>
              <input 
                type="date" 
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-[4px] text-sm focus:border-primary-blue focus:ring-1 focus:ring-primary-blue outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Payment Method</label>
              <select 
                value={paymentMethod}
                onChange={e => setPaymentMethod(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-[4px] text-sm focus:border-primary-blue focus:ring-1 focus:ring-primary-blue outline-none"
              >
                <option>Cash</option>
                <option>Bank Transfer</option>
                <option>Cheque</option>
              </select>
            </div>
          </div>
        </div>

        {/* Product Search & Grid */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
          <div className="mb-6 relative">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search products by name, SKU, or Barcode..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-[4px] text-sm focus:border-primary-blue focus:ring-1 focus:ring-primary-blue outline-none shadow-sm"
              />
            </div>
            {searchQuery && (
              <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 mt-1 rounded-[4px] shadow-lg max-h-60 overflow-y-auto z-10">
                {filteredProducts.length > 0 ? filteredProducts.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => addItem(p)}
                    className="p-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <div className="font-semibold text-sm text-slate-800">{p.name}</div>
                      <div className="text-xs text-slate-500">Stock: {p.stock_quantity} | Cost: Rs. {p.purchase_cost}</div>
                    </div>
                    <Plus className="w-4 h-4 text-primary-blue" />
                  </div>
                )) : (
                  <div className="p-3 text-sm text-slate-500 text-center">No products found</div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white border border-slate-200 rounded-[4px] shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-700">Product</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 w-24">Qty</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 w-32">Unit Cost</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 w-32">Total</th>
                  <th className="px-4 py-3 font-semibold text-slate-700 w-16 text-center">Act</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No items added to purchase yet. Search and add products above.
                    </td>
                  </tr>
                ) : items.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{item.product_name}</td>
                    <td className="px-4 py-3">
                      <input 
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={e => updateItemQuantity(item.product_id, parseInt(e.target.value) || 0)}
                        className="w-full p-1.5 border border-slate-300 rounded-[4px] text-sm focus:border-primary-blue focus:ring-1 outline-none text-center"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input 
                        type="number"
                        min="0"
                        value={item.unit_cost}
                        onChange={e => updateItemCost(item.product_id, parseFloat(e.target.value) || 0)}
                        className="w-full p-1.5 border border-slate-300 rounded-[4px] text-sm focus:border-primary-blue focus:ring-1 outline-none text-right"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700">
                      Rs. {item.line_total.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => removeItem(item.product_id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-[4px] transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Right Pane - Summary */}
      <div className="w-80 flex flex-col bg-white overflow-y-auto shrink-0 border-l border-slate-200 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.05)] relative z-10">
        <div className="p-5 border-b border-slate-200">
          <h2 className="font-bold text-slate-800">Purchase Summary</h2>
        </div>
        
        <div className="p-5 space-y-4">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span className="font-semibold">Rs. {subtotal.toLocaleString()}</span>
          </div>
          
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-semibold block">Discount Amount (Rs.)</label>
            <input 
              type="number" 
              value={discount}
              onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border border-slate-300 rounded-[4px] text-sm text-right focus:border-primary-blue outline-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-semibold block">Tax Amount (Rs.)</label>
            <input 
              type="number" 
              value={tax}
              onChange={e => setTax(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border border-slate-300 rounded-[4px] text-sm text-right focus:border-primary-blue outline-none"
            />
          </div>

          <div className="pt-4 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-800">Grand Total</span>
              <span className="text-lg font-bold text-primary-blue">Rs. {grandTotal.toLocaleString()}</span>
            </div>
          </div>

          <div className="pt-4 space-y-1">
            <label className="text-xs text-slate-500 font-semibold block">Amount Paid (Rs.)</label>
            <input 
              type="number" 
              value={amountPaid}
              onChange={e => setAmountPaid(parseFloat(e.target.value) || 0)}
              className="w-full p-2 border border-slate-300 rounded-[4px] text-sm text-right focus:border-primary-blue outline-none bg-blue-50 font-semibold text-blue-800"
            />
          </div>

          <div className="flex justify-between items-center text-sm pt-2">
            <span className="text-slate-600 font-semibold">Remaining Balance</span>
            <span className={`font-bold ${remainingPayable > 0 ? 'text-red-500' : 'text-success-green'}`}>
              Rs. {remainingPayable.toLocaleString()}
            </span>
          </div>

          <div className="pt-4 space-y-1">
            <label className="text-xs text-slate-500 font-semibold block">Internal Notes</label>
            <textarea 
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full p-2 border border-slate-300 rounded-[4px] text-sm focus:border-primary-blue outline-none resize-none"
              placeholder="e.g. Delivered by Ali..."
            ></textarea>
          </div>
        </div>

        <div className="p-5 mt-auto border-t border-slate-200 bg-slate-50">
          <div className="text-xs text-slate-500 mb-2">Recent Purchases</div>
          <div className="space-y-2">
            {purchases.slice(0, 3).map(p => (
              <div key={p.id} className="p-3 bg-white border border-slate-200 rounded-[4px] shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-slate-800 text-sm truncate pr-2">{p.supplier_name || 'Unknown'}</span>
                  <span className="text-xs font-bold text-slate-600">Rs. {p.grand_total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">{new Date(p.date).toLocaleDateString()}</span>
                  <span className={`px-1.5 py-0.5 rounded-[2px] font-semibold ${
                    p.payment_status === 'Paid' ? 'bg-green-100 text-green-700' :
                    p.payment_status === 'Partial' ? 'bg-orange-100 text-orange-700' :
                    'bg-red-100 text-red-700'
                  }`}>{p.payment_status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
