import React, { useEffect, useMemo, useState } from 'react';
import { BadgeCheck, Briefcase, Pencil, Power, Save, UserPlus } from 'lucide-react';
import { useErp } from '../../app/providers/ErpContext';
import { Employee } from '../../shared/types';
import { IconActionButton } from '../../shared/ui/IconActionButton';

const emptyEmployee: Partial<Employee> = {
  employee_code: '',
  name: '',
  phone: '',
  email: '',
  designation: '',
  hourly_rate: 0,
  monthly_salary: 0,
  status: 'active',
  branch_id: ''
};

export const EmployeesPage: React.FC = () => {
  const { accessibleBranches, activeBranchId, notify } = useErp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState<Partial<Employee>>({ ...emptyEmployee, branch_id: activeBranchId || '' });
  const [editingId, setEditingId] = useState<string | null>(null);

  const load = async () => setEmployees(await window.api.employees.getAll());
  useEffect(() => { load().catch((error) => notify('error', error.message || 'Failed to load employees.')); }, []);

  const activeCount = useMemo(() => employees.filter((employee) => employee.status === 'active').length, [employees]);
  const payrollBase = useMemo(() => employees.reduce((sum, employee) => sum + Number(employee.monthly_salary || 0), 0), [employees]);

  const reset = () => {
    setEditingId(null);
    setForm({ ...emptyEmployee, branch_id: activeBranchId || '' });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const payload = {
      ...form,
      branch_id: form.branch_id || null,
      hourly_rate: Number(form.hourly_rate || 0),
      monthly_salary: Number(form.monthly_salary || 0)
    };
    if (editingId) await window.api.employees.update({ ...payload, id: editingId });
    else await window.api.employees.create(payload);
    await load();
    reset();
    notify('success', 'Employee profile saved.');
  };

  const edit = (employee: Employee) => {
    setEditingId(employee.id);
    setForm({ ...employee, branch_id: employee.branch_id || '' });
  };

  const deactivate = async (id: string) => {
    await window.api.employees.deactivate(id);
    await load();
    notify('success', 'Employee deactivated.');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Summary label="Employees" value={employees.length} />
        <Summary label="Active" value={activeCount} />
        <Summary label="Monthly Payroll Base" value={`Rs ${payrollBase.toLocaleString()}`} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4">
        <form onSubmit={save} className="bg-white border border-slate-200 rounded-[8px] shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-800">{editingId ? 'Edit Employee' : 'Add Employee'}</h3>
              <p className="text-[11px] text-slate-500">Payroll-ready employee profile and branch assignment.</p>
            </div>
            <UserPlus className="w-5 h-5 text-primary-blue" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Employee Code"><input className="erp-input" value={form.employee_code || ''} onChange={(e) => setForm({ ...form, employee_code: e.target.value })} required /></Field>
            <Field label="Status"><select className="erp-input" value={form.status || 'active'} onChange={(e) => setForm({ ...form, status: e.target.value as any })}><option value="active">Active</option><option value="inactive">Inactive</option></select></Field>
          </div>
          <Field label="Name"><input className="erp-input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
          <Field label="Designation"><input className="erp-input" value={form.designation || ''} onChange={(e) => setForm({ ...form, designation: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Phone"><input className="erp-input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
            <Field label="Email"><input className="erp-input" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
          </div>
          <Field label="Branch"><select className="erp-input" value={form.branch_id || ''} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}><option value="">Unassigned</option>{accessibleBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_code} - {branch.branch_name}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Hourly Rate"><input type="number" className="erp-input" value={form.hourly_rate || 0} onChange={(e) => setForm({ ...form, hourly_rate: Number(e.target.value) })} /></Field>
            <Field label="Monthly Salary"><input type="number" className="erp-input" value={form.monthly_salary || 0} onChange={(e) => setForm({ ...form, monthly_salary: Number(e.target.value) })} /></Field>
          </div>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-[4px] bg-primary-blue px-3 py-2 text-xs font-bold text-white" type="submit"><Save className="w-4 h-4" />Save Employee</button>
            {editingId && <button className="rounded-[4px] border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600" type="button" onClick={reset}>Cancel</button>}
          </div>
        </form>

        <section className="bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200">
            <h3 className="text-sm font-black text-slate-800">Employee Register</h3>
            <p className="text-[11px] text-slate-500">Compact workforce list with payroll rates and branch tags.</p>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-2 text-left">Employee</th><th className="px-4 py-2 text-left">Branch</th><th className="px-4 py-2 text-right">Hourly</th><th className="px-4 py-2 text-right">Salary</th><th className="px-4 py-2 text-left">Status</th><th className="px-4 py-2 text-right">Actions</th></tr></thead>
            <tbody>{employees.map((employee) => <tr key={employee.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-4 py-2"><div className="font-bold text-slate-800">{employee.employee_code} - {employee.name}</div><div className="text-slate-500">{employee.designation || 'Staff'} · {employee.phone || '-'}</div></td><td className="px-4 py-2">{employee.branch_name || 'Unassigned'}</td><td className="px-4 py-2 text-right">{Number(employee.hourly_rate || 0).toLocaleString()}</td><td className="px-4 py-2 text-right">{Number(employee.monthly_salary || 0).toLocaleString()}</td><td className="px-4 py-2"><Badge value={employee.status} /></td><td className="px-4 py-2"><div className="flex items-center justify-end gap-1"><IconActionButton icon={<Pencil className="w-3.5 h-3.5" />} tooltip="Edit Employee" onClick={() => edit(employee)} />{employee.status === 'active' && <IconActionButton icon={<Power className="w-3.5 h-3.5" />} tooltip="Deactivate Employee" danger onClick={() => deactivate(employee.id)} />}</div></td></tr>)}</tbody>
          </table>
        </section>
      </div>
    </div>
  );
};

const Summary: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"><Briefcase className="w-3.5 h-3.5" />{label}</div><div className="mt-1 text-2xl font-black text-slate-900">{value}</div></div>;
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 space-y-1"><span>{label}</span>{children}</label>;
const Badge: React.FC<{ value: string }> = ({ value }) => <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-[3px] text-[10px] font-black uppercase ${value === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}><BadgeCheck className="w-3 h-3" />{value}</span>;
