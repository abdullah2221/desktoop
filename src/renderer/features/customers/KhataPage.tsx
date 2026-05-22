import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { useErp } from '../../app/providers/ErpContext';

type TabKey = 'customers' | 'statements' | 'payments' | 'overdue' | 'reminders';

export const KhataPage: React.FC = () => {
  const { notify, hasPermission } = useErp();
  const [tab, setTab] = useState<TabKey>('customers');
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [statement, setStatement] = useState<any | null>(null);
  const [overdue, setOverdue] = useState<any[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentForm, setPaymentForm] = useState({ customer_name: '', payment_date: new Date().toISOString().split('T')[0], amount: 0, payment_method: 'Cash', reference_no: '', notes: '' });
  const [adjustForm, setAdjustForm] = useState({ customer_name: '', adjustment_date: new Date().toISOString().split('T')[0], adjustment_type: 'DEBIT', amount: 0, notes: '' });

  const loadCustomers = async () => {
    const rows = await window.api.khata.getCustomers();
    setCustomers(rows || []);
    if (!selectedCustomer && rows?.length) setSelectedCustomer(rows[0].name);
  };

  const loadStatement = async (customerName: string) => {
    if (!customerName) return;
    const data = await window.api.khata.getStatement(customerName);
    setStatement(data || null);
    setPaymentForm((p) => ({ ...p, customer_name: customerName }));
    setAdjustForm((p) => ({ ...p, customer_name: customerName }));
  };

  const loadOverdue = async () => setOverdue(await window.api.khata.getOverdue(asOfDate));
  const loadReminders = async () => setReminders(await window.api.khata.getReminders(asOfDate));

  useEffect(() => {
    loadCustomers().catch((e) => notify('error', e?.message || 'Failed to load khata customers.'));
  }, []);

  useEffect(() => {
    if (selectedCustomer) loadStatement(selectedCustomer).catch((e) => notify('error', e?.message || 'Failed to load statement.'));
  }, [selectedCustomer]);

  useEffect(() => {
    if (tab === 'overdue') loadOverdue().catch((e) => notify('error', e?.message || 'Failed to load overdue data.'));
    if (tab === 'reminders') loadReminders().catch((e) => notify('error', e?.message || 'Failed to load reminders.'));
  }, [tab, asOfDate]);

  const totalKhata = useMemo(() => customers.reduce((sum, row) => sum + Number(row.credit || 0), 0), [customers]);

  const collectPayment = async () => {
    if (!hasPermission('khata.payment')) {
      notify('error', 'You do not have permission to collect khata payment.');
      return;
    }
    const payload = { ...paymentForm, amount: Number(paymentForm.amount || 0) };
    const res = await window.api.khata.recordPayment(payload);
    if (res?.success) {
      notify('success', 'Khata payment recorded successfully.');
      const printPayload = { ...payload, id: res.id };
      await window.api.receipts.printKhataPayment(printPayload, false);
      await loadCustomers();
      await loadStatement(payload.customer_name);
    }
  };

  const postAdjustment = async () => {
    if (!hasPermission('khata.adjust')) {
      notify('error', 'You do not have permission for khata adjustment.');
      return;
    }
    const payload = { ...adjustForm, amount: Number(adjustForm.amount || 0) };
    const res = await window.api.khata.createAdjustment(payload);
    if (res?.success) {
      notify('success', 'Khata adjustment posted successfully.');
      await loadCustomers();
      await loadStatement(payload.customer_name);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        {(['customers', 'statements', 'payments', 'overdue', 'reminders'] as const).map((t) => (
          <button key={t} className={`px-4 py-2 text-sm font-semibold rounded-[4px] ${tab === t ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'customers' && (
        <Card title="Khata Customers">
          <p className="text-xs text-slate-500 mb-3">Total outstanding khata: Rs. {totalKhata.toLocaleString()}</p>
          <table className="erp-table">
            <thead><tr><th>Customer</th><th>Phone</th><th>WhatsApp</th><th>Address</th><th>Opening</th><th>Balance</th><th>Limit</th><th>Due Days</th><th>Status</th></tr></thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.name} className="cursor-pointer" onClick={() => { setSelectedCustomer(c.name); setTab('statements'); }}>
                  <td>{c.name}</td><td>{c.phone || '-'}</td><td>{c.whatsapp || '-'}</td><td>{c.address || '-'}</td>
                  <td>Rs. {Number(c.opening_balance || 0).toLocaleString()}</td>
                  <td>Rs. {Number(c.credit || 0).toLocaleString()}</td>
                  <td>Rs. {Number(c.credit_limit || 0).toLocaleString()}</td>
                  <td>{Number(c.due_days || 0)}</td><td>{c.status || 'active'}</td>
                </tr>
              ))}
              {customers.length === 0 && <tr><td colSpan={9} className="text-center text-xs text-slate-500 py-4">No khata customers found.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}

      {tab === 'statements' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card title="Customer Statement" className="lg:col-span-2">
            <div className="mb-3">
              <select className="erp-input" value={selectedCustomer} onChange={(e) => setSelectedCustomer(e.target.value)}>
                <option value="">Select Customer</option>
                {customers.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <table className="erp-table">
              <thead><tr><th>Date</th><th>Type</th><th>Reference</th><th>Debit</th><th>Credit</th><th>Balance</th><th>Notes</th></tr></thead>
              <tbody>
                {(statement?.entries || []).map((e: any) => (
                  <tr key={`${e.type}-${e.reference}-${e.date}`}>
                    <td>{e.date}</td><td>{e.type}</td><td>{e.reference}</td>
                    <td>Rs. {Number(e.debit || 0).toLocaleString()}</td>
                    <td>Rs. {Number(e.credit || 0).toLocaleString()}</td>
                    <td>Rs. {Number(e.balance || 0).toLocaleString()}</td>
                    <td>{e.notes || '-'}</td>
                  </tr>
                ))}
                {(statement?.entries || []).length === 0 && <tr><td colSpan={7} className="text-center text-xs text-slate-500 py-4">No statement entries found.</td></tr>}
              </tbody>
            </table>
          </Card>
          <Card title="Summary">
            <div className="space-y-2 text-sm">
              <p>Opening: Rs. {Number(statement?.summary?.opening_balance || 0).toLocaleString()}</p>
              <p>POS Sales: Rs. {Number(statement?.summary?.total_pos_sales || 0).toLocaleString()}</p>
              <p>Invoices: Rs. {Number(statement?.summary?.total_invoice_sales || 0).toLocaleString()}</p>
              <p>Payments: Rs. {Number(statement?.summary?.total_payments || 0).toLocaleString()}</p>
              <p>Returns: Rs. {Number(statement?.summary?.total_returns || 0).toLocaleString()}</p>
              <p>Adjustments: Rs. {Number(statement?.summary?.net_adjustments || 0).toLocaleString()}</p>
              <p className="font-bold">Outstanding: Rs. {Number(statement?.summary?.outstanding_balance || 0).toLocaleString()}</p>
            </div>
          </Card>
        </div>
      )}

      {tab === 'payments' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Collect Payment">
            <div className="space-y-2">
              <select className="erp-input" value={paymentForm.customer_name} onChange={(e) => setPaymentForm((p) => ({ ...p, customer_name: e.target.value }))}>
                <option value="">Select Customer</option>
                {customers.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <Input type="date" value={paymentForm.payment_date} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_date: e.target.value }))} />
              <Input type="number" placeholder="Amount" value={String(paymentForm.amount)} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: Number(e.target.value || 0) }))} />
              <select className="erp-input" value={paymentForm.payment_method} onChange={(e) => setPaymentForm((p) => ({ ...p, payment_method: e.target.value }))}>
                {['Cash', 'Bank', 'EasyPaisa', 'JazzCash', 'Card', 'Cheque'].map((m) => <option key={m}>{m}</option>)}
              </select>
              <Input placeholder="Reference" value={paymentForm.reference_no} onChange={(e) => setPaymentForm((p) => ({ ...p, reference_no: e.target.value }))} />
              <textarea className="erp-input" rows={3} placeholder="Notes" value={paymentForm.notes} onChange={(e) => setPaymentForm((p) => ({ ...p, notes: e.target.value }))} />
              <Button onClick={collectPayment}>Record Payment</Button>
            </div>
          </Card>
          <Card title="Adjustments">
            <div className="space-y-2">
              <select className="erp-input" value={adjustForm.customer_name} onChange={(e) => setAdjustForm((p) => ({ ...p, customer_name: e.target.value }))}>
                <option value="">Select Customer</option>
                {customers.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
              <Input type="date" value={adjustForm.adjustment_date} onChange={(e) => setAdjustForm((p) => ({ ...p, adjustment_date: e.target.value }))} />
              <select className="erp-input" value={adjustForm.adjustment_type} onChange={(e) => setAdjustForm((p) => ({ ...p, adjustment_type: e.target.value }))}>
                <option value="DEBIT">Debit (Increase Balance)</option>
                <option value="CREDIT">Credit (Decrease Balance)</option>
              </select>
              <Input type="number" placeholder="Amount" value={String(adjustForm.amount)} onChange={(e) => setAdjustForm((p) => ({ ...p, amount: Number(e.target.value || 0) }))} />
              <textarea className="erp-input" rows={3} placeholder="Notes" value={adjustForm.notes} onChange={(e) => setAdjustForm((p) => ({ ...p, notes: e.target.value }))} />
              <Button onClick={postAdjustment}>Post Adjustment</Button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'overdue' && (
        <Card title="Overdue / Aging">
          <div className="mb-3 flex items-center gap-2">
            <Input type="date" value={asOfDate} onChange={(e) => setAsOfDate(e.target.value)} />
            <Button variant="secondary" onClick={loadOverdue}>Refresh</Button>
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
            <Button variant="secondary" onClick={loadReminders}>Refresh</Button>
          </div>
          <table className="erp-table">
            <thead><tr><th>Customer</th><th>Overdue Days</th><th>Balance</th><th>Status</th><th>Last Reminder</th></tr></thead>
            <tbody>
              {reminders.map((r) => <tr key={`${r.customer_name}-${r.due_date}`}><td>{r.customer_name}</td><td>{r.overdue_days}</td><td>Rs. {Number(r.balance || 0).toLocaleString()}</td><td>{r.reminder_status}</td><td>{r.reminder_last_at || '-'}</td></tr>)}
              {reminders.length === 0 && <tr><td colSpan={5} className="text-center text-xs text-slate-500 py-4">No reminder queue entries.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};
