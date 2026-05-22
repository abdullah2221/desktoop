import React, { useEffect, useState, useMemo } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Card } from '../../shared/ui/Card';
import { Button } from '../../shared/ui/Button';
import { Input } from '../../shared/ui/Input';
import { Badge } from '../../shared/ui/Badge';
import { Undo2, Search, RotateCcw, FileText, Printer } from 'lucide-react';

interface PurchaseReturnItemState {
  product_id: string;
  product_name: string;
  purchased_qty: number;
  returned_qty: number;
  max_returnable: number;
  return_qty: number;
  unit_cost: number;
}

export const PurchaseReturnsPage: React.FC = () => {
  const { notify } = useErp();
  const [tab, setTab] = useState<'history' | 'new'>('history');

  // History states
  const [history, setHistory] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState('');
  const [selectedReturnDetail, setSelectedReturnDetail] = useState<any | null>(null);

  // New return creation states
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchaseSearch, setPurchaseSearch] = useState('');
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);

  const [returnItems, setReturnItems] = useState<PurchaseReturnItemState[]>([]);
  const [returnReason, setReturnReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load returns history
  const loadHistory = async () => {
    try {
      const res = await window.api.returns.getPurchaseHistory();
      setHistory(res || []);
    } catch (err: any) {
      notify('error', 'Failed to load return history: ' + err.message);
    }
  };

  // Load completed purchases
  const loadPurchases = async () => {
    try {
      const res = await window.api.purchases.getAll();
      setPurchases(res || []);
    } catch (err: any) {
      notify('error', 'Failed to load completed purchases: ' + err.message);
    }
  };

  useEffect(() => {
    loadHistory();
    loadPurchases();
  }, []);

  // Filter returns history
  const filteredHistory = useMemo(() => {
    return history.filter((h) => {
      const term = historySearch.toLowerCase();
      return (
        h.id.toLowerCase().includes(term) ||
        h.purchase_id.toLowerCase().includes(term) ||
        (h.supplier_name && h.supplier_name.toLowerCase().includes(term))
      );
    });
  }, [history, historySearch]);

  // Filter purchase references
  const filteredPurchases = useMemo(() => {
    if (!purchaseSearch) return [];
    return purchases.filter((p) => {
      const term = purchaseSearch.toLowerCase();
      return (
        p.id.toLowerCase().includes(term) ||
        (p.supplier_name && p.supplier_name.toLowerCase().includes(term)) ||
        (p.supplier_id && p.supplier_id.toLowerCase().includes(term))
      );
    });
  }, [purchases, purchaseSearch]);

  // Select purchase to process return
  const handleSelectPurchase = async (p: any) => {
    try {
      const detailed = await window.api.purchases.getById(p.id);
      if (!detailed) {
        notify('error', 'Failed to load purchase transaction items.');
        return;
      }
      setSelectedPurchase(detailed);
      setPurchaseSearch(detailed.id);

      // Get past returns for this purchase
      const pastReturns = await window.api.returns.getPurchaseReturnsByPurchase(detailed.id);
      const returnedQuantities: Record<string, number> = {};

      for (const pr of pastReturns) {
        const fullDetail = await window.api.returns.getPurchaseReturnById(pr.id);
        if (fullDetail && fullDetail.items) {
          for (const item of fullDetail.items) {
            returnedQuantities[item.product_id] = (returnedQuantities[item.product_id] || 0) + item.quantity;
          }
        }
      }

      // Map purchase items to return inputs
      const mapped = (detailed.items || []).map((item: any) => {
        const product_id = item.product_id;
        const alreadyReturned = returnedQuantities[product_id] || 0;
        const maxReturnable = Math.max(0, item.quantity - alreadyReturned);
        return {
          product_id,
          product_name: item.name || item.product_name || 'Product',
          purchased_qty: item.quantity,
          returned_qty: alreadyReturned,
          max_returnable: maxReturnable,
          return_qty: 0,
          unit_cost: item.unit_cost || item.price || 0,
        };
      });

      setReturnItems(mapped);
      setReturnReason('');
      setNotes('');
    } catch (err: any) {
      notify('error', 'Error setting up return purchase: ' + err.message);
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
    return returnItems.reduce((sum, item) => sum + (item.return_qty * item.unit_cost), 0);
  }, [returnItems]);

  const totalRefund = subtotal;

  const handleCreateReturn = async () => {
    if (!selectedPurchase) {
      notify('error', 'Please select a valid purchase transaction.');
      return;
    }

    const itemsToReturn = returnItems
      .filter((i) => i.return_qty > 0)
      .map((i) => ({
        product_id: i.product_id,
        quantity: i.return_qty,
        unit_cost: i.unit_cost,
        total: i.return_qty * i.unit_cost
      }));

    if (itemsToReturn.length === 0) {
      notify('error', 'Please input at least one item quantity to return.');
      return;
    }

    setIsSubmitting(true);

    const payload = {
      purchase_id: selectedPurchase.id,
      supplier_id: selectedPurchase.supplier_id,
      subtotal: subtotal,
      tax_amount: 0,
      total_amount: totalRefund,
      return_reason: returnReason,
      notes: notes,
      items: itemsToReturn
    };

    try {
      const res = await window.api.returns.createPurchaseReturn(payload);
      if (res.success) {
        notify('success', 'Purchase Return processed successfully!');
        
        // Reset
        setSelectedPurchase(null);
        setPurchaseSearch('');
        setReturnItems([]);
        setTab('history');
        await loadHistory();
        await loadPurchases();
      } else {
        notify('error', res.error || 'Failed to process return.');
      }
    } catch (err: any) {
      notify('error', 'Error processing purchase return: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const detail = await window.api.returns.getPurchaseReturnById(id);
      setSelectedReturnDetail(detail);
    } catch (err: any) {
      notify('error', 'Failed to retrieve return details.');
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
          Purchase Returns Log
        </button>
        <button
          className={`px-4 py-2 text-sm font-semibold rounded-[4px] inline-flex items-center gap-2 ${
            tab === 'new' ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'
          }`}
          onClick={() => setTab('new')}
        >
          <Undo2 className="w-4 h-4" />
          Process Supplier Return
        </button>
      </div>

      {/* HISTORY TAB */}
      {tab === 'history' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2" title="Completed Supplier Returns">
            <div className="mb-3">
              <Input
                id="purchases-history-search"
                placeholder="Search returns by Return ID, purchase ID, supplier name..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                prefix="🔍"
              />
            </div>

            {filteredHistory.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No purchase returns found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="erp-table">
                  <thead>
                    <tr>
                      <th>Return ID</th>
                      <th>Purchase Ref</th>
                      <th>Supplier</th>
                      <th>Total Adjusted</th>
                      <th>Reason</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHistory.map((ret) => (
                      <tr key={ret.id} onClick={() => handleViewDetail(ret.id)} className="cursor-pointer hover:bg-slate-50">
                        <td className="font-semibold text-slate-800">{ret.id}</td>
                        <td>{ret.purchase_id}</td>
                        <td>{ret.supplier_name || 'Vendor'}</td>
                        <td className="font-bold text-slate-900">Rs. {ret.total_amount.toLocaleString()}</td>
                        <td><span className="text-xs text-slate-600 truncate max-w-[150px] block">{ret.return_reason || '-'}</span></td>
                        <td>{new Date(ret.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* Details Column */}
          <Card title="Purchase Return Detail">
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
                      <span className="text-slate-400 block font-semibold uppercase text-[9px]">Purchase Ref</span>
                      <span className="font-bold text-slate-800">{selectedReturnDetail.purchase_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-semibold uppercase text-[9px]">Supplier Name</span>
                      <span className="font-bold text-slate-800">{selectedReturnDetail.supplier_id}</span>
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
                          <p className="text-[10px] text-slate-400">Qty: {item.quantity} x Rs. {item.unit_cost.toLocaleString()}</p>
                        </div>
                        <span className="font-bold text-slate-900">Rs. {item.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 flex justify-between items-center text-sm font-bold">
                  <span className="text-slate-700">Total Adjusted</span>
                  <span className="text-primary-blue">Rs. {selectedReturnDetail.total_amount.toLocaleString()}</span>
                </div>
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
          <Card className="lg:col-span-2" title="Select Purchase & Set Quantities">
            <div className="relative mb-4">
              <Input
                id="returns-purchase-search"
                label="Search Purchase Reference"
                placeholder="Type Purchase Ref ID or Supplier Name..."
                value={purchaseSearch}
                onChange={(e) => {
                  setPurchaseSearch(e.target.value);
                  if (selectedPurchase && e.target.value !== selectedPurchase.id) {
                    setSelectedPurchase(null);
                    setReturnItems([]);
                  }
                }}
                prefix="🔍"
              />

              {/* Autocomplete list */}
              {purchaseSearch && !selectedPurchase && filteredPurchases.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-[6px] shadow-lg max-h-60 overflow-y-auto z-10">
                  {filteredPurchases.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-100 text-xs"
                      onClick={() => handleSelectPurchase(p)}
                    >
                      <div>
                        <p className="font-bold text-slate-800">Purchase Ref: {p.id}</p>
                        <p className="text-[10px] text-slate-400">Supplier: {p.supplier_name || p.supplier_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">Rs. {p.total_amount.toLocaleString()}</p>
                        <p className="text-[9px] text-slate-400">{p.created_at}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {selectedPurchase ? (
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-[6px] p-3 border border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase text-[9px]">Purchase Reference</span>
                    <span className="font-bold text-slate-800">{selectedPurchase.id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase text-[9px]">Supplier name</span>
                    <span className="font-bold text-slate-800">{selectedPurchase.supplier_id}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase text-[9px]">Purchase Total</span>
                    <span className="font-bold text-slate-800">Rs. {selectedPurchase.total_amount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-semibold uppercase text-[9px]">Date</span>
                    <span>{selectedPurchase.created_at}</span>
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
                          <th>Unit Cost</th>
                          <th>Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {returnItems.map((item, idx) => (
                          <tr key={item.product_id} className="align-middle">
                            <td className="font-bold text-slate-800">{item.product_name}</td>
                            <td>{item.purchased_qty}</td>
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
                            <td>Rs. {item.unit_cost.toLocaleString()}</td>
                            <td className="font-bold text-slate-900">
                              Rs. {(item.return_qty * item.unit_cost).toLocaleString()}
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
                <p className="text-xs text-slate-500 font-medium">Use the reference input field above to find and select a purchase to return.</p>
              </div>
            )}
          </Card>

          {/* Refund Details Form */}
          <Card title="Refund & Balance Adjustments">
            <div className="space-y-4">
              <Input
                id="purchase-return-reason"
                label="Return Reason"
                placeholder="e.g. Expired product, Damaged package, Excess Stock..."
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
                  <span className="text-slate-800">TOTAL SUPPLIER ADJUSTMENT:</span>
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
                {isSubmitting ? 'Processing return...' : 'Process Supplier Return'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
