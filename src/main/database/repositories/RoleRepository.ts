import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export class RoleRepository {
  static getPermissions() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM permissions ORDER BY name ASC').all();
  }

  static getAll() {
    const db = getDatabase();
    const roles = db.prepare('SELECT * FROM roles ORDER BY name ASC').all() as Array<any>;
    const perms = db.prepare(`
      SELECT rp.role_id, p.id, p.name, p.description
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      ORDER BY p.name ASC
    `).all() as Array<any>;
    return roles.map((role) => ({
      ...role,
      permissions: perms.filter((perm) => perm.role_id === role.id)
    }));
  }

  static create(payload: any, actorId?: string) {
    const db = getDatabase();
    const id = payload.id || `ROLE-${Date.now()}`;
    const tx = db.transaction((data: any) => {
      db.prepare('INSERT INTO roles (id, name, description) VALUES (?, ?, ?)').run(id, data.name, data.description || '');
      this.setPermissionsInternal(id, data.permission_ids || []);
      AuditLogRepository.write({ action: 'ROLE_CREATE', user_id: actorId, details: `Role ${id} created` });
      return { success: true, id };
    });
    return tx(payload);
  }

  static update(payload: any, actorId?: string) {
    const db = getDatabase();
    const tx = db.transaction((data: any) => {
      db.prepare('UPDATE roles SET name=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(data.name, data.description || '', data.id);
      this.setPermissionsInternal(data.id, data.permission_ids || []);
      AuditLogRepository.write({ action: 'ROLE_UPDATE', user_id: actorId, details: `Role ${data.id} updated` });
      return true;
    });
    return tx(payload);
  }

  private static setPermissionsInternal(roleId: string, permissionIds: string[]) {
    const db = getDatabase();
    db.prepare('DELETE FROM role_permissions WHERE role_id = ?').run(roleId);
    const insert = db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)');
    for (const permissionId of permissionIds) insert.run(roleId, permissionId);
  }
}
