import React, { useEffect, useMemo, useState } from 'react';
import { CircleDollarSign, RefreshCw, Save, TrendingUp } from 'lucide-react';
import { useErp } from '../../app/providers/ErpContext';
import { Currency, ExchangeRate } from '../../shared/types';

type Tab = 'currencies' | 'rates' | 'settings';
const today = () => new Date().toISOString().split('T')[0];

export const CurrencySettingsPage: React.FC = () => {
  const { notify } = useErp();
  const [tab, setTab] = useState<Tab>('currencies');
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [currencyForm, setCurrencyForm] = useState<Partial<Currency>>({ code: '', name: '', symbol: '', decimal_precision: 2, is_base: 0, status: 'active' });
  const [rateForm, setRateForm] = useState<Partial<ExchangeRate>>({ from_currency: 'USD', to_currency: 'PKR', rate: 280, effective_date: today(), manual_override: 1, notes: '' });
  const [conversion, setConversion] = useState<Record<string, any> | null>(null);
  const [gainLoss, setGainLoss] = useState<Record<string, any> | null>(null);

  const load = async () => {
    const [currencyRows, rateRows] = await Promise.all([window.api.currencies.getAll(), window.api.exchangeRates.getAll()]);
    setCurrencies(currencyRows);
    setRates(rateRows);
  };

  useEffect(() => { load().catch((error) => notify('error', error.message || 'Failed to load currency settings.')); }, []);

  const baseCurrency = useMemo(() => currencies.find((currency) => currency.is_base), [currencies]);

  const saveCurrency = async () => {
    const payload = { ...currencyForm, code: String(currencyForm.code || '').toUpperCase(), decimal_precision: Number(currencyForm.decimal_precision || 2), is_base: currencyForm.is_base ? 1 : 0 };
    const exists = currencies.some((currency) => currency.code === payload.code);
    if (exists) await window.api.currencies.update(payload);
    else await window.api.currencies.create(payload);
    await load();
    setCurrencyForm({ code: '', name: '', symbol: '', decimal_precision: 2, is_base: 0, status: 'active' });
    notify('success', 'Currency saved.');
  };

  const saveRate = async () => {
    const payload = { ...rateForm, rate: Number(rateForm.rate || 0), manual_override: rateForm.manual_override ? 1 : 0 };
    if (rateForm.id) await window.api.exchangeRates.update(payload);
    else await window.api.exchangeRates.create(payload);
    await load();
    setRateForm({ from_currency: 'USD', to_currency: baseCurrency?.code || 'PKR', rate: 280, effective_date: today(), manual_override: 1, notes: '' });
    notify('success', 'Exchange rate saved.');
  };

  const runConversion = async () => {
    setConversion(await window.api.exchangeRates.convert(100, rateForm.from_currency || 'USD', rateForm.to_currency || baseCurrency?.code || 'PKR', rateForm.effective_date || today()));
    setGainLoss(await window.api.exchangeRates.gainLossFoundation(100, Number(rateForm.rate || 0), Number(rateForm.rate || 0) + 5));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Summary label="Base Currency" value={baseCurrency?.code || 'PKR'} />
        <Summary label="Active Currencies" value={currencies.filter((currency) => currency.status === 'active').length} />
        <Summary label="Historical Rates" value={rates.length} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <TabButton active={tab === 'currencies'} onClick={() => setTab('currencies')}>Currencies</TabButton>
        <TabButton active={tab === 'rates'} onClick={() => setTab('rates')}>Exchange Rates</TabButton>
        <TabButton active={tab === 'settings'} onClick={() => setTab('settings')}>Settings</TabButton>
        <button className="ml-auto inline-flex items-center gap-2 rounded-[4px] border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600" onClick={load}><RefreshCw className="w-4 h-4" />Refresh</button>
      </div>

      {tab === 'currencies' && (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
          <section className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-800">Currency Profile</h3>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Code"><input className="erp-input uppercase" value={currencyForm.code || ''} maxLength={3} onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })} /></Field>
              <Field label="Symbol"><input className="erp-input" value={currencyForm.symbol || ''} onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })} /></Field>
            </div>
            <Field label="Currency Name"><input className="erp-input" value={currencyForm.name || ''} onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Precision"><input type="number" className="erp-input" value={currencyForm.decimal_precision || 2} onChange={(e) => setCurrencyForm({ ...currencyForm, decimal_precision: Number(e.target.value) })} /></Field>
              <Field label="Status"><select className="erp-input" value={currencyForm.status || 'active'} onChange={(e) => setCurrencyForm({ ...currencyForm, status: e.target.value as any })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={Boolean(currencyForm.is_base)} onChange={(e) => setCurrencyForm({ ...currencyForm, is_base: e.target.checked ? 1 : 0 })} />Set as base currency</label>
            <button className="w-full inline-flex items-center justify-center gap-2 rounded-[4px] bg-primary-blue px-3 py-2 text-xs font-bold text-white" onClick={saveCurrency}><Save className="w-4 h-4" />Save Currency</button>
          </section>

          <Table title="Currency Register">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 text-left">Code</th><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Symbol</th><th className="px-3 py-2 text-left">Base</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
            <tbody>{currencies.map((currency) => <tr key={currency.code} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-3 py-2 font-mono font-black">{currency.code}</td><td className="px-3 py-2">{currency.name}</td><td className="px-3 py-2">{currency.symbol}</td><td className="px-3 py-2">{currency.is_base ? 'Yes' : '-'}</td><td className="px-3 py-2"><Badge value={currency.status} /></td><td className="px-3 py-2 text-right space-x-2"><button className="text-primary-blue font-bold" onClick={() => setCurrencyForm(currency)}>Edit</button>{!currency.is_base && currency.status === 'active' && <button className="text-red-600 font-bold" onClick={async () => { await window.api.currencies.deactivate(currency.code); await load(); }}>Deactivate</button>}</td></tr>)}</tbody>
          </Table>
        </div>
      )}

      {tab === 'rates' && (
        <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
          <section className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-slate-800">Exchange Rate</h3>
            <div className="grid grid-cols-2 gap-2">
              <Field label="From"><select className="erp-input" value={rateForm.from_currency || ''} onChange={(e) => setRateForm({ ...rateForm, from_currency: e.target.value })}>{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}</select></Field>
              <Field label="To"><select className="erp-input" value={rateForm.to_currency || ''} onChange={(e) => setRateForm({ ...rateForm, to_currency: e.target.value })}>{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Rate"><input type="number" step="0.0001" className="erp-input" value={rateForm.rate || 0} onChange={(e) => setRateForm({ ...rateForm, rate: Number(e.target.value) })} /></Field>
              <Field label="Effective Date"><input type="date" className="erp-input" value={rateForm.effective_date || today()} onChange={(e) => setRateForm({ ...rateForm, effective_date: e.target.value })} /></Field>
            </div>
            <Field label="Notes"><input className="erp-input" value={rateForm.notes || ''} onChange={(e) => setRateForm({ ...rateForm, notes: e.target.value })} /></Field>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={Boolean(rateForm.manual_override)} onChange={(e) => setRateForm({ ...rateForm, manual_override: e.target.checked ? 1 : 0 })} />Manual override</label>
            <button className="w-full inline-flex items-center justify-center gap-2 rounded-[4px] bg-primary-blue px-3 py-2 text-xs font-bold text-white" onClick={saveRate}><TrendingUp className="w-4 h-4" />Save Rate</button>
          </section>
          <Table title="Exchange Rate History">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 text-left">Pair</th><th className="px-3 py-2 text-right">Rate</th><th className="px-3 py-2 text-left">Effective</th><th className="px-3 py-2 text-left">Override</th><th className="px-3 py-2 text-left">Notes</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
            <tbody>{rates.map((rate) => <tr key={rate.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-3 py-2 font-mono font-bold">{rate.from_currency}/{rate.to_currency}</td><td className="px-3 py-2 text-right font-bold">{Number(rate.rate).toFixed(4)}</td><td className="px-3 py-2">{rate.effective_date}</td><td className="px-3 py-2">{rate.manual_override ? 'Manual' : 'System'}</td><td className="px-3 py-2">{rate.notes || '-'}</td><td className="px-3 py-2 text-right"><button className="text-primary-blue font-bold" onClick={() => setRateForm(rate)}>Edit</button></td></tr>)}</tbody>
          </Table>
        </div>
      )}

      {tab === 'settings' && (
        <section className="bg-white border border-slate-200 rounded-[8px] shadow-sm p-4 max-w-3xl space-y-4">
          <h3 className="text-sm font-black text-slate-800">Conversion Engine Check</h3>
          <p className="text-xs text-slate-500">Foundation check for base reporting and realized/unrealized exchange variance.</p>
          <button className="rounded-[4px] bg-slate-900 px-3 py-2 text-xs font-bold text-white" onClick={runConversion}>Convert 100 {rateForm.from_currency || 'USD'}</button>
          {conversion && <pre className="rounded-[6px] bg-slate-950 p-3 text-xs text-slate-100 overflow-x-auto">{JSON.stringify({ conversion, gainLoss }, null, 2)}</pre>}
        </section>
      )}
    </div>
  );
};

const Summary: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"><CircleDollarSign className="w-3.5 h-3.5" />{label}</div><div className="mt-1 text-2xl font-black text-slate-900">{value}</div></div>;
const TabButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => <button className={`px-4 py-2 rounded-[4px] text-xs font-bold ${active ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'}`} onClick={onClick}>{children}</button>;
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 space-y-1"><span>{label}</span>{children}</label>;
const Table: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => <section className="bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden"><div className="px-4 py-3 border-b border-slate-200"><h3 className="text-sm font-black text-slate-800">{title}</h3></div><table className="w-full text-xs">{children}</table></section>;
const Badge: React.FC<{ value: string }> = ({ value }) => <span className={`px-2 py-1 rounded-[3px] text-[10px] font-black uppercase ${value === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{value}</span>;
