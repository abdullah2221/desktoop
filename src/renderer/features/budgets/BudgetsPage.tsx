import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, Plus, Save, Target, TrendingUp } from 'lucide-react';
import { useErp } from '../../app/providers/ErpContext';
import type { Account, Budget, BudgetLine, ClassTracking } from '../../shared/types';

const today = () => new Date().toISOString().split('T')[0];
const yearStart = () => `${new Date().getFullYear()}-01-01`;
const yearEnd = () => `${new Date().getFullYear()}-12-31`;
const money = (value: number) => `Rs. ${Number(value || 0).toFixed(2)}`;

const emptyForm = (): Partial<Budget> => ({
  name: '',
  period_type: 'monthly',
  date_from: yearStart(),
  date_to: yearEnd(),
  branch_id: '',
  class_id: '',
  status: 'Draft',
  notes: '',
  lines: []
});

export const BudgetsPage: React.FC = () => {
  const { notify, accessibleBranches, activeBranchId, hasPermission } = useErp();
  const [tab, setTab] = useState<'budgets' | 'variance' | 'classPnl'>('budgets');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [classes, setClasses] = useState<ClassTracking[]>([]);
  const [form, setForm] = useState<Partial<Budget>>(emptyForm());
  const [dateFrom, setDateFrom] = useState(yearStart());
  const [dateTo, setDateTo] = useState(today());
  const [budgetFilter, setBudgetFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState(activeBranchId);
  const [classFilter, setClassFilter] = useState('');
  const [varianceReport, setVarianceReport] = useState<any>(null);
  const [classPnl, setClassPnl] = useState<any>(null);

  const load = async () => {
    const [budgetRows, accountRows, classRows] = await Promise.all([
      hasPermission('budget.manage') ? window.api.budgets.getAll() : Promise.resolve([]),
      hasPermission('budget.manage') ? window.api.accounts.getAll() : Promise.resolve([]),
      window.api.classes.getAll()
    ]);
    setBudgets(budgetRows);
    setAccounts(accountRows.filter((account) => account.status === 'active'));
    setClasses(classRows);
  };

  useEffect(() => {
    load().catch((error) => notify('error', error.message || 'Failed to load budgets.'));
  }, []);

  useEffect(() => {
    setBranchFilter(activeBranchId);
  }, [activeBranchId]);

  const budgetAccounts = useMemo(() => accounts.filter((account) => ['Income', 'Expense', 'Asset', 'Liability'].includes(account.account_type)), [accounts]);
  const formLines = form.lines || [];
  const formTotal = formLines.reduce((sum, line) => sum + Number(line.amount || 0), 0);

  const addLine = () => {
    setForm((prev) => ({
      ...prev,
      lines: [...(prev.lines || []), { account_id: budgetAccounts[0]?.id || '', amount: 0, notes: '' }]
    }));
  };

  const updateLine = (index: number, patch: Partial<BudgetLine>) => {
    setForm((prev) => {
      const lines = [...(prev.lines || [])];
      lines[index] = { ...lines[index], ...patch } as BudgetLine;
      return { ...prev, lines };
    });
  };

  const removeLine = (index: number) => {
    setForm((prev) => ({ ...prev, lines: (prev.lines || []).filter((_, idx) => idx !== index) }));
  };

  const editBudget = async (id: string) => {
    const data = await window.api.budgets.getById(id);
    setForm({ ...data, branch_id: data.branch_id || '', class_id: data.class_id || '' });
  };

  const saveBudget = async () => {
    if (!form.name || !form.date_from || !form.date_to) {
      notify('error', 'Budget name and date range are required.');
      return;
    }
    const payload = {
      ...form,
      branch_id: form.branch_id || null,
      class_id: form.class_id || null,
      lines: (form.lines || []).filter((line) => line.account_id)
    };
    if (form.id) await window.api.budgets.update(payload);
    else await window.api.budgets.create(payload);
    setForm(emptyForm());
    await load();
    notify('success', 'Budget saved.');
  };

  const deactivateBudget = async (id: string) => {
    await window.api.budgets.deactivate(id);
    await load();
    notify('success', 'Budget deactivated.');
  };

  const runVariance = async () => {
    const report = await window.api.reports.budgetVsActual(dateFrom, dateTo, budgetFilter || undefined, branchFilter || undefined, classFilter || undefined);
    setVarianceReport(report);
  };

  const runClassPnl = async () => {
    const report = await window.api.reports.classProfitAndLoss(dateFrom, dateTo, branchFilter || undefined, classFilter || undefined);
    setClassPnl(report);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-blue">
            <Target className="w-4 h-4" />
            Performance Planning
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">Budgets & Department P&L</h2>
          <p className="text-sm text-slate-500">Plan income and expenses, compare against ledger actuals, and review class performance.</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-[8px] px-4 py-3 shadow-sm">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">Active Budgets</span>
          <span className="text-xl font-black text-slate-900">{budgets.filter((budget) => budget.status !== 'inactive').length}</span>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[8px] p-1 inline-flex shadow-sm">
        <button className={`px-4 py-2 text-xs font-bold rounded-[5px] ${tab === 'budgets' ? 'bg-primary-blue text-white' : 'text-slate-500 hover:bg-slate-50'}`} onClick={() => setTab('budgets')}>Budgets</button>
        <button className={`px-4 py-2 text-xs font-bold rounded-[5px] ${tab === 'variance' ? 'bg-primary-blue text-white' : 'text-slate-500 hover:bg-slate-50'}`} onClick={() => setTab('variance')}>Budget vs Actual</button>
        <button className={`px-4 py-2 text-xs font-bold rounded-[5px] ${tab === 'classPnl' ? 'bg-primary-blue text-white' : 'text-slate-500 hover:bg-slate-50'}`} onClick={() => setTab('classPnl')}>Class / Department P&L</button>
      </div>

      {tab === 'budgets' && !hasPermission('budget.manage') && (
        <ReportShell title="Budget Management">
          <p className="text-sm text-slate-500">You can view budget reports, but budget editing requires budget.manage permission.</p>
        </ReportShell>
      )}

      {tab === 'budgets' && hasPermission('budget.manage') && (
        <div className="grid grid-cols-1 xl:grid-cols-[420px_1fr] gap-4">
          <div className="bg-white border border-slate-200 rounded-[8px] shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">{form.id ? 'Edit Budget' : 'Create Budget'}</h3>
              <Plus className="w-5 h-5 text-primary-blue" />
            </div>
            <input className="erp-input" placeholder="Budget name" value={form.name || ''} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            <div className="grid grid-cols-2 gap-2">
              <select className="erp-input" value={form.period_type || 'monthly'} onChange={(e) => setForm((prev) => ({ ...prev, period_type: e.target.value as Budget['period_type'] }))}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
              <select className="erp-input" value={form.status || 'Draft'} onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as Budget['status'] }))}>
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className="erp-input" type="date" value={form.date_from || ''} onChange={(e) => setForm((prev) => ({ ...prev, date_from: e.target.value }))} />
              <input className="erp-input" type="date" value={form.date_to || ''} onChange={(e) => setForm((prev) => ({ ...prev, date_to: e.target.value }))} />
            </div>
            <select className="erp-input" value={form.branch_id || ''} onChange={(e) => setForm((prev) => ({ ...prev, branch_id: e.target.value }))}>
              <option value="">All / Corporate Budget</option>
              {accessibleBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_code} - {branch.branch_name}</option>)}
            </select>
            <select className="erp-input" value={form.class_id || ''} onChange={(e) => setForm((prev) => ({ ...prev, class_id: e.target.value }))}>
              <option value="">All Classes</option>
              {classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.class_code} - {cls.class_name}</option>)}
            </select>
            <textarea className="erp-input" rows={2} placeholder="Notes" value={form.notes || ''} onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))} />

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Budget Lines</span>
                <button className="text-xs font-bold text-primary-blue" onClick={addLine}>Add line</button>
              </div>
              {formLines.map((line, index) => (
                <div key={index} className="grid grid-cols-[1fr_90px_24px] gap-2">
                  <select className="erp-input" value={line.account_id} onChange={(e) => updateLine(index, { account_id: e.target.value })}>
                    {budgetAccounts.map((account) => <option key={account.id} value={account.id}>{account.account_code} - {account.account_name}</option>)}
                  </select>
                  <input className="erp-input text-right" type="number" value={line.amount || 0} onChange={(e) => updateLine(index, { amount: Number(e.target.value) })} />
                  <button className="text-red-600 font-bold" onClick={() => removeLine(index)}>x</button>
                </div>
              ))}
              <div className="text-right text-xs font-black text-slate-700">Total: {money(formTotal)}</div>
            </div>

            <div className="flex gap-2">
              <button className="inline-flex items-center gap-2 rounded-[4px] bg-primary-blue px-3 py-2 text-xs font-bold text-white" onClick={saveBudget}>
                <Save className="w-4 h-4" />
                Save Budget
              </button>
              {form.id && <button className="rounded-[4px] border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600" onClick={() => setForm(emptyForm())}>New</button>}
            </div>
          </div>

          <ReportShell title="Budget Register">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="text-left px-3 py-2">Budget</th><th className="text-left px-3 py-2">Scope</th><th className="text-right px-3 py-2">Amount</th><th className="text-left px-3 py-2">Status</th><th className="text-right px-3 py-2">Actions</th></tr></thead>
              <tbody>
                {budgets.map((budget) => (
                  <tr key={budget.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2"><b>{budget.name}</b><span className="block text-slate-500">{budget.date_from} to {budget.date_to}</span></td>
                    <td className="px-3 py-2">{budget.branch_name || 'All Branches'} / {budget.class_name || 'All Classes'}</td>
                    <td className="px-3 py-2 text-right font-bold">{money(budget.total_budget || 0)}</td>
                    <td className="px-3 py-2"><span className="px-2 py-1 rounded-[3px] bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">{budget.status}</span></td>
                    <td className="px-3 py-2 text-right space-x-2"><button className="text-primary-blue font-bold" onClick={() => editBudget(budget.id)}>Edit</button>{budget.status !== 'inactive' && <button className="text-red-600 font-bold" onClick={() => deactivateBudget(budget.id)}>Deactivate</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ReportShell>
        </div>
      )}

      {tab === 'variance' && (
        <ReportShell title="Budget vs Actual" actions={<Filters budgets={budgets} branches={accessibleBranches} classes={classes} dateFrom={dateFrom} dateTo={dateTo} budgetFilter={budgetFilter} branchFilter={branchFilter} classFilter={classFilter} setDateFrom={setDateFrom} setDateTo={setDateTo} setBudgetFilter={setBudgetFilter} setBranchFilter={setBranchFilter} setClassFilter={setClassFilter} run={runVariance} />}>
          {varianceReport && <VarianceReport report={varianceReport} />}
        </ReportShell>
      )}

      {tab === 'classPnl' && (
        <ReportShell title="Class / Department P&L" actions={<Filters branches={accessibleBranches} classes={classes} dateFrom={dateFrom} dateTo={dateTo} branchFilter={branchFilter} classFilter={classFilter} setDateFrom={setDateFrom} setDateTo={setDateTo} setBranchFilter={setBranchFilter} setClassFilter={setClassFilter} run={runClassPnl} />}>
          {classPnl && <ClassPnlReport report={classPnl} />}
        </ReportShell>
      )}
    </div>
  );
};

const ReportShell: React.FC<{ title: string; actions?: React.ReactNode; children: React.ReactNode }> = ({ title, actions, children }) => (
  <div className="bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden">
    <div className="px-4 py-3 border-b border-slate-200 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      {actions}
    </div>
    <div className="p-4 overflow-x-auto">{children}</div>
  </div>
);

const Filters: React.FC<any> = ({ budgets = [], branches, classes, dateFrom, dateTo, budgetFilter, branchFilter, classFilter, setDateFrom, setDateTo, setBudgetFilter, setBranchFilter, setClassFilter, run }) => (
  <div className="flex flex-wrap gap-2">
    <input className="erp-input w-36" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
    <input className="erp-input w-36" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
    {setBudgetFilter && <select className="erp-input w-48" value={budgetFilter} onChange={(e) => setBudgetFilter(e.target.value)}><option value="">All Budgets</option>{budgets.map((budget: Budget) => <option key={budget.id} value={budget.id}>{budget.name}</option>)}</select>}
    <select className="erp-input w-48" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}><option value="">All Branches</option>{branches.map((branch: any) => <option key={branch.id} value={branch.id}>{branch.branch_code} - {branch.branch_name}</option>)}</select>
    <select className="erp-input w-48" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}><option value="">All Classes</option>{classes.map((cls: ClassTracking) => <option key={cls.id} value={cls.id}>{cls.class_code} - {cls.class_name}</option>)}</select>
    <button className="inline-flex items-center gap-2 rounded-[4px] bg-primary-blue px-3 py-2 text-xs font-bold text-white" onClick={run}><BarChart3 className="w-4 h-4" />Run</button>
  </div>
);

const VarianceReport: React.FC<{ report: any }> = ({ report }) => (
  <div className="space-y-4">
    <SummaryCards cards={[['Budget', report.totalBudget], ['Actual', report.totalActual], ['Variance', report.totalVariance]]} />
    <table className="w-full text-xs">
      <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="text-left px-3 py-2">Account</th><th className="text-right px-3 py-2">Budget</th><th className="text-right px-3 py-2">Actual</th><th className="text-right px-3 py-2">Variance</th><th className="text-right px-3 py-2">%</th></tr></thead>
      <tbody>{report.rows.map((row: any) => <tr key={row.account_id} className="border-t border-slate-100"><td className="px-3 py-2 font-bold">{row.account_code} - {row.account_name}</td><td className="px-3 py-2 text-right">{money(row.budget_amount)}</td><td className="px-3 py-2 text-right">{money(row.actual_amount)}</td><td className={`px-3 py-2 text-right font-bold ${row.variance_amount >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{money(row.variance_amount)}</td><td className="px-3 py-2 text-right">{row.variance_percentage === null ? '-' : `${row.variance_percentage.toFixed(1)}%`}</td></tr>)}</tbody>
    </table>
  </div>
);

const ClassPnlReport: React.FC<{ report: any }> = ({ report }) => (
  <div className="space-y-4">
    <SummaryCards cards={[['Income', report.totals.income], ['COGS', report.totals.cogs], ['Expenses', report.totals.expenses], ['Net Profit', report.totals.netProfit]]} />
    <table className="w-full text-xs">
      <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="text-left px-3 py-2">Class</th><th className="text-right px-3 py-2">Income</th><th className="text-right px-3 py-2">COGS</th><th className="text-right px-3 py-2">Expenses</th><th className="text-right px-3 py-2">Net Profit</th></tr></thead>
      <tbody>{report.classes.map((row: any) => <tr key={row.class_id} className="border-t border-slate-100"><td className="px-3 py-2 font-bold">{row.class_code} - {row.class_name}</td><td className="px-3 py-2 text-right">{money(row.income)}</td><td className="px-3 py-2 text-right">{money(row.cogs)}</td><td className="px-3 py-2 text-right">{money(row.expenses)}</td><td className={`px-3 py-2 text-right font-black ${row.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{money(row.netProfit)}</td></tr>)}</tbody>
    </table>
  </div>
);

const SummaryCards: React.FC<{ cards: Array<[string, number]> }> = ({ cards }) => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
    {cards.map(([label, value]) => (
      <div key={label} className="bg-slate-50 border border-slate-200 rounded-[6px] p-3">
        <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">{label}</div>
        <div className="mt-1 text-lg font-black text-slate-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary-blue" />{money(value)}</div>
      </div>
    ))}
  </div>
);
