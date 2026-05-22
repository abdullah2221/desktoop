import { getDatabase } from '../connection';
import { AuditLogRepository } from './AuditLogRepository';

export class EmployeeRepository {
  static getAll() {
    const db = getDatabase();
    return db.prepare(`
      SELECT e.*, br.branch_code, COALESCE(br.branch_name, br.name) as branch_name
      FROM employees e
      LEFT JOIN branches br ON br.id = e.branch_id
      ORDER BY e.status ASC, e.employee_code ASC
    `).all();
  }

  static getById(id: string) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM employees WHERE id = ?').get(id);
  }

  static create(payload: any, actorId?: string) {
    const db = getDatabase();
    const id = payload.id || `EMP-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const info = db.prepare(`
      INSERT INTO employees (
        id, tenant_id, branch_id, employee_code, name, phone, email, designation,
        hourly_rate, monthly_salary, status
      ) VALUES (
        @id, 'T001', @branch_id, @employee_code, @name, @phone, @email, @designation,
        @hourly_rate, @monthly_salary, @status
      )
    `).run({
      id,
      branch_id: payload.branch_id || null,
      employee_code: payload.employee_code,
      name: payload.name,
      phone: payload.phone || '',
      email: payload.email || '',
      designation: payload.designation || '',
      hourly_rate: Number(payload.hourly_rate || 0),
      monthly_salary: Number(payload.monthly_salary || 0),
      status: payload.status || 'active'
    });
    if (info.changes > 0) AuditLogRepository.write({ action: 'EMPLOYEE_CREATE', user_id: actorId, details: `Employee ${id} created` });
    return { success: info.changes > 0, id };
  }

  static update(payload: any, actorId?: string) {
    const db = getDatabase();
    const info = db.prepare(`
      UPDATE employees
      SET branch_id=@branch_id,
          employee_code=@employee_code,
          name=@name,
          phone=@phone,
          email=@email,
          designation=@designation,
          hourly_rate=@hourly_rate,
          monthly_salary=@monthly_salary,
          status=@status,
          updated_at=CURRENT_TIMESTAMP
      WHERE id=@id
    `).run({
      id: payload.id,
      branch_id: payload.branch_id || null,
      employee_code: payload.employee_code,
      name: payload.name,
      phone: payload.phone || '',
      email: payload.email || '',
      designation: payload.designation || '',
      hourly_rate: Number(payload.hourly_rate || 0),
      monthly_salary: Number(payload.monthly_salary || 0),
      status: payload.status || 'active'
    });
    if (info.changes > 0) AuditLogRepository.write({ action: 'EMPLOYEE_UPDATE', user_id: actorId, details: `Employee ${payload.id} updated` });
    return info.changes > 0;
  }

  static deactivate(id: string, actorId?: string) {
    const db = getDatabase();
    const info = db.prepare("UPDATE employees SET status='inactive', updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
    if (info.changes > 0) AuditLogRepository.write({ action: 'EMPLOYEE_DEACTIVATE', user_id: actorId, details: `Employee ${id} deactivated` });
    return info.changes > 0;
  }
}
