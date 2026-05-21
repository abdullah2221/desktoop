"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupService = void 0;
const BackupService_1 = require("./BackupService");
class BackupService {
    static backup() {
        const destPath = BackupService_1.BackupService.createBackupFile();
        console.log(`[Backup Service] Database backup successfully written to: ${destPath}`);
        return destPath;
    }
}
exports.BackupService = BackupService;
