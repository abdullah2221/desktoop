import { getDatabase } from '../connection';

interface AuditPayload {
  action: string;
  details: string;
  user_id?: string | null;
}

export class AuditLogRepository {
  static write(payload: AuditPayload): boolean {
    const db = getDatabase();
    const id = `AUD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const info = db.prepare(`
      INSERT INTO audit_logs (id, user_id, action, details)
      VALUES (@id, @user_id, @action, @details)
    `).run({
      id,
      user_id: payload.user_id ?? null,
      action: payload.action,
      details: payload.details
    });

    return info.changes > 0;
  }
}
