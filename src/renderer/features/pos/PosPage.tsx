import React from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Badge } from '../../shared/ui/Badge';
import { CreditCard, Trash2 } from 'lucide-react';

export const PosPage: React.FC = () => {
  const {
    products,
    customers,
    cart,
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
    handleCheckout
  } = useErp();

  const subtotal = cart.reduce((sum, item) => sum + ((item.product.sale_price ?? 0) * item.quantity), 0);
  const taxAmount = Math.round((subtotal - posDiscount) * (posTaxRate / 100));
  const grandTotal = Math.max(0, subtotal - posDiscount + taxAmount);

  // Customer dropdown list options
  const customerOptions = customers.map(cust => ({
    value: cust.name,
    label: `${cust.name} (Phone: ${cust.phone})`
  }));

  // Tax rate dropdown options
  const taxOptions = [
    { value: 0, label: '0% Exempt' },
    { value: 5, label: '5% Service Tax' },
    { value: 17, label: '17% FBR GST' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left: Cart & Add Items Selector */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Cart Item Grid */}
        <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary-blue" />
              <span>Current Billing Invoice Items</span>
            </h3>
            {cart.length > 0 && (
              <button 
                type="button"
                onClick={() => {
                  // Simply clear cart through updating quantity to 0
                  cart.forEach(item => updateCartQty(item.product.id, 0));
                }}
                className="text-[10px] font-bold text-danger-red hover:underline cursor-pointer"
              >
                Empty Cart
              </button>
            )}
          </div>

          {cart.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs space-y-2">
              <p>Your POS Cart is currently empty.</p>
              <p className="font-semibold text-slate-500">Select products from the quick selector menu below to begin checkout.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="erp-table">
                <thead>
                  <tr>
                    <th>Item Name</th>
                    <th>Unit Price</th>
                    <th className="text-center">Quantity</th>
                    <th className="text-right">Total (Rs.)</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.product.id}>
                      <td className="font-bold text-slate-700">{item.product.name}</td>
                      <td>Rs. {item.product.sale_price}</td>
                      <td className="text-center">
                        <div className="inline-flex items-center border border-slate-200 rounded-[4px] bg-slate-50">
                          <button 
                            type="button"
                            onClick={() => updateCartQty(item.product.id, item.quantity - 1)}
                            className="px-2 py-0.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-[2px] cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-3 text-xs font-bold">{item.quantity}</span>
                          <button 
                            type="button"
                            onClick={() => addToCart(item.product)}
                            className="px-2 py-0.5 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-[2px] cursor-pointer"
                            disabled={item.quantity >= (item.product.stock_quantity ?? 0)}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td className="text-right font-bold">
                        Rs. {((item.product.sale_price ?? 0) * item.quantity).toLocaleString()}
                      </td>
                      <td className="text-center">
                        <button 
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-danger-red hover:text-red-700 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Quick Inventory Picker selector */}
        <div className="bg-white p-5 rounded-[8px] border border-slate-200 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">Quick Inventory Product Picker</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {products.map((prod) => {
              const isOutOfStock = (prod.stock_quantity ?? 0) === 0;
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
                    <span className="text-[10px] text-slate-500 font-semibold uppercase">{prod.category_name}</span>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between text-xs w-full">
                    <span className="font-extrabold text-primary-blue">Rs. {prod.sale_price}</span>
                    <span className={`text-[10px] font-bold ${(prod.stock_quantity ?? 0) <= (prod.minimum_stock ?? 0) ? 'text-danger-red' : 'text-slate-500'}`}>
                      {isOutOfStock ? 'Out of Stock' : `${prod.stock_quantity} Left`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Right: Checkout Billing summary parameters */}
      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm flex flex-col justify-between h-fit">
        <form onSubmit={handleCheckout} className="p-5 space-y-4">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide pb-2.5 border-b border-slate-200">
            POS Invoice Summary
          </h3>

          {/* Customer select options */}
          <Select
            label="Customer (Credit / Udhaar Ledger)"
            id="pos-customer"
            options={customerOptions}
            value={posCustomerName}
            onChange={(e) => setPosCustomerName(e.target.value)}
          />

          {/* Pricing calculations details */}
          <div className="pt-2 divide-y divide-slate-100 space-y-2 text-xs">
            
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Cart Total Items:</span>
              <span className="font-bold">{cart.reduce((sum, item) => sum + item.quantity, 0)} Units</span>
            </div>

            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Subtotal Amount:</span>
              <span className="font-bold">
                Rs. {subtotal.toLocaleString()}
              </span>
            </div>

            {/* Discount field */}
            <div className="py-2 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Add Discount (Rs.):</span>
              <div className="w-32">
                <Input
                  type="number"
                  min="0"
                  className="text-right font-bold py-1 px-1.5"
                  value={posDiscount}
                  onChange={(e) => setPosDiscount(parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Tax setting dropdown */}
            <div className="py-2 flex justify-between items-center">
              <span className="text-slate-500 font-medium">Sales Tax Rate (%):</span>
              <div className="w-32">
                <Select
                  options={taxOptions}
                  value={posTaxRate}
                  onChange={(e) => setPosTaxRate(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Net Total */}
            <div className="flex justify-between items-center py-3 bg-slate-50 px-2.5 rounded-[4px] border border-slate-200">
              <span className="text-slate-800 font-bold text-xs">Net Grand Total:</span>
              <span className="font-extrabold text-base text-primary-blue">
                Rs. {grandTotal.toLocaleString()}
              </span>
            </div>

          </div>

          {/* Payment Type status select */}
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

          <Button
            type="submit"
            variant="primary"
            fullWidth
            disabled={cart.length === 0}
            className="mt-4 py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Complete Invoice & Print
          </Button>
        </form>

        <div className="p-4 border-t border-slate-100 bg-slate-50 text-[10px] text-slate-500 font-semibold leading-relaxed">
          * Note: Completing the checkout session decrements the inventory stock count dynamically and updates store accounting logs.
        </div>
      </div>

    </div>
  );
};
