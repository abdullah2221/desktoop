import React, { useEffect, useMemo, useState } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Invoice, InvoiceItem, InvoicePayment, Quote, QuoteItem, QuoteStatus } from '../../shared/types';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { SalesReceiptDetail } from './SalesReceiptDetail';

const defaultLine = (): QuoteItem => ({ product_id: '', quantity: 1, unit_price: 0, discount: 0, tax_rate: 0, line_total: 0 });

function lineTotal(quantity: number, unitPrice: number, discount: number, taxRate: number) {
  const base = quantity * unitPrice;
  const discounted = Math.max(0, base - discount);
  return discounted + (discounted * (taxRate / 100));
}

export const SalesPage: React.FC = () => {
  const { products, customers, notify, reloadProducts, setActiveTab, hasPermission, activeUser, activeBranchId } = useErp();
  const [tab, setTab] = useState<'pos_receipts' | 'invoices' | 'quotes' | 'payments' | 'returns'>('pos_receipts');

  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<InvoicePayment[]>([]);
  const [posSales, setPosSales] = useState<any[]>([]);
  const [salesReturns, setSalesReturns] = useState<any[]>([]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [customerFilter, setCustomerFilter] = useState('All');
  const [cashierFilter, setCashierFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedReceiptNo, setSelectedReceiptNo] = useState<string | null>(null);

  const [drawerQuote, setDrawerQuote] = useState<Quote | null>(null);
  const [drawerInvoice, setDrawerInvoice] = useState<Invoice | null>(null);

  const [quoteValidation, setQuoteValidation] = useState('');
  const [invoiceValidation, setInvoiceValidation] = useState('');

  const [quoteForm, setQuoteForm] = useState<{ id?: string; customer_name: string; quote_date: string; expiry_date: string; status: QuoteStatus; notes: string; items: QuoteItem[] }>({
    customer_name: '',
    quote_date: new Date().toISOString().split('T')[0],
    expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    status: 'Draft',
    notes: '',
    items: [defaultLine()]
  });

  const [invoiceForm, setInvoiceForm] = useState<{ id?: string; customer_name: string; invoice_date: string; due_date: string; status: Invoice['status']; notes: string; items: InvoiceItem[] }>({
    customer_name: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: new Date().toISOString().split('T')[0],
    status: 'Draft',
    notes: '',
    items: [defaultLine()]
  });

  const [paymentForm, setPaymentForm] = useState({
    invoice_id: '',
    payment_date: new Date().toISOString().split('T')[0],
    amount: 0,
    payment_method: 'Cash' as 'Cash' | 'Bank',
    reference_no: '',
    notes: ''
  });

  const totals = (items: Array<{ quantity: number; unit_price: number; discount: number; tax_rate: number }>) => {
    const subtotal = items.reduce((sum, l) => sum + (l.quantity * l.unit_price), 0);
    const discount_total = items.reduce((sum, l) => sum + l.discount, 0);
    const tax_total = items.reduce((sum, l) => {
      const base = Math.max(0, l.quantity * l.unit_price - l.discount);
      return sum + (base * (l.tax_rate / 100));
    }, 0);
    return { subtotal, discount_total, tax_total, grand_total: subtotal - discount_total + tax_total };
  };

  const quoteTotals = useMemo(() => totals(quoteForm.items), [quoteForm.items]);
  const invoiceTotals = useMemo(() => totals(invoiceForm.items), [invoiceForm.items]);

  const loadQuotes = async () => setQuotes(await window.api.quotes.getAll());
  const loadInvoices = async () => setInvoices(await window.api.invoices.getAll());
  const loadPosSales = async () => setPosSales(await window.api.sales.getHistory({ limit: 500 }));
  const loadSalesReturns = async () => setSalesReturns(await window.api.returns.getSalesHistory());

  const loadPayments = async () => {
    if (!paymentForm.invoice_id) {
      setPayments([]);
      return;
    }
    setPayments(await window.api.invoicePayments.getByInvoice(paymentForm.invoice_id));
  };

  useEffect(() => {
    loadQuotes();
    loadInvoices();
    loadPosSales();
    loadSalesReturns();
  }, []);

  useEffect(() => {
    loadPayments();
  }, [paymentForm.invoice_id]);

  const updateQuoteLine = (idx: number, patch: Partial<QuoteItem>) => {
    const lines = [...quoteForm.items];
    const line = { ...lines[idx], ...patch };
    line.line_total = lineTotal(line.quantity, line.unit_price, line.discount, line.tax_rate);
    lines[idx] = line;
    setQuoteForm((prev) => ({ ...prev, items: lines }));
  };

  const updateInvoiceLine = (idx: number, patch: Partial<InvoiceItem>) => {
    const lines = [...invoiceForm.items];
    const line = { ...lines[idx], ...patch };
    line.line_total = lineTotal(line.quantity, line.unit_price, line.discount, line.tax_rate);
    lines[idx] = line;
    setInvoiceForm((prev) => ({ ...prev, items: lines }));
  };

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (statusFilter !== 'All' && q.status !== statusFilter) return false;
      if (customerFilter !== 'All' && q.customer_name !== customerFilter) return false;
      if (dateFrom && q.quote_date < dateFrom) return false;
      if (dateTo && q.quote_date > dateTo) return false;
      if (search && !(q.quote_no.toLowerCase().includes(search.toLowerCase()) || q.customer_name.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [quotes, search, statusFilter, customerFilter, dateFrom, dateTo]);

  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => {
      if (statusFilter !== 'All' && i.status !== statusFilter) return false;
      if (customerFilter !== 'All' && i.customer_name !== customerFilter) return false;
      if (dateFrom && i.invoice_date < dateFrom) return false;
      if (dateTo && i.invoice_date > dateTo) return false;
      if (cashierFilter && !String((i as any).cashier_name || '').toLowerCase().includes(cashierFilter.toLowerCase())) return false;
      if (branchFilter && !String((i as any).branch_id || '').toLowerCase().includes(branchFilter.toLowerCase()) && !String((i as any).branch_name || '').toLowerCase().includes(branchFilter.toLowerCase())) return false;
      if (search && !(i.invoice_no.toLowerCase().includes(search.toLowerCase()) || i.customer_name.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    });
  }, [invoices, search, statusFilter, customerFilter, dateFrom, dateTo, cashierFilter, branchFilter]);

  const saveQuote = async () => {
    setQuoteValidation('');
    if (!quoteForm.customer_name) {
      setQuoteValidation('Customer is required.');
      return;
    }
    const lines = quoteForm.items.filter((i) => i.product_id);
    if (lines.length === 0) {
      setQuoteValidation('At least one product line is required.');
      return;
    }

    const payload = { ...quoteForm, ...quoteTotals, items: lines };
    if (quoteForm.id) {
      await window.api.quotes.update(payload);
      notify('success', 'Quote updated successfully.');
    } else {
      await window.api.quotes.create(payload);
      notify('success', 'Quote created successfully.');
    }
    setQuoteForm({ customer_name: '', quote_date: new Date().toISOString().split('T')[0], expiry_date: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0], status: 'Draft', notes: '', items: [defaultLine()] });
    await loadQuotes();
  };

  const editQuote = async (id: string) => {
    const q = await window.api.quotes.getById(id) as Quote;
    setQuoteForm({ id: q.id, customer_name: q.customer_name, quote_date: q.quote_date, expiry_date: q.expiry_date, status: q.status, notes: q.notes || '', items: q.items?.length ? q.items : [defaultLine()] });
  };

  const convertQuote = async (id: string) => {
    await window.api.quotes.convertToInvoice(id);
    notify('success', 'Quote converted into draft invoice.');
    await loadQuotes();
    await loadInvoices();
    setTab('invoices');
  };

  const saveInvoice = async () => {
    setInvoiceValidation('');
    if (!invoiceForm.customer_name) {
      setInvoiceValidation('Customer is required.');
      return;
    }
    const lines = invoiceForm.items.filter((i) => i.product_id);
    if (lines.length === 0) {
      setInvoiceValidation('At least one invoice line is required.');
      return;
    }

    const payload = { ...invoiceForm, ...invoiceTotals, amount_paid: invoiceForm.status === 'Paid' ? invoiceTotals.grand_total : 0, items: lines };
    if (invoiceForm.id) {
      await window.api.invoices.updateDraft(payload);
      notify('success', 'Draft invoice updated.');
    } else {
      await window.api.invoices.create(payload);
      notify('success', 'Invoice saved.');
    }

    setInvoiceForm({ customer_name: '', invoice_date: new Date().toISOString().split('T')[0], due_date: new Date().toISOString().split('T')[0], status: 'Draft', notes: '', items: [defaultLine()] });
    await loadInvoices();
    await reloadProducts();
  };

  const editInvoice = async (id: string) => {
    const inv = await window.api.invoices.getById(id) as Invoice;
    if (inv.status !== 'Draft') {
      notify('error', 'Only draft invoices can be edited.');
      return;
    }
    setInvoiceForm({ id: inv.id, customer_name: inv.customer_name, invoice_date: inv.invoice_date, due_date: inv.due_date || inv.invoice_date, status: inv.status, notes: inv.notes || '', items: inv.items?.length ? inv.items : [defaultLine()] });
  };

  const finalizeInvoice = async (id: string) => {
    await window.api.invoices.finalize(id);
    notify('success', 'Invoice finalized.');
    await loadInvoices();
    await reloadProducts();
  };

  const voidInvoice = async (id: string) => {
    const ok = await window.api.invoices.void(id);
    if (!ok) {
      notify('error', 'Only draft invoices can be voided.');
      return;
    }
    notify('success', 'Invoice voided.');
    await loadInvoices();
  };

  const savePayment = async () => {
    if (!paymentForm.invoice_id || paymentForm.amount <= 0) {
      notify('error', 'Invoice and amount are required.');
      return;
    }
    await window.api.invoicePayments.create(paymentForm);
    notify('success', 'Payment recorded.');
    setPaymentForm((prev) => ({ ...prev, amount: 0, reference_no: '', notes: '' }));
    await loadInvoices();
    await loadPayments();
  };

  const statusBadge = (status: string) => {
    if (status === 'Paid' || status === 'Accepted') return 'success';
    if (status === 'Rejected' || status === 'Void' || status === 'VOIDED') return 'danger';
    return 'warning';
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {(['pos_receipts', 'invoices', 'quotes', 'payments', 'returns'] as const).map((t) => (
          <button key={t} id={`sales-tab-${t}`} className={`px-4 py-2 text-sm font-semibold rounded-[4px] ${tab === t ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setTab(t)}>
            {t === 'pos_receipts' ? 'POS Receipts' : t === 'invoices' ? 'Sales Invoices' : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <Card title="Sales Filters">
        <div className="grid grid-cols-1 md:grid-cols-9 gap-3">
          <Input id="sales-search" placeholder="Search customer / number" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select id="sales-status-filter" className="erp-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option>All</option>
            {(tab === 'quotes'
              ? ['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired']
              : tab === 'pos_receipts'
                ? ['Paid', 'Credit', 'VOIDED', 'RETURNED', 'PARTIALLY_RETURNED']
                : ['Draft', 'Unpaid', 'Partially Paid', 'Paid', 'Void']
            ).map((s) => <option key={s}>{s}</option>)}
          </select>
          <select id="sales-customer-filter" className="erp-input" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
            <option>All</option>
            {customers.map((c) => <option key={c.name}>{c.name}</option>)}
          </select>
          <Input id="sales-date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input id="sales-date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <Input id="sales-cashier-filter" placeholder="Cashier" value={cashierFilter} onChange={(e) => setCashierFilter(e.target.value)} />
          <Input id="sales-branch-filter" placeholder="Branch" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} />
          <Input id="sales-shift-filter" placeholder="Shift" value={shiftFilter} onChange={(e) => setShiftFilter(e.target.value)} />
          <select id="sales-payment-method-filter" className="erp-input" value={paymentMethodFilter} onChange={(e) => setPaymentMethodFilter(e.target.value)}>
            <option>All</option><option>Cash</option><option>Credit</option><option>Bank</option>
          </select>
        </div>
      </Card>

      {tab === 'pos_receipts' && (
        <Card title="POS Receipts">
          {posSales.length === 0 ? <p className="text-xs text-slate-500 py-6 text-center">No POS sales found for current filters.</p> : (
            <table className="erp-table">
              <thead><tr><th>Receipt #</th><th>Date/Time</th><th>Customer</th><th>Cashier</th><th>Branch</th><th>Register</th><th>Shift</th><th>Payment</th><th>Subtotal</th><th>Discount</th><th>Tax</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {posSales.filter((s: any) => {
                  const canViewAll = hasPermission('sales.view.all');
                  const canViewBranch = hasPermission('sales.view.branch');
                  const canViewOwn = hasPermission('sales.view.own') || hasPermission('pos.sale.create');
                  if (!canViewAll) {
                    if (canViewBranch && activeBranchId && s.branch_id !== activeBranchId) return false;
                    if (canViewOwn && !canViewBranch && activeUser?.id && s.cashier_id !== activeUser.id) return false;
                  }
                  if (customerFilter !== 'All' && s.customerName !== customerFilter) return false;
                  if (statusFilter !== 'All' && s.status !== statusFilter) return false;
                  if (dateFrom && s.date < dateFrom) return false;
                  if (dateTo && s.date > dateTo) return false;
                  if (cashierFilter && !String(s.cashier_name || s.cashier_id || '').toLowerCase().includes(cashierFilter.toLowerCase())) return false;
                  if (branchFilter && !String(s.branch_name || s.branch_id || '').toLowerCase().includes(branchFilter.toLowerCase())) return false;
                  if (shiftFilter && !String(s.shift_id || '').toLowerCase().includes(shiftFilter.toLowerCase())) return false;
                  if (paymentMethodFilter !== 'All' && String(s.payment_method || (s.status === 'Credit' ? 'Credit' : 'Cash')) !== paymentMethodFilter) return false;
                  if (search && !(`${s.invoiceNo} ${s.customerName}`.toLowerCase().includes(search.toLowerCase()))) return false;
                  return true;
                }).map((row: any) => (
                  <tr key={row.invoiceNo}>
                    <td>{row.invoiceNo}</td>
                    <td>{row.sale_time ? new Date(row.sale_time).toLocaleString() : row.date}</td>
                    <td>{row.customerName || 'Walk-in Customer'}</td>
                    <td>{row.cashier_name || '-'}</td>
                    <td>{row.branch_name || row.branch_id || '-'}</td>
                    <td>{row.register_id || '-'}</td>
                    <td>{row.shift_id || '-'}</td>
                    <td>{row.payment_method || (row.status === 'Credit' ? 'Credit' : 'Cash')}</td>
                    <td>Rs. {Number(row.subtotal || row.total || 0).toLocaleString()}</td>
                    <td>Rs. {Number(row.discount_amount ?? row.discount ?? 0).toLocaleString()}</td>
                    <td>Rs. {Number(row.tax_amount || 0).toLocaleString()}</td>
                    <td>Rs. {Number(row.total || 0).toLocaleString()}</td>
                    <td><Badge variant={statusBadge(row.status) as any}>{row.status}</Badge></td>
                    <td className="flex gap-1">
                      <Button size="sm" variant="secondary" onClick={() => setSelectedReceiptNo(row.invoiceNo)}>View</Button>
                      {hasPermission('sales.receipt.reprint') && <Button size="sm" onClick={async () => {
                        const payload = await window.api.receipts.fromSale(row.invoiceNo);
                        await window.api.receipts.print(payload, false);
                      }}>Reprint</Button>}
                      {hasPermission('sales.return') && <Button size="sm" variant="danger" onClick={() => setActiveTab('sales_returns')}>Return</Button>}
                      {hasPermission('sales.void') && row.status !== 'VOIDED' && <Button size="sm" variant="danger" onClick={async () => {
                        await window.api.sales.void(row.invoiceNo, 'Voided from Sales page');
                        notify('success', `Sale ${row.invoiceNo} voided.`);
                        await loadPosSales();
                        await reloadProducts();
                      }}>Void</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'quotes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2" title="Quotes">
            {filteredQuotes.length === 0 ? <p className="text-xs text-slate-500 py-6 text-center">No quotes found for current filters.</p> : (
              <table className="erp-table">
                <thead><tr><th>No</th><th>Customer</th><th>Date</th><th>Expiry</th><th>Status</th><th>Total</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredQuotes.map((q) => (
                    <tr key={q.id} onClick={() => setDrawerQuote(q)} className="cursor-pointer">
                      <td>{q.quote_no}</td><td>{q.customer_name}</td><td>{q.quote_date}</td><td>{q.expiry_date}</td>
                      <td><Badge variant={statusBadge(q.status) as any}>{q.status}</Badge></td>
                      <td>Rs. {q.grand_total.toLocaleString()}</td>
                      <td className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); editQuote(q.id); }}>Edit</Button>
                        <Button id={`quote-convert-${q.id}`} size="sm" onClick={(e) => { e.stopPropagation(); convertQuote(q.id); }}>Convert</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Quote Editor">
            <div className="space-y-2">
              <select id="quote-customer" className="erp-input" value={quoteForm.customer_name} onChange={(e) => setQuoteForm((p) => ({ ...p, customer_name: e.target.value }))}>
                <option value="">Select Customer</option>{customers.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input id="quote-date" type="date" value={quoteForm.quote_date} onChange={(e) => setQuoteForm((p) => ({ ...p, quote_date: e.target.value }))} />
                <Input id="quote-expiry" type="date" value={quoteForm.expiry_date} onChange={(e) => setQuoteForm((p) => ({ ...p, expiry_date: e.target.value }))} />
              </div>
              <select id="quote-status" className="erp-input" value={quoteForm.status} onChange={(e) => setQuoteForm((p) => ({ ...p, status: e.target.value as QuoteStatus }))}>
                {['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired'].map((s) => <option key={s}>{s}</option>)}
              </select>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {quoteForm.items.map((line, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-[4px] p-2 grid grid-cols-12 gap-1 text-xs items-center">
                    <select className="erp-input col-span-5" value={line.product_id} onChange={(e) => updateQuoteLine(idx, { product_id: e.target.value })}>
                      <option value="">Product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input className="erp-input col-span-2" type="number" min="1" value={line.quantity} onChange={(e) => updateQuoteLine(idx, { quantity: Number(e.target.value) })} />
                    <input className="erp-input col-span-2" type="number" min="0" value={line.unit_price} onChange={(e) => updateQuoteLine(idx, { unit_price: Number(e.target.value) })} />
                    <input className="erp-input col-span-2" type="number" min="0" value={line.discount} onChange={(e) => updateQuoteLine(idx, { discount: Number(e.target.value) })} />
                    <span className="col-span-1 text-right">{line.line_total.toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setQuoteForm((p) => ({ ...p, items: [...p.items, defaultLine()] }))}>Add Line</Button>
                <Button id="quote-save" onClick={saveQuote}>Save Quote</Button>
              </div>
              {quoteValidation && <p className="text-xs text-red-600">{quoteValidation}</p>}
              <p className="text-xs text-slate-600">Total: Rs. {quoteTotals.grand_total.toLocaleString()}</p>
            </div>
          </Card>
        </div>
      )}

      {tab === 'invoices' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2" title="Invoices">
            {filteredInvoices.length === 0 ? <p className="text-xs text-slate-500 py-6 text-center">No invoices found for current filters.</p> : (
              <table className="erp-table">
                <thead><tr><th>No</th><th>Customer</th><th>Date</th><th>Cashier</th><th>Branch</th><th>Status</th><th>Total</th><th>Due</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id} onClick={() => setDrawerInvoice(inv)} className="cursor-pointer">
                      <td>{inv.invoice_no}</td><td>{inv.customer_name}</td><td>{inv.invoice_date}</td>
                      <td>{(inv as any).cashier_name || '-'}</td>
                      <td>{(inv as any).branch_name || inv.branch_id || '-'}</td>
                      <td><Badge variant={statusBadge(inv.status) as any}>{inv.status}</Badge></td>
                      <td>Rs. {inv.grand_total.toLocaleString()}</td><td>Rs. {inv.balance_due.toLocaleString()}</td>
                      <td className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); editInvoice(inv.id); }}>Edit</Button>
                        <Button id={`invoice-finalize-${inv.id}`} size="sm" onClick={(e) => { e.stopPropagation(); finalizeInvoice(inv.id); }}>Finalize</Button>
                        <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); voidInvoice(inv.id); }}>Void</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          <Card title="Invoice Editor">
            <div className="space-y-2">
              <select id="invoice-customer" className="erp-input" value={invoiceForm.customer_name} onChange={(e) => setInvoiceForm((p) => ({ ...p, customer_name: e.target.value }))}>
                <option value="">Select Customer</option>{customers.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <Input id="invoice-date" type="date" value={invoiceForm.invoice_date} onChange={(e) => setInvoiceForm((p) => ({ ...p, invoice_date: e.target.value }))} />
                <Input id="invoice-due-date" type="date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm((p) => ({ ...p, due_date: e.target.value }))} />
              </div>
              <select id="invoice-status" className="erp-input" value={invoiceForm.status} onChange={(e) => setInvoiceForm((p) => ({ ...p, status: e.target.value as Invoice['status'] }))}>
                {['Draft', 'Unpaid', 'Paid'].map((s) => <option key={s}>{s}</option>)}
              </select>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {invoiceForm.items.map((line, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-[4px] p-2 grid grid-cols-12 gap-1 text-xs items-center">
                    <select className="erp-input col-span-5" value={line.product_id} onChange={(e) => updateInvoiceLine(idx, { product_id: e.target.value })}>
                      <option value="">Product</option>{products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input className="erp-input col-span-2" type="number" min="1" value={line.quantity} onChange={(e) => updateInvoiceLine(idx, { quantity: Number(e.target.value) })} />
                    <input className="erp-input col-span-2" type="number" min="0" value={line.unit_price} onChange={(e) => updateInvoiceLine(idx, { unit_price: Number(e.target.value) })} />
                    <input className="erp-input col-span-2" type="number" min="0" value={line.discount} onChange={(e) => updateInvoiceLine(idx, { discount: Number(e.target.value) })} />
                    <span className="col-span-1 text-right">{line.line_total.toFixed(0)}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setInvoiceForm((p) => ({ ...p, items: [...p.items, defaultLine()] }))}>Add Line</Button>
                <Button id="invoice-save" onClick={saveInvoice}>Save Invoice</Button>
              </div>
              {invoiceValidation && <p className="text-xs text-red-600">{invoiceValidation}</p>}
              <p className="text-xs text-slate-600">Total: Rs. {invoiceTotals.grand_total.toLocaleString()}</p>
            </div>
          </Card>
        </div>
      )}

      {tab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2" title="Payment History">
            {payments.length === 0 ? <p className="text-xs text-slate-500 py-6 text-center">No payments for selected invoice.</p> : (
              <table className="erp-table">
                <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Notes</th></tr></thead>
                <tbody>{payments.map((p) => <tr key={p.id}><td>{p.payment_date}</td><td>Rs. {p.amount.toLocaleString()}</td><td>{p.payment_method}</td><td>{p.reference_no || '-'}</td><td>{p.notes || '-'}</td></tr>)}</tbody>
              </table>
            )}
          </Card>
          <Card title="Record Payment">
            <div className="space-y-2">
              <select id="payment-invoice" className="erp-input" value={paymentForm.invoice_id} onChange={(e) => setPaymentForm((p) => ({ ...p, invoice_id: e.target.value }))}>
                <option value="">Select Invoice</option>
                {invoices.filter((i) => i.status !== 'Void' && i.balance_due > 0).map((i) => <option key={i.id} value={i.id}>{i.invoice_no} - {i.customer_name}</option>)}
              </select>
              <Input id="payment-date" type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))} />
              <Input id="payment-amount" type="number" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: Number(e.target.value) }))} />
              <select id="payment-method" className="erp-input" value={paymentForm.payment_method} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_method: e.target.value as 'Cash' | 'Bank' }))}><option>Cash</option><option>Bank</option></select>
              <Input id="payment-ref" value={paymentForm.reference_no} onChange={(e) => setPaymentForm((p) => ({ ...p, reference_no: e.target.value }))} placeholder="Reference No" />
              <textarea id="payment-notes" className="erp-input" rows={3} value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" />
              <Button id="payment-save" onClick={savePayment}>Save Payment</Button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'returns' && (
        <Card title="Sales Returns">
          {salesReturns.length === 0 ? <p className="text-xs text-slate-500 py-6 text-center">No sales returns found.</p> : (
            <table className="erp-table">
              <thead><tr><th>Return #</th><th>Sale #</th><th>Customer</th><th>Refund</th><th>Total</th><th>Date</th></tr></thead>
              <tbody>
                {salesReturns.map((ret: any) => (
                  <tr key={ret.id}>
                    <td>{ret.id}</td>
                    <td>{ret.sale_id}</td>
                    <td>{ret.customer_name || 'Walk-in Customer'}</td>
                    <td>{ret.refund_method}</td>
                    <td>Rs. {Number(ret.total_amount || 0).toLocaleString()}</td>
                    <td>{ret.created_at || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {(drawerQuote || drawerInvoice) && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => { setDrawerQuote(null); setDrawerInvoice(null); }}>
          <div className="w-[420px] bg-white h-full shadow-xl p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-slate-800">{drawerQuote ? 'Quote Detail' : 'Invoice Detail'}</h3>
              <Button size="sm" variant="secondary" onClick={() => { setDrawerQuote(null); setDrawerInvoice(null); }}>Close</Button>
            </div>
            {drawerQuote && <div className="space-y-2 text-sm"><p><b>No:</b> {drawerQuote.quote_no}</p><p><b>Customer:</b> {drawerQuote.customer_name}</p><p><b>Status:</b> {drawerQuote.status}</p><p><b>Total:</b> Rs. {drawerQuote.grand_total.toLocaleString()}</p></div>}
            {drawerInvoice && <div className="space-y-2 text-sm"><p><b>No:</b> {drawerInvoice.invoice_no}</p><p><b>Customer:</b> {drawerInvoice.customer_name}</p><p><b>Status:</b> {drawerInvoice.status}</p><p><b>Total:</b> Rs. {drawerInvoice.grand_total.toLocaleString()}</p><p><b>Balance:</b> Rs. {drawerInvoice.balance_due.toLocaleString()}</p></div>}
          </div>
        </div>
      )}

      {selectedReceiptNo && (
        <SalesReceiptDetail
          invoiceNo={selectedReceiptNo}
          canReprint={hasPermission('sales.receipt.reprint')}
          canVoid={hasPermission('sales.void')}
          canReturn={hasPermission('sales.return')}
          notify={notify}
          onOpenReturn={() => {
            setSelectedReceiptNo(null);
            setActiveTab('sales_returns');
          }}
          onVoid={async (invoiceNo) => {
            await window.api.sales.void(invoiceNo, 'Voided from receipt detail');
            notify('success', `Sale ${invoiceNo} voided.`);
            await loadPosSales();
            await reloadProducts();
            setSelectedReceiptNo(null);
          }}
          onClose={() => setSelectedReceiptNo(null)}
        />
      )}
    </div>
  );
};
