import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, Barcode, Check, CheckCircle2, ClipboardCheck, Eye, History, Layers, SlidersHorizontal, Truck, X } from 'lucide-react';
import { useErp } from '../../app/providers/ErpContext';
import { BranchInventory, InventoryAdjustment, Product, StockTransfer } from '../../shared/types';
import { IconActionButton } from '../../shared/ui/IconActionButton';

type Tab = 'stock' | 'movements' | 'transfers' | 'adjustments' | 'low_stock' | 'valuation';
const today = () => new Date().toISOString().split('T')[0];

export const InventoryTransfersPage: React.FC<{ initialTab?: Tab }> = ({ initialTab = 'stock' }) => {
  const { accessibleBranches, activeBranchId, products, hasPermission, notify } = useErp();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [branchFilter, setBranchFilter] = useState(activeBranchId || '');
  const [search, setSearch] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [stock, setStock] = useState<BranchInventory[]>([]);
  const [lowStock, setLowStock] = useState<BranchInventory[]>([]);
  const [valuation, setValuation] = useState<Record<string, any> | null>(null);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [movements, setMovements] = useState<any[]>([]);

  const [stockCard, setStockCard] = useState<any | null>(null);
  const [stockCardOpen, setStockCardOpen] = useState(false);

  const [stockForm, setStockForm] = useState({ branch_id: activeBranchId || '', product_id: '', quantity_on_hand: 0, reorder_level: 0, average_cost: 0 });
  const [transferForm, setTransferForm] = useState({ source_branch_id: activeBranchId || '', destination_branch_id: '', product_id: '', quantity: 1, notes: '' });
  const [adjustmentForm, setAdjustmentForm] = useState({ branch_id: activeBranchId || '', product_id: '', quantity_change: 0, adjustment_type: 'Manual Correction', reason: '', notes: '' });

  const load = async () => {
    const [stockRows, lowRows, valueRows, transferRows, adjustmentRows, movementRows] = await Promise.all([
      window.api.branchInventory.getAll(branchFilter || undefined),
      window.api.branchInventory.lowStock(branchFilter || undefined),
      window.api.branchInventory.valuation(branchFilter || undefined),
      window.api.stockTransfers.getAll(),
      window.api.inventoryAdjustments.getAll(),
      window.api.stockMovements.getHistory({ branch_id: branchFilter || undefined, movement_type: movementTypeFilter || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined, limit: 1000 })
    ]);
    setStock(stockRows);
    setLowStock(lowRows);
    setValuation(valueRows);
    setTransfers(transferRows);
    setAdjustments(adjustmentRows);
    setMovements(movementRows || []);
  };

  useEffect(() => { load().catch((error) => notify('error', error.message || 'Failed to load warehouse controls.')); }, []);

  const productOptions = useMemo(() => products.filter((product: Product) => product.status === 'active'), [products]);
  const totalValue = Number(valuation?.totalValue || 0);

  const filteredStock = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return stock;
    return stock.filter((row: any) => `${row.product_name || ''} ${row.sku || ''} ${row.barcode || ''} ${row.branch_code || ''}`.toLowerCase().includes(q));
  }, [stock, search]);

  const saveBranchStock = async () => {
    await window.api.branchInventory.upsert(stockForm);
    await load();
    notify('success', 'Branch stock saved.');
  };

  const createTransfer = async () => {
    await window.api.stockTransfers.create({
      source_branch_id: transferForm.source_branch_id,
      destination_branch_id: transferForm.destination_branch_id,
      request_date: today(),
      notes: transferForm.notes,
      items: [{ product_id: transferForm.product_id, quantity: Number(transferForm.quantity || 0) }]
    });
    await load();
    notify('success', 'Transfer request created.');
  };

  const createAdjustment = async () => {
    if (!String(adjustmentForm.reason || '').trim()) {
      notify('error', 'Adjustment reason is required.');
      return;
    }
    await window.api.inventoryAdjustments.create({
      branch_id: adjustmentForm.branch_id,
      adjustment_date: today(),
      adjustment_type: adjustmentForm.adjustment_type as any,
      reason: adjustmentForm.reason,
      notes: adjustmentForm.notes,
      items: [{ product_id: adjustmentForm.product_id, quantity_change: Number(adjustmentForm.quantity_change || 0) }]
    });
    await load();
    notify('success', 'Inventory adjustment posted.');
  };

  const approve = async (id: string) => { await window.api.stockTransfers.approve(id); await load(); notify('success', 'Transfer approved.'); };
  const markInTransit = async (id: string) => { await window.api.stockTransfers.markInTransit(id); await load(); notify('success', 'Transfer marked in transit.'); };
  const complete = async (id: string) => { await window.api.stockTransfers.complete(id); await load(); notify('success', 'Transfer completed.'); };
  const reject = async (id: string) => { await window.api.stockTransfers.reject(id); await load(); notify('success', 'Transfer rejected.'); };

  const openStockCard = async (productId: string) => {
    const card = await window.api.branchInventory.getStockCard(productId, branchFilter || undefined);
    setStockCard(card);
    setStockCardOpen(true);
  };

  return (
    <div className="space-y-4">
      {stockCardOpen && stockCard && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setStockCardOpen(false)}>
          <div className="bg-white border border-slate-200 rounded-[6px] shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-800">Stock Card</h3>
              <button className="text-slate-500" onClick={() => setStockCardOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-3 text-xs">
              <Metric label="Opening" value={stockCard.totals?.opening_stock || 0} />
              <Metric label="Purchases In" value={stockCard.totals?.purchases_in || 0} />
              <Metric label="Sales Out" value={stockCard.totals?.sales_out || 0} />
              <Metric label="Transfers In" value={stockCard.totals?.transfers_in || 0} />
              <Metric label="Transfers Out" value={stockCard.totals?.transfers_out || 0} />
              <Metric label="Closing" value={stockCard.current_stock || 0} />
            </div>
            <div className="mt-3 text-xs text-slate-600">Avg Cost: {Number(stockCard.average_cost || 0).toFixed(2)} | Estimated Value: Rs {Number(stockCard.estimated_value || 0).toLocaleString()}</div>
            <div className="mt-3 border border-slate-200 rounded-[6px] overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-slate-50"><tr><th className="px-2 py-1 text-left">Date</th><th className="px-2 py-1 text-left">Type</th><th className="px-2 py-1 text-right">In</th><th className="px-2 py-1 text-right">Out</th><th className="px-2 py-1 text-left">Reference</th></tr></thead>
                <tbody>{(stockCard.movement_rows || []).map((row: any) => <tr key={row.id} className="border-t border-slate-100"><td className="px-2 py-1">{row.date}</td><td className="px-2 py-1">{row.movement_type}</td><td className="px-2 py-1 text-right">{row.quantity_in}</td><td className="px-2 py-1 text-right">{row.quantity_out}</td><td className="px-2 py-1">{row.reference_type} {row.reference_id}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <Summary label="Branch SKUs" value={stock.length} />
        <Summary label="Low Stock" value={lowStock.length} />
        <Summary label="Inventory Value" value={`Rs ${totalValue.toLocaleString()}`} />
        <Summary label="Transfers" value={transfers.length} />
        <Summary label="Movements" value={movements.length} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <TabButton active={tab === 'stock'} onClick={() => setTab('stock')}>Branch Stock</TabButton>
        <TabButton active={tab === 'movements'} onClick={() => setTab('movements')}>Stock Movements</TabButton>
        <TabButton active={tab === 'transfers'} onClick={() => setTab('transfers')}>Transfers</TabButton>
        <TabButton active={tab === 'adjustments'} onClick={() => setTab('adjustments')}>Adjustments</TabButton>
        <TabButton active={tab === 'low_stock'} onClick={() => setTab('low_stock')}>Low Stock</TabButton>
        <TabButton active={tab === 'valuation'} onClick={() => setTab('valuation')}>Valuation</TabButton>
        <select className="erp-input ml-auto max-w-[220px]" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
          <option value="">All Branches</option>
          {accessibleBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_code} - {branch.branch_name}</option>)}
        </select>
        <input className="erp-input max-w-[220px]" placeholder="Search product/SKU/barcode" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="rounded-[4px] bg-slate-900 px-3 py-2 text-xs font-bold text-white" onClick={load}>Apply</button>
      </div>

      {tab === 'stock' && (
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">
          <Panel title="Create / Update Branch Stock">
            <Field label="Branch"><select className="erp-input" value={stockForm.branch_id} onChange={(e) => setStockForm({ ...stockForm, branch_id: e.target.value })}>{accessibleBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_code}</option>)}</select></Field>
            <Field label="Product"><select className="erp-input" value={stockForm.product_id} onChange={(e) => setStockForm({ ...stockForm, product_id: e.target.value })}><option value="">Select product</option>{productOptions.map((product) => <option key={product.id} value={product.id}>{product.sku} - {product.name}</option>)}</select></Field>
            <div className="grid grid-cols-3 gap-2">
              <Field label="Qty"><input type="number" className="erp-input" value={stockForm.quantity_on_hand} onChange={(e) => setStockForm({ ...stockForm, quantity_on_hand: Number(e.target.value) })} /></Field>
              <Field label="Reorder"><input type="number" className="erp-input" value={stockForm.reorder_level} onChange={(e) => setStockForm({ ...stockForm, reorder_level: Number(e.target.value) })} /></Field>
              <Field label="Avg Cost"><input type="number" className="erp-input" value={stockForm.average_cost} onChange={(e) => setStockForm({ ...stockForm, average_cost: Number(e.target.value) })} /></Field>
            </div>
            <button disabled={!hasPermission('inventory.adjust')} className="w-full inline-flex items-center justify-center gap-2 rounded-[4px] bg-primary-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-50" onClick={saveBranchStock}><ClipboardCheck className="w-4 h-4" />Save Branch Stock</button>
          </Panel>
          <BranchStockTable rows={filteredStock} onStockCard={openStockCard} canAdjust={hasPermission('inventory.adjust')} canTransfer={hasPermission('inventory.transfer')} />
        </div>
      )}

      {tab === 'movements' && (
        <section className="bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden">
          <Header title="Stock Movement History" icon={History} />
          <div className="p-3 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-2">
            <select className="erp-input" value={movementTypeFilter} onChange={(e) => setMovementTypeFilter(e.target.value)}>
              <option value="">All Movement Types</option>
              <option value="PURCHASE_IN">PURCHASE_IN</option>
              <option value="SALE_OUT">SALE_OUT</option>
              <option value="SALES_RETURN_IN">SALES_RETURN_IN</option>
              <option value="PURCHASE_RETURN_OUT">PURCHASE_RETURN_OUT</option>
              <option value="TRANSFER_IN">TRANSFER_IN</option>
              <option value="TRANSFER_OUT">TRANSFER_OUT</option>
              <option value="ADJUSTMENT_IN">ADJUSTMENT_IN</option>
              <option value="ADJUSTMENT_OUT">ADJUSTMENT_OUT</option>
              <option value="DAMAGE">DAMAGE</option>
              <option value="SHRINKAGE">SHRINKAGE</option>
            </select>
            <input className="erp-input" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <input className="erp-input" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <button className="rounded-[4px] bg-slate-900 px-3 py-2 text-xs font-bold text-white" onClick={load}>Refresh</button>
          </div>
          <table className="w-full text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-left">Branch</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-right">In</th><th className="px-3 py-2 text-right">Out</th><th className="px-3 py-2 text-left">Reference</th></tr></thead><tbody>{movements.map((row: any) => <tr key={row.id} className="border-t border-slate-100"><td className="px-3 py-2">{row.date}</td><td className="px-3 py-2">{row.sku} - {row.product_name}</td><td className="px-3 py-2">{row.branch_code || '-'}</td><td className="px-3 py-2">{row.movement_type}</td><td className="px-3 py-2 text-right">{row.quantity_in}</td><td className="px-3 py-2 text-right">{row.quantity_out}</td><td className="px-3 py-2">{row.reference_type} {row.reference_id}</td></tr>)}</tbody></table>
        </section>
      )}

      {tab === 'transfers' && (
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">
          <Panel title="New Transfer Request">
            <Field label="Source"><select className="erp-input" value={transferForm.source_branch_id} onChange={(e) => setTransferForm({ ...transferForm, source_branch_id: e.target.value })}>{accessibleBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_code}</option>)}</select></Field>
            <Field label="Destination"><select className="erp-input" value={transferForm.destination_branch_id} onChange={(e) => setTransferForm({ ...transferForm, destination_branch_id: e.target.value })}><option value="">Select branch</option>{accessibleBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_code}</option>)}</select></Field>
            <Field label="Product"><select className="erp-input" value={transferForm.product_id} onChange={(e) => setTransferForm({ ...transferForm, product_id: e.target.value })}><option value="">Select product</option>{productOptions.map((product) => <option key={product.id} value={product.id}>{product.sku} - {product.name}</option>)}</select></Field>
            <Field label="Quantity"><input type="number" className="erp-input" value={transferForm.quantity} onChange={(e) => setTransferForm({ ...transferForm, quantity: Number(e.target.value) })} /></Field>
            <Field label="Notes"><input className="erp-input" value={transferForm.notes} onChange={(e) => setTransferForm({ ...transferForm, notes: e.target.value })} /></Field>
            <button disabled={!hasPermission('inventory.transfer')} className="w-full rounded-[4px] bg-primary-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-50" onClick={createTransfer}>Create Transfer</button>
          </Panel>
          <TransferTable rows={transfers} approve={approve} markInTransit={markInTransit} complete={complete} reject={reject} canAct={hasPermission('inventory.transfer')} />
        </div>
      )}

      {tab === 'adjustments' && (
        <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-4">
          <Panel title="Inventory Adjustment">
            <Field label="Branch"><select className="erp-input" value={adjustmentForm.branch_id} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, branch_id: e.target.value })}>{accessibleBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_code}</option>)}</select></Field>
            <Field label="Type"><select className="erp-input" value={adjustmentForm.adjustment_type} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, adjustment_type: e.target.value })}><option>Damage</option><option>Shrinkage</option><option>Manual Correction</option><option>Opening Stock</option></select></Field>
            <Field label="Product"><select className="erp-input" value={adjustmentForm.product_id} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, product_id: e.target.value })}><option value="">Select product</option>{productOptions.map((product) => <option key={product.id} value={product.id}>{product.sku} - {product.name}</option>)}</select></Field>
            <Field label="Quantity Change"><input type="number" className="erp-input" value={adjustmentForm.quantity_change} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, quantity_change: Number(e.target.value) })} /></Field>
            <Field label="Reason"><input className="erp-input" value={adjustmentForm.reason} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, reason: e.target.value })} /></Field>
            <Field label="Notes"><input className="erp-input" value={adjustmentForm.notes} onChange={(e) => setAdjustmentForm({ ...adjustmentForm, notes: e.target.value })} /></Field>
            <button disabled={!hasPermission('inventory.adjust')} className="w-full rounded-[4px] bg-primary-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-50" onClick={createAdjustment}>Post Adjustment</button>
          </Panel>
          <AdjustmentTable rows={adjustments} />
        </div>
      )}

      {tab === 'low_stock' && (
        <section className="bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden">
          <Header title="Low Stock / Reorder" icon={ClipboardCheck} />
          <table className="w-full text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-left">Branch</th><th className="px-3 py-2 text-right">Current</th><th className="px-3 py-2 text-right">Reorder</th><th className="px-3 py-2 text-right">Suggested Qty</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>{lowStock.map((row: any) => <tr key={`${row.branch_id}-${row.product_id}`} className="border-t border-slate-100"><td className="px-3 py-2 font-bold">{row.sku} - {row.product_name}</td><td className="px-3 py-2">{row.branch_code}</td><td className="px-3 py-2 text-right">{row.quantity_on_hand}</td><td className="px-3 py-2 text-right">{row.reorder_level}</td><td className="px-3 py-2 text-right">{Math.max(0, Number(row.reorder_level || 0) - Number(row.quantity_on_hand || 0))}</td><td className="px-3 py-2"><div className="flex items-center justify-end gap-1"><IconActionButton icon={<ArrowRightLeft className="w-3.5 h-3.5" />} tooltip="Transfer stock" onClick={() => setTab('transfers')} /><IconActionButton icon={<Barcode className="w-3.5 h-3.5" />} tooltip="Contact supplier placeholder" onClick={() => notify('info', 'Supplier contact placeholder.')} /></div></td></tr>)}</tbody></table>
        </section>
      )}

      {tab === 'valuation' && (
        <div className="space-y-4">
          <Panel title="Valuation Foundation">
            <p className="text-xs text-slate-500">Average-cost valuation is active. FIFO and batch/lot tracking fields are prepared for the next deeper inventory costing phase.</p>
            <div className="text-3xl font-black text-slate-900">Rs {totalValue.toLocaleString()}</div>
          </Panel>
          <BranchStockTable rows={valuation?.rows || []} onStockCard={openStockCard} canAdjust={false} canTransfer={false} />
        </div>
      )}
    </div>
  );
};

const Metric: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div className="border border-slate-200 rounded-[4px] p-2"><div className="text-[10px] uppercase text-slate-500">{label}</div><div className="text-sm font-bold text-slate-800">{value}</div></div>;
const Summary: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"><Layers className="w-3.5 h-3.5" />{label}</div><div className="mt-1 text-2xl font-black text-slate-900">{value}</div></div>;
const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => <button className={`px-4 py-2 rounded-[4px] text-xs font-bold ${active ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'}`} onClick={onClick}>{children}</button>;
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 space-y-1"><span>{label}</span>{children}</label>;
const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => <section className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm space-y-3"><h3 className="text-sm font-black text-slate-800">{title}</h3>{children}</section>;
const Header: React.FC<{ title: string; icon: React.ElementType }> = ({ title, icon: Icon }) => <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2"><Icon className="w-4 h-4 text-primary-blue" /><h3 className="text-sm font-black text-slate-800">{title}</h3></div>;
const Badge: React.FC<{ value: string }> = ({ value }) => <span className="px-2 py-1 rounded-[3px] text-[10px] font-black uppercase bg-slate-100 text-slate-700">{value}</span>;

const BranchStockTable: React.FC<{ rows: BranchInventory[]; onStockCard: (productId: string) => void; canAdjust: boolean; canTransfer: boolean }> = ({ rows, onStockCard, canAdjust, canTransfer }) => (
  <section className="bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden">
    <Header title="Branch Stock Report" icon={ClipboardCheck} />
    <table className="w-full text-xs">
      <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-left">Branch</th><th className="px-3 py-2 text-right">On Hand</th><th className="px-3 py-2 text-right">Reserved</th><th className="px-3 py-2 text-right">Available</th><th className="px-3 py-2 text-right">Reorder</th><th className="px-3 py-2 text-right">Value</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
      <tbody>
        {rows.map((row: any) => {
          const low = Number(row.quantity_on_hand || 0) <= Number(row.reorder_level || 0);
          return (
            <tr key={`${row.branch_id}-${row.product_id}`} className="border-t border-slate-100">
              <td className="px-3 py-2 font-bold">{row.sku} - {row.product_name}</td>
              <td className="px-3 py-2">{row.branch_code}</td>
              <td className="px-3 py-2 text-right">{row.quantity_on_hand}</td>
              <td className="px-3 py-2 text-right">{row.quantity_reserved}</td>
              <td className="px-3 py-2 text-right">{row.available_quantity}</td>
              <td className="px-3 py-2 text-right"><span className={low ? 'text-red-600 font-bold' : ''}>{row.reorder_level}</span></td>
              <td className="px-3 py-2 text-right">{Number(row.inventory_value || 0).toLocaleString()}</td>
              <td className="px-3 py-2"><div className="flex items-center justify-end gap-1"><IconActionButton icon={<Eye className="w-3.5 h-3.5" />} tooltip="View stock card" onClick={() => onStockCard(row.product_id)} /><IconActionButton icon={<SlidersHorizontal className="w-3.5 h-3.5" />} tooltip="Adjust stock" disabled={!canAdjust} disabledTooltip="Only admin/manager can perform this action" onClick={() => {}} /><IconActionButton icon={<ArrowRightLeft className="w-3.5 h-3.5" />} tooltip="Transfer stock" disabled={!canTransfer} disabledTooltip="Only admin/manager can perform this action" onClick={() => {}} /><IconActionButton icon={<History className="w-3.5 h-3.5" />} tooltip="Movement history" onClick={() => onStockCard(row.product_id)} /><IconActionButton icon={<Barcode className="w-3.5 h-3.5" />} tooltip="Barcode label" onClick={() => {}} /></div></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </section>
);

const TransferTable: React.FC<{ rows: StockTransfer[]; approve: (id: string) => void; markInTransit: (id: string) => void; complete: (id: string) => void; reject: (id: string) => void; canAct: boolean }> = ({ rows, approve, markInTransit, complete, reject, canAct }) => <section className="bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden"><Header title="Transfer History" icon={ArrowRightLeft} /><table className="w-full text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 text-left">Transfer</th><th className="px-3 py-2 text-left">Route</th><th className="px-3 py-2 text-left">Items</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>{rows.map((row: any) => <tr key={row.id} className="border-t border-slate-100"><td className="px-3 py-2 font-bold">{row.transfer_no}</td><td className="px-3 py-2">{row.source_branch_code} to {row.destination_branch_code}</td><td className="px-3 py-2">{row.items?.map((item: any) => `${item.product_name} x ${item.quantity}`).join(', ')}</td><td className="px-3 py-2"><Badge value={row.status} /></td><td className="px-3 py-2"><div className="flex items-center justify-end gap-1"><IconActionButton icon={<Eye className="w-3.5 h-3.5" />} tooltip="View transfer" onClick={() => {}} />{row.status === 'Pending' && canAct && <IconActionButton icon={<Check className="w-3.5 h-3.5" />} tooltip="Approve transfer" onClick={() => approve(row.id)} />}{row.status === 'Pending' && canAct && <IconActionButton icon={<Truck className="w-3.5 h-3.5" />} tooltip="Mark in transit" onClick={() => markInTransit(row.id)} />}{row.status === 'In Transit' && canAct && <IconActionButton icon={<CheckCircle2 className="w-3.5 h-3.5" />} tooltip="Complete transfer" variant="success" onClick={() => complete(row.id)} />}{row.status === 'Pending' && canAct && <IconActionButton icon={<X className="w-3.5 h-3.5" />} tooltip="Reject transfer" danger onClick={() => reject(row.id)} />}</div></td></tr>)}</tbody></table></section>;
const AdjustmentTable: React.FC<{ rows: InventoryAdjustment[] }> = ({ rows }) => <section className="bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden"><Header title="Adjustment History" icon={ClipboardCheck} /><table className="w-full text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Branch</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Reason</th><th className="px-3 py-2 text-left">Items</th><th className="px-3 py-2 text-left">Accounting</th></tr></thead><tbody>{rows.map((row: any) => <tr key={row.id} className="border-t border-slate-100"><td className="px-3 py-2">{row.adjustment_date}</td><td className="px-3 py-2">{row.branch_code}</td><td className="px-3 py-2">{row.adjustment_type}</td><td className="px-3 py-2">{row.reason}</td><td className="px-3 py-2">{row.items?.map((item: any) => `${item.product_name}: ${item.quantity_change}`).join(', ')}</td><td className="px-3 py-2"><Badge value={row.accounting_status} /></td></tr>)}</tbody></table></section>;
