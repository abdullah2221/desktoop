import React, { useEffect, useMemo, useState } from 'react';
import { Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useErp } from '../../app/providers/ErpContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';

type ReportKey = 'profitAndLoss' | 'balanceSheet' | 'cashFlow' | 'generalLedger' | 'trialBalance' | 'arAging' | 'apAging' | 'inventoryValuation' | 'taxSummary' | 'salesByCustomerProduct' | 'purchasesBySupplierProduct' | 'expenseSummary';

const today = () => new Date().toISOString().split('T')[0];
const monthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
};
const money = (value: number) => `Rs. ${Number(value || 0).toFixed(2)}`;

const reportOptions: Array<{ key: ReportKey; label: string; group: string }> = [
  { key: 'profitAndLoss', label: 'Profit & Loss', group: 'Financial Statements' },
  { key: 'balanceSheet', label: 'Balance Sheet', group: 'Financial Statements' },
  { key: 'cashFlow', label: 'Cash Flow Statement', group: 'Financial Statements' },
  { key: 'trialBalance', label: 'Trial Balance', group: 'Ledger' },
  { key: 'generalLedger', label: 'General Ledger', group: 'Ledger' },
  { key: 'arAging', label: 'Accounts Receivable Aging', group: 'Aging' },
  { key: 'apAging', label: 'Accounts Payable Aging', group: 'Aging' },
  { key: 'inventoryValuation', label: 'Inventory Valuation', group: 'Operations' },
  { key: 'taxSummary', label: 'Sales Tax/GST Summary', group: 'Tax' },
  { key: 'salesByCustomerProduct', label: 'Sales by Customer/Product', group: 'Sales' },
  { key: 'purchasesBySupplierProduct', label: 'Purchases by Supplier/Product', group: 'Purchases' },
  { key: 'expenseSummary', label: 'Expense Summary', group: 'Expenses' }
];

const SimpleTable: React.FC<{ columns: string[]; rows: Array<Record<string, any>>; empty?: string }> = ({ columns, rows, empty = 'No report rows found.' }) => {
  if (!rows || rows.length === 0) return <p className="text-xs text-slate-500 py-6 text-center">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="erp-table text-xs">
        <thead><tr>{columns.map((col) => <th key={col}>{col}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>{columns.map((col) => <td key={col}>{String(row[col] ?? '')}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const ReportsPage: React.FC = () => {
  const { notify, accessibleBranches, activeBranchId } = useErp();
  const [reportKey, setReportKey] = useState<ReportKey>('profitAndLoss');
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo, setDateTo] = useState(today());
  const [branchFilter, setBranchFilter] = useState<string>(activeBranchId);
  const [classFilter, setClassFilter] = useState<string>('');
  const [classes, setClasses] = useState<Array<{ id: string; class_code: string; class_name: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);

  const selectedReport = useMemo(() => reportOptions.find((r) => r.key === reportKey), [reportKey]);

  const loadReport = async () => {
    setLoading(true);
    try {
      let data: any;
      if (reportKey === 'profitAndLoss') data = await window.api.reports.profitAndLoss(dateFrom, dateTo, branchFilter || undefined, classFilter || undefined);
      else if (reportKey === 'balanceSheet') data = await window.api.reports.balanceSheet(dateTo, branchFilter || undefined);
      else if (reportKey === 'trialBalance') data = await window.api.reports.trialBalance(dateFrom, dateTo, branchFilter || undefined, classFilter || undefined);
      else if (reportKey === 'arAging') data = await window.api.reports.arAging(dateTo);
      else if (reportKey === 'apAging') data = await window.api.reports.apAging(dateTo);
      else if (reportKey === 'inventoryValuation') data = await window.api.reports.inventoryValuation();
      else data = await window.api.reports[reportKey](dateFrom, dateTo);
      setReport(data);
    } catch (e: any) {
      notify('error', e.message || 'Failed to load report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [reportKey]);

  useEffect(() => {
    setBranchFilter(activeBranchId);
  }, [activeBranchId]);

  useEffect(() => {
    window.api.classes.getAll().then(setClasses).catch(() => setClasses([]));
  }, []);

  const exportPlaceholder = () => notify('info', 'Export will be enabled in a future phase.');

  const renderReport = () => {
    if (!report) return <p className="text-xs text-slate-500">Choose a report to begin.</p>;

    if (reportKey === 'profitAndLoss') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Summary title="Income" value={money(report.totalIncome)} />
            <Summary title="Expenses" value={money(report.totalExpenses)} />
            <Summary title="Net Income" value={money(report.netIncome)} tone={report.netIncome >= 0 ? 'good' : 'bad'} />
          </div>
          <ReportBlock title="Income" rows={report.income.map((r: any) => ({ Account: `${r.account_code} - ${r.account_name}`, Amount: money(r.amount) }))} />
          <ReportBlock title="Expenses" rows={report.expenses.map((r: any) => ({ Account: `${r.account_code} - ${r.account_name}`, Amount: money(r.amount) }))} />
        </div>
      );
    }

    if (reportKey === 'balanceSheet') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Summary title="Assets" value={money(report.totalAssets)} />
            <Summary title="Liabilities" value={money(report.totalLiabilities)} />
            <Summary title="Equity" value={money(report.totalEquity)} />
            <Summary title="Difference" value={money(report.difference)} tone={Math.abs(report.difference) < 0.01 ? 'good' : 'bad'} />
          </div>
          <ReportBlock title="Assets" rows={formatBalanceRows(report.assets)} />
          <ReportBlock title="Liabilities" rows={formatBalanceRows(report.liabilities)} />
          <ReportBlock title="Equity" rows={formatBalanceRows(report.equity)} />
        </div>
      );
    }

    if (reportKey === 'trialBalance') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Summary title="Debit" value={money(report.totalDebit)} />
            <Summary title="Credit" value={money(report.totalCredit)} />
            <Summary title="Difference" value={money(report.difference)} tone={Math.abs(report.difference) < 0.01 ? 'good' : 'bad'} />
          </div>
          <SimpleTable columns={['Account', 'Debit', 'Credit']} rows={report.rows.map((r: any) => ({ Account: `${r.account_code} - ${r.account_name}`, Debit: money(r.debit_balance), Credit: money(r.credit_balance) }))} />
        </div>
      );
    }

    if (reportKey === 'cashFlow') {
      const rows = Object.values(report.sections).map((s: any) => ({ Section: s.label, Amount: money(s.total) }));
      return <><Summary title="Net Cash Flow" value={money(report.netCashFlow)} tone={report.netCashFlow >= 0 ? 'good' : 'bad'} /><SimpleTable columns={['Section', 'Amount']} rows={rows} /></>;
    }

    if (reportKey === 'generalLedger') {
      return <SimpleTable columns={['Date', 'Account', 'Entry', 'Reference', 'Debit', 'Credit', 'Balance']} rows={report.map((r: any) => ({ Date: r.entry_date, Account: `${r.account_code} - ${r.account_name}`, Entry: r.entry_no, Reference: r.reference_type || '', Debit: money(r.debit), Credit: money(r.credit), Balance: money(r.running_balance) }))} />;
    }

    if (reportKey === 'arAging' || reportKey === 'apAging') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Summary title="Current" value={money(report.totals.current)} />
            <Summary title="31-60" value={money(report.totals.days31_60)} />
            <Summary title="61-90" value={money(report.totals.days61_90)} />
            <Summary title="Over 90" value={money(report.totals.over90)} />
            <Summary title="Total" value={money(report.totals.total)} />
          </div>
          <SimpleTable columns={['Name', 'Current', '31-60', '61-90', 'Over 90', 'Total']} rows={report.rows.map((r: any) => ({ Name: r.name, Current: money(r.current), '31-60': money(r.days31_60), '61-90': money(r.days61_90), 'Over 90': money(r.over90), Total: money(r.total) }))} />
        </div>
      );
    }

    if (reportKey === 'inventoryValuation') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Summary title="Quantity On Hand" value={String(report.totalQuantity)} />
            <Summary title="Inventory Value" value={money(report.totalValue)} />
          </div>
          <SimpleTable columns={['SKU', 'Product', 'Qty', 'Unit Cost', 'Value']} rows={report.rows.map((r: any) => ({ SKU: r.sku || r.id, Product: r.name, Qty: r.quantity_on_hand, 'Unit Cost': money(r.unit_cost), Value: money(r.inventory_value) }))} />
        </div>
      );
    }

    if (reportKey === 'taxSummary') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Summary title="Output Tax" value={money(report.summary.outputTax)} />
            <Summary title="Input Tax" value={money(report.summary.inputTax)} />
            <Summary title="Net Payable" value={money(report.summary.netPayable)} tone={report.summary.netPayable >= 0 ? 'bad' : 'good'} />
          </div>
          <ReportBlock title="Output Tax" rows={report.output.map((r: any) => ({ Code: r.tax_code, Documents: r.docs, Tax: money(r.tax_amount), Net: money(r.net_sales) }))} />
          <ReportBlock title="Input Tax" rows={report.input.map((r: any) => ({ Code: r.tax_code, Documents: r.docs, Tax: money(r.tax_amount), Net: money(r.net_purchase) }))} />
        </div>
      );
    }

    if (reportKey === 'salesByCustomerProduct') {
      return <><ReportBlock title="By Customer" rows={report.byCustomer.map((r: any) => ({ Customer: r.customer_name, Invoices: r.invoices, Sales: money(r.total_sales), Balance: money(r.balance_due) }))} /><ReportBlock title="By Product" rows={report.byProduct.map((r: any) => ({ Product: r.product_name, Qty: r.quantity, Sales: money(r.total_sales) }))} /></>;
    }

    if (reportKey === 'purchasesBySupplierProduct') {
      return <><ReportBlock title="By Supplier" rows={report.bySupplier.map((r: any) => ({ Supplier: r.supplier_name, Purchases: r.purchases, Total: money(r.total_purchases), Payable: money(r.remaining_payable) }))} /><ReportBlock title="By Product" rows={report.byProduct.map((r: any) => ({ Product: r.product_name, Qty: r.quantity, Purchases: money(r.total_purchases) }))} /></>;
    }

    if (reportKey === 'expenseSummary') {
      return <><Summary title="Total Expenses" value={money(report.total)} /><SimpleTable columns={['Category', 'Entries', 'Amount', 'Tax']} rows={report.byCategory.map((r: any) => ({ Category: r.category, Entries: r.entries, Amount: money(r.total_amount), Tax: money(r.tax_amount) }))} /></>;
    }
  };

  return (
    <div className="space-y-4">
      <Card title="Financial Reports" headerActions={<Badge variant="info">{selectedReport?.group}</Badge>}>
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 items-end">
          <div className="lg:col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Report</label>
            <select className="erp-input" value={reportKey} onChange={(e) => setReportKey(e.target.value as ReportKey)}>
              {reportOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
          </div>
          <Input id="report-from" label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <Input id="report-to" label="To / As Of" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Branch</label>
            <select className="erp-input" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
              <option value="">All Branches</option>
              {accessibleBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_code} - {branch.branch_name}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Class</label>
            <select className="erp-input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
              <option value="">All Classes</option>
              {classes.map((row) => <option key={row.id} value={row.id}>{row.class_code} - {row.class_name}</option>)}
            </select>
          </div>
          <Button onClick={loadReport} disabled={loading}><RefreshCw className="w-4 h-4 mr-2" />Run</Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={exportPlaceholder}><Download className="w-4 h-4 mr-2" />PDF</Button>
            <Button variant="secondary" onClick={exportPlaceholder}><FileSpreadsheet className="w-4 h-4 mr-2" />CSV</Button>
          </div>
        </div>
      </Card>

      <Card title={selectedReport?.label || 'Report'}>
        {loading ? <p className="text-xs text-slate-500">Loading report...</p> : renderReport()}
      </Card>
    </div>
  );
};

const Summary: React.FC<{ title: string; value: string; tone?: 'good' | 'bad' }> = ({ title, value, tone }) => (
  <div className="bg-slate-50 border border-slate-200 rounded-[6px] p-3">
    <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">{title}</div>
    <div className={`mt-1 text-lg font-bold ${tone === 'good' ? 'text-success-green' : tone === 'bad' ? 'text-danger-red' : 'text-slate-900'}`}>{value}</div>
  </div>
);

const ReportBlock: React.FC<{ title: string; rows: Array<Record<string, any>> }> = ({ title, rows }) => (
  <div className="space-y-2">
    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">{title}</h3>
    <SimpleTable columns={Object.keys(rows[0] || { Account: '', Amount: '' })} rows={rows} />
  </div>
);

function formatBalanceRows(rows: Array<Record<string, any>>) {
  return rows.map((r) => ({ Account: `${r.account_code} - ${r.account_name}`, Balance: money(r.balance) }));
}
