import React, { useEffect, useState } from 'react';
import { Badge } from '../../shared/ui/Badge';
import { Button } from '../../shared/ui/Button';
import { Card } from '../../shared/ui/Card';
import { Input } from '../../shared/ui/Input';
import { useErp } from '../../app/providers/ErpContext';

interface Permission { id: string; name: string; description?: string }
interface Role { id: string; name: string; description?: string; permissions: Permission[] }

export const RolesPage: React.FC = () => {
  const { activeUser, notify, refreshActiveUser } = useErp();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [form, setForm] = useState<Partial<Role> & { permission_ids: string[] }>({ name: '', description: '', permission_ids: [] });

  const load = async () => {
    const [roleRows, permissionRows] = await Promise.all([window.api.roles.getAll(), window.api.roles.getPermissions()]);
    setRoles(roleRows as Role[]);
    setPermissions(permissionRows as Permission[]);
  };

  useEffect(() => { load(); }, []);

  const edit = (role: Role) => setForm({ ...role, permission_ids: role.permissions.map((p) => p.id) });

  const save = async () => {
    if (!form.name?.trim()) {
      notify('error', 'Role name is required.');
      return;
    }
    const affectsCurrentUser = form.id === activeUser?.role_id;
    if (form.id) await window.api.roles.update(form);
    else await window.api.roles.create(form);
    setForm({ name: '', description: '', permission_ids: [] });
    await load();
    if (affectsCurrentUser) {
      await refreshActiveUser();
      notify('success', 'Role saved and your permissions were refreshed.');
    } else {
      notify('success', 'Role saved.');
    }
  };

  const togglePermission = (permissionId: string) => {
    setForm((prev) => {
      const existing = prev.permission_ids || [];
      return { ...prev, permission_ids: existing.includes(permissionId) ? existing.filter((id) => id !== permissionId) : [...existing, permissionId] };
    });
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card className="xl:col-span-2" title="Roles & Permission Matrix">
        <table className="erp-table text-xs">
          <thead><tr><th>Role</th><th>Description</th><th>Permissions</th><th>Action</th></tr></thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td className="font-bold">{role.name}</td>
                <td>{role.description}</td>
                <td><div className="flex flex-wrap gap-1">{role.permissions.map((p) => <Badge key={p.id} variant="info">{p.name}</Badge>)}</div></td>
                <td><Button size="sm" variant="secondary" onClick={() => edit(role)}>Edit</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title={form.id ? 'Edit Role' : 'Create Role'}>
        <div className="space-y-3">
          <Input id="role-name" label="Role Name" value={form.name || ''} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <Input id="role-description" label="Description" value={form.description || ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <div className="border border-slate-200 rounded-[6px] max-h-80 overflow-y-auto">
            {permissions.map((permission) => (
              <label key={permission.id} className="flex items-start gap-2 px-3 py-2 border-b border-slate-100 text-xs">
                <input type="checkbox" checked={(form.permission_ids || []).includes(permission.id)} onChange={() => togglePermission(permission.id)} />
                <span><b className="block text-slate-800">{permission.name}</b><span className="text-slate-500">{permission.description}</span></span>
              </label>
            ))}
          </div>
          <Button fullWidth onClick={save}>Save Role</Button>
        </div>
      </Card>
    </div>
  );
};
