import React, { useEffect, useMemo, useState } from 'react';
import { useErp } from '../../app/providers/ErpContext';
import { TaxRate } from '../../shared/types';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { Button } from '../../shared/ui/Button';
import { Badge } from '../../shared/ui/Badge';
import { IconActionButton } from '../../shared/ui/IconActionButton';
import { Pencil, Power } from 'lucide-react';

export const TaxSettingsPage: React.FC = () => {
  const { notify } = useErp();
  const [rates, setRates] = useState<TaxRate[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [form, setForm] = useState<Partial<TaxRate>>({ code: '', name: '', rate: 0, type: 'GST', mode: 'exclusive', status: 'active' });
  const [dateFrom, setDateFrom] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [outputReport, setOutputReport] = useState<Array<Record<string, unknown>>>([]);
  const [inputReport, setInputReport] = useState<Array<Record<string, unknown>>>([]);
  const [summary, setSummary] = useState({ outputTax: 0, inputTax: 0, netPayable: 0 });

  const [previewAmount, setPreviewAmount] = useState(1000);
  const [previewRate, setPreviewRate] = useState(17);
  const [previewMode, setPreviewMode] = useState<'inclusive' | 'exclusive'>('exclusive');
  const [previewResult, setPreviewResult] = useState({ netAmount: 0, taxAmount: 0, grossAmount: 0 });

  const loadRates = async () => setRates(await window.api.taxes.getRates() as TaxRate[]);
  const loadSettings = async () => setSettings(await window.api.taxes.getSettings());

  const loadReports = async () => {
    const [out, input, sum] = await Promise.all([
      window.api.taxes.getOutputReport(dateFrom, dateTo),
      window.api.taxes.getInputReport(dateFrom, dateTo),
      window.api.taxes.getSummaryReport(dateFrom, dateTo)
    ]);
    setOutputReport(out);
    setInputReport(input);
    setSummary(sum);
  };

  useEffect(() => {
    loadRates();
    loadSettings();
    loadReports();
  }, []);

  useEffect(() => {
    window.api.taxes.calculate({ amount: previewAmount, rate: previewRate, mode: previewMode }).then(setPreviewResult);
  }, [previewAmount, previewRate, previewMode]);

  const saveRate = async () => {
    if (!form.code || !form.name) {
      notify('error', 'Code and name are required for tax rate.');
      return;
    }

    if (form.id) {
      await window.api.taxes.updateRate(form);
      notify('success', 'Tax rate updated.');
    } else {
      await window.api.taxes.createRate(form);
      notify('success', 'Tax rate created.');
    }

    setForm({ code: '', name: '', rate: 0, type: 'GST', mode: 'exclusive', status: 'active' });
    await loadRates();
  };

  const updateDefault = async (key: string, value: string) => {
    await window.api.taxes.updateSetting(key, value);
    await loadSettings();
    notify('success', 'Tax default updated.');
  };

  const activeRates = useMemo(() => rates.filter((r) => r.status === 'active'), [rates]);

  return (
    <div className="space-y-4">
      <Card title="Tax Rates Master">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {rates.length === 0 ? <p className="text-xs text-slate-500 py-4">No tax rates configured.</p> : (
              <table className="erp-table text-xs">
                <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Mode</th><th>Rate</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {rates.map((r) => (
                    <tr key={r.id}>
                      <td>{r.code}</td>
                      <td>{r.name}</td>
                      <td>{r.type}</td>
                      <td>{r.mode}</td>
                      <td>{r.rate}%</td>
                      <td><Badge variant={r.status === 'active' ? 'success' : 'danger'}>{r.status}</Badge></td>
                      <td>
                        <div className="flex items-center gap-1">
                          <IconActionButton icon={<Pencil className="w-3.5 h-3.5" />} tooltip="Edit Tax Rate" onClick={() => setForm(r)} />
                          <IconActionButton icon={<Power className="w-3.5 h-3.5" />} tooltip="Deactivate Tax Rate" danger onClick={async () => { await window.api.taxes.deactivateRate(r.id); await loadRates(); }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="space-y-2 border border-slate-200 rounded-[6px] p-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase">Tax Rate Form</h3>
            <Input id="tax-code" label="Code" value={form.code || ''} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} />
            <Input id="tax-name" label="Name" value={form.name || ''} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
            <Input id="tax-rate" type="number" label="Rate %" value={form.rate || 0} onChange={(e) => setForm((p) => ({ ...p, rate: Number(e.target.value) || 0 }))} />
            <select id="tax-type" className="erp-input" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as TaxRate['type'] }))}>
              <option>GST</option><option>VAT</option><option>Sales Tax</option><option>Withholding</option>
            </select>
            <select id="tax-mode" className="erp-input" value={form.mode} onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value as TaxRate['mode'] }))}>
              <option value="exclusive">exclusive</option>
              <option value="inclusive">inclusive</option>
            </select>
            <Button id="tax-save" onClick={saveRate}>{form.id ? 'Update Rate' : 'Create Rate'}</Button>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Default Tax Settings">
          <div className="space-y-2 text-xs">
            <label className="text-slate-600">Default Sales Tax</label>
            <select className="erp-input" value={settings.default_sales_tax_code || ''} onChange={(e) => updateDefault('default_sales_tax_code', e.target.value)}>
              {activeRates.map((r) => <option key={r.code}>{r.code}</option>)}
            </select>
            <label className="text-slate-600">Default Purchase Tax</label>
            <select className="erp-input" value={settings.default_purchase_tax_code || ''} onChange={(e) => updateDefault('default_purchase_tax_code', e.target.value)}>
              {activeRates.map((r) => <option key={r.code}>{r.code}</option>)}
            </select>
            <label className="text-slate-600">Default Expense Tax</label>
            <select className="erp-input" value={settings.default_expense_tax_code || ''} onChange={(e) => updateDefault('default_expense_tax_code', e.target.value)}>
              {activeRates.map((r) => <option key={r.code}>{r.code}</option>)}
            </select>
          </div>
        </Card>

        <Card title="Tax Preview Calculator">
          <div className="space-y-2 text-xs">
            <Input id="tax-preview-amount" label="Amount" type="number" value={previewAmount} onChange={(e) => setPreviewAmount(Number(e.target.value) || 0)} />
            <Input id="tax-preview-rate" label="Rate %" type="number" value={previewRate} onChange={(e) => setPreviewRate(Number(e.target.value) || 0)} />
            <select id="tax-preview-mode" className="erp-input" value={previewMode} onChange={(e) => setPreviewMode(e.target.value as 'inclusive' | 'exclusive')}>
              <option value="exclusive">exclusive</option>
              <option value="inclusive">inclusive</option>
            </select>
            <p>Net: Rs. {previewResult.netAmount.toFixed(2)}</p>
            <p>Tax: Rs. {previewResult.taxAmount.toFixed(2)}</p>
            <p>Gross: Rs. {previewResult.grossAmount.toFixed(2)}</p>
          </div>
        </Card>

        <Card title="Tax Summary">
          <div className="space-y-2 text-xs">
            <Input id="tax-date-from" type="date" label="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input id="tax-date-to" type="date" label="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
            <Button id="tax-refresh-report" variant="secondary" onClick={loadReports}>Refresh Reports</Button>
            <p>Output Tax: Rs. {summary.outputTax.toFixed(2)}</p>
            <p>Input Tax: Rs. {summary.inputTax.toFixed(2)}</p>
            <p className="font-bold">Net Payable: Rs. {summary.netPayable.toFixed(2)}</p>
          </div>
        </Card>
      </div>

      <Card title="Output / Input Tax Reports">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2">Output Tax</h4>
            <table className="erp-table text-xs">
              <thead><tr><th>Tax</th><th>Docs</th><th>Tax Amount</th><th>Net Sales</th></tr></thead>
              <tbody>
                {outputReport.map((r, idx) => (
                  <tr key={idx}><td>{String(r.tax_code || '')}</td><td>{String(r.docs || 0)}</td><td>{Number(r.tax_amount || 0).toFixed(2)}</td><td>{Number(r.net_sales || 0).toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-700 mb-2">Input Tax</h4>
            <table className="erp-table text-xs">
              <thead><tr><th>Tax</th><th>Docs</th><th>Tax Amount</th><th>Net Purchase</th></tr></thead>
              <tbody>
                {inputReport.map((r, idx) => (
                  <tr key={idx}><td>{String(r.tax_code || '')}</td><td>{String(r.docs || 0)}</td><td>{Number(r.tax_amount || 0).toFixed(2)}</td><td>{Number(r.net_purchase || 0).toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>
    </div>
  );
};
