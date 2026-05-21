import React, { useEffect, useState } from 'react';
import { Layers, Plus, Save } from 'lucide-react';
import type { ClassTracking } from '../../shared/types';

const emptyClass: Partial<ClassTracking> = {
  class_code: '',
  class_name: '',
  description: '',
  status: 'active'
};

export const ClassesPage: React.FC = () => {
  const [classes, setClasses] = useState<ClassTracking[]>([]);
  const [form, setForm] = useState<Partial<ClassTracking>>(emptyClass);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>('');

  const loadClasses = async () => {
    const rows = await window.api.classes.getAll();
    setClasses(rows);
  };

  useEffect(() => {
    loadClasses().catch(console.error);
  }, []);

  const resetForm = () => {
    setForm(emptyClass);
    setEditingId(null);
  };

  const saveClass = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.class_code || !form.class_name) {
      setMessage('Class code and name are required.');
      return;
    }

    if (editingId) {
      await window.api.classes.update({ ...form, id: editingId });
      setMessage('Class updated.');
    } else {
      await window.api.classes.create(form);
      setMessage('Class created.');
    }
    resetForm();
    await loadClasses();
  };

  const editClass = (row: ClassTracking) => {
    setEditingId(row.id);
    setForm(row);
  };

  const deactivateClass = async (id: string) => {
    await window.api.classes.deactivate(id);
    setMessage('Class deactivated.');
    await loadClasses();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4">
        <form onSubmit={saveClass} className="bg-white border border-slate-200 rounded-[8px] shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">{editingId ? 'Edit Class' : 'Add Class'}</h3>
              <p className="text-[11px] text-slate-500">Track profit by department, project, or business line.</p>
            </div>
            <Layers className="w-5 h-5 text-primary-blue" />
          </div>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Class Code
            <input className="mt-1 w-full rounded-[4px] border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary-blue" value={form.class_code || ''} onChange={(event) => setForm({ ...form, class_code: event.target.value })} />
          </label>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Class Name
            <input className="mt-1 w-full rounded-[4px] border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary-blue" value={form.class_name || ''} onChange={(event) => setForm({ ...form, class_name: event.target.value })} />
          </label>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Description
            <textarea className="mt-1 w-full rounded-[4px] border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary-blue" rows={3} value={form.description || ''} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </label>
          <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Status
            <select className="mt-1 w-full rounded-[4px] border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-primary-blue" value={form.status || 'active'} onChange={(event) => setForm({ ...form, status: event.target.value as 'active' | 'inactive' })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-[4px] bg-primary-blue px-3 py-2 text-xs font-bold text-white" type="submit">
              <Save className="w-4 h-4" />
              Save Class
            </button>
            {editingId && <button className="rounded-[4px] border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600" type="button" onClick={resetForm}>Cancel</button>}
          </div>
          {message && <p className="text-[11px] font-semibold text-primary-blue">{message}</p>}
        </form>

        <div className="bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Classes / Departments</h3>
              <p className="text-[11px] text-slate-500">Foundation for class-wise reports and transaction tagging.</p>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wide bg-slate-100 text-slate-500 px-2 py-1 rounded-[3px]">{classes.length} records</span>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left px-4 py-2">Code</th>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-left px-4 py-2">Description</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-right px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classes.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-2 font-mono font-bold text-slate-700">{row.class_code}</td>
                  <td className="px-4 py-2 font-bold text-slate-800">{row.class_name}</td>
                  <td className="px-4 py-2 text-slate-500">{row.description || '-'}</td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 rounded-[3px] text-[10px] font-bold uppercase ${row.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>{row.status}</span>
                  </td>
                  <td className="px-4 py-2 text-right space-x-2">
                    <button className="text-primary-blue font-bold" onClick={() => editClass(row)}>Edit</button>
                    {row.status === 'active' && <button className="text-red-600 font-bold" onClick={() => deactivateClass(row.id)}>Deactivate</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
