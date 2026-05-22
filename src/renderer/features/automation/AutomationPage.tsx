import React, { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Play, RefreshCw, Save, Settings2 } from 'lucide-react';
import { useErp } from '../../app/providers/ErpContext';
import { ClassTracking, RecurringRun, RecurringTemplate } from '../../shared/types';

type Tab = 'templates' | 'runs' | 'settings';

const today = () => new Date().toISOString().split('T')[0];
const defaultPayload = JSON.stringify({ category: 'Rent', paidTo: 'Landlord', amount: 1000, status: 'Paid' }, null, 2);

export const AutomationPage: React.FC = () => {
  const { accessibleBranches, activeBranchId, notify } = useErp();
  const [tab, setTab] = useState<Tab>('templates');
  const [templates, setTemplates] = useState<RecurringTemplate[]>([]);
  const [runs, setRuns] = useState<RecurringRun[]>([]);
  const [classes, setClasses] = useState<ClassTracking[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Partial<RecurringTemplate> & { payload_json?: string }>({
    name: '',
    template_type: 'expense',
    frequency: 'monthly',
    start_date: today(),
    next_run_date: today(),
    auto_create: 1,
    status: 'active',
    branch_id: activeBranchId || '',
    class_id: '',
    payload_json: defaultPayload
  });

  const load = async () => {
    const [templateRows, runRows, classRows, automationRules] = await Promise.all([
      window.api.recurring.getTemplates(),
      window.api.recurring.getRuns(),
      window.api.classes.getAll(),
      window.api.automation.getRules()
    ]);
    setTemplates(templateRows);
    setRuns(runRows);
    setClasses(classRows);
    setSettings(automationRules);
  };

  useEffect(() => {
    load().catch((error) => notify('error', error.message || 'Failed to load automation workspace.'));
  }, []);

  useEffect(() => {
    if (!form.id && activeBranchId) setForm((prev) => ({ ...prev, branch_id: prev.branch_id || activeBranchId }));
  }, [activeBranchId, form.id]);

  const activeTemplates = useMemo(() => templates.filter((template) => template.status === 'active'), [templates]);
  const dueToday = useMemo(() => activeTemplates.filter((template) => template.auto_create && template.next_run_date <= today()).length, [activeTemplates]);

  const resetForm = () => setForm({
    name: '',
    template_type: 'expense',
    frequency: 'monthly',
    start_date: today(),
    next_run_date: today(),
    auto_create: 1,
    status: 'active',
    branch_id: activeBranchId || '',
    class_id: '',
    payload_json: defaultPayload
  });

  const saveTemplate = async () => {
    setBusy(true);
    try {
      JSON.parse(form.payload_json || '{}');
      const payload = {
        ...form,
        branch_id: form.branch_id || null,
        class_id: form.class_id || null,
        auto_create: form.auto_create ? 1 : 0
      };
      if (form.id) await window.api.recurring.updateTemplate(payload);
      else await window.api.recurring.createTemplate(payload);
      await load();
      resetForm();
      notify('success', 'Recurring template saved.');
    } catch (error: any) {
      notify('error', error.message || 'Template payload must be valid JSON.');
    } finally {
      setBusy(false);
    }
  };

  const editTemplate = (template: RecurringTemplate) => {
    setForm({
      ...template,
      branch_id: template.branch_id || '',
      class_id: template.class_id || '',
      payload_json: JSON.stringify(template.payload || {}, null, 2)
    });
    setTab('templates');
  };

  const deactivateTemplate = async (id: string) => {
    await window.api.recurring.deactivateTemplate(id);
    await load();
    notify('success', 'Recurring template deactivated.');
  };

  const runDue = async () => {
    setBusy(true);
    try {
      const result = await window.api.recurring.runDue(today());
      await load();
      notify(result.failed ? 'error' : 'success', `Automation run complete: ${result.success} success, ${result.failed} failed, ${result.skipped} skipped.`);
      setTab('runs');
    } finally {
      setBusy(false);
    }
  };

  const saveSettings = async () => {
    const updated = await window.api.automation.updateRules(settings);
    setSettings(updated);
    notify('success', 'Automation settings saved.');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <SummaryCard label="Active Templates" value={activeTemplates.length} />
        <SummaryCard label="Due Today" value={dueToday} />
        <SummaryCard label="Last Run" value={settings.last_recurring_run_at ? settings.last_recurring_run_at.slice(0, 10) : 'Never'} />
        <SummaryCard label="Auto Run" value={settings.recurring_auto_run_enabled === 'true' ? 'Enabled' : 'Manual'} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <TabButton active={tab === 'templates'} onClick={() => setTab('templates')} icon={CalendarClock}>Recurring Templates</TabButton>
        <TabButton active={tab === 'runs'} onClick={() => setTab('runs')} icon={RefreshCw}>Automation Runs</TabButton>
        <TabButton active={tab === 'settings'} onClick={() => setTab('settings')} icon={Settings2}>Settings</TabButton>
        <button onClick={runDue} disabled={busy} className="ml-auto px-4 py-2 rounded-[4px] bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-2 disabled:opacity-60">
          <Play className="w-4 h-4" />Run Due Now
        </button>
      </div>

      {tab === 'templates' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <section className="bg-white border border-slate-200 rounded-[6px] p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-black text-slate-800 text-sm">{form.id ? 'Edit Template' : 'New Template'}</h3>
              {form.id && <button className="text-xs font-bold text-slate-500" onClick={resetForm}>New</button>}
            </div>
            <div className="space-y-3">
              <Field label="Template Name"><input className="erp-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Type"><select className="erp-input" value={form.template_type} onChange={(e) => setForm({ ...form, template_type: e.target.value as any })}><option value="expense">Expense</option><option value="journal">Journal Entry</option><option value="purchase">Bill / Purchase</option><option value="invoice">Invoice</option></select></Field>
                <Field label="Frequency"><select className="erp-input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as any })}><option>daily</option><option>weekly</option><option>monthly</option><option>quarterly</option><option>yearly</option></select></Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Start Date"><input type="date" className="erp-input" value={form.start_date || ''} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></Field>
                <Field label="Next Run"><input type="date" className="erp-input" value={form.next_run_date || ''} onChange={(e) => setForm({ ...form, next_run_date: e.target.value })} /></Field>
              </div>
              <Field label="End Date"><input type="date" className="erp-input" value={form.end_date || ''} onChange={(e) => setForm({ ...form, end_date: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Branch"><select className="erp-input" value={form.branch_id || ''} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}><option value="">Default Branch</option>{accessibleBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_code} - {branch.branch_name}</option>)}</select></Field>
                <Field label="Class"><select className="erp-input" value={form.class_id || ''} onChange={(e) => setForm({ ...form, class_id: e.target.value })}><option value="">No Class</option>{classes.map((cls) => <option key={cls.id} value={cls.id}>{cls.class_code} - {cls.class_name}</option>)}</select></Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Status"><select className="erp-input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as any })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
                <label className="flex items-end gap-2 text-xs font-bold text-slate-600 pb-2"><input type="checkbox" checked={Boolean(form.auto_create)} onChange={(e) => setForm({ ...form, auto_create: e.target.checked ? 1 : 0 })} />Auto-create</label>
              </div>
              <Field label="Payload JSON"><textarea className="erp-input min-h-[150px] font-mono text-[11px]" value={form.payload_json || ''} onChange={(e) => setForm({ ...form, payload_json: e.target.value })} /></Field>
              <button onClick={saveTemplate} disabled={busy || !form.name} className="w-full bg-primary-blue text-white rounded-[4px] px-4 py-2 text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"><Save className="w-4 h-4" />Save Template</button>
            </div>
          </section>

          <section className="xl:col-span-2 bg-white border border-slate-200 rounded-[6px] shadow-sm overflow-hidden">
            <TableHeader title="Recurring Template Register" />
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase"><tr><th className="px-3 py-2 text-left">Name</th><th className="px-3 py-2 text-left">Schedule</th><th className="px-3 py-2 text-left">Scope</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
              <tbody>{templates.map((template) => <tr key={template.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-3 py-2 font-bold text-slate-800">{template.name}<span className="block text-[10px] text-slate-500 uppercase">{template.template_type}</span></td><td className="px-3 py-2">{template.frequency}<span className="block text-slate-500">Next: {template.next_run_date}</span></td><td className="px-3 py-2">{template.branch_name || 'Default'}<span className="block text-slate-500">{template.class_name || 'No class'}</span></td><td className="px-3 py-2"><Badge value={template.status} /></td><td className="px-3 py-2 text-right space-x-2"><button className="text-primary-blue font-bold" onClick={() => editTemplate(template)}>Edit</button>{template.status === 'active' && <button className="text-red-600 font-bold" onClick={() => deactivateTemplate(template.id)}>Deactivate</button>}</td></tr>)}</tbody>
            </table>
          </section>
        </div>
      )}

      {tab === 'runs' && (
        <section className="bg-white border border-slate-200 rounded-[6px] shadow-sm overflow-hidden">
          <TableHeader title="Automation Run Log" />
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase"><tr><th className="px-3 py-2 text-left">Template</th><th className="px-3 py-2 text-left">Run Date</th><th className="px-3 py-2 text-left">Result</th><th className="px-3 py-2 text-left">Created Transaction</th><th className="px-3 py-2 text-left">Error</th></tr></thead>
            <tbody>{runs.map((run) => <tr key={run.id} className="border-t border-slate-100"><td className="px-3 py-2 font-bold">{run.template_name || run.template_id}</td><td className="px-3 py-2">{run.run_date}</td><td className="px-3 py-2"><Badge value={run.status} /></td><td className="px-3 py-2">{run.created_transaction_type || '-'} {run.created_transaction_id || ''}</td><td className="px-3 py-2 text-red-600">{run.error_message || '-'}</td></tr>)}</tbody>
          </table>
        </section>
      )}

      {tab === 'settings' && (
        <section className="bg-white border border-slate-200 rounded-[6px] p-4 shadow-sm max-w-2xl">
          <h3 className="font-black text-slate-800 text-sm mb-3">Automation Settings</h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between rounded-[5px] bg-slate-50 border border-slate-200 px-3 py-3 text-xs font-bold text-slate-700">
              Enable daily recurring automation foundation
              <input type="checkbox" checked={settings.recurring_auto_run_enabled === 'true'} onChange={(e) => setSettings({ ...settings, recurring_auto_run_enabled: e.target.checked ? 'true' : 'false' })} />
            </label>
            <Field label="Last Recurring Run"><input className="erp-input" value={settings.last_recurring_run_at || ''} onChange={(e) => setSettings({ ...settings, last_recurring_run_at: e.target.value })} /></Field>
            <button onClick={saveSettings} className="bg-primary-blue text-white rounded-[4px] px-4 py-2 text-xs font-bold">Save Settings</button>
          </div>
        </section>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div className="bg-white border border-slate-200 rounded-[6px] p-4 shadow-sm"><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</p><div className="text-2xl font-black text-slate-900 mt-1">{value}</div></div>;
const TabButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ElementType; children: React.ReactNode }> = ({ active, onClick, icon: Icon, children }) => <button className={`px-4 py-2 rounded-[4px] text-xs font-bold inline-flex items-center gap-2 ${active ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'}`} onClick={onClick}><Icon className="w-4 h-4" />{children}</button>;
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block text-xs font-bold text-slate-600 space-y-1"><span>{label}</span>{children}</label>;
const TableHeader: React.FC<{ title: string }> = ({ title }) => <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between"><h3 className="font-black text-slate-800 text-sm">{title}</h3></div>;
const Badge: React.FC<{ value: string }> = ({ value }) => <span className={`px-2 py-1 rounded-[3px] text-[10px] font-black uppercase ${value === 'success' || value === 'active' ? 'bg-emerald-50 text-emerald-700' : value === 'failed' || value === 'inactive' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{value}</span>;
