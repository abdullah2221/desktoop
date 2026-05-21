import { BackupService as SafeBackupService } from './BackupService';

export class BackupService {
  static backup(): string {
    const destPath = SafeBackupService.createBackupFile();
    console.log(`[Backup Service] Database backup successfully written to: ${destPath}`);
    return destPath;
  }
}
