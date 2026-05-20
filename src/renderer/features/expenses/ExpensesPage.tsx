import React, { useState } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Table, TableColumn } from '../../shared/ui/Table';
import { Input } from '../../shared/ui/Input';
import { Select } from '../../shared/ui/Select';
import { Button } from '../../shared/ui/Button';
import { Expense } from '../../shared/types';
import { Plus } from 'lucide-react';

export const ExpensesPage: React.FC = () => {
  const { expenses, addExpense, notify } = useErp();

  // Form input state variables
  const [category, setCategory] = useState('Sundry');
  const [paidTo, setPaidTo] = useState('');
  const [amount, setAmount] = useState('');

  const handleLogExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !paidTo) {
      notify('error', 'Please fill out all fields.');
      return;
    }

    const amt = parseFloat(amount);
    const success = addExpense(category, paidTo, amt);

    if (success) {
      setPaidTo('');
      setAmount('');
    } else {
      notify('error', 'Failed to log expense. Enter a valid positive number.');
    }
  };

  // Table columns definition
  const columns: TableColumn<Expense>[] = [
    {
      header: 'Expense ID',
      accessor: (e) => <span className="font-mono text-slate-500">{e.id}</span>
    },
    {
      header: 'Date',
      accessor: (e) => <span>{e.date}</span>
    },
    {
      header: 'Category',
      accessor: (e) => <span className="font-bold text-slate-700">{e.category}</span>
    },
    {
      header: 'Paid To',
      accessor: (e) => <span>{e.paidTo}</span>
    },
    {
      header: 'Amount (Rs.)',
      accessor: (e) => <span className="font-extrabold text-danger-red">Rs. {e.amount.toLocaleString()}</span>,
      align: 'right'
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Expense Table Ledger list */}
      <div className="lg:col-span-2 space-y-6">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Expense Ledger Journal
            </h3>
          </div>
          
          <Table
            columns={columns}
            data={expenses}
            keyExtractor={(e) => e.id}
            emptyMessage="No store expenses logged in the ledger yet."
          />
        </div>
      </div>

      {/* Add Expense Form side-panel */}
      <div className="bg-white rounded-[8px] border border-slate-200 shadow-sm p-5 space-y-4 h-fit">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wide pb-2 border-b border-slate-200 flex items-center gap-2">
          <Plus className="w-4 h-4 text-danger-red" />
          <span>Log Shop Expense</span>
        </h3>

        <form onSubmit={handleLogExpense} className="space-y-4">
          <Select
            label="Expense Category"
            id="exp-cat"
            options={[
              { value: 'Utility Bill', label: 'Utility Bill' },
              { value: 'Shop Rent', label: 'Shop Rent' },
              { value: 'Salaries', label: 'Employee Salaries' },
              { value: 'Sundry', label: 'Sundry Supplies' }
            ]}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />

          <Input
            label="Recipient (Paid To)"
            id="exp-recipient"
            placeholder="e.g. LESCO Electricity"
            value={paidTo}
            onChange={(e) => setPaidTo(e.target.value)}
          />

          <Input
            label="Amount Paid (Rs.)"
            id="exp-amount"
            type="number"
            placeholder="e.g. 5000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />

          <Button
            type="submit"
            variant="danger"
            fullWidth
            className="py-2.5 text-xs font-bold uppercase tracking-wider cursor-pointer"
          >
            Log Expense
          </Button>
        </form>
      </div>

    </div>
  );
};
