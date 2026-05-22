import React, { useEffect, useMemo, useState } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { Account, JournalEntry, JournalEntryLine } from '../../shared/types';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';

interface JournalWithLines extends JournalEntry {
  lines?: JournalEntryLine[];
}

const emptyJournalLine = (): Partial<JournalEntryLine> => ({ account_id: '', description: '', debit: 0, credit: 0 });

export const AccountingPage: React.FC = () => {
  const { notify } = useErp();
  const [activeTab, setActiveTab] = useState<'accounts' | 'journals'>('accounts');

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [journals, setJournals] = useState<JournalEntry[]>([]);

  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingJournals, setLoadingJournals] = useState(false);

  const [searchAccount, setSearchAccount] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterSubtype, setFilterSubtype] = useState('All');

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [accountErrors, setAccountErrors] = useState<Record<string, string>>({});
  const [currentAccount, setCurrentAccount] = useState<Partial<Account>>({ account_code: '', account_name: '', account_type: 'Asset', account_subtype: '', opening_balance: 0, status: 'active' });

  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [journalDrawer, setJournalDrawer] = useState<JournalWithLines | null>(null);
  const [journalError, setJournalError] = useState('');
  const [journalForm, setJournalForm] = useState<{ entry_date: string; description: string; reference_id: string; lines: Partial<JournalEntryLine>[] }>({
    entry_date: new Date().toISOString().split('T')[0],
    description: '',
    reference_id: '',
    lines: [emptyJournalLine(), emptyJournalLine()]
  });

  const loadAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const data = await window.api.accounts.getAll();
      setAccounts(data);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const loadJournals = async () => {
    setLoadingJournals(true);
    try {
      const data = await window.api.journals.getAll();
      setJournals(data);
    } finally {
      setLoadingJournals(false);
    }
  };

  useEffect(() => {
    loadAccounts();
    loadJournals();
  }, []);

  const filteredAccounts = useMemo(() => {
    return accounts.filter((a) => {
      if (filterType !== 'All' && a.account_type !== filterType) return false;
      if (filterSubtype !== 'All' && (a.account_subtype || '') !== filterSubtype) return false;
      if (searchAccount) {
        const q = searchAccount.toLowerCase();
        return a.account_code.toLowerCase().includes(q) || a.account_name.toLowerCase().includes(q);
      }
      return true;
    });
  }, [accounts, filterType, filterSubtype, searchAccount]);

  const subtypes = useMemo(() => {
    const set = new Set(accounts.map((a) => a.account_subtype).filter(Boolean) as string[]);
    return Array.from(set);
  }, [accounts]);

  const totals = useMemo(() => {
    const totalDebit = journalForm.lines.reduce((sum, line) => sum + (Number(line.debit) || 0), 0);
    const totalCredit = journalForm.lines.reduce((sum, line) => sum + (Number(line.credit) || 0), 0);
    return { totalDebit, totalCredit, balanced: Math.abs(totalDebit - totalCredit) <= 0.001 && totalDebit > 0 };
  }, [journalForm.lines]);

  const validateAccount = () => {
    const errs: Record<string, string> = {};
    if (!currentAccount.account_code?.trim()) errs.account_code = 'Account code is required.';
    if (!currentAccount.account_name?.trim()) errs.account_name = 'Account name is required.';
    if (!currentAccount.account_type) errs.account_type = 'Account type is required.';
    setAccountErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const openAccountForm = (account?: Account) => {
    setAccountErrors({});
    if (account) {
      setCurrentAccount({ ...account });
    } else {
      setCurrentAccount({ account_code: '', account_name: '', account_type: 'Asset', account_subtype: '', opening_balance: 0, status: 'active' });
    }
    setIsAccountModalOpen(true);
  };

  const saveAccount = async () => {
    if (!validateAccount()) return;
    try {
      if (currentAccount.id) {
        await window.api.accounts.update(currentAccount);
      } else {
        await window.api.accounts.create(currentAccount);
      }
      setIsAccountModalOpen(false);
      await loadAccounts();
      notify('success', 'Account saved successfully.');
    } catch (e: any) {
      notify('error', e.message || 'Failed to save account.');
    }
  };

  const deactivateAccount = async (account: Account) => {
    if (account.is_system_account) return;
    try {
      await window.api.accounts.deactivate(account.id);
      await loadAccounts();
      notify('success', 'Account deactivated.');
    } catch (e: any) {
      notify('error', e.message || 'Failed to deactivate account.');
    }
  };

  const updateJournalLine = (index: number, patch: Partial<JournalEntryLine>) => {
    setJournalForm((prev) => {
      const lines = [...prev.lines];
      const merged = { ...lines[index], ...patch };
      if (patch.debit && Number(patch.debit) > 0) merged.credit = 0;
      if (patch.credit && Number(patch.credit) > 0) merged.debit = 0;
      lines[index] = merged;
      return { ...prev, lines };
    });
  };

  const saveJournal = async () => {
    setJournalError('');
    if (!journalForm.description.trim()) {
      setJournalError('Description is required.');
      return;
    }
    if (journalForm.lines.some((l) => !l.account_id)) {
      setJournalError('Every journal line must have an account.');
      return;
    }
    if (!totals.balanced) {
      setJournalError('Journal entry is not balanced.');
      return;
    }

    try {
      const lines = journalForm.lines.map((line) => ({
        account_id: line.account_id || '',
        description: line.description || '',
        debit: Number(line.debit) || 0,
        credit: Number(line.credit) || 0
      }));
      await window.api.journals.create({ ...journalForm, lines, total_debit: totals.totalDebit, total_credit: totals.totalCredit });
      setIsJournalModalOpen(false);
      setJournalForm({ entry_date: new Date().toISOString().split('T')[0], description: '', reference_id: '', lines: [emptyJournalLine(), emptyJournalLine()] });
      await loadJournals();
      await loadAccounts();
      notify('success', 'Journal posted successfully.');
    } catch (e: any) {
      setJournalError(e.message || 'Failed to save journal.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button id="accounting-tab-accounts" className={`px-4 py-2 text-sm font-semibold rounded-[4px] ${activeTab === 'accounts' ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setActiveTab('accounts')}>Chart of Accounts</button>
        <button id="accounting-tab-journals" className={`px-4 py-2 text-sm font-semibold rounded-[4px] ${activeTab === 'journals' ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setActiveTab('journals')}>Journal Entries</button>
      </div>

      {activeTab === 'accounts' && (
        <Card title="Chart of Accounts" headerActions={<Button id="account-add" onClick={() => openAccountForm()}>Add Account</Button>}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
            <Input id="account-search" placeholder="Search code / name" value={searchAccount} onChange={(e) => setSearchAccount(e.target.value)} />
            <select id="account-type-filter" className="erp-input" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option>All</option>
              <option>Asset</option><option>Liability</option><option>Equity</option><option>Income</option><option>Expense</option>
            </select>
            <select id="account-subtype-filter" className="erp-input" value={filterSubtype} onChange={(e) => setFilterSubtype(e.target.value)}>
              <option>All</option>{subtypes.map((s) => <option key={s}>{s}</option>)}
            </select>
            <div className="text-xs text-slate-500 flex items-center">{filteredAccounts.length} accounts</div>
          </div>

          {loadingAccounts ? <p className="text-xs text-slate-500">Loading accounts...</p> : filteredAccounts.length === 0 ? <p className="text-xs text-slate-500 py-6 text-center">No accounts found.</p> : (
            <table className="erp-table text-xs">
              <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Balance</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {filteredAccounts.map((a) => {
                  const polarity = (a.account_type === 'Asset' || a.account_type === 'Expense') ? 'Dr' : 'Cr';
                  return (
                    <tr key={a.id}>
                      <td>{a.account_code}</td>
                      <td>{a.account_name} {a.is_system_account ? <Badge variant="warning">Locked</Badge> : null}</td>
                      <td>{a.account_type}{a.account_subtype ? ` / ${a.account_subtype}` : ''}</td>
                      <td>{Math.abs(a.current_balance).toFixed(2)} {polarity}</td>
                      <td><Badge variant={a.status === 'active' ? 'success' : 'danger'}>{a.status}</Badge></td>
                      <td className="flex gap-1">
                        <Button size="sm" variant="secondary" onClick={() => openAccountForm(a)} disabled={Boolean(a.is_system_account)}>Edit</Button>
                        <Button size="sm" variant="danger" onClick={() => deactivateAccount(a)} disabled={Boolean(a.is_system_account)}>Deactivate</Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {activeTab === 'journals' && (
        <Card title="Journal Entries" headerActions={<Button id="journal-add" onClick={() => setIsJournalModalOpen(true)}>New Journal</Button>}>
          {loadingJournals ? <p className="text-xs text-slate-500">Loading journals...</p> : journals.length === 0 ? <p className="text-xs text-slate-500 py-6 text-center">No journal entries found.</p> : (
            <table className="erp-table text-xs">
              <thead><tr><th>Date</th><th>Entry No</th><th>Description</th><th>Debit</th><th>Credit</th><th>Status</th><th>Detail</th></tr></thead>
              <tbody>
                {journals.map((j) => (
                  <tr key={j.id}>
                    <td>{new Date(j.entry_date).toLocaleDateString()}</td>
                    <td>{j.entry_no}</td>
                    <td>{j.description}</td>
                    <td>{j.total_debit.toFixed(2)}</td>
                    <td>{j.total_credit.toFixed(2)}</td>
                    <td><Badge variant={j.status === 'posted' ? 'success' : 'warning'}>{j.status}</Badge></td>
                    <td><Button size="sm" variant="secondary" onClick={() => setJournalDrawer(j)}>View</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {isAccountModalOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setIsAccountModalOpen(false)}>
          <div className="bg-white w-full max-w-xl rounded-[6px] border border-slate-200 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 text-sm font-bold">{currentAccount.id ? 'Edit Account' : 'Add Account'}</div>
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Input id="account-code" label="Account Code" value={currentAccount.account_code || ''} onChange={(e) => setCurrentAccount((p) => ({ ...p, account_code: e.target.value }))} />
                {accountErrors.account_code && <p className="text-xs text-red-600">{accountErrors.account_code}</p>}
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Type</label>
                <select id="account-type" className="erp-input" value={currentAccount.account_type} onChange={(e) => setCurrentAccount((p) => ({ ...p, account_type: e.target.value as Account['account_type'] }))}>
                  <option>Asset</option><option>Liability</option><option>Equity</option><option>Income</option><option>Expense</option>
                </select>
              </div>
              <div>
                <Input id="account-name" label="Account Name" value={currentAccount.account_name || ''} onChange={(e) => setCurrentAccount((p) => ({ ...p, account_name: e.target.value }))} />
                {accountErrors.account_name && <p className="text-xs text-red-600">{accountErrors.account_name}</p>}
              </div>
              <div>
                <Input id="account-subtype" label="Account Subtype" value={currentAccount.account_subtype || ''} onChange={(e) => setCurrentAccount((p) => ({ ...p, account_subtype: e.target.value }))} />
              </div>
              {!currentAccount.id && (
                <div>
                  <Input id="account-opening-balance" type="number" label="Opening Balance" value={currentAccount.opening_balance || 0} onChange={(e) => setCurrentAccount((p) => ({ ...p, opening_balance: Number(e.target.value) || 0 }))} />
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsAccountModalOpen(false)}>Cancel</Button>
              <Button id="account-save" onClick={saveAccount}>Save</Button>
            </div>
          </div>
        </div>
      )}

      {isJournalModalOpen && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4" onClick={() => setIsJournalModalOpen(false)}>
          <div className="bg-white w-full max-w-5xl rounded-[6px] border border-slate-200 shadow-xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-slate-200 text-sm font-bold">New Journal Entry</div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <Input id="journal-date" type="date" label="Date" value={journalForm.entry_date} onChange={(e) => setJournalForm((p) => ({ ...p, entry_date: e.target.value }))} />
                <div className="md:col-span-2"><Input id="journal-description" label="Description" value={journalForm.description} onChange={(e) => setJournalForm((p) => ({ ...p, description: e.target.value }))} /></div>
              </div>

              <table className="erp-table text-xs">
                <thead><tr><th>Account</th><th>Description</th><th>Debit</th><th>Credit</th><th></th></tr></thead>
                <tbody>
                  {journalForm.lines.map((line, idx) => (
                    <tr key={idx}>
                      <td>
                        <select id={`journal-line-account-${idx}`} className="erp-input" value={line.account_id} onChange={(e) => updateJournalLine(idx, { account_id: e.target.value })}>
                          <option value="">Select account</option>
                          {accounts.filter((a) => a.status === 'active').map((a) => <option key={a.id} value={a.id}>{a.account_code} - {a.account_name}</option>)}
                        </select>
                      </td>
                      <td><input className="erp-input" value={line.description || ''} onChange={(e) => updateJournalLine(idx, { description: e.target.value })} /></td>
                      <td><input className="erp-input text-right" type="number" value={line.debit || 0} onChange={(e) => updateJournalLine(idx, { debit: Number(e.target.value) || 0 })} /></td>
                      <td><input className="erp-input text-right" type="number" value={line.credit || 0} onChange={(e) => updateJournalLine(idx, { credit: Number(e.target.value) || 0 })} /></td>
                      <td>{journalForm.lines.length > 2 ? <Button size="sm" variant="danger" onClick={() => setJournalForm((p) => ({ ...p, lines: p.lines.filter((_, i) => i !== idx) }))}>-</Button> : null}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="sticky bottom-0 bg-white border border-slate-200 rounded-[4px] p-3 flex justify-between items-center text-xs">
                <div className={totals.balanced ? 'text-green-700' : 'text-red-700'}>{totals.balanced ? 'Balanced entry' : 'Unbalanced entry'}</div>
                <div className="font-semibold">Debit: {totals.totalDebit.toFixed(2)} | Credit: {totals.totalCredit.toFixed(2)}</div>
              </div>

              {journalError && <p className="text-xs text-red-600">{journalError}</p>}
              <Button variant="secondary" onClick={() => setJournalForm((p) => ({ ...p, lines: [...p.lines, emptyJournalLine()] }))}>Add Line</Button>
            </div>
            <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsJournalModalOpen(false)}>Cancel</Button>
              <Button id="journal-save" disabled={!totals.balanced} onClick={saveJournal}>Post Journal</Button>
            </div>
          </div>
        </div>
      )}

      {journalDrawer && (
        <div className="fixed inset-0 bg-black/30 z-50 flex justify-end" onClick={() => setJournalDrawer(null)}>
          <div className="w-[430px] bg-white h-full shadow-xl p-4 overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold">Journal Detail</h3>
              <Button size="sm" variant="secondary" onClick={() => setJournalDrawer(null)}>Close</Button>
            </div>
            <div className="text-sm space-y-1">
              <p><b>Entry:</b> {journalDrawer.entry_no}</p>
              <p><b>Date:</b> {new Date(journalDrawer.entry_date).toLocaleDateString()}</p>
              <p><b>Description:</b> {journalDrawer.description}</p>
              <p><b>Debit:</b> {journalDrawer.total_debit.toFixed(2)}</p>
              <p><b>Credit:</b> {journalDrawer.total_credit.toFixed(2)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
