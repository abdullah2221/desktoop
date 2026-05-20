import React, { useState } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Table, TableColumn } from '../../shared/ui/Table';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Button } from '../../shared/ui/Button';
import { Customer } from '../../shared/types';
import { Coins } from 'lucide-react';

export const CustomersPage: React.FC = () => {
  const { customers, receivePayment, notify } = useErp();

  // Form input state variables
  const [selectedCustomer, setSelectedCustomer] = useState(customers[0]?.name || '');
  const [payAmount, setPayAmount] = useState('');

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

  // Table columns definition
  const columns: TableColumn<Customer>[] = [
    {
      header: 'Customer Name',
      accessor: (c) => <span className="font-bold text-slate-700">{c.name}</span>
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
          </div>
          
          <Table
            columns={columns}
            data={customers}
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
            options={customers.map(c => ({
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
      </div>

    </div>
  );
};
