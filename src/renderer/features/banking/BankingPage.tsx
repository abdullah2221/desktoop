import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDownCircle, ArrowRightLeft, ArrowUpCircle, BadgeCheck, Landmark, ReceiptText, Settings2 } from 'lucide-react';
import { useErp } from '../../app/providers/ErpContext';
import { Account, BankAccount, BankAccountType, BankReconciliation, BankReconciliationItem, MoneyTransaction, PaymentMethod, PaymentMethodAccount } from '../../shared/types';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';

type BankingTab = 'accounts' | 'transactions' | 'transfers' | 'reconciliation' | 'mapping';
type TransactionMode = 'DEPOSIT' | 'WITHDRAWAL' | 'BANK_CHARGE' | 'ADJUSTMENT';

const today = () => new Date().toISOString().split('T')[0];
const money = (value: number) => `Rs. ${Number(value || 0).toFixed(2)}`;
const paymentMethods: PaymentMethod[] = ['Cash', 'Bank', 'EasyPaisa', 'JazzCash', 'Card', 'Cheque'];

export const BankingPage: React.FC = () => {
  const { notify } = useErp();
  const [activeTab, setActiveTab] = useState<BankingTab>('accounts');
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [glAccounts, setGlAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<MoneyTransaction[]>([]);
  const [reconciliations, setReconciliations] = useState<BankReconciliation[]>([]);
  const [reconItems, setReconItems] = useState<BankReconciliationItem[]>([]);
  const [selectedReconId, setSelectedReconId] = useState('');
  const [selectedReconItems, setSelectedReconItems] = useState<string[]>([]);
  const [mappings, setMappings] = useState<PaymentMethodAccount[]>([]);

  const [accountForm, setAccountForm] = useState<Partial<BankAccount>>({
    code: '',
    name: '',
    account_type: 'Bank',
    linked_gl_account_id: 'ACC-1010',
    opening_balance: 0,
    status: 'active'
  });

  const [transactionMode, setTransactionMode] = useState<TransactionMode>('DEPOSIT');
  const [transactionForm, setTransactionForm] = useState({
    account_id: '',
    transaction_date: today(),
    amount: 0,
    offset_gl_account_id: 'ACC-3000',
    adjustment_sign: 1 as 1 | -1,
    reference_no: '',
    notes: ''
  });

  const [transferForm, setTransferForm] = useState({
    from_account_id: '',
    to_account_id: '',
    transaction_date: today(),
    amount: 0,
    reference_no: '',
    notes: ''
  });

  const [reconForm, setReconForm] = useState({
    account_id: '',
    start_date: today(),
    end_date: today(),
    statement_balance: 0
  });

  const loadAll = async () => {
    const [bankAccounts, ledgerAccounts, txRows, reconRows, mappingRows] = await Promise.all([
      window.api.bankAccounts.getAll(),
      window.api.accounts.getAll(),
      window.api.moneyTransactions.getAll(),
      window.api.bankReconciliations.getAll(),
      window.api.bankAccounts.getPaymentMethodMappings()
    ]);
    setAccounts(bankAccounts);
    setGlAccounts(ledgerAccounts);
    setTransactions(txRows);
    setReconciliations(reconRows);
    setMappings(mappingRows);

    const firstAccountId = bankAccounts[0]?.id || '';
    setTransactionForm((prev) => ({ ...prev, account_id: prev.account_id || firstAccountId }));
    setTransferForm((prev) => ({ ...prev, from_account_id: prev.from_account_id || firstAccountId, to_account_id: prev.to_account_id || bankAccounts[1]?.id || '' }));
    setReconForm((prev) => ({ ...prev, account_id: prev.account_id || firstAccountId }));
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    if (!selectedReconId) {
      setReconItems([]);
      return;
    }
    window.api.bankReconciliations.getItems(selectedReconId).then(setReconItems);
  }, [selectedReconId]);

  const totals = useMemo(() => {
    return accounts.reduce((acc, account) => {
      acc.total += Number(account.current_balance || 0);
      acc[account.account_type] = (acc[account.account_type] || 0) + Number(account.current_balance || 0);
      return acc;
    }, { total: 0 } as Record<string, number>);
  }, [accounts]);

  const activeAccounts = accounts.filter((a) => a.status === 'active');
  const assetAccounts = glAccounts.filter((a) => a.account_type === 'Asset' || a.account_type === 'Equity' || a.account_type === 'Expense');
  const selectedRecon = reconciliations.find((r) => r.id === selectedReconId);

  const saveAccount = async () => {
    if (!accountForm.code || !accountForm.name || !accountForm.linked_gl_account_id) {
      notify('error', 'Code, name, and GL account are required.');
      return;
    }
    await window.api.bankAccounts.create(accountForm);
    setAccountForm({ code: '', name: '', account_type: 'Bank', linked_gl_account_id: 'ACC-1010', opening_balance: 0, status: 'active' });
    await loadAll();
    notify('success', 'Cash/bank account created.');
  };

  const postTransaction = async () => {
    if (!transactionForm.account_id || transactionForm.amount <= 0) {
      notify('error', 'Select an account and enter a positive amount.');
      return;
    }
    const payload = { ...transactionForm };
    if (transactionMode === 'DEPOSIT') await window.api.moneyTransactions.createDeposit(payload);
    if (transactionMode === 'WITHDRAWAL') await window.api.moneyTransactions.createWithdrawal(payload);
    if (transactionMode === 'BANK_CHARGE') await window.api.moneyTransactions.createBankCharge(payload);
    if (transactionMode === 'ADJUSTMENT') await window.api.moneyTransactions.createAdjustment(payload);
    setTransactionForm((prev) => ({ ...prev, amount: 0, reference_no: '', notes: '' }));
    await loadAll();
    notify('success', 'Money transaction posted.');
  };

  const postTransfer = async () => {
    if (!transferForm.from_account_id || !transferForm.to_account_id || transferForm.amount <= 0) {
      notify('error', 'Select both accounts and enter a positive transfer amount.');
      return;
    }
    if (transferForm.from_account_id === transferForm.to_account_id) {
      notify('error', 'Transfer accounts must be different.');
      return;
    }
    await window.api.moneyTransactions.createTransfer(transferForm);
    setTransferForm((prev) => ({ ...prev, amount: 0, reference_no: '', notes: '' }));
    await loadAll();
    notify('success', 'Transfer posted.');
  };

  const createReconciliation = async () => {
    if (!reconForm.account_id) {
      notify('error', 'Select an account to reconcile.');
      return;
    }
    const result = await window.api.bankReconciliations.createWorksheet(reconForm);
    await loadAll();
    setSelectedReconId(result.id || '');
    notify('success', `Worksheet ready. Difference: ${money(result.difference)}`);
  };

  const completeReconciliation = async () => {
    if (!selectedReconId) return;
    await window.api.bankReconciliations.markItemsCleared(selectedReconId, selectedReconItems);
    setSelectedReconItems([]);
    await loadAll();
    setReconItems(await window.api.bankReconciliations.getItems(selectedReconId));
    notify('success', 'Reconciliation completed.');
  };

  const mapPaymentMethod = async (method: PaymentMethod, accountId: string) => {
    await window.api.bankAccounts.mapPaymentMethod(method, accountId || null);
    setMappings(await window.api.bankAccounts.getPaymentMethodMappings());
    notify('success', `${method} mapping updated.`);
  };

  const tabs: Array<{ id: BankingTab; label: string; icon: React.ElementType }> = [
    { id: 'accounts', label: 'Accounts', icon: Landmark },
    { id: 'transactions', label: 'Transactions', icon: ReceiptText },
    { id: 'transfers', label: 'Transfers', icon: ArrowRightLeft },
    { id: 'reconciliation', label: 'Reconciliation', icon: BadgeCheck },
    { id: 'mapping', label: 'Payment Method Mapping', icon: Settings2 }
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {(['Cash', 'Bank', 'EasyPaisa', 'JazzCash'] as BankAccountType[]).map((type) => (
          <div key={type} className="bg-white border border-slate-200 rounded-[6px] shadow-sm p-4">
            <div className="text-[10px] uppercase tracking-wide font-bold text-slate-500">{type}</div>
            <div className="mt-1 text-xl font-bold text-slate-900">{money(totals[type] || 0)}</div>
            <div className="mt-2 text-[11px] text-slate-500">{accounts.filter((a) => a.account_type === type).length} accounts</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} className={`px-3 py-2 text-xs font-semibold rounded-[4px] inline-flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setActiveTab(tab.id)}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'accounts' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2" title="Cash And Bank Accounts">
            <table className="erp-table text-xs">
              <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Opening</th><th>Current</th><th>Status</th></tr></thead>
              <tbody>
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>{account.code}</td>
                    <td>{account.name}</td>
                    <td>{account.account_type}</td>
                    <td>{money(account.opening_balance)}</td>
                    <td className="font-bold">{money(account.current_balance)}</td>
                    <td><Badge variant={account.status === 'active' ? 'success' : 'danger'}>{account.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Create Account">
            <div className="space-y-3">
              <Input id="bank-code" label="Code" value={accountForm.code || ''} onChange={(e) => setAccountForm((p) => ({ ...p, code: e.target.value }))} />
              <Input id="bank-name" label="Name" value={accountForm.name || ''} onChange={(e) => setAccountForm((p) => ({ ...p, name: e.target.value }))} />
              <select className="erp-input" value={accountForm.account_type} onChange={(e) => setAccountForm((p) => ({ ...p, account_type: e.target.value as BankAccountType }))}>
                <option>Cash</option><option>Bank</option><option>EasyPaisa</option><option>JazzCash</option>
              </select>
              <select className="erp-input" value={accountForm.linked_gl_account_id || ''} onChange={(e) => setAccountForm((p) => ({ ...p, linked_gl_account_id: e.target.value }))}>
                {assetAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>)}
              </select>
              <Input id="bank-opening" label="Opening Balance" type="number" value={accountForm.opening_balance || 0} onChange={(e) => setAccountForm((p) => ({ ...p, opening_balance: Number(e.target.value) || 0 }))} />
              <Button fullWidth onClick={saveAccount}>Create Account</Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'transactions' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2" title="Transaction Register">
            <table className="erp-table text-xs">
              <thead><tr><th>Date</th><th>Account</th><th>Type</th><th>Reference</th><th>Amount</th><th>Cleared</th></tr></thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{tx.transaction_date}</td>
                    <td>{tx.account_code} - {tx.account_name}</td>
                    <td>{tx.transaction_type}</td>
                    <td>{tx.reference_no || '-'}</td>
                    <td className="font-bold">{money(tx.amount)}</td>
                    <td><Badge variant={tx.is_cleared ? 'success' : 'neutral'}>{tx.is_cleared ? 'Cleared' : 'Open'}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title="Post Money Transaction">
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button className={`erp-btn border ${transactionMode === 'DEPOSIT' ? 'bg-success-green text-white border-success-green' : 'bg-white border-slate-200 text-slate-700'}`} onClick={() => setTransactionMode('DEPOSIT')}><ArrowDownCircle className="w-4 h-4 mr-1" />Deposit</button>
                <button className={`erp-btn border ${transactionMode === 'WITHDRAWAL' ? 'bg-danger-red text-white border-danger-red' : 'bg-white border-slate-200 text-slate-700'}`} onClick={() => setTransactionMode('WITHDRAWAL')}><ArrowUpCircle className="w-4 h-4 mr-1" />Withdraw</button>
                <button className={`erp-btn border ${transactionMode === 'BANK_CHARGE' ? 'bg-primary-blue text-white border-primary-blue' : 'bg-white border-slate-200 text-slate-700'}`} onClick={() => setTransactionMode('BANK_CHARGE')}>Charge</button>
                <button className={`erp-btn border ${transactionMode === 'ADJUSTMENT' ? 'bg-primary-blue text-white border-primary-blue' : 'bg-white border-slate-200 text-slate-700'}`} onClick={() => setTransactionMode('ADJUSTMENT')}>Adjust</button>
              </div>
              <select className="erp-input" value={transactionForm.account_id} onChange={(e) => setTransactionForm((p) => ({ ...p, account_id: e.target.value }))}>
                {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
              <Input id="money-date" label="Date" type="date" value={transactionForm.transaction_date} onChange={(e) => setTransactionForm((p) => ({ ...p, transaction_date: e.target.value }))} />
              <Input id="money-amount" label="Amount" type="number" value={transactionForm.amount} onChange={(e) => setTransactionForm((p) => ({ ...p, amount: Number(e.target.value) || 0 }))} />
              {transactionMode !== 'BANK_CHARGE' && (
                <select className="erp-input" value={transactionForm.offset_gl_account_id} onChange={(e) => setTransactionForm((p) => ({ ...p, offset_gl_account_id: e.target.value }))}>
                  {glAccounts.map((a) => <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>)}
                </select>
              )}
              {transactionMode === 'ADJUSTMENT' && (
                <select className="erp-input" value={transactionForm.adjustment_sign} onChange={(e) => setTransactionForm((p) => ({ ...p, adjustment_sign: Number(e.target.value) as 1 | -1 }))}>
                  <option value={1}>Increase balance</option>
                  <option value={-1}>Decrease balance</option>
                </select>
              )}
              <Input id="money-ref" label="Reference" value={transactionForm.reference_no} onChange={(e) => setTransactionForm((p) => ({ ...p, reference_no: e.target.value }))} />
              <Input id="money-notes" label="Notes" value={transactionForm.notes} onChange={(e) => setTransactionForm((p) => ({ ...p, notes: e.target.value }))} />
              <Button fullWidth onClick={postTransaction}>Post Transaction</Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'transfers' && (
        <Card title="Transfer Between Accounts">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <select className="erp-input" value={transferForm.from_account_id} onChange={(e) => setTransferForm((p) => ({ ...p, from_account_id: e.target.value }))}>
              {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
            </select>
            <select className="erp-input" value={transferForm.to_account_id} onChange={(e) => setTransferForm((p) => ({ ...p, to_account_id: e.target.value }))}>
              {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
            </select>
            <Input id="transfer-date" label="Date" type="date" value={transferForm.transaction_date} onChange={(e) => setTransferForm((p) => ({ ...p, transaction_date: e.target.value }))} />
            <Input id="transfer-amount" label="Amount" type="number" value={transferForm.amount} onChange={(e) => setTransferForm((p) => ({ ...p, amount: Number(e.target.value) || 0 }))} />
            <Input id="transfer-ref" label="Reference" value={transferForm.reference_no} onChange={(e) => setTransferForm((p) => ({ ...p, reference_no: e.target.value }))} />
            <Button onClick={postTransfer}><ArrowRightLeft className="w-4 h-4 mr-2" />Transfer</Button>
          </div>
        </Card>
      )}

      {activeTab === 'reconciliation' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card title="Reconciliation Worksheet">
            <div className="space-y-3">
              <select className="erp-input" value={reconForm.account_id} onChange={(e) => setReconForm((p) => ({ ...p, account_id: e.target.value }))}>
                {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
              </select>
              <Input id="recon-start" label="Start Date" type="date" value={reconForm.start_date} onChange={(e) => setReconForm((p) => ({ ...p, start_date: e.target.value }))} />
              <Input id="recon-end" label="End Date" type="date" value={reconForm.end_date} onChange={(e) => setReconForm((p) => ({ ...p, end_date: e.target.value }))} />
              <Input id="recon-statement" label="Statement Balance" type="number" value={reconForm.statement_balance} onChange={(e) => setReconForm((p) => ({ ...p, statement_balance: Number(e.target.value) || 0 }))} />
              <Button fullWidth onClick={createReconciliation}>Create Worksheet</Button>
            </div>
          </Card>

          <Card className="xl:col-span-2" title="Clear Transactions">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
              <select className="erp-input" value={selectedReconId} onChange={(e) => setSelectedReconId(e.target.value)}>
                <option value="">Select reconciliation</option>
                {reconciliations.map((r) => <option key={r.id} value={r.id}>{r.account_code} {r.end_date} ({r.status})</option>)}
              </select>
              <div className="text-xs bg-slate-50 border border-slate-200 rounded-[4px] px-3 py-2">Book: {money(selectedRecon?.book_balance || 0)}</div>
              <div className="text-xs bg-slate-50 border border-slate-200 rounded-[4px] px-3 py-2">Statement: {money(selectedRecon?.statement_balance || 0)}</div>
              <div className="text-xs bg-slate-50 border border-slate-200 rounded-[4px] px-3 py-2 font-bold">Difference: {money(selectedRecon?.difference || 0)}</div>
            </div>
            <table className="erp-table text-xs">
              <thead><tr><th>Clear</th><th>Date</th><th>Type</th><th>Reference</th><th>Amount</th></tr></thead>
              <tbody>
                {reconItems.map((item) => (
                  <tr key={item.id}>
                    <td><input type="checkbox" checked={selectedReconItems.includes(item.transaction_id)} onChange={(e) => setSelectedReconItems((prev) => e.target.checked ? [...prev, item.transaction_id] : prev.filter((id) => id !== item.transaction_id))} /></td>
                    <td>{item.transaction_date}</td>
                    <td>{item.transaction_type}</td>
                    <td>{item.reference_no || '-'}</td>
                    <td>{money(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-3 flex justify-end">
              <Button onClick={completeReconciliation} disabled={!selectedReconId}>Mark Selected Cleared</Button>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'mapping' && (
        <Card title="Payment Method Mapping">
          <table className="erp-table text-xs">
            <thead><tr><th>Payment Method</th><th>Mapped Account</th><th>Status</th></tr></thead>
            <tbody>
              {paymentMethods.map((method) => {
                const mapping = mappings.find((m) => m.payment_method === method);
                return (
                  <tr key={method}>
                    <td className="font-bold">{method}</td>
                    <td>
                      <select className="erp-input" value={mapping?.account_id || ''} onChange={(e) => mapPaymentMethod(method, e.target.value)}>
                        <option value="">Not mapped</option>
                        {activeAccounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                      </select>
                    </td>
                    <td><Badge variant={mapping?.account_id ? 'success' : 'warning'}>{mapping?.account_id ? 'Mapped' : 'Open'}</Badge></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <div className="text-[11px] text-slate-500">Total cash and bank liquidity: <span className="font-bold text-slate-800">{money(totals.total || 0)}</span></div>
    </div>
  );
};
