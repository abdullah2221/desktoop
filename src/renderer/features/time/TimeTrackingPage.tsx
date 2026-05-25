import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle, Clock, FileClock, Play, Save, Square } from 'lucide-react';
import { useErp } from '../../app/providers/ErpContext';
import { Employee, Timesheet } from '../../shared/types';
import { IconActionButton } from '../../shared/ui/IconActionButton';

const today = () => new Date().toISOString().split('T')[0];

export const TimeTrackingPage: React.FC = () => {
  const { accessibleBranches, activeBranchId, hasPermission, notify } = useErp();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [summary, setSummary] = useState<Record<string, any> | null>(null);
  const [filters, setFilters] = useState({ dateFrom: today(), dateTo: today(), branchId: activeBranchId || '', employeeId: '' });
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [manual, setManual] = useState({ employee_id: '', work_date: today(), total_hours: 8, break_minutes: 0, notes: '', branch_id: activeBranchId || '' });

  const load = async () => {
    const [employeeRows, timeRows, summaryRows] = await Promise.all([
      window.api.employees.getAll(),
      window.api.timesheets.getAll(filters),
      window.api.timesheets.summary(filters)
    ]);
    setEmployees(employeeRows);
    setTimesheets(timeRows);
    setSummary(summaryRows);
    if (!selectedEmployee && employeeRows.length) setSelectedEmployee(employeeRows.find((employee) => employee.status === 'active')?.id || employeeRows[0].id);
  };

  useEffect(() => { load().catch((error) => notify('error', error.message || 'Failed to load time tracking.')); }, []);

  const activeEmployees = useMemo(() => employees.filter((employee) => employee.status === 'active'), [employees]);
  const openSheet = useMemo(() => timesheets.find((sheet) => sheet.employee_id === selectedEmployee && !sheet.clock_out && sheet.entry_type === 'clock'), [timesheets, selectedEmployee]);

  const clockIn = async () => {
    await window.api.timesheets.clockIn({ employee_id: selectedEmployee, branch_id: filters.branchId || activeBranchId || undefined });
    await load();
    notify('success', 'Clock-in recorded.');
  };

  const clockOut = async () => {
    if (!openSheet) return;
    await window.api.timesheets.clockOut(openSheet.id, { break_minutes: openSheet.break_minutes || 0 });
    await load();
    notify('success', 'Clock-out recorded.');
  };

  const saveManual = async () => {
    await window.api.timesheets.createManual({
      ...manual,
      employee_id: manual.employee_id || selectedEmployee,
      branch_id: manual.branch_id || filters.branchId || activeBranchId || undefined,
      total_hours: Number(manual.total_hours || 0),
      break_minutes: Number(manual.break_minutes || 0)
    });
    await load();
    notify('success', 'Manual time entry saved.');
  };

  const approve = async (id: string) => {
    await window.api.timesheets.approve(id);
    await load();
    notify('success', 'Timesheet approved.');
  };

  const applyFilters = async () => {
    const [timeRows, summaryRows] = await Promise.all([
      window.api.timesheets.getAll(filters),
      window.api.timesheets.summary(filters)
    ]);
    setTimesheets(timeRows);
    setSummary(summaryRows);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Summary label="Approved Hours" value={(summary?.totals?.totalHours || 0).toFixed(2)} />
        <Summary label="Estimated Pay" value={`Rs ${Number(summary?.totals?.estimatedPay || 0).toLocaleString()}`} />
        <Summary label="Open Clock-ins" value={timesheets.filter((sheet) => !sheet.clock_out && sheet.entry_type === 'clock').length} />
        <Summary label="Pending Approval" value={timesheets.filter((sheet) => sheet.approval_status === 'pending').length} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
        <section className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-[8px] shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-800">Clock Station</h3><Clock className="w-5 h-5 text-primary-blue" /></div>
            <Field label="Employee"><select className="erp-input" value={selectedEmployee} onChange={(e) => { setSelectedEmployee(e.target.value); setManual({ ...manual, employee_id: e.target.value }); }}>{activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_code} - {employee.name}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-2">
              <button disabled={!selectedEmployee || Boolean(openSheet) || !hasPermission('time.track')} onClick={clockIn} className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-emerald-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Play className="w-4 h-4" />Clock In</button>
              <button disabled={!openSheet || !hasPermission('time.track')} onClick={clockOut} className="inline-flex items-center justify-center gap-2 rounded-[4px] bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Square className="w-4 h-4" />Clock Out</button>
            </div>
            {openSheet && <p className="rounded-[4px] bg-amber-50 px-3 py-2 text-[11px] font-bold text-amber-700">Open since {new Date(openSheet.clock_in || '').toLocaleTimeString()}</p>}
          </div>

          <div className="bg-white border border-slate-200 rounded-[8px] shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between"><h3 className="text-sm font-black text-slate-800">Manual Time Entry</h3><FileClock className="w-5 h-5 text-primary-blue" /></div>
            <Field label="Employee"><select className="erp-input" value={manual.employee_id || selectedEmployee} onChange={(e) => setManual({ ...manual, employee_id: e.target.value })}>{activeEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_code} - {employee.name}</option>)}</select></Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Work Date"><input type="date" className="erp-input" value={manual.work_date} onChange={(e) => setManual({ ...manual, work_date: e.target.value })} /></Field>
              <Field label="Branch"><select className="erp-input" value={manual.branch_id} onChange={(e) => setManual({ ...manual, branch_id: e.target.value })}><option value="">Employee Branch</option>{accessibleBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_code}</option>)}</select></Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Hours"><input type="number" step="0.25" className="erp-input" value={manual.total_hours} onChange={(e) => setManual({ ...manual, total_hours: Number(e.target.value) })} /></Field>
              <Field label="Break Minutes"><input type="number" className="erp-input" value={manual.break_minutes} onChange={(e) => setManual({ ...manual, break_minutes: Number(e.target.value) })} /></Field>
            </div>
            <Field label="Notes"><input className="erp-input" value={manual.notes} onChange={(e) => setManual({ ...manual, notes: e.target.value })} /></Field>
            <button disabled={!hasPermission('time.track')} onClick={saveManual} className="inline-flex w-full items-center justify-center gap-2 rounded-[4px] bg-primary-blue px-3 py-2 text-xs font-bold text-white disabled:opacity-50"><Save className="w-4 h-4" />Save Manual Entry</button>
          </div>
        </section>

        <section className="bg-white border border-slate-200 rounded-[8px] shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 space-y-3">
            <div><h3 className="text-sm font-black text-slate-800">Timesheet Register</h3><p className="text-[11px] text-slate-500">Time by employee, branch, and approval status.</p></div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              <input type="date" className="erp-input" value={filters.dateFrom} onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })} />
              <input type="date" className="erp-input" value={filters.dateTo} onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })} />
              <select className="erp-input" value={filters.branchId} onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}><option value="">All Branches</option>{accessibleBranches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_code}</option>)}</select>
              <select className="erp-input" value={filters.employeeId} onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}><option value="">All Employees</option>{employees.map((employee) => <option key={employee.id} value={employee.id}>{employee.employee_code}</option>)}</select>
              <button className="rounded-[4px] bg-slate-900 px-3 py-2 text-xs font-bold text-white" onClick={applyFilters}>Apply</button>
            </div>
          </div>
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-[10px] uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-2 text-left">Employee</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Time</th><th className="px-3 py-2 text-right">Hours</th><th className="px-3 py-2 text-left">Branch</th><th className="px-3 py-2 text-left">Status</th><th className="px-3 py-2 text-right">Actions</th></tr></thead>
            <tbody>{timesheets.map((sheet) => <tr key={sheet.id} className="border-t border-slate-100 hover:bg-slate-50"><td className="px-3 py-2 font-bold">{sheet.employee_code} - {sheet.employee_name}</td><td className="px-3 py-2">{sheet.work_date}</td><td className="px-3 py-2">{sheet.clock_in ? new Date(sheet.clock_in).toLocaleTimeString() : '-'} to {sheet.clock_out ? new Date(sheet.clock_out).toLocaleTimeString() : 'Open'}</td><td className="px-3 py-2 text-right font-bold">{Number(sheet.total_hours || 0).toFixed(2)}</td><td className="px-3 py-2">{sheet.branch_name || '-'}</td><td className="px-3 py-2"><Badge value={sheet.approval_status} /></td><td className="px-3 py-2"><div className="flex items-center justify-end">{sheet.approval_status !== 'approved' && hasPermission('time.approve') && <IconActionButton icon={<CheckCircle className="w-3.5 h-3.5" />} tooltip="Approve Timesheet" variant="success" onClick={() => approve(sheet.id)} />}</div></td></tr>)}</tbody>
          </table>
        </section>
      </div>
    </div>
  );
};

const Summary: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => <div className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400"><CheckCircle className="w-3.5 h-3.5" />{label}</div><div className="mt-1 text-2xl font-black text-slate-900">{value}</div></div>;
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 space-y-1"><span>{label}</span>{children}</label>;
const Badge: React.FC<{ value: string }> = ({ value }) => <span className={`px-2 py-1 rounded-[3px] text-[10px] font-black uppercase ${value === 'approved' ? 'bg-emerald-50 text-emerald-700' : value === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-700'}`}>{value}</span>;
