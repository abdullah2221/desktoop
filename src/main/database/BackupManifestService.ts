export interface BackupManifest {
  backup_version: string;
  app_version: string;
  created_at: string;
  created_by?: string;
  store_name?: string;
  backup_type: 'full' | 'data_only' | 'settings' | 'master_data' | 'accounting';
  encrypted: boolean;
  database_size: number;
  checksum_sha256: string;
  integrity_status: string;
  tables_count: number;
  notes?: string;
}

export class BackupManifestService {
  static create(input: Omit<BackupManifest, 'backup_version' | 'created_at'>): BackupManifest {
    return {
      backup_version: '24.11',
      created_at: new Date().toISOString(),
      ...input
    };
  }
}
