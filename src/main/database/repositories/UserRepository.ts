import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';
import { AuthRepository } from './AuthRepository';

export class UserRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare(`
      SELECT u.id, u.username, u.full_name, u.email, u.role_id, r.name as role_name,
             u.status, u.last_login, u.branch_id, u.created_at, u.updated_at
      FROM users u
      JOIN roles r ON r.id = u.role_id
      ORDER BY u.created_at DESC
    `).all();
  }

  static create(payload: any, actorId?: string) {
    const db = getDatabase();
    const id = payload.id || `USR-${Date.now()}`;
    const info = db.prepare(`
      INSERT INTO users (
        id, tenant_id, branch_id, username, full_name, email, password_hash, role_id, status
      ) VALUES (
        @id, 'T001', @branch_id, @username, @full_name, @email, @password_hash, @role_id, @status
      )
    `).run({
      id,
      branch_id: payload.branch_id || 'B001',
      username: payload.username,
      full_name: payload.full_name || payload.username,
      email: payload.email || '',
      password_hash: AuthRepository.hashPassword(payload.password || 'changeMe123'),
      role_id: payload.role_id,
      status: payload.status || 'active'
    });
    if (info.changes > 0) AuditLogRepository.write({ action: 'USER_CREATE', user_id: actorId, details: `User ${id} created` });
    return { success: info.changes > 0, id };
  }

  static update(payload: any, actorId?: string) {
    const db = getDatabase();
    const info = db.prepare(`
      UPDATE users
      SET username=@username,
          full_name=@full_name,
          email=@email,
          role_id=@role_id,
          branch_id=@branch_id,
          status=@status,
          updated_at=CURRENT_TIMESTAMP
      WHERE id=@id
    `).run({
      id: payload.id,
      username: payload.username,
      full_name: payload.full_name || payload.username,
      email: payload.email || '',
      role_id: payload.role_id,
      branch_id: payload.branch_id || 'B001',
      status: payload.status || 'active'
    });
    if (info.changes > 0) AuditLogRepository.write({ action: 'USER_UPDATE', user_id: actorId, details: `User ${payload.id} updated` });
    return info.changes > 0;
  }

  static deactivate(id: string, actorId?: string) {
    if (actorId && id === actorId) {
      throw new Error('Users cannot deactivate their own account.');
    }
    const db = getDatabase();
    const info = db.prepare("UPDATE users SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
    if (info.changes > 0) AuditLogRepository.write({ action: 'USER_DEACTIVATE', user_id: actorId, details: `User ${id} deactivated` });
    return info.changes > 0;
  }

  static resetPassword(id: string, password: string, actorId?: string) {
    const db = getDatabase();
    const info = db.prepare('UPDATE users SET password_hash=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(AuthRepository.hashPassword(password), id);
    if (info.changes > 0) AuditLogRepository.write({ action: 'USER_PASSWORD_RESET', user_id: actorId, details: `Password reset for ${id}` });
    return info.changes > 0;
  }
}
