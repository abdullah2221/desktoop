import crypto from 'crypto';

export class BackupIntegrityService {
  static sha256(buffer: Buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  static verifySha256(buffer: Buffer, expected: string) {
    return this.sha256(buffer) === expected;
  }
}
