import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export class BranchRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare(`
      SELECT id, branch_code, COALESCE(branch_name, name) as branch_name, address, phone, email,
             manager_name, tax_number, status, is_default, created_at, updated_at
      FROM branches
      ORDER BY is_default DESC, branch_code ASC
    `).all();
  }

  static getAccessibleForUser(userId: string) {
    const db = getDatabase();
    const user = db.prepare(`
      SELECT u.id, u.role_id, r.name as role_name
      FROM users u JOIN roles r ON r.id = u.role_id
      WHERE u.id = ?
    `).get(userId) as { role_name: string } | undefined;
    if (!user) return [];
    if (user.role_name === 'Owner/Admin') return this.getAll();

    return db.prepare(`
      SELECT b.id, b.branch_code, COALESCE(b.branch_name, b.name) as branch_name, b.address, b.phone,
             b.email, b.manager_name, b.tax_number, b.status, ub.is_default, b.created_at, b.updated_at
      FROM user_branches ub
      JOIN branches b ON b.id = ub.branch_id
      WHERE ub.user_id = ? AND b.status = 'active'
      ORDER BY ub.is_default DESC, b.branch_code ASC
    `).all(userId);
  }

  static userCanAccessBranch(userId: string, branchId: string) {
    const db = getDatabase();
    const user = db.prepare('SELECT r.name as role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id=?').get(userId) as { role_name: string } | undefined;
    if (user?.role_name === 'Owner/Admin') return true;
    const row = db.prepare('SELECT 1 FROM user_branches WHERE user_id=? AND branch_id=?').get(userId, branchId);
    return Boolean(row);
  }

  static create(payload: any, actorId?: string) {
    const db = getDatabase();
    const id = payload.id || `BR-${Date.now()}`;
    const info = db.prepare(`
      INSERT INTO branches (
        id, tenant_id, branch_code, name, branch_name, address, phone, email, manager_name, tax_number, status, is_default
      ) VALUES (
        @id, 'T001', @branch_code, @branch_name, @branch_name, @address, @phone, @email, @manager_name, @tax_number, @status, @is_default
      )
    `).run({
      id,
      branch_code: payload.branch_code,
      branch_name: payload.branch_name,
      address: payload.address || '',
      phone: payload.phone || '',
      email: payload.email || '',
      manager_name: payload.manager_name || '',
      tax_number: payload.tax_number || '',
      status: payload.status || 'active',
      is_default: payload.is_default ? 1 : 0
    });
    if (payload.is_default) this.setDefault(id);
    if (info.changes > 0) AuditLogRepository.write({ action: 'BRANCH_CREATE', user_id: actorId, details: `Branch ${id} created` });
    return { success: info.changes > 0, id };
  }

  static update(payload: any, actorId?: string) {
    const db = getDatabase();
    const info = db.prepare(`
      UPDATE branches
      SET branch_code=@branch_code,
          name=@branch_name,
          branch_name=@branch_name,
          address=@address,
          phone=@phone,
          email=@email,
          manager_name=@manager_name,
          tax_number=@tax_number,
          status=@status,
          is_default=@is_default,
          updated_at=CURRENT_TIMESTAMP
      WHERE id=@id
    `).run({
      id: payload.id,
      branch_code: payload.branch_code,
      branch_name: payload.branch_name,
      address: payload.address || '',
      phone: payload.phone || '',
      email: payload.email || '',
      manager_name: payload.manager_name || '',
      tax_number: payload.tax_number || '',
      status: payload.status || 'active',
      is_default: payload.is_default ? 1 : 0
    });
    if (payload.is_default) this.setDefault(payload.id);
    if (info.changes > 0) AuditLogRepository.write({ action: 'BRANCH_UPDATE', user_id: actorId, details: `Branch ${payload.id} updated` });
    return info.changes > 0;
  }

  static deactivate(id: string, actorId?: string) {
    const db = getDatabase();
    const info = db.prepare("UPDATE branches SET status='inactive', is_default=0, updated_at=CURRENT_TIMESTAMP WHERE id=? AND is_default=0").run(id);
    if (info.changes > 0) AuditLogRepository.write({ action: 'BRANCH_DEACTIVATE', user_id: actorId, details: `Branch ${id} deactivated` });
    return info.changes > 0;
  }

  static setDefault(id: string) {
    const db = getDatabase();
    const tx = db.transaction((branchId: string) => {
      db.prepare('UPDATE branches SET is_default=0').run();
      db.prepare("UPDATE branches SET is_default=1, status='active', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(branchId);
      return true;
    });
    return tx(id);
  }

  static assignUserBranches(userId: string, branchIds: string[], defaultBranchId?: string) {
    const db = getDatabase();
    const tx = db.transaction(() => {
      db.prepare('DELETE FROM user_branches WHERE user_id=?').run(userId);
      const insert = db.prepare('INSERT OR IGNORE INTO user_branches (user_id, branch_id, is_default) VALUES (?, ?, ?)');
      for (const branchId of branchIds) insert.run(userId, branchId, branchId === defaultBranchId ? 1 : 0);
      return true;
    });
    return tx();
  }
}
