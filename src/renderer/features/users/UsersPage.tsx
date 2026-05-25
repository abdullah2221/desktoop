import React, { useEffect, useState } from 'react';
import { KeyRound, Pencil, Power, ShieldCheck } from 'lucide-react';
import { useErp } from '../../app/providers/ErpContext';
import { Branch, User } from '../../shared/types';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { IconActionButton } from '../../shared/ui/IconActionButton';
import { Input } from '../../shared/ui/Input';
import { RolesPage } from './RolesPage';

interface Role { id: string; name: string }

export const UsersPage: React.FC = () => {
  const { activeUser, notify, refreshActiveUser, logout } = useErp();
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<Partial<User> & { password?: string }>({ username: '', full_name: '', email: '', role_id: '', status: 'active', branch_id: 'B001', password: '' });
  const [resetPassword, setResetPassword] = useState('');

  const load = async () => {
    const [userRows, roleRows, branchRows] = await Promise.all([window.api.users.getAll(), window.api.roles.getAll(), window.api.branches.getAll()]);
    setUsers(userRows);
    setRoles(roleRows as Role[]);
    setBranches(branchRows);
    setForm((prev) => ({ ...prev, role_id: prev.role_id || (roleRows as Role[])[0]?.id || '' }));
  };

  useEffect(() => { load(); }, []);

  const edit = (user: User) => setForm({ ...user, password: '' });

  const clearForm = () => {
    setForm({ username: '', full_name: '', email: '', role_id: roles[0]?.id || '', status: 'active', branch_id: 'B001', password: '' });
    setResetPassword('');
  };

  const save = async () => {
    if (!form.username?.trim() || !form.role_id) {
      notify('error', 'Username and role are required.');
      return;
    }
    const wasCurrentUser = Boolean(form.id && form.id === activeUser?.id);
    let userId = form.id;
    if (form.id) await window.api.users.update(form);
    else {
      const created = await window.api.users.create(form);
      userId = created.id;
    }
    if (userId && form.branch_id) await window.api.branches.assignUserBranches(userId, [form.branch_id], form.branch_id);
    clearForm();
    await load();
    if (wasCurrentUser) {
      const refreshed = await refreshActiveUser();
      if (!refreshed) return;
      notify('success', 'Your profile and header were updated.');
    } else {
      notify('success', 'User saved.');
    }
  };

  const deactivate = async (id: string) => {
    const isCurrentUser = id === activeUser?.id;
    await window.api.users.deactivate(id);
    await load();
    if (isCurrentUser) {
      notify('info', 'Your user was deactivated. Logging out for security.');
      await logout();
      return;
    }
    notify('success', 'User deactivated.');
  };

  const reset = async () => {
    if (!form.id || !resetPassword) return;
    await window.api.users.resetPassword(form.id, resetPassword);
    setResetPassword('');
    if (form.id === activeUser?.id) {
      await refreshActiveUser();
      notify('success', 'Your password was reset. Current session remains active.');
    } else {
      notify('success', 'Password reset.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button className={`px-4 py-2 text-sm font-semibold rounded-[4px] ${activeTab === 'users' ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setActiveTab('users')}>Users</button>
        <button className={`px-4 py-2 text-sm font-semibold rounded-[4px] ${activeTab === 'roles' ? 'bg-primary-blue text-white' : 'bg-slate-100 text-slate-700'}`} onClick={() => setActiveTab('roles')}>Roles & Permissions</button>
      </div>

      {activeTab === 'roles' ? <RolesPage /> : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <Card className="xl:col-span-2" title="User Management">
            <table className="erp-table text-xs">
              <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Branch</th><th>Last Login</th><th>Status</th><th>Action</th></tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td><b>{user.full_name || user.username}</b><span className="block text-slate-500">{user.username}</span></td>
                    <td>{user.email || '-'}</td>
                    <td><Badge variant="info">{user.role_name || user.role}</Badge></td>
                    <td>{user.branch_id || 'B001'}</td>
                    <td>{user.last_login || '-'}</td>
                    <td><Badge variant={user.status === 'active' ? 'success' : 'danger'}>{user.status}</Badge></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <IconActionButton icon={<Pencil className="w-3.5 h-3.5" />} tooltip="Edit record" onClick={() => edit(user)} />
                        <IconActionButton icon={<Power className="w-3.5 h-3.5" />} tooltip="Deactivate record" danger onClick={() => deactivate(user.id)} disabled={user.id === activeUser?.id} disabledTooltip="You cannot deactivate your own account" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          <Card title={form.id ? 'Edit User' : 'Add User'} headerActions={form.id ? <Button size="sm" variant="secondary" onClick={clearForm}>New User</Button> : null}>
            <div className="space-y-3">
              <Input id="user-username" label="Username" value={form.username || ''} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
              <Input id="user-full-name" label="Full Name" value={form.full_name || ''} onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))} />
              <Input id="user-email" label="Email" value={form.email || ''} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
              {!form.id && <Input id="user-password" label="Initial Password" type="password" value={form.password || ''} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} />}
              <select className="erp-input" value={form.role_id || ''} onChange={(e) => setForm((p) => ({ ...p, role_id: e.target.value }))}>
                {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
              </select>
              <select className="erp-input" value={form.branch_id || 'B001'} onChange={(e) => setForm((p) => ({ ...p, branch_id: e.target.value }))}>
                {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_code} - {branch.branch_name}</option>)}
              </select>
              <select className="erp-input" value={form.status || 'active'} onChange={(e) => setForm((p) => ({ ...p, status: e.target.value as 'active' | 'inactive' }))}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <Button fullWidth onClick={save}><ShieldCheck className="w-4 h-4 mr-2" />Save User</Button>
              {form.id && (
                <div className="border-t border-slate-100 pt-3 space-y-2">
                  <Input id="reset-password" label="Reset Password" type="password" value={resetPassword} onChange={(e) => setResetPassword(e.target.value)} />
                  <Button fullWidth variant="secondary" onClick={reset}><KeyRound className="w-4 h-4 mr-2" />Reset Password</Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
