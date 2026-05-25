import React, { useEffect, useMemo, useState } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { IconActionButton } from '../../shared/ui/IconActionButton';
import { CreditCard, Eye, FileText, Pencil, Power, Printer, RefreshCw } from 'lucide-react';

type TabKey = 'customers' | 'khata' | 'statements' | 'payments' | 'overdue' | 'reminders';

type CustomerForm = {
  customer_code?: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  credit_limit: number;
  due_days: number;
  opening_balance: number;
  credit: number;
  status: 'active' | 'inactive';
  notes: string;
};

const emptyCustomerForm: CustomerForm = {
  customer_code: '',
  name: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  city: '',
  credit_limit: 0,
  due_days: 0,
  opening_balance: 0,
  credit: 0,
  status: 'active',
  notes: ''
};

export const CustomersPage: React.FC = () => {
  const { notify, hasPermission, activeUser, activeBranchId } = useErp();
  const [tab, setTab] = useState<TabKey>('customers');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [statement, setStatement] = useState<any | null>(null);
  const [overdue, setOverdue] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [creditWarnings, setCreditWarnings] = useState<any[]>([]);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerForm>(emptyCustomerForm);
  const [paymentForm, setPaymentForm] = useState({ customer_name: '', payment_date: new Date().toISOString().split('T')[0], amount: 0, payment_method: 'Cash', reference_no: '', notes: '' });

  const canCreate = hasPermission('customers.create');
  const canEdit = hasPermission('customers.edit');
  const canDeactivate = hasPermission('customers.deactivate');
  const canPayment = hasPermission('khata.payment');
  const canStatement = hasPermission('khata.statement');

  const loadCustomers = async () => {
    const rows = await window.api.customers.getAll({ include_inactive: includeInactive, search, branch_id: activeBranchId || null });
    setCustomers(rows || []);
    if (!selectedCustomer && rows?.length) setSelectedCustomer(rows[0].name);
  };

  const loadStatement = async (customerName: string) => {
    if (!customerName) return;
    const data = await window.api.customers.getStatement(customerName);
    setStatement(data || null);
    setPaymentForm((p) => ({ ...p, customer_name: customerName }));
  };

  const loadOverdue = async () => setOverdue(await window.api.customers.getOverdue(asOfDate));
  const loadReminders = async () => setReminders(await window.api.khata.getReminders(asOfDate));
  const loadWarnings = async () => setCreditWarnings(await window.api.customers.getCreditLimitWarnings());

  useEffect(() => {
    loadCustomers().catch((e) => notify('error', e?.message || 'Failed to load customers.'));
    loadWarnings().catch(() => undefined);
  }, [includeInactive, search, activeBranchId]);

  useEffect(() => {
    if (selectedCustomer) loadStatement(selectedCustomer).catch((e) => notify('error', e?.message || 'Failed to load statement.'));
  }, [selectedCustomer]);

  useEffect(() => {
    if (tab === 'overdue') loadOverdue().catch((e) => notify('error', e?.message || 'Failed to load overdue data.'));
    if (tab === 'reminders') loadReminders().catch((e) => notify('error', e?.message || 'Failed to load reminders.'));
  }, [tab, asOfDate]);

  const totalKhata = useMemo(() => customers.reduce((sum, row) => sum + Number(row.credit || 0), 0), [customers]);
  const selected = customers.find((c) => c.name === selectedCustomer);

  const openAdd = () => {
    setEditingName(null);
    setCustomerForm({ ...emptyCustomerForm, status: 'active' });
    setShowCustomerModal(true);
  };

  const openEdit = (customer: any) => {
    setEditingName(customer.name);
    setCustomerForm({
      customer_code: customer.customer_code || '',
      name: customer.name || '',
      phone: customer.phone || '',
      whatsapp: customer.whatsapp || '',
      email: customer.email || '',
      address: customer.address || '',
      city: customer.city || '',
      credit_limit: Number(customer.credit_limit || 0),
      due_days: Number(customer.due_days || 0),
      opening_balance: Number(customer.opening_balance || 0),
      credit: Number(customer.credit || 0),
      status: customer.status || 'active',
      notes: customer.notes || ''
    });
    setShowCustomerModal(true);
  };

  const saveCustomer = async () => {
    if (!customerForm.name.trim()) {
      notify('error', 'Customer name is required.');
      return;
    }
    if (customerForm.name.trim().toLowerCase() === 'walk-in customer') {
      notify('error', 'Walk-in Customer is reserved and cannot be created as profile.');
      return;
    }
    const payload = {
      ...customerForm,
      name: customerForm.name.trim(),
      branch_id: activeBranchId || activeUser?.branch_id || 'B001',
      lastPayment: new Date().toISOString().split('T')[0]
    };
    if (editingName) {
      await window.api.customers.update({ ...payload, name: editingName, status: customerForm.status });
      notify('success', 'Customer updated successfully.');
      if (selectedCustomer === editingName) setSelectedCustomer(editingName);
    } else {
      await window.api.customers.create(payload);
      notify('success', 'Customer created successfully.');
      setSelectedCustomer(payload.name);
    }
    setShowCustomerModal(false);
    await loadCustomers();
    await loadWarnings();
    if (selectedCustomer || payload.name) await loadStatement(payload.name);
  };

  const toggleActive = async (customer: any) => {
    if (String(customer.status || 'active') === 'inactive') {
      await window.api.customers.reactivate(customer.name);
      notify('success', 'Customer reactivated.');
    } else {
      await window.api.customers.deactivate(customer.name);
      notify('success', 'Customer deactivated.');
    }
    await loadCustomers();
    await loadWarnings();
    if (selectedCustomer === customer.name) await loadStatement(customer.name);
  };

  const collectPayment = async () => {
    if (!canPayment) {
      notify('error', 'You do not have permission to collect khata payment.');
      return;
    }
    const payload = {
      ...paymentForm,
      amount: Number(paymentForm.amount || 0),
      created_by: activeUser?.username || activeUser?.id || 'system',
      branch_id: activeBranchId || activeUser?.branch_id || 'B001'
    };
    const res = await window.api.khata.recordPayment(payload);
    if (res?.success) {
      notify('success', 'Khata payment recorded successfully.');
      await window.api.receipts.printKhataPayment({ ...payload, id: res.id }, false);
      await loadCustomers();
      await loadWarnings();
      await loadStatement(payload.customer_name);
      setTab('payments');
    }
  };

  const previewStatement = async () => {
    if (!statement) {
      notify('info', 'Select a customer statement first.');
      return;
    }
    const html = await window.api.receipts.previewCustomerStatement(statement);
    const win = window.open('', '_blank');
    if (!win) {
      notify('error', 'Popup blocked. Please allow popups to preview statement.');
      return;
    }
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {(['customers', 'khata', 'statements', 'payments', 'overdue', 'reminders'] as const).map((t) => (
          <button key={t} className={`px-4 py-2 text-sm font-semibold rounded-[4px] whitespace-nowrap ${tab === t ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setTab(t)}>
            {t === 'khata' ? 'Khata / Credit' : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'customers' && (
        <Card title="Customers">
          <div className="mb-3 grid grid-cols-1 lg:grid-cols-4 gap-2">
            <Input placeholder="Search name/phone/city/code" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label className="flex items-center gap-2 text-xs text-slate-600"><input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />Show inactive</label>
            <div />
            {canCreate ? <div className="text-right"><Button onClick={openAdd}>Add Customer</Button></div> : <div />}
          </div>
          <table className="erp-table">
            <thead><tr><th>Code</th><th>Name</th><th>Phone/WhatsApp</th><th>City</th><th>Current Balance</th><th>Credit Limit</th><th>Due Days</th><th>Status</th><th>Last Payment</th><th>Actions</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.name}>
                  <td>{c.customer_code || '-'}</td>
                  <td>{c.name}</td>
                  <td>{c.phone || '-'} / {c.whatsapp || '-'}</td>
                  <td>{c.city || '-'}</td>
                  <td>Rs. {Number(c.credit || 0).toLocaleString()}</td>
                  <td>Rs. {Number(c.credit_limit || 0).toLocaleString()}</td>
                  <td>{Number(c.due_days || 0)}</td>
                  <td><span className={`px-2 py-1 rounded text-[10px] font-bold ${String(c.status || 'active') === 'inactive' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{c.status || 'active'}</span></td>
                  <td>{c.lastPayment || '-'}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <IconActionButton icon={<Eye className="w-3.5 h-3.5" />} tooltip="View details" variant="primary" onClick={() => { setSelectedCustomer(c.name); setTab('khata'); }} />
                      {canEdit && <IconActionButton icon={<Pencil className="w-3.5 h-3.5" />} tooltip="Edit record" onClick={() => openEdit(c)} />}
                      {canPayment && <IconActionButton icon={<CreditCard className="w-3.5 h-3.5" />} tooltip="Record payment" variant="success" onClick={() => { setSelectedCustomer(c.name); setPaymentForm((p) => ({ ...p, customer_name: c.name })); setTab('payments'); }} />}
                      {canStatement && <IconActionButton icon={<FileText className="w-3.5 h-3.5" />} tooltip="View statement" onClick={() => { setSelectedCustomer(c.name); setTab('statements'); }} />}
                      {canDeactivate && <IconActionButton icon={<Power className="w-3.5 h-3.5" />} tooltip={String(c.status || 'active') === 'inactive' ? 'Reactivate record' : 'Deactivate record'} danger={String(c.status || 'active') !== 'inactive'} onClick={() => toggleActive(c)} />}
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td colSpan={10} className="text-center text-xs text-slate-500 py-4">No customers found.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'khata' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="Customer Profile" className="lg:col-span-2">
            {!selected ? <p className="text-xs text-slate-500">Select a customer first.</p> : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                  <div className="rounded border border-slate-200 p-2"><p className="text-slate-500">Current Balance</p><p className="font-bold">Rs. {Number(selected.credit || 0).toLocaleString()}</p></div>
                  <div className="rounded border border-slate-200 p-2"><p className="text-slate-500">Credit Limit</p><p className="font-bold">Rs. {Number(selected.credit_limit || 0).toLocaleString()}</p></div>
                  <div className="rounded border border-slate-200 p-2"><p className="text-slate-500">Total Purchases</p><p className="font-bold">Rs. {Number(selected.totalPurchases || 0).toLocaleString()}</p></div>
                  <div className="rounded border border-slate-200 p-2"><p className="text-slate-500">Total Payments</p><p className="font-bold">Rs. {Number(statement?.summary?.total_payments || 0).toLocaleString()}</p></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-sm">
                  <p><strong>Customer Code:</strong> {selected.customer_code || '-'}</p><p><strong>Status:</strong> {selected.status || 'active'}</p>
                  <p><strong>Name:</strong> {selected.name}</p><p><strong>Phone:</strong> {selected.phone || '-'}</p>
                  <p><strong>WhatsApp:</strong> {selected.whatsapp || '-'}</p><p><strong>Email:</strong> {selected.email || '-'}</p>
                  <p><strong>Address:</strong> {selected.address || '-'}</p><p><strong>City:</strong> {selected.city || '-'}</p>
                  <p><strong>Due Days:</strong> {Number(selected.due_days || 0)}</p><p><strong>Last Payment:</strong> {selected.lastPayment || '-'}</p>
                  <p><strong>Notes:</strong> {selected.notes || '-'}</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold mb-1">POS Sales History</p>
                    <table className="erp-table"><thead><tr><th>Invoice</th><th>Date</th><th>Total</th></tr></thead><tbody>{(statement?.sales || []).slice(0, 6).map((s: any) => <tr key={s.invoiceNo}><td>{s.invoiceNo}</td><td>{s.date}</td><td>Rs. {Number(s.total || 0).toLocaleString()}</td></tr>)}{(statement?.sales || []).length === 0 && <tr><td colSpan={3} className="text-center text-xs text-slate-500 py-2">No POS sales.</td></tr>}</tbody></table>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1">Invoice History</p>
                    <table className="erp-table"><thead><tr><th>Invoice</th><th>Date</th><th>Total</th></tr></thead><tbody>{(statement?.invoices || []).slice(0, 6).map((i: any) => <tr key={i.id}><td>{i.invoice_no || i.id}</td><td>{i.invoice_date}</td><td>Rs. {Number(i.grand_total || 0).toLocaleString()}</td></tr>)}{(statement?.invoices || []).length === 0 && <tr><td colSpan={3} className="text-center text-xs text-slate-500 py-2">No invoices.</td></tr>}</tbody></table>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1">Payment History</p>
                    <table className="erp-table"><thead><tr><th>Date</th><th>Method</th><th>Amount</th></tr></thead><tbody>{(statement?.khata_payments || []).slice(0, 6).map((p: any) => <tr key={p.id}><td>{p.payment_date}</td><td>{p.payment_method}</td><td>Rs. {Number(p.amount || 0).toLocaleString()}</td></tr>)}{(statement?.khata_payments || []).length === 0 && <tr><td colSpan={3} className="text-center text-xs text-slate-500 py-2">No payments.</td></tr>}</tbody></table>
                  </div>
                  <div>
                    <p className="text-xs font-semibold mb-1">Return History</p>
                    <table className="erp-table"><thead><tr><th>Return</th><th>Date</th><th>Amount</th></tr></thead><tbody>{(statement?.returns || []).slice(0, 6).map((r: any) => <tr key={r.id}><td>{r.id}</td><td>{String(r.created_at || '').split(' ')[0]}</td><td>Rs. {Number(r.total_amount || 0).toLocaleString()}</td></tr>)}{(statement?.returns || []).length === 0 && <tr><td colSpan={3} className="text-center text-xs text-slate-500 py-2">No returns.</td></tr>}</tbody></table>
                  </div>
                </div>
              </div>
            )}
          </Card>
          <Card title="Khata Snapshot">
            <p className="text-xs text-slate-500 mb-2">Outstanding across selected list</p>
            <p className="text-lg font-bold mb-3">Rs. {totalKhata.toLocaleString()}</p>
            {creditWarnings.length > 0 && (
              <div className="rounded-[4px] border border-amber-300 bg-amber-50 p-3 text-xs">
                <p className="font-semibold text-amber-900 mb-1">Credit limit warnings</p>
                {creditWarnings.slice(0, 5).map((w) => <p key={w.customer_name}>{w.customer_name}: exceeded by Rs. {Number(w.exceeded_by || 0).toLocaleString()}</p>)}
              </div>
            )}
          </Card>
        </div>
      )}

      {tab === 'statements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="Customer Statement" className="lg:col-span-2">
            <div className="mb-3 flex gap-2">
              <select className="erp-input" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                <option value="">Select Customer</option>
                {customers.filter((c) => String(c.status || 'active') !== 'inactive').map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <IconActionButton icon={<Printer className="w-3.5 h-3.5" />} tooltip="Print statement" variant="primary" onClick={previewStatement} />
            </div>
            <table className="erp-table">
              <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead>
              <tbody>
                {(statement?.entries || []).map((e: any) => (
                  <tr key={`${e.type}-${e.reference}-${e.date}`}>
                    <td>{e.date}</td><td>{e.type}</td><td>{e.reference}</td>
                    <td>Rs. {Number(e.debit || 0).toLocaleString()}</td>
                    <td>Rs. {Number(e.credit || 0).toLocaleString()}</td>
                    <td>Rs. {Number(e.balance || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {(statement?.entries || []).length === 0 && <tr><td colSpan={6} className="text-center text-xs text-slate-500 py-4">No statement entries found.</td></tr>}
              </tbody>
            </table>
          </Card>
          <Card title="Summary">
            <div className="space-y-2 text-sm">
              <p>Opening: Rs. {Number(statement?.summary?.opening_balance || 0).toLocaleString()}</p>
              <p>POS Credit Sales: Rs. {Number(statement?.summary?.total_pos_sales || 0).toLocaleString()}</p>
              <p>Invoices: Rs. {Number(statement?.summary?.total_invoice_sales || 0).toLocaleString()}</p>
              <p>Payments: Rs. {Number(statement?.summary?.total_payments || 0).toLocaleString()}</p>
              <p>Returns: Rs. {Number(statement?.summary?.total_returns || 0).toLocaleString()}</p>
              <p>Adjustments: Rs. {Number(statement?.summary?.net_adjustments || 0).toLocaleString()}</p>
              <p className="font-bold">Closing Balance: Rs. {Number(statement?.summary?.outstanding_balance || 0).toLocaleString()}</p>
            </div>
          </Card>
        </div>
      )}

      {tab === 'payments' && (
        <Card title="Khata Payment Collection">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <select className="erp-input" value={paymentForm.customer_name} onChange={(e) => setPaymentForm((p) => ({ ...p, customer_name: e.target.value }))}>
              <option value="">Select Customer</option>
              {customers.filter((c) => String(c.status || 'active') !== 'inactive').map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            <Input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))} />
            <Input type="number" placeholder="Amount" value={String(paymentForm.amount)} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: Number(e.target.value || 0) }))} />
            <select className="erp-input" value={paymentForm.payment_method} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_method: e.target.value }))}>
              {['Cash', 'Bank', 'EasyPaisa', 'JazzCash', 'Card', 'Cheque'].map((m) => <option key={m}>{m}</option>)}
            </select>
            <Input placeholder="Reference" value={paymentForm.reference_no} onChange={(e) => setPaymentForm((p) => ({ ...p, reference_no: e.target.value }))} />
            <Input placeholder="Notes" value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} />
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={collectPayment}>Record Payment + Print Receipt</Button>
            <Button variant="secondary" onClick={() => window.api.receipts.previewKhataPayment(paymentForm, false)}>Preview Receipt</Button>
          </div>
        </Card>
      )}

      {tab === 'overdue' && (
        <Card title="Overdue / Aging">
          <div className="mb-3 flex items-center gap-2">
            <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
            <IconActionButton icon={<RefreshCw className="w-3.5 h-3.5" />} tooltip="Refresh Overdue" onClick={loadOverdue} />
          </div>
          <table className="erp-table">
            <thead><tr><th>Customer</th><th>Due Date</th><th>Overdue Days</th><th>Bucket</th><th>Balance</th></tr></thead>
            <tbody>
              {overdue.map((o) => <tr key={`${o.customer_name}-${o.due_date}`}><td>{o.customer_name}</td><td>{o.due_date}</td><td>{o.overdue_days}</td><td>{o.aging_bucket}</td><td>Rs. {Number(o.balance || 0).toLocaleString()}</td></tr>)}
              {overdue.length === 0 && <tr><td colSpan={5} className="text-center text-xs text-slate-500 py-4">No overdue customers.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'reminders' && (
        <Card title="Due Reminders">
          <div className="mb-3 flex items-center gap-2">
            <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
            <IconActionButton icon={<RefreshCw className="w-3.5 h-3.5" />} tooltip="Refresh Reminders" onClick={loadReminders} />
          </div>
          <table className="erp-table">
            <thead><tr><th>Customer</th><th>Overdue Days</th><th>Balance</th><th>Status</th><th>Last Reminder</th><th>WhatsApp Message</th></tr></thead>
            <tbody>
              {reminders.map((r) => <tr key={`${r.customer_name}-${r.due_date}`}><td>{r.customer_name}</td><td>{r.overdue_days}</td><td>Rs. {Number(r.balance || 0).toLocaleString()}</td><td>{r.reminder_status}</td><td>{r.reminder_last_at || '-'}</td><td>{`Dear ${r.customer_name}, your outstanding is Rs. ${Number(r.balance || 0).toLocaleString()}.`}</td></tr>)}
              {reminders.length === 0 && <tr><td colSpan={6} className="text-center text-xs text-slate-500 py-4">No reminder queue entries.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {showCustomerModal && (
        <div className="fixed inset-0 z-40 bg-black/30 flex items-center justify-center p-4">
          <div className="bg-white rounded-[6px] border border-slate-200 w-full max-w-3xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-800">{editingName ? 'Edit Customer' : 'Add Customer'}</h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-2 text-xs">
              <Input placeholder="Customer Code" value={customerForm.customer_code || ''} onChange={(e) => setCustomerForm((p) => ({ ...p, customer_code: e.target.value }))} />
              <Input placeholder="Name *" value={customerForm.name} onChange={(e) => setCustomerForm((p) => ({ ...p, name: e.target.value }))} />
              <Input placeholder="Phone" value={customerForm.phone} onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))} />
              <Input placeholder="WhatsApp" value={customerForm.whatsapp} onChange={(e) => setCustomerForm((p) => ({ ...p, whatsapp: e.target.value }))} />
              <Input placeholder="Email" value={customerForm.email} onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))} />
              <Input placeholder="City" value={customerForm.city} onChange={(e) => setCustomerForm((p) => ({ ...p, city: e.target.value }))} />
              <Input placeholder="Credit Limit" type="number" value={String(customerForm.credit_limit)} onChange={(e) => setCustomerForm((p) => ({ ...p, credit_limit: Number(e.target.value || 0) }))} />
              <Input placeholder="Due Days" type="number" value={String(customerForm.due_days)} onChange={(e) => setCustomerForm((p) => ({ ...p, due_days: Number(e.target.value || 0) }))} />
              <Input placeholder="Opening Balance" type="number" value={String(customerForm.opening_balance)} onChange={(e) => setCustomerForm((p) => ({ ...p, opening_balance: Number(e.target.value || 0) }))} />
              <div className="lg:col-span-2"><Input placeholder="Address" value={customerForm.address} onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))} /></div>
              <select className="erp-input" value={customerForm.status} onChange={(e) => setCustomerForm((p) => ({ ...p, status: e.target.value as 'active' | 'inactive' }))}><option value="active">Active</option><option value="inactive">Inactive</option></select>
              <div className="lg:col-span-3"><Input placeholder="Notes" value={customerForm.notes} onChange={(e) => setCustomerForm((p) => ({ ...p, notes: e.target.value }))} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowCustomerModal(false)}>Cancel</Button>
              <Button onClick={saveCustomer}>Save Customer</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
