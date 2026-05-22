import React, { useEffect, useState, useMemo } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Badge } from '../../shared/ui/Badge';
import { Invoice } from '../../shared/types';
import { Undo2, Search, RotateCcw, FileText, Printer } from 'lucide-react';

interface ReturnItemState {
  product_id: string;
  product_name: string;
  sold_qty: number;
  returned_qty: number;
  max_returnable: number;
  return_qty: number;
  unit_price: number;
}

export const SalesReturnsPage: React.FC = () => {
  const { notify } = useErp();
  const [tab, setTab] = useState<'history' | 'new'>('history');
  
  // History states
  const [history, setHistory] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedReturnDetail, setSelectedReturnDetail] = useState<any | null>(null);

  // New return creation states
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  
  const [returnItems, setReturnItems] = useState<ReturnItemState[]>([]);
  const [refundMethod, setRefundMethod] = useState<'Cash' | 'Bank' | 'Store Credit'>('Cash');
  const [returnReason, setReturnReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load returns history
  const loadHistory = async () => {
    try {
      const res = await window.api.returns.getSalesHistory();
      setHistory(res || []);
    } catch (err: any) {
      notify('error', 'Failed to load return history: ' + err.message);
    }
  };

  // Load all invoice references for select
  const loadInvoices = async () => {
    try {
      const res = await window.api.invoices.getAll();
      // Filter out void and draft invoices, only returnable are Paid or Unpaid or Partially Paid finalized invoices
      const completed = (res || []).filter((inv: Invoice) => inv.status !== 'Void' && inv.status !== 'Draft');
      setInvoices(completed);
    } catch (err: any) {
      notify('error', 'Failed to load completed invoices: ' + err.message);
    }
  };

  useEffect(() => {
    loadHistory();
    loadInvoices();
  }, []);

  // Filter returns history
  const filteredHistory = useMemo(() => {
    return history.filter((h) => {
      const term = historySearch.toLowerCase();
      return (
        h.id.toLowerCase().includes(term) ||
        h.sale_id.toLowerCase().includes(term) ||
        (h.customer_name && h.customer_name.toLowerCase().includes(term)) ||
        (h.customer_id && h.customer_id.toLowerCase().includes(term))
      );
    });
  }, [history, historySearch]);

  // Filter invoice dropdown references
  const filteredInvoices = useMemo(() => {
    if (!invoiceSearch) return [];
    return invoices.filter((inv) => {
      const term = invoiceSearch.toLowerCase();
      return (
        inv.invoice_no.toLowerCase().includes(term) ||
        inv.customer_name.toLowerCase().includes(term)
      );
    });
  }, [invoices, invoiceSearch]);

  // Select an invoice to process return
  const handleSelectInvoice = async (inv: Invoice) => {
    try {
      // Get detailed invoice with item listings
      const detailed = await window.api.invoices.getById(inv.id);
      if (!detailed) {
        notify('error', 'Failed to load sales invoice items.');
        return;
      }
      setSelectedInvoice(detailed);
      setInvoiceSearch(detailed.invoice_no);

      // Get past returns for this sale to compute max returnable quantities
      const pastReturns = await window.api.returns.getSalesReturnsBySale(detailed.invoice_no);
      const returnedQuantities: Record<string, number> = {};
      
      for (const pr of pastReturns) {
        const fullDetail = await window.api.returns.getSalesReturnById(pr.id);
        if (fullDetail && fullDetail.items) {
          for (const item of fullDetail.items) {
            returnedQuantities[item.product_id] = (returnedQuantities[item.product_id] || 0) + item.quantity;
          }
        }
      }

      // Map invoice items to return inputs
      const mapped = (detailed.items || []).map((item: any) => {
        const product_id = item.product_id;
        const alreadyReturned = returnedQuantities[product_id] || 0;
        const maxReturnable = Math.max(0, item.quantity - alreadyReturned);
        return {
          product_id,
          product_name: item.name || item.product_name || 'Product',
          sold_qty: item.quantity,
          returned_qty: alreadyReturned,
          max_returnable: maxReturnable,
          return_qty: 0,
          unit_price: item.unit_price || item.price || 0,
        };
      });

      setReturnItems(mapped);
      setRefundMethod('Cash');
      setReturnReason('');
      setNotes('');
    } catch (err: any) {
      notify('error', 'Error setting up return invoice: ' + err.message);
    }
  };

  const updateReturnQty = (idx: number, val: number) => {
    const updated = [...returnItems];
    const max = updated[idx].max_returnable;
    updated[idx].return_qty = Math.min(max, Math.max(0, val));
    setReturnItems(updated);
  };

  // Computations
  const subtotal = useMemo(() => {
    return returnItems.reduce((sum, item) => sum + (item.return_qty * item.unit_price), 0);
  }, [returnItems]);

  const totalRefund = subtotal; // can also add tax reversals if needed

  const handleCreateReturn = async () => {
    if (!selectedInvoice) {
      notify('error', 'Please select a valid sales invoice.');
      return;
    }

    const itemsToReturn = returnItems
      .filter((i) => i.return_qty > 0)
      .map((i) => ({
        product_id: i.product_id,
        quantity: i.return_qty,
        unit_price: i.unit_price,
        total: i.return_qty * i.unit_price
      }));

    if (itemsToReturn.length === 0) {
      notify('error', 'Please input at least one item quantity to return.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      sale_id: selectedInvoice.invoice_no,
      customer_id: selectedInvoice.customer_name || null,
      refund_method: refundMethod,
      subtotal: subtotal,
      tax_amount: 0,
      total_amount: totalRefund,
      return_reason: returnReason,
      notes: notes,
      items: itemsToReturn
    };

    try {
      const res = await window.api.returns.createSalesReturn(payload);
      if (res.success) {
        notify('success', 'Sales Return created successfully!');
        
        // Auto-print thermal refund copy
        try {
          const retObj = await window.api.returns.getSalesReturnById(res.returnId!);
          if (retObj) {
            await window.api.receipts.printReturn(retObj);
          }
        } catch (printErr) {
          console.warn('Silent return print failed:', printErr);
        }

        // Reset
        setSelectedInvoice(null);
        setInvoiceSearch('');
        setReturnItems([]);
        setTab('history');
        await loadHistory();
        await loadInvoices();
      } else {
        notify('error', res.error || 'Failed to create return.');
      }
    } catch (err: any) {
      notify('error', 'Error processing sales return: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const detail = await window.api.returns.getSalesReturnById(id);
      setSelectedReturnDetail(detail);
    } catch (err: any) {
      notify('error', 'Failed to retrieve return details.');
    }
  };

  const handlePrintHistorical = async (record: any) => {
    try {
      await window.api.receipts.printReturn(record);
      notify('success', 'Return receipt sent to printer.');
    } catch (err: any) {
      notify('error', 'Printing failed.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Selectors */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          className={`px-4 py-2 text-sm font-semibold rounded-[4px] inline-flex items-center gap-2 ${
            tab === 'history' ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'
          }`}
          onClick={() => setTab('history')}
        >
          <RotateCcw className="w-4 h-4" />
          Sales Returns Log
        </button>
        <button
          className={`px-4 py-2 text-sm font-semibold rounded-[4px] inline-flex items-center gap-2 ${
            tab === 'new' ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'
          }`}
          onClick={() => setTab('new')}
        >
          <Undo2 className="w-4 h-4" />
          Process New Return
        </button>
      </div>

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2" title="Completed Sales Returns">
            <div className="mb-3">
              <Input
                id="returns-history-search"
                placeholder="Search returns by Return ID, invoice no, customer name..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                prefix="🔍"
              />
            </div>

            {filteredHistory.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No sales returns found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Return ID</th>
                      <th>Ref Invoice</th>
                      <th>Customer</th>
                      <th>Method</th>
                      <th>Total Refund</th>
                      <th>Reason</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((ret) => (
                      <tr key={ret.id} onClick={() => handleViewDetail(ret.id)} className="cursor-pointer hover:bg-slate-50">
                        <td className="font-semibold text-slate-800">{ret.id}</td>
                        <td>{ret.sale_id}</td>
                        <td>{ret.customer_name || 'Walk-in Customer'}</td>
                        <td>
                          <Badge variant={ret.refund_method === 'Store Credit' ? 'warning' : 'success'}>
                            {ret.refund_method}
                          </Badge>
                        </td>
                        <td className="font-bold text-slate-900">Rs. {ret.total_amount.toLocaleString()}</td>
                        <td><span className="text-xs text-slate-600 truncate max-w-[120px] block">{ret.return_reason || '-'}</span></td>
                        <td>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintHistorical(ret);
                            }}
                          >
                            <Printer className="w-3.5 h-3.5 mr-1" />
                            Print
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Details Column */}
          <Card title="Return Credit Note Detail">
            {selectedReturnDetail ? (
              <div className="space-y-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-bold text-slate-700 uppercase">Return Info</h4>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    <div>
                      <span className="text-slate-400 block font-semibold uppercase text-[9px]">Return ID</span>
                      <span className="font-bold text-slate-800">{selectedReturnDetail.id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold uppercase text-[9px]">Ref Sale ID</span>
                      <span className="font-bold text-slate-800">{selectedReturnDetail.sale_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold uppercase text-[9px]">Refund Method</span>
                      <span className="font-bold text-slate-800">{selectedReturnDetail.refund_method}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold uppercase text-[9px]">Date</span>
                      <span>{new Date(selectedReturnDetail.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                  {selectedReturnDetail.return_reason && (
                    <div className="mt-2 text-xs">
                      <span className="text-slate-400 block font-semibold uppercase text-[9px]">Reason</span>
                      <span className="text-slate-700 font-medium">{selectedReturnDetail.return_reason}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-2">Returned Items</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {(selectedReturnDetail.items || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2 bg-slate-50 border border-slate-100 rounded-[4px]">
                        <div>
                          <p className="font-bold text-slate-800">{item.product_name}</p>
                          <p className="text-[10px] text-slate-400">Qty: {item.quantity} x Rs. {item.unit_price.toLocaleString()}</p>
                        </div>
                        <span className="font-bold text-slate-900">Rs. {item.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-700">Total Refunded</span>
                  <span className="text-base font-extrabold text-primary-blue">Rs. {selectedReturnDetail.total_amount.toLocaleString()}</span>
                </div>

                <Button fullWidth onClick={() => handlePrintHistorical(selectedReturnDetail)}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Credit Note Copy
                </Button>
              </div>
            ) : (
              <div className="py-12 text-center">
                <Undo2 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-500">Select a return from the log list to view its complete details.</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* PROCESS NEW RETURN TAB */}
      {tab === 'new' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2" title="Select Invoice & Set Quantities">
            <div className="relative mb-4">
              <Input
                id="returns-invoice-search"
                label="Search Reference Invoice"
                placeholder="Type Invoice Number (e.g. INV-xxxx) or Customer Name..."
                value={invoiceSearch}
                onChange={(e) => {
                  setInvoiceSearch(e.target.value);
                  if (selectedInvoice && e.target.value !== selectedInvoice.invoice_no) {
                    setSelectedInvoice(null);
                    setReturnItems([]);
                  }
                }}
                prefix="🔍"
              />
              
              {/* Autocomplete list */}
              {invoiceSearch && !selectedInvoice && filteredInvoices.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-[6px] shadow-lg max-h-60 overflow-y-auto z-10">
                  {filteredInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 text-xs"
                      onClick={() => handleSelectInvoice(inv)}
                    >
                      <div>
                        <p className="font-bold text-slate-800">{inv.invoice_no}</p>
                        <p className="text-[10px] text-slate-400">{inv.customer_name || 'Walk-in Customer'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">Rs. {inv.grand_total.toLocaleString()}</p>
                        <p className="text-[9px]"><Badge variant="success">{inv.status}</Badge></p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedInvoice ? (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-[6px] p-3 border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase text-[9px]">Invoice Number</span>
                    <span className="font-bold text-slate-800">{selectedInvoice.invoice_no}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase text-[9px]">Customer name</span>
                    <span className="font-bold text-slate-800">{selectedInvoice.customer_name || 'Walk-in Customer'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase text-[9px]">Invoice Total</span>
                    <span className="font-bold text-slate-800">Rs. {selectedInvoice.grand_total.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase text-[9px]">Invoice Date</span>
                    <span>{selectedInvoice.invoice_date}</span>
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-slate-700 uppercase mb-3">Item Breakdown & Quantities</h4>
                  <div className="overflow-x-auto">
                    <table className="erp-table text-xs">
                      <thead>
                        <tr>
                          <th>Item Name</th>
                          <th>Original Qty</th>
                          <th>Already Returned</th>
                          <th>Max Returnable</th>
                          <th style={{ width: '120px' }}>Return Qty</th>
                          <th>Price</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnItems.map((item, idx) => (
                          <tr key={item.product_id} className="align-middle">
                            <td className="font-bold text-slate-800">{item.product_name}</td>
                            <td>{item.sold_qty}</td>
                            <td>
                              {item.returned_qty > 0 ? (
                                <Badge variant="warning">{item.returned_qty}</Badge>
                              ) : (
                                <span className="text-slate-400">0</span>
                              )}
                            </td>
                            <td className="font-bold">{item.max_returnable}</td>
                            <td>
                              <input
                                className="erp-input w-20 py-1 text-center font-semibold"
                                type="number"
                                min="0"
                                max={item.max_returnable}
                                value={item.return_qty}
                                disabled={item.max_returnable === 0}
                                onChange={(e) => updateReturnQty(idx, Number(e.target.value))}
                              />
                            </td>
                            <td>Rs. {item.unit_price.toLocaleString()}</td>
                            <td className="font-bold text-slate-900">
                              Rs. {(item.return_qty * item.unit_price).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-16 text-center">
                <Search className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-xs text-slate-500 font-medium">Use the reference input field above to find and select a sale to process.</p>
              </div>
            )}
          </Card>

          {/* Refund Details Form */}
          <Card title="Refund Payment & Reason">
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                  Refund Disbursement Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Cash', 'Bank', 'Store Credit'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      className={`py-2 px-3 text-xs font-semibold rounded-[4px] border transition-all ${
                        refundMethod === method
                          ? 'bg-primary-blue text-white border-primary-blue shadow-sm'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                      onClick={() => setRefundMethod(method)}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                id="return-reason-input"
                label="Return Reason"
                placeholder="e.g. Damaged Goods, Incorrect Size, Customer changed mind..."
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
              />

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Return Notes
                </label>
                <textarea
                  className="erp-input text-xs"
                  rows={4}
                  placeholder="Enter specific comments or transaction references..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Calculations summary */}
              <div className="bg-slate-50 rounded-[6px] border border-slate-100 p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Refund Subtotal:</span>
                  <span className="font-semibold">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-bold">
                  <span className="text-slate-800">NET REFUND AMOUNT:</span>
                  <span className="text-primary-blue">Rs. {totalRefund.toLocaleString()}</span>
                </div>
              </div>

              <Button
                variant="success"
                fullWidth
                size="lg"
                disabled={totalRefund === 0 || isSubmitting}
                onClick={handleCreateReturn}
              >
                {isSubmitting ? 'Processing return...' : 'Confirm & Process Return'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
