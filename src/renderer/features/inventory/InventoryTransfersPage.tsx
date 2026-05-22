import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, ClipboardCheck, Layers, Save } from 'lucide-react';
import { useErp } from '../../app/providers/ErpContext';
import { BranchInventory, InventoryAdjustment, Product, StockTransfer } from '../../shared/types';

type Tab = 'stock' | 'transfers' | 'adjustments' | 'valuation';
const today = () => new Date().toISOString().split('T')[0];

export const InventoryTransfersPage: React.FC<{ initialTab?: Tab }> = ({ initialTab = 'stock' }) => {
  const { accessibleBranches, activeBranchId, products, hasPermission, notify } = useErp();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [branchFilter, setBranchFilter] = useState(activeBranchId || '');
  const [stock, setStock] = useState<BranchInventory[]>([]);
  const [lowStock, setLowStock] = useState<BranchInventory[]>([]);
  const [valuation, setValuation] = useState<Record<string, any> | null>(null);
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [adjustments, setAdjustments] = useState<InventoryAdjustment[]>([]);
  const [stockForm, setStockForm] = useState({ branch_id: activeBranchId || '', product_id: '', quantity_on_hand: 0, reorder_level: 0, average_cost: 0 });
  const [transferForm, setTransferForm] = useState({ source_branch_id: activeBranchId || '', destination_branch_id: '', product_id: '', quantity: 1, notes: '' });
  const [adjustmentForm, setAdjustmentForm] = useState({ branch_id: activeBranchId || '', product_id: '', quantity_change: 0, adjustment_type: 'Manual Correction', reason: '', notes: '' });

  const load = async () => {
    const [stockRows, lowRows, valueRows, transferRows, adjustmentRows] = await Promise.all([
      window.api.branchInventory.getAll(branchFilter || undefined),
      window.api.branchInventory.lowStock(branchFilter || undefined),
      window.api.branchInventory.valuation(branchFilter || undefined),
      window.api.stockTransfers.getAll(),
      window.api.inventoryAdjustments.getAll()
    ]);
    setStock(stockRows);
    setLowStock(lowRows);
    setValuation(valueRows);
    setTransfers(transferRows);
    setAdjustments(adjustmentRows);
  };

  useEffect(() => { load().catch((error) => notify('error', error.message || 'Failed to load warehouse controls.')); }, []);

  const productOptions = useMemo(() => products.filter((product: Product) => product.status === 'active'), [products]);
  const totalValue = Number(valuation?.totalValue || 0);

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

  const approve = async (id: string) => { await window.api.stockTransfers.approve(id); await load(); notify('success', 'Transfer approved and source stock deducted.'); };
  const complete = async (id: string) => { await window.api.stockTransfers.complete(id); await load(); notify('success', 'Transfer completed and destination stock increased.'); };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Summary label="Branch SKUs" value={stock.length} />
        <Summary label="Low Stock" value={lowStock.length} />
        <Summary label="Inventory Value" value={`Rs ${totalValue.toLocaleString()}`} />
        <Summary label="Transfers" value={transfers.length} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <TabButton active={tab === 'stock'} onClick={() => setTab('stock')}>Branch Stock</TabButton>
        <TabButton active={tab === 'transfers'} onClick={() => setTab('transfers')}>Transfers</TabButton>
        <TabButton active={tab === 'adjustments'} onClick={() => setTab('adjustments')}>Adjustments</TabButton>
        <TabButton active={tab === 'valuation'} onClick={() => setTab('valuation')}>Valuation</TabButton>
        <select className="erp-input ml-auto max-w-[220px]" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
          <option value="">All Branches</option>
          {accessibleBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_code} - {branch.branch_name}</option>)}
        </select>
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
            <button disabled={!hasPermission('inventory.adjust')} className="w-full inline-flex items-center justify-center gap-2 rounded-[4px] bg-primary-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-50" onClick={saveBranchStock}><Save className="w-4 h-4" />Save Branch Stock</button>
          </Panel>
          <StockTable rows={stock} />
        </div>
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
          <TransferTable rows={transfers} approve={approve} complete={complete} canAct={hasPermission('inventory.transfer')} />
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

      {tab === 'valuation' && (
        <div className="space-y-4">
          <Panel title="Valuation Foundation">
            <p className="text-xs text-slate-500">Average-cost valuation is active. FIFO and batch/lot tracking fields are prepared for the next deeper inventory costing phase.</p>
            <div className="text-3xl font-black text-slate-900">Rs {totalValue.toLocaleString()}</div>
          </Panel>
          <StockTable rows={valuation?.rows || []} />
        </div>
      )}
    </div>
  );
};

const Summary: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"><Layers className="w-3.5 h-3.5" />{label}</div><div className="mt-1 text-2xl font-black text-slate-900">{value}</div></div>;
const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => <button className={`px-4 py-2 rounded-[4px] text-xs font-bold ${active ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'}`} onClick={onClick}>{children}</button>;
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 space-y-1"><span>{label}</span>{children}</label>;
const Panel: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => <section className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm space-y-3"><h3 className="text-sm font-black text-slate-800">{title}</h3>{children}</section>;

const StockTable: React.FC<{ rows: BranchInventory[] }> = ({ rows }) => <section className="bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden"><Header title="Branch Stock Report" icon={ClipboardCheck} /><table className="w-full text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 text-left">Branch</th><th className="px-3 py-2 text-left">Product</th><th className="px-3 py-2 text-right">On Hand</th><th className="px-3 py-2 text-right">Reserved</th><th className="px-3 py-2 text-right">Available</th><th className="px-3 py-2 text-right">Value</th></tr></thead><tbody>{rows.map((row) => <tr key={`${row.branch_id}-${row.product_id}`} className="border-t border-slate-100"><td className="px-3 py-2">{row.branch_code}</td><td className="px-3 py-2 font-bold">{row.sku} - {row.product_name}</td><td className="px-3 py-2 text-right">{row.quantity_on_hand}</td><td className="px-3 py-2 text-right">{row.quantity_reserved}</td><td className="px-3 py-2 text-right">{row.available_quantity}</td><td className="px-3 py-2 text-right">{Number(row.inventory_value || 0).toLocaleString()}</td></tr>)}</tbody></table></section>;
const TransferTable: React.FC<{ rows: StockTransfer[]; approve: (id: string) => void; complete: (id: string) => void; canAct: boolean }> = ({ rows, approve, complete, canAct }) => <section className="bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden"><Header title="Transfer History" icon={ArrowRightLeft} /><table className="w-full text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 text-left">Transfer</th><th className="px-3 py-2 text-left">Route</th><th className="px-3 py-2 text-left">Items</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Actions</th></tr></thead><tbody>{rows.map((row: any) => <tr key={row.id} className="border-t border-slate-100"><td className="px-3 py-2 font-bold">{row.transfer_no}</td><td className="px-3 py-2">{row.source_branch_code} to {row.destination_branch_code}</td><td className="px-3 py-2">{row.items?.map((item: any) => `${item.product_name} x ${item.quantity}`).join(', ')}</td><td className="px-3 py-2"><Badge value={row.status} /></td><td className="px-3 py-2 text-right space-x-2">{row.status === 'Pending' && canAct && <button className="text-primary-blue font-bold" onClick={() => approve(row.id)}>Approve</button>}{row.status === 'In Transit' && canAct && <button className="text-emerald-700 font-bold" onClick={() => complete(row.id)}>Complete</button>}</td></tr>)}</tbody></table></section>;
const AdjustmentTable: React.FC<{ rows: InventoryAdjustment[] }> = ({ rows }) => <section className="bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden"><Header title="Adjustment History" icon={ClipboardCheck} /><table className="w-full text-xs"><thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Branch</th><th className="px-3 py-2 text-left">Type</th><th className="px-3 py-2 text-left">Reason</th><th className="px-3 py-2 text-left">Items</th><th className="px-3 py-2 text-left">Accounting</th></tr></thead><tbody>{rows.map((row: any) => <tr key={row.id} className="border-t border-slate-100"><td className="px-3 py-2">{row.adjustment_date}</td><td className="px-3 py-2">{row.branch_code}</td><td className="px-3 py-2">{row.adjustment_type}</td><td className="px-3 py-2">{row.reason}</td><td className="px-3 py-2">{row.items?.map((item: any) => `${item.product_name}: ${item.quantity_change}`).join(', ')}</td><td className="px-3 py-2"><Badge value={row.accounting_status} /></td></tr>)}</tbody></table></section>;
const Header: React.FC<{ title: string; icon: React.ElementType }> = ({ title, icon: Icon }) => <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2"><Icon className="w-4 h-4 text-primary-blue" /><h3 className="text-sm font-black text-slate-800">{title}</h3></div>;
const Badge: React.FC<{ value: string }> = ({ value }) => <span className="px-2 py-1 rounded-[3px] text-[10px] font-black uppercase bg-slate-100 text-slate-700">{value}</span>;
