import { getDatabase } from '../connection';
import { BackupRepository } from './BackupRepository';
import { NotificationRepository } from './NotificationRepository';
import { NotificationRuleRepository } from './NotificationRuleRepository';

function asDateOnly(value?: string | null) {
  if (!value) return null;
  return String(value).split('T')[0] || null;
}

function dateDiffDays(from: string, to: string) {
  return Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86400000);
}

export class NotificationService {
  static scanAndGenerate(runDate?: string) {
    const db = getDatabase();
    const today = asDateOnly(runDate || new Date().toISOString()) as string;
    const rules = NotificationRuleRepository.getRules();

    let generated = 0;

    if (rules.scan_low_stock_enabled !== 'false') generated += this.scanLowStock(today);
    if (rules.scan_expiry_enabled !== 'false') generated += this.scanExpiry(today, Number(rules.near_expiry_days || 30));
    if (rules.scan_customer_due_enabled !== 'false') generated += this.scanCustomerDues(today, Number(rules.customer_due_grace_days || 0));
    if (rules.scan_supplier_due_enabled !== 'false') generated += this.scanSupplierPayables(today, Number(rules.supplier_due_grace_days || 0));
    if (rules.scan_system_enabled !== 'false') generated += this.scanSystemAlerts(today);

    db.prepare(`
      INSERT INTO automation_rules (key, value, updated_at)
      VALUES ('last_notification_scan_at', ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
    `).run(new Date().toISOString());

    return { success: true, generated };
  }

  static createSystemAlert(payload: { type: string; severity?: 'info' | 'warning' | 'critical'; title: string; message: string; dedupeKey?: string; metadata?: Record<string, unknown> }) {
    return NotificationRepository.createOrRefresh({
      type: payload.type,
      category: 'system',
      severity: payload.severity || 'warning',
      title: payload.title,
      message: payload.message,
      rule_key: 'system.manual',
      dedupe_key: payload.dedupeKey || `${payload.type}:${asDateOnly(new Date().toISOString())}`,
      metadata_json: JSON.stringify(payload.metadata || {})
    });
  }

  private static scanLowStock(today: string) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT bi.branch_id, b.branch_code, COALESCE(b.branch_name, b.name) as branch_name,
             bi.product_id, p.name as product_name, p.sku, bi.quantity_on_hand, bi.reorder_level,
             s.id as supplier_id, s.name as supplier_name
      FROM branch_inventory bi
      JOIN products p ON p.id = bi.product_id
      LEFT JOIN branches b ON b.id = bi.branch_id
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.status='active' AND bi.reorder_level > 0 AND bi.quantity_on_hand <= bi.reorder_level
    `).all() as Array<any>;

    let count = 0;
    for (const row of rows) {
      const shortage = Number(row.reorder_level || 0) - Number(row.quantity_on_hand || 0);
      const severity = shortage >= Number(row.reorder_level || 0) ? 'critical' : 'warning';
      const supplierText = row.supplier_name ? ` Suggested supplier: ${row.supplier_name}.` : '';
      const result = NotificationRepository.createOrRefresh({
        type: 'inventory.low_stock',
        category: 'inventory',
        severity,
        title: `Low stock: ${row.product_name}`,
        message: `${row.product_name} (${row.sku || row.product_id}) at ${row.branch_code || row.branch_id} is ${row.quantity_on_hand} vs reorder ${row.reorder_level}.${supplierText}`,
        branch_id: row.branch_id,
        entity_type: 'product',
        entity_id: row.product_id,
        due_date: today,
        rule_key: 'low_stock',
        dedupe_key: `low_stock:${row.branch_id}:${row.product_id}`,
        metadata_json: JSON.stringify({
          reorder_shortage: shortage,
          supplier_id: row.supplier_id || null,
          branch_name: row.branch_name || null
        })
      });
      if ((result as any).success) count += 1;
    }
    return count;
  }

  private static scanExpiry(today: string, nearDays: number) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, name, sku, expiry_date, batch_number, branch_id
      FROM products
      WHERE status='active' AND expiry_date IS NOT NULL AND TRIM(expiry_date) != ''
    `).all() as Array<any>;

    let count = 0;
    for (const row of rows) {
      const expiry = asDateOnly(row.expiry_date);
      if (!expiry) continue;
      const days = dateDiffDays(today, expiry);
      let type = '';
      let severity: 'warning' | 'critical' = 'warning';
      let title = '';

      if (days < 0) {
        type = 'inventory.expired';
        severity = 'critical';
        title = `Expired product: ${row.name}`;
      } else if (days <= nearDays) {
        type = 'inventory.near_expiry';
        severity = days <= 7 ? 'critical' : 'warning';
        title = `Near expiry: ${row.name}`;
      } else {
        continue;
      }

      const result = NotificationRepository.createOrRefresh({
        type,
        category: 'inventory',
        severity,
        title,
        message: `${row.name} (${row.sku || row.id}) expires on ${expiry}${row.batch_number ? ` (Batch ${row.batch_number})` : ''}.`,
        branch_id: row.branch_id || null,
        entity_type: 'product',
        entity_id: row.id,
        due_date: expiry,
        rule_key: 'expiry_scan',
        dedupe_key: `${type}:${row.id}:${expiry}`,
        metadata_json: JSON.stringify({ batch_number: row.batch_number || null, days_to_expiry: days })
      });
      if ((result as any).success) count += 1;
    }
    return count;
  }

  private static scanCustomerDues(today: string, graceDays: number) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, customer_name, due_date, balance_due
      FROM invoices
      WHERE status IN ('Unpaid', 'Partially Paid') AND balance_due > 0
    `).all() as Array<any>;

    let count = 0;
    for (const row of rows) {
      const dueDate = asDateOnly(row.due_date) || today;
      const overdueDays = dateDiffDays(dueDate, today);
      if (overdueDays < graceDays) continue;

      const bucket = overdueDays <= 30 ? '0-30' : overdueDays <= 60 ? '31-60' : overdueDays <= 90 ? '61-90' : '90+';
      const result = NotificationRepository.createOrRefresh({
        type: 'customers.due_overdue',
        category: 'customers',
        severity: overdueDays > 30 ? 'critical' : 'warning',
        title: `Customer due: ${row.customer_name}`,
        message: `${row.customer_name} has overdue receivable ${Number(row.balance_due || 0).toFixed(2)} (age ${overdueDays} days, bucket ${bucket}).`,
        entity_type: 'invoice',
        entity_id: row.id,
        due_date: dueDate,
        rule_key: 'customer_due',
        dedupe_key: `customer_due:${row.id}:${today}`,
        metadata_json: JSON.stringify({ overdue_days: overdueDays, aging_bucket: bucket, balance_due: row.balance_due })
      });
      if ((result as any).success) count += 1;
    }

    const khataRows = db.prepare('SELECT name, credit FROM customers WHERE credit > 0').all() as Array<{ name: string; credit: number }>;
    for (const row of khataRows) {
      const result = NotificationRepository.createOrRefresh({
        type: 'customers.balance_reminder',
        category: 'customers',
        severity: Number(row.credit) > 50000 ? 'critical' : 'warning',
        title: `Customer balance reminder: ${row.name}`,
        message: `${row.name} has outstanding credit balance ${Number(row.credit).toFixed(2)}.`,
        entity_type: 'customer',
        entity_id: row.name,
        due_date: today,
        rule_key: 'customer_balance',
        dedupe_key: `customer_balance:${row.name}:${today}`,
        metadata_json: JSON.stringify({ credit: row.credit })
      });
      if ((result as any).success) count += 1;
    }

    return count;
  }

  private static scanSupplierPayables(today: string, graceDays: number) {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT p.id, p.date, p.remaining_payable, s.id as supplier_id, s.name as supplier_name
      FROM purchases p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE p.remaining_payable > 0
    `).all() as Array<any>;

    let count = 0;
    for (const row of rows) {
      const dueDate = asDateOnly(row.date) || today;
      const overdueDays = dateDiffDays(dueDate, today);
      if (overdueDays < graceDays) continue;
      const result = NotificationRepository.createOrRefresh({
        type: 'suppliers.payable_overdue',
        category: 'suppliers',
        severity: overdueDays > 30 ? 'critical' : 'warning',
        title: `Supplier payable due: ${row.supplier_name || 'Unknown Supplier'}`,
        message: `${row.supplier_name || 'Supplier'} has pending payable ${Number(row.remaining_payable || 0).toFixed(2)} (overdue ${overdueDays} days).`,
        entity_type: 'purchase',
        entity_id: row.id,
        due_date: dueDate,
        rule_key: 'supplier_payable',
        dedupe_key: `supplier_payable:${row.id}:${today}`,
        metadata_json: JSON.stringify({ supplier_id: row.supplier_id || null, overdue_days: overdueDays })
      });
      if ((result as any).success) count += 1;
    }
    return count;
  }

  private static scanSystemAlerts(today: string) {
    const db = getDatabase();
    let count = 0;

    const integrity = BackupRepository.integrityCheck();
    if (!integrity.ok) {
      const result = NotificationRepository.createOrRefresh({
        type: 'system.integrity_failure',
        category: 'system',
        severity: 'critical',
        title: 'Database integrity warning',
        message: `Integrity check status is ${integrity.integrity}. Foreign key issues: ${integrity.foreignKeyIssues}.`,
        due_date: today,
        rule_key: 'integrity_check',
        dedupe_key: `system_integrity:${today}`,
        metadata_json: JSON.stringify(integrity)
      });
      if ((result as any).success) count += 1;
    }

    const backupFailed = db.prepare("SELECT * FROM backup_history WHERE status='failed' ORDER BY created_at DESC LIMIT 1").get() as any;
    if (backupFailed) {
      const result = NotificationRepository.createOrRefresh({
        type: 'system.backup_failed',
        category: 'system',
        severity: 'critical',
        title: 'Backup failure detected',
        message: `Backup ${backupFailed.file_name || backupFailed.id} failed. ${backupFailed.notes || ''}`.trim(),
        due_date: today,
        rule_key: 'backup_monitor',
        dedupe_key: `backup_failed:${backupFailed.id}`,
        metadata_json: JSON.stringify(backupFailed)
      });
      if ((result as any).success) count += 1;
    }

    const automationFailure = db.prepare("SELECT * FROM recurring_runs WHERE status='failed' ORDER BY created_at DESC LIMIT 1").get() as any;
    if (automationFailure) {
      const result = NotificationRepository.createOrRefresh({
        type: 'system.automation_failed',
        category: 'system',
        severity: 'warning',
        title: 'Automation failure detected',
        message: `Recurring automation failed on ${automationFailure.run_date}. ${automationFailure.error_message || ''}`.trim(),
        due_date: today,
        rule_key: 'automation_monitor',
        dedupe_key: `automation_failed:${automationFailure.id}`,
        metadata_json: JSON.stringify(automationFailure)
      });
      if ((result as any).success) count += 1;
    }

    return count;
  }
}
