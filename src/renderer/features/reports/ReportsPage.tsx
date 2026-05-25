import React from 'react';
import { Download, FileSpreadsheet, RefreshCw } from 'lucide-react';
import { useErp } from '../../app/providers/ErpContext';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { reportRegistry, reportRegistryByKey, ReportKey } from './reportRegistry';

const today = () => new Date().toISOString().split('T')[0];
const monthStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
};
const money = (value: number) => `Rs. ${Number(value || 0).toFixed(2)}`;

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
  const { notify, accessibleBranches, activeBranchId, hasPermission, customers, suppliers } = useReportsContextSafe();
  const [classes, setClasses] = React.useState<Array<{ id: string; class_code: string; class_name: string }>>([]);
  const visibleReports = React.useMemo(
    () => reportRegistry.filter((report) => hasPermission(report.requiredPermission)),
    [hasPermission]
  );

  const [reportKey, setReportKey] = React.useState<ReportKey>(visibleReports[0]?.key || 'profitAndLoss');
  const [dateFrom, setDateFrom] = React.useState(monthStart());
  const [dateTo, setDateTo] = React.useState(today());
  const [branchFilter, setBranchFilter] = React.useState<string>(activeBranchId);
  const [classFilter, setClassFilter] = React.useState<string>('');
  const [cashierFilter, setCashierFilter] = React.useState<string>('');
  const [customerFilter, setCustomerFilter] = React.useState<string>('');
  const [supplierFilter, setSupplierFilter] = React.useState<string>('');
  const [userFilter, setUserFilter] = React.useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [reportData, setReportData] = React.useState<any>(null);

  const selectedReport = reportRegistryByKey[reportKey];

  React.useEffect(() => {
    if (!visibleReports.some((r) => r.key === reportKey) && visibleReports[0]) {
      setReportKey(visibleReports[0].key);
    }
  }, [visibleReports, reportKey]);

  React.useEffect(() => {
    setBranchFilter(activeBranchId);
  }, [activeBranchId]);

  React.useEffect(() => {
    window.api.classes.getAll().then(setClasses).catch(() => setClasses([]));
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await fetchReport(reportKey, {
        dateFrom,
        dateTo,
        branchFilter,
        classFilter,
        cashierFilter,
        customerFilter,
        supplierFilter,
        userFilter
      });
      setReportData(data);
    } catch (e: any) {
      notify('error', e.message || 'Failed to load report.');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadReport();
  }, [reportKey]);

  const groupedReports = React.useMemo(() => {
    const grouped = new Map<string, typeof visibleReports>();
    for (const report of visibleReports) {
      if (!grouped.has(report.category)) grouped.set(report.category, []);
      grouped.get(report.category)!.push(report);
    }
    return grouped;
  }, [visibleReports]);

  const rows = normalizeRows(reportKey, reportData);
  const columns = selectedReport?.columns.map((c) => c.label) || [];
  const summaryCards = buildSummaryCards(selectedReport?.summaryCards || [], reportData);

  return (
    <div className="space-y-4">
      <Card title="Financial & Operational Reports" headerActions={<Badge variant="info">{selectedReport?.category || 'Reports'}</Badge>}>
        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3 items-end">
          <div className="lg:col-span-2 space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Report</label>
            <select className="erp-input" value={reportKey} onChange={(e) => setReportKey(e.target.value as ReportKey)}>
              {Array.from(groupedReports.entries()).map(([group, reports]) => (
                <optgroup key={group} label={group}>
                  {reports.map((report) => <option key={report.key} value={report.key}>{report.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>

          {selectedReport?.supportedFilters.includes('dateFrom') && (
            <Input id="report-from" label="From" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          )}
          {selectedReport?.supportedFilters.includes('dateTo') && (
            <Input id="report-to" label="To / As Of" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          )}
          {selectedReport?.supportedFilters.includes('branch') && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Branch</label>
              <select className="erp-input" value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
                <option value="">All Branches</option>
                {accessibleBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_code} - {branch.branch_name}</option>)}
              </select>
            </div>
          )}
          {selectedReport?.supportedFilters.includes('class') && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Class</label>
              <select className="erp-input" value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
                <option value="">All Classes</option>
                {classes.map((row: any) => <option key={row.id} value={row.id}>{row.class_code} - {row.class_name}</option>)}
              </select>
            </div>
          )}
          {selectedReport?.supportedFilters.includes('cashier') && (
            <Input id="report-cashier" label="Cashier ID" value={cashierFilter} onChange={(e) => setCashierFilter(e.target.value)} />
          )}
          {selectedReport?.supportedFilters.includes('customer') && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Customer</label>
              <select className="erp-input" value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}>
                <option value="">Select Customer</option>
                {customers.map((row: any) => <option key={row.name} value={row.name}>{row.name}</option>)}
              </select>
            </div>
          )}
          {selectedReport?.supportedFilters.includes('supplier') && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Supplier</label>
              <select className="erp-input" value={supplierFilter} onChange={(e) => setSupplierFilter(e.target.value)}>
                <option value="">Select Supplier</option>
                {suppliers.map((row: any) => <option key={row.id} value={row.id}>{row.name}</option>)}
              </select>
            </div>
          )}
          {selectedReport?.supportedFilters.includes('user') && (
            <Input id="report-user" label="User ID" value={userFilter} onChange={(e) => setUserFilter(e.target.value)} />
          )}

          <Button onClick={loadReport} disabled={loading}><RefreshCw className="w-4 h-4 mr-2" />Run</Button>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => notify('info', 'PDF export is not enabled yet.')} disabled={!selectedReport?.exportEnabled}><Download className="w-4 h-4 mr-2" />PDF</Button>
            <Button variant="secondary" onClick={() => notify('info', 'CSV export is not enabled yet.')} disabled={!selectedReport?.exportEnabled}><FileSpreadsheet className="w-4 h-4 mr-2" />CSV</Button>
          </div>
        </div>
      </Card>

      <Card title={selectedReport?.label || 'Report'}>
        <p className="text-xs text-slate-500 mb-3">{selectedReport?.description}</p>
        {summaryCards.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
            {summaryCards.map((card) => (
              <div key={card.key} className="bg-slate-50 border border-slate-200 rounded-[6px] p-3">
                <div className="text-[10px] uppercase tracking-wide text-slate-500 font-bold">{card.label}</div>
                <div className="mt-1 text-lg font-bold text-slate-900">{card.value}</div>
              </div>
            ))}
          </div>
        )}
        {loading ? <p className="text-xs text-slate-500">Loading report...</p> : <SimpleTable columns={columns} rows={rows} empty="No report data found for selected filters." />}
      </Card>
    </div>
  );
};

function useReportsContextSafe() {
  const ctx = useErp() as any;
  return {
    notify: ctx.notify,
    accessibleBranches: ctx.accessibleBranches || [],
    activeBranchId: ctx.activeBranchId || '',
    hasPermission: ctx.hasPermission || (() => false),
    customers: ctx.customers || [],
    suppliers: ctx.suppliers || []
  };
}

function buildSummaryCards(cards: Array<{ key: string; label: string }>, reportData: any) {
  return cards.map((card) => ({
    ...card,
    value: formatSummaryValue(resolveSummaryValue(reportData, card.key))
  }));
}

function resolveSummaryValue(data: any, key: string): any {
  if (!data) return 0;
  if (data[key] != null) return data[key];
  if (data.summary?.[key] != null) return data.summary[key];
  if (data.totals?.[key] != null) return data.totals[key];
  return 0;
}

function formatSummaryValue(value: any) {
  if (typeof value === 'number') {
    if (Math.abs(value) >= 1000 || Number.isInteger(value) === false) return money(value);
    return String(value);
  }
  return String(value ?? '0');
}

async function fetchReport(reportKey: ReportKey, filters: Record<string, string>) {
  const { dateFrom, dateTo, branchFilter, classFilter, customerFilter, supplierFilter, userFilter } = filters;
  switch (reportKey) {
    case 'profitAndLoss': return window.api.reports.profitAndLoss(dateFrom, dateTo, branchFilter || undefined, classFilter || undefined);
    case 'balanceSheet': return window.api.reports.balanceSheet(dateTo, branchFilter || undefined);
    case 'cashFlow': return window.api.reports.cashFlow(dateFrom, dateTo);
    case 'trialBalance': return window.api.reports.trialBalance(dateFrom, dateTo, branchFilter || undefined, classFilter || undefined);
    case 'generalLedger': return window.api.reports.generalLedger(dateFrom, dateTo);
    case 'dailySalesSummary': return window.api.reports.dailySalesSummary(dateFrom, dateTo, branchFilter || undefined);
    case 'salesInvoices': return window.api.reports.salesInvoices(dateFrom, dateTo, branchFilter || undefined);
    case 'salesByCustomerProduct': return window.api.reports.salesByCustomerProduct(dateFrom, dateTo);
    case 'productSales': return window.api.reports.productSales(dateFrom, dateTo, branchFilter || undefined);
    case 'returnSummary': return window.api.reports.returnSummary(dateFrom, dateTo, branchFilter || undefined);
    case 'discountSummary': return window.api.reports.discountSummary(dateFrom, dateTo, branchFilter || undefined);
    case 'paymentMethod': return window.api.reports.paymentMethod(dateFrom, dateTo, branchFilter || undefined);
    case 'purchaseSummary': return window.api.reports.purchaseSummary(dateFrom, dateTo, branchFilter || undefined);
    case 'purchasesBySupplierProduct': return window.api.reports.purchasesBySupplierProduct(dateFrom, dateTo);
    case 'purchaseReturns': return window.api.reports.purchaseReturns(dateFrom, dateTo, branchFilter || undefined);
    case 'inventoryValuation': return window.api.reports.inventoryValuation();
    case 'stockMovement': return window.api.reports.stockMovement(dateFrom, dateTo, branchFilter || undefined);
    case 'lowStock': return window.api.reports.lowStock(branchFilter || undefined);
    case 'branchStock': return window.api.reports.branchStock(branchFilter || undefined);
    case 'inventoryAdjustment': return window.api.reports.inventoryAdjustment(dateFrom, dateTo, branchFilter || undefined);
    case 'stockTransfer': return window.api.reports.stockTransfer(dateFrom, dateTo);
    case 'customerBalance': return window.api.reports.customerBalance();
    case 'customerAging': return window.api.reports.customerAging(dateTo);
    case 'customerStatement': return window.api.reports.customerStatement(customerFilter, dateFrom, dateTo);
    case 'paymentCollection': return window.api.reports.paymentCollection(dateFrom, dateTo);
    case 'supplierPayable': return window.api.reports.supplierPayable(dateTo);
    case 'supplierLedger': return window.api.reports.supplierLedger(supplierFilter, dateFrom, dateTo);
    case 'supplierPayment': return window.api.reports.supplierPayment(dateFrom, dateTo, branchFilter || undefined);
    case 'taxSummary': return window.api.reports.taxSummary(dateFrom, dateTo);
    case 'outputTax': return window.api.reports.outputTax(dateFrom, dateTo);
    case 'inputTax': return window.api.reports.inputTax(dateFrom, dateTo);
    case 'bankAccountSummary': return window.api.reports.bankAccountSummary();
    case 'moneyTransaction': return window.api.reports.moneyTransaction(dateFrom, dateTo, branchFilter || undefined);
    case 'bankReconciliation': return window.api.reports.bankReconciliation(dateFrom, dateTo);
    case 'shiftSummary': return window.api.reports.shiftSummary(dateFrom, dateTo, branchFilter || undefined);
    case 'cashierSales': return window.api.reports.cashierSales(dateFrom, dateTo, branchFilter || undefined);
    case 'cashDrawerReconciliation': return window.api.reports.cashDrawerReconciliation(dateFrom, dateTo, branchFilter || undefined);
    case 'cashierDiscrepancy': return window.api.reports.cashierDiscrepancy(dateFrom, dateTo, branchFilter || undefined);
    case 'branchProfitAndLoss': return window.api.reports.branchProfitAndLoss(dateFrom, dateTo);
    case 'classProfitAndLoss': return window.api.reports.classProfitAndLoss(dateFrom, dateTo, branchFilter || undefined, classFilter || undefined);
    case 'budgetVsActual': return window.api.reports.budgetVsActual(dateFrom, dateTo, undefined, branchFilter || undefined, classFilter || undefined);
    case 'branchPerformance': return window.api.reports.branchPerformance(dateFrom, dateTo);
    case 'auditLog': return window.api.reports.auditLog(dateFrom, dateTo, userFilter || undefined);
    case 'backupHistory': return window.api.reports.backupHistory(dateFrom, dateTo);
    case 'notification': return window.api.reports.notification(dateFrom, dateTo, branchFilter || undefined);
    case 'userActivity': return window.api.reports.userActivity(dateFrom, dateTo);
    default: return { rows: [] };
  }
}

function normalizeRows(reportKey: ReportKey, data: any): Array<Record<string, any>> {
  if (!data) return [];
  switch (reportKey) {
    case 'profitAndLoss': return [...(data.income || []), ...(data.expenses || [])].map((r: any) => ({ Account: `${r.account_code} - ${r.account_name}`, Amount: money(r.amount) }));
    case 'balanceSheet': return [...(data.assets || []), ...(data.liabilities || []), ...(data.equity || [])].map((r: any) => ({ Account: `${r.account_code} - ${r.account_name}`, Balance: money(r.balance) }));
    case 'cashFlow': return Object.values(data.sections || {}).map((s: any) => ({ Section: s.label, Amount: money(s.total) }));
    case 'trialBalance': return (data.rows || []).map((r: any) => ({ Account: `${r.account_code} - ${r.account_name}`, Debit: money(r.debit_balance), Credit: money(r.credit_balance) }));
    case 'generalLedger': return (data || []).map((r: any) => ({ Date: r.entry_date, Account: `${r.account_code} - ${r.account_name}`, Debit: money(r.debit), Credit: money(r.credit), Balance: money(r.running_balance) }));
    case 'salesByCustomerProduct': return (data.byCustomer || []).map((r: any) => ({ Customer: r.customer_name, Sales: money(r.total_sales) }));
    case 'purchasesBySupplierProduct': return (data.bySupplier || []).map((r: any) => ({ Supplier: r.supplier_name, Purchases: money(r.total_purchases) }));
    case 'discountSummary': return (data.byInvoice || []).map((r: any) => ({ Invoice: r.invoiceNo, Cashier: r.cashier_name, Discount: money(r.discount_amount) }));
    case 'paymentCollection': return (data.rows || []).map((r: any) => ({ Customer: r.customer_name, Khata: money(r.khata_payments), Invoice: money(r.invoice_payments), Total: money(r.total_collected) }));
    case 'classProfitAndLoss': return (data.classes || []).map((r: any) => ({ Class: `${r.class_code} - ${r.class_name}`, Income: money(r.income), COGS: money(r.cogs), Expenses: money(r.expenses), Net: money(r.netProfit) }));
    case 'budgetVsActual': return (data.rows || []).map((r: any) => ({ Account: `${r.account_code} - ${r.account_name}`, Budget: money(r.budget_amount), Actual: money(r.actual_amount), Variance: money(r.variance_amount) }));
    case 'outputTax': return (data.rows || []).map((r: any) => ({ Code: r.tax_code, Tax: money(r.tax_amount), Net: money(r.net_sales) }));
    case 'inputTax': return (data.rows || []).map((r: any) => ({ Code: r.tax_code, Tax: money(r.tax_amount), Net: money(r.net_purchase) }));
    case 'taxSummary': return [{ Tax: `Output ${money(data.summary?.outputTax)} | Input ${money(data.summary?.inputTax)} | Net ${money(data.summary?.netPayable)}` }];
    case 'customerAging': return (data.rows || []).map((r: any) => ({ Customer: r.customer_name, Balance: money(r.balance), Overdue: r.overdue_days }));
    case 'supplierPayable': return (data.rows || []).map((r: any) => ({ Supplier: r.supplier_name, Payable: money(Number(r.current_balance || 0) + Number(r.invoice_payable || 0)) }));
    case 'auditLog': return (data.rows || []).map((r: any) => ({ Time: r.created_at, User: r.user_name, Action: r.action, Details: r.details }));
    case 'backupHistory': return (data.rows || []).map((r: any) => ({ Time: r.created_at, File: r.file_name, Type: r.backup_type, Status: r.status }));
    case 'notification': return (data.rows || []).map((r: any) => ({ Time: r.created_at, Category: r.category, Severity: r.severity, Status: r.status }));
    case 'userActivity': return (data.rows || []).map((r: any) => ({ User: r.user_name, Activities: r.activity_count, 'Last Activity': r.last_activity_at }));
    default: return (data.rows || []).map((r: any) => mapRowByShape(r));
  }
}

function mapRowByShape(row: Record<string, any>) {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    const label = key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());
    out[label] = typeof value === 'number' && /amount|total|balance|value|sales|tax|cost|profit|payable|discount|cash/i.test(key)
      ? money(value)
      : value;
  }
  return out;
}
