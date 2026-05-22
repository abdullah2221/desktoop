import { getDatabase } from '../connection';

export interface ImportJob {
  id: string;
  tenant_id: string;
  branch_id: string;
  entity_type: string;
  file_name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  total_rows: number;
  processed_rows: number;
  failed_rows: number;
  created_by?: string;
  created_at?: string;
  completed_at?: string;
}

export interface ExportJob {
  id: string;
  tenant_id: string;
  branch_id: string;
  entity_type: string;
  format: 'csv' | 'xlsx';
  file_path?: string;
  status: 'pending' | 'completed' | 'failed';
  created_by?: string;
  created_at?: string;
  completed_at?: string;
}

export interface ImportJobError {
  id: string;
  job_id: string;
  row_number: number;
  error_message: string;
  row_data?: string;
}

export class ImportExportRepository {
  static createImportJob(job: Partial<ImportJob>) {
    const db = getDatabase();
    const id = job.id || `IMP-${Math.floor(100000 + Math.random() * 900000)}`;
    const stmt = db.prepare(`
      INSERT INTO import_jobs (
        id, tenant_id, branch_id, entity_type, file_name, status, 
        total_rows, processed_rows, failed_rows, created_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);
    stmt.run(
      id,
      job.tenant_id || 'T001',
      job.branch_id || 'B001',
      job.entity_type,
      job.file_name || '',
      job.status || 'pending',
      job.total_rows || 0,
      job.processed_rows || 0,
      job.failed_rows || 0,
      job.created_by || 'system'
    );
    return id;
  }

  static updateImportJob(id: string, updates: Partial<ImportJob>) {
    const db = getDatabase();
    const fields = [];
    const values = [];
    
    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.total_rows !== undefined) {
      fields.push('total_rows = ?');
      values.push(updates.total_rows);
    }
    if (updates.processed_rows !== undefined) {
      fields.push('processed_rows = ?');
      values.push(updates.processed_rows);
    }
    if (updates.failed_rows !== undefined) {
      fields.push('failed_rows = ?');
      values.push(updates.failed_rows);
    }
    if (updates.status === 'completed' || updates.status === 'failed') {
      fields.push('completed_at = CURRENT_TIMESTAMP');
    }

    if (fields.length === 0) return false;

    values.push(id);
    const stmt = db.prepare(`
      UPDATE import_jobs 
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    const info = stmt.run(...values);
    return info.changes > 0;
  }

  static createImportJobError(err: Omit<ImportJobError, 'id'>) {
    const db = getDatabase();
    const id = `ERR-${Math.floor(100000 + Math.random() * 900000)}`;
    const stmt = db.prepare(`
      INSERT INTO import_job_errors (id, job_id, row_number, error_message, row_data)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, err.job_id, err.row_number, err.error_message, err.row_data || '');
    return id;
  }

  static createImportJobErrors(errors: Omit<ImportJobError, 'id'>[]) {
    const db = getDatabase();
    const stmt = db.prepare(`
      INSERT INTO import_job_errors (id, job_id, row_number, error_message, row_data)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertTransaction = db.transaction((errs: Omit<ImportJobError, 'id'>[]) => {
      for (const err of errs) {
        const id = `ERR-${Math.floor(100000 + Math.random() * 900000)}`;
        stmt.run(id, err.job_id, err.row_number, err.error_message, err.row_data || '');
      }
    });
    insertTransaction(errors);
  }

  static createExportJob(job: Partial<ExportJob>) {
    const db = getDatabase();
    const id = job.id || `EXP-${Math.floor(100000 + Math.random() * 900000)}`;
    const stmt = db.prepare(`
      INSERT INTO export_jobs (
        id, tenant_id, branch_id, entity_type, format, file_path, status, created_by
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?
      )
    `);
    stmt.run(
      id,
      job.tenant_id || 'T001',
      job.branch_id || 'B001',
      job.entity_type,
      job.format,
      job.file_path || '',
      job.status || 'pending',
      job.created_by || 'system'
    );
    return id;
  }

  static updateExportJob(id: string, updates: Partial<ExportJob>) {
    const db = getDatabase();
    const fields = [];
    const values = [];

    if (updates.status) {
      fields.push('status = ?');
      values.push(updates.status);
    }
    if (updates.file_path) {
      fields.push('file_path = ?');
      values.push(updates.file_path);
    }
    if (updates.status === 'completed' || updates.status === 'failed') {
      fields.push('completed_at = CURRENT_TIMESTAMP');
    }

    if (fields.length === 0) return false;

    values.push(id);
    const stmt = db.prepare(`
      UPDATE export_jobs 
      SET ${fields.join(', ')}
      WHERE id = ?
    `);
    const info = stmt.run(...values);
    return info.changes > 0;
  }

  static getImportJobs() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM import_jobs ORDER BY created_at DESC LIMIT 50').all();
  }

  static getExportJobs() {
    const db = getDatabase();
    return db.prepare('SELECT * FROM export_jobs ORDER BY created_at DESC LIMIT 50').all();
  }

  static getJobErrors(jobId: string) {
    const db = getDatabase();
    return db.prepare('SELECT * FROM import_job_errors WHERE job_id = ? ORDER BY row_number ASC').all(jobId) as ImportJobError[];
  }
}
