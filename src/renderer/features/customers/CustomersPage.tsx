import React, { useEffect, useState } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Table, TableColumn } from '../../shared/ui/Table';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Button } from '../../shared/ui/Button';
import { Customer } from '../../shared/types';
import { Coins } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { customers, receivePayment, notify } = useErp();
  const [customerRows, setCustomerRows] = useState<Customer[]>(customers);

  // Form input state variables
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0]?.name || '');
  const [payAmount, setPayAmount] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', credit_limit: 0, due_days: 0, status: 'active' });
  const [saving, setSaving] = useState(false);
  const [statement, setStatement] = useState<any | null>(null);

  const loadCustomers = async () => {
    const rows = await window.api.customers.getAll();
    setCustomerRows(rows as Customer[]);
  };

  const loadStatement = async (customerName: string) => {
    const data = await window.api.customers.getStatement(customerName);
    setStatement(data || null);
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payAmount) return;

    const amt = parseFloat(payAmount);
    const success = receivePayment(selectedCustomer, amt);

    if (success) {
      setPayAmount('');
      notify('success', `Payment of Rs. ${amt.toLocaleString()} recorded for ${selectedCustomer}.`);
    } else {
      notify('error', 'Failed to record payment. Enter a valid positive number.');
    }
  };

  const openCreate = () => {
    setEditingName(null);
    setForm({ name: '', phone: '', credit_limit: 0, due_days: 0, status: 'active' });
    setShowForm(true);
  };

  const openEdit = (customer: Customer) => {
    setEditingName(customer.name);
    setForm({
      name: customer.name,
      phone: customer.phone || '',
      credit_limit: Number(customer.credit_limit || 0),
      due_days: Number(customer.due_days || 0),
      status: customer.status || 'active'
    });
    setShowForm(true);
    loadStatement(customer.name).catch(() => setStatement(null));
  };

  const saveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      notify('error', 'Customer name is required.');
      return;
    }
    setSaving(true);
    try {
      if (editingName) {
        await window.api.customers.update({
          name: editingName,
          phone: form.phone,
          credit_limit: Number(form.credit_limit || 0),
          due_days: Number(form.due_days || 0),
          status: form.status
        });
        notify('success', 'Customer updated successfully.');
      } else {
        await window.api.customers.create({
          name: form.name.trim(),
          phone: form.phone,
          credit_limit: Number(form.credit_limit || 0),
          due_days: Number(form.due_days || 0),
          status: form.status
        });
        notify('success', 'Customer created successfully.');
      }
      await loadCustomers();
      setShowForm(false);
    } catch (error: any) {
      notify('error', error?.message || 'Failed to save customer.');
    } finally {
      setSaving(false);
    }
  };

  const deactivateCustomer = async (name: string) => {
    await window.api.customers.deactivate(name);
    notify('success', 'Customer deactivated.');
    await loadCustomers();
  };

  // Table columns definition
  const columns: TableColumn<Customer>[] = [
    {
      header: 'Customer Name',
      accessor: (c) => (
        <button className="font-bold text-slate-700 hover:text-primary-blue" onClick={() => openEdit(c)}>
          {c.name}
        </button>
      )
    },
    {
      header: 'Phone Number',
      accessor: (c) => <span className="font-mono text-slate-500">{c.phone}</span>
    },
    {
      header: 'Total Purchases',
      accessor: (c) => <span>Rs. {c.totalPurchases.toLocaleString()}</span>
    },
    {
      header: 'Outstanding Credit',
      accessor: (c) => (
        <span className={`font-bold ${c.credit > 0 ? 'text-warning-amber' : 'text-success-green'}`}>
          Rs. {c.credit.toLocaleString()}
        </span>
      )
    },
    {
      header: 'Last Transaction',
      accessor: (c) => <span>{c.lastPayment}</span>
    },
    {
      header: 'Actions',
      accessor: (c) => (
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => openEdit(c)}>Edit</Button>
          <Button size="sm" variant="danger" onClick={() => deactivateCustomer(c.name)}>Deactivate</Button>
        </div>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Customer Ledger Grid */}
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Pakistan Active Udhaar (Credit Ledgers)
            </h3>
            <Button size="sm" onClick={openCreate}>Add Customer</Button>
          </div>
          
          <Table
            columns={columns}
            data={customerRows}
            keyExtractor={(c) => c.name}
            emptyMessage="No active customer ledgers found."
          />
        </div>
      </div>

      {/* Record Customer Credit Payment Form side-panel */}
      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm p-5 space-y-4 h-fit">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide pb-2 border-b border-slate-200 flex items-center gap-2">
          <Coins className="w-4 h-4 text-emerald-600" />
          <span>Receive Udhaar Payment</span>
        </h3>

        <form onSubmit={handleRecordPayment} className="space-y-4">
          <Select
            label="Select Customer"
            id="credit-customer"
            options={customerRows.map(c => ({
              value: c.name,
              label: `${c.name} (Credit Balance: Rs. ${c.credit})`
            }))}
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
          />

          <Input
            label="Payment Received (Rs.)"
            id="credit-amount"
            type="number"
            placeholder="e.g. 500"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
          />

          <Button
            type="submit"
            variant="success"
            fullWidth
            className="py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Record Payment
          </Button>
        </form>

        {statement && (
          <div className="pt-3 border-t border-slate-200 text-xs space-y-1">
            <p className="font-bold text-slate-700">Customer Statement</p>
            <p>Total POS Sales: Rs. {Number(statement.summary?.total_pos_sales || 0).toLocaleString()}</p>
            <p>Total Invoice Sales: Rs. {Number(statement.summary?.total_invoice_sales || 0).toLocaleString()}</p>
            <p>Khata Balance: Rs. {Number(statement.summary?.khata_balance || 0).toLocaleString()}</p>
            <p>Outstanding: Rs. {Number(statement.summary?.outstanding_balance || 0).toLocaleString()}</p>
            <p>Payments: {Number(statement.payments?.length || 0)}</p>
            <p>Returns: {Number(statement.returns?.length || 0)}</p>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[8px] border border-slate-200 shadow-lg p-5">
            <h3 className="text-sm font-bold text-slate-800 mb-4">{editingName ? 'Edit Customer' : 'Add Customer'}</h3>
            <form onSubmit={saveCustomer} className="space-y-3">
              <Input label="Customer Name" id="customer-name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} disabled={Boolean(editingName)} />
              <Input label="Phone / WhatsApp" id="customer-phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Credit Limit" id="customer-credit-limit" type="number" value={String(form.credit_limit)} onChange={(e) => setForm((p) => ({ ...p, credit_limit: Number(e.target.value || 0) }))} />
                <Input label="Due Days" id="customer-due-days" type="number" value={String(form.due_days)} onChange={(e) => setForm((p) => ({ ...p, due_days: Number(e.target.value || 0) }))} />
              </div>
              <Select label="Status" id="customer-status" value={form.status} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))} options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save Customer'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
