import React, { useEffect, useState } from 'react';
import { Building2, CheckCircle, MapPin, Pencil, Plus, Power, RefreshCw, Save, ToggleLeft, Star } from 'lucide-react';
import type { Branch } from '../../shared/types';
import { ClassesPage } from './ClassesPage';
import { useErp } from '../../app/providers/ErpContext';
import { IconActionButton } from '../../shared/ui/IconActionButton';

const emptyBranch: Partial<Branch> = {
  branch_code: '',
  branch_name: '',
  address: '',
  phone: '',
  email: '',
  manager_name: '',
  tax_number: '',
  status: 'active',
  is_default: 0
};

export const BranchesPage: React.FC = () => {
  const { refreshActiveUser, activeBranchId, setActiveBranch } = useErp();
  const [tab, setTab] = useState<'branches' | 'classes'>('branches');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<Partial<Branch>>(emptyBranch);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const loadBranches = async () => {
    const rows = await window.api.branches.getAll();
    setBranches(rows);
  };

  useEffect(() => {
    loadBranches().catch(console.error);
  }, []);

  const resetForm = () => {
    setForm(emptyBranch);
    setEditingId(null);
  };

  const saveBranch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.branch_code || !form.branch_name) {
      setMessage('Branch code and name are required.');
      return;
    }

    if (editingId) {
      await window.api.branches.update({ ...form, id: editingId });
      setMessage('Branch updated.');
    } else {
      await window.api.branches.create(form);
      setMessage('Branch created.');
    }
    resetForm();
    await loadBranches();
    await refreshActiveUser();
  };

  const editBranch = (row: Branch) => {
    setEditingId(row.id);
    setForm(row);
  };

  const deactivateBranch = async (id: string) => {
    const ok = await window.api.branches.deactivate(id);
    setMessage(ok ? 'Branch deactivated.' : 'Default branch cannot be deactivated.');
    await loadBranches();
    await refreshActiveUser();
  };

  const makeDefault = async (id: string) => {
    await window.api.branches.setDefault(id);
    setMessage('Default branch updated.');
    await loadBranches();
    await refreshActiveUser();
  };

  const switchBranch = async (id: string) => {
    await setActiveBranch(id);
    setMessage('Active branch switched.');
  };

  const activeBranches = branches.filter((branch) => branch.status === 'active').length;
  const defaultBranch = branches.find((branch) => branch.is_default);

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-primary-blue">
            <Building2 className="w-4 h-4" />
            Enterprise Organization
          </div>
          <h2 className="mt-1 text-2xl font-black text-slate-900 tracking-tight">Branches, Classes & Locations</h2>
          <p className="text-sm text-slate-500">Control branch access, default location, and class-wise reporting foundations.</p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-[4px] border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm" onClick={() => loadBranches()}>
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Total Branches</span>
          <p className="mt-1 text-2xl font-black text-slate-900">{branches.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Active Locations</span>
          <p className="mt-1 text-2xl font-black text-emerald-700">{activeBranches}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Default Branch</span>
          <p className="mt-1 text-sm font-black text-slate-900">{defaultBranch?.branch_name || 'Not set'}</p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-[8px] p-1 inline-flex shadow-sm">
        <button className={`px-4 py-2 text-xs font-bold rounded-[5px] ${tab === 'branches' ? 'bg-primary-blue text-white' : 'text-slate-500 hover:bg-slate-50'}`} onClick={() => setTab('branches')}>Branches</button>
        <button className={`px-4 py-2 text-xs font-bold rounded-[5px] ${tab === 'classes' ? 'bg-primary-blue text-white' : 'text-slate-500 hover:bg-slate-50'}`} onClick={() => setTab('classes')}>Classes / Departments</button>
      </div>

      {tab === 'classes' ? (
        <ClassesPage />
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4">
          <form onSubmit={saveBranch} className="bg-white border border-slate-200 rounded-[8px] shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">{editingId ? 'Edit Branch' : 'Add Branch'}</h3>
                <p className="text-[11px] text-slate-500">Location profile, tax identity, and operating status.</p>
              </div>
              <Plus className="w-5 h-5 text-primary-blue" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Code
                <input className="mt-1 w-full rounded-[4px] border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary-blue" value={form.branch_code || ''} onChange={(event) => setForm({ ...form, branch_code: event.target.value })} />
              </label>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Status
                <select className="mt-1 w-full rounded-[4px] border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary-blue" value={form.status || 'active'} onChange={(event) => setForm({ ...form, status: event.target.value as 'active' | 'inactive' })}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
            </div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Branch Name
              <input className="mt-1 w-full rounded-[4px] border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary-blue" value={form.branch_name || ''} onChange={(event) => setForm({ ...form, branch_name: event.target.value })} />
            </label>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
              Address
              <textarea className="mt-1 w-full rounded-[4px] border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary-blue" rows={2} value={form.address || ''} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Phone
                <input className="mt-1 w-full rounded-[4px] border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary-blue" value={form.phone || ''} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </label>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Email
                <input className="mt-1 w-full rounded-[4px] border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary-blue" value={form.email || ''} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Manager
                <input className="mt-1 w-full rounded-[4px] border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary-blue" value={form.manager_name || ''} onChange={(event) => setForm({ ...form, manager_name: event.target.value })} />
              </label>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
                Tax Number
                <input className="mt-1 w-full rounded-[4px] border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary-blue" value={form.tax_number || ''} onChange={(event) => setForm({ ...form, tax_number: event.target.value })} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
              <input type="checkbox" checked={Boolean(form.is_default)} onChange={(event) => setForm({ ...form, is_default: event.target.checked ? 1 : 0 })} />
              Make this the default branch
            </label>
            <div className="flex gap-2">
              <button className="inline-flex items-center gap-2 rounded-[4px] bg-primary-blue px-3 py-2 text-xs font-bold text-white" type="submit">
                <Save className="w-4 h-4" />
                Save Branch
              </button>
              {editingId && <button className="rounded-[4px] border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600" type="button" onClick={resetForm}>Cancel</button>}
            </div>
            {message && <p className="text-[11px] font-semibold text-primary-blue">{message}</p>}
          </form>

          <div className="bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Branch Register</h3>
                <p className="text-[11px] text-slate-500">QuickBooks-style location list with default and active-branch controls.</p>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 px-2 py-1 rounded-[3px]">Current: {activeBranchId || 'None'}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2">Branch</th>
                    <th className="text-left px-4 py-2">Manager</th>
                    <th className="text-left px-4 py-2">Contact</th>
                    <th className="text-left px-4 py-2">Tax No.</th>
                    <th className="text-left px-4 py-2">Status</th>
                    <th className="text-right px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branches.map((row) => (
                    <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-2">
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 w-3.5 h-3.5 text-slate-400" />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-700">{row.branch_code}</span>
                              {row.is_default ? <span className="bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-[3px] text-[9px] font-black uppercase">Default</span> : null}
                            </div>
                            <p className="font-bold text-slate-900">{row.branch_name}</p>
                            <p className="text-[11px] text-slate-500">{row.address || '-'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2 text-slate-600">{row.manager_name || '-'}</td>
                      <td className="px-4 py-2 text-slate-600">
                        <p>{row.phone || '-'}</p>
                        <p className="text-[11px] text-slate-400">{row.email || '-'}</p>
                      </td>
                      <td className="px-4 py-2 font-mono text-slate-600">{row.tax_number || '-'}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 rounded-[3px] text-[10px] font-bold uppercase ${row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.status}</span>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {row.id !== activeBranchId && row.status === 'active' && <IconActionButton icon={<ToggleLeft className="w-3.5 h-3.5" />} tooltip="Switch Branch" variant="success" onClick={() => switchBranch(row.id)} />}
                          {!row.is_default && row.status === 'active' && <IconActionButton icon={<Star className="w-3.5 h-3.5" />} tooltip="Set Default Branch" onClick={() => makeDefault(row.id)} />}
                          <IconActionButton icon={<Pencil className="w-3.5 h-3.5" />} tooltip="Edit Branch" onClick={() => editBranch(row)} />
                          {!row.is_default && row.status === 'active' && <IconActionButton icon={<Power className="w-3.5 h-3.5" />} tooltip="Deactivate Branch" danger onClick={() => deactivateBranch(row.id)} />}
                          {row.id === activeBranchId && <CheckCircle className="inline w-4 h-4 text-emerald-600" />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
