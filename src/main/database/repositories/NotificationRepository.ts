import { getDatabase } from '../connection';

export interface NotificationInput {
  type: string;
  category: 'inventory' | 'customers' | 'suppliers' | 'system';
  severity?: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  branch_id?: string | null;
  entity_type?: string | null;
  entity_id?: string | null;
  due_date?: string | null;
  rule_key?: string | null;
  dedupe_key?: string | null;
  metadata_json?: string | null;
}

export class NotificationRepository {
  static create(input: NotificationInput) {
    const db = getDatabase();
    const id = `NTF-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const info = db.prepare(`
      INSERT INTO notifications (
        id, type, category, severity, title, message, branch_id,
        entity_type, entity_id, due_date, status, rule_key, dedupe_key, metadata_json
      ) VALUES (
        @id, @type, @category, @severity, @title, @message, @branch_id,
        @entity_type, @entity_id, @due_date, 'unread', @rule_key, @dedupe_key, @metadata_json
      )
    `).run({
      id,
      type: input.type,
      category: input.category,
      severity: input.severity || 'info',
      title: input.title,
      message: input.message,
      branch_id: input.branch_id || null,
      entity_type: input.entity_type || null,
      entity_id: input.entity_id || null,
      due_date: input.due_date || null,
      rule_key: input.rule_key || null,
      dedupe_key: input.dedupe_key || null,
      metadata_json: input.metadata_json || '{}'
    });
    return info.changes > 0 ? { success: true, id } : { success: false };
  }

  static createOrRefresh(input: NotificationInput) {
    const db = getDatabase();
    if (!input.dedupe_key) return this.create(input);

    const existing = db.prepare('SELECT id, status FROM notifications WHERE dedupe_key = ?').get(input.dedupe_key) as { id: string; status: string } | undefined;
    if (!existing) return this.create(input);

    db.prepare(`
      UPDATE notifications
      SET severity=@severity,
          title=@title,
          message=@message,
          branch_id=@branch_id,
          entity_type=@entity_type,
          entity_id=@entity_id,
          due_date=@due_date,
          status=CASE WHEN status='dismissed' THEN 'dismissed' ELSE 'unread' END,
          read_at=NULL,
          metadata_json=@metadata_json,
          updated_at=CURRENT_TIMESTAMP
      WHERE id=@id
    `).run({
      id: existing.id,
      severity: input.severity || 'info',
      title: input.title,
      message: input.message,
      branch_id: input.branch_id || null,
      entity_type: input.entity_type || null,
      entity_id: input.entity_id || null,
      due_date: input.due_date || null,
      metadata_json: input.metadata_json || '{}'
    });

    return { success: true, id: existing.id, updated: true };
  }

  static getAll(filter: { tab?: string; includeDismissed?: boolean } = {}) {
    const db = getDatabase();
    const tab = filter.tab || 'all';
    const includeDismissed = Boolean(filter.includeDismissed || tab === 'dismissed');

    return db.prepare(`
      SELECT n.*
      FROM notifications n
      WHERE
        (@includeDismissed = 1 OR n.status != 'dismissed')
        AND (
          @tab = 'all'
          OR (@tab = 'dismissed' AND n.status = 'dismissed')
          OR (@tab = 'inventory' AND n.category = 'inventory')
          OR (@tab = 'customers' AND n.category = 'customers')
          OR (@tab = 'suppliers' AND n.category = 'suppliers')
          OR (@tab = 'system' AND n.category = 'system')
        )
      ORDER BY CASE n.severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END, n.created_at DESC
    `).all({ includeDismissed: includeDismissed ? 1 : 0, tab });
  }

  static getUnreadCount() {
    const db = getDatabase();
    const row = db.prepare("SELECT count(*) as count FROM notifications WHERE status='unread'").get() as { count: number };
    return row.count;
  }

  static markRead(id: string) {
    const db = getDatabase();
    const info = db.prepare(`
      UPDATE notifications
      SET status='read', read_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND status!='dismissed'
    `).run(id);
    return info.changes > 0;
  }

  static markAllRead() {
    const db = getDatabase();
    const info = db.prepare(`
      UPDATE notifications
      SET status='read', read_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP
      WHERE status='unread'
    `).run();
    return info.changes;
  }

  static dismiss(notificationId: string, userId?: string) {
    const db = getDatabase();
    const tx = db.transaction(() => {
      const info = db.prepare("UPDATE notifications SET status='dismissed', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(notificationId);
      if (info.changes > 0) {
        const dismissalId = `NTD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        db.prepare(`
          INSERT INTO notification_dismissals (id, notification_id, user_id)
          VALUES (?, ?, ?)
        `).run(dismissalId, notificationId, userId || null);
      }
      return info.changes > 0;
    });
    return tx();
  }
}
