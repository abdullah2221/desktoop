# Backup & Restore Guide

This guide explains the Enterprise ERP backup and restore system.

## Backup Architecture

The backup system creates binary-level copies of the SQLite database file using WAL checkpoint + file copy strategy. This ensures:
- Zero data loss (WAL is flushed before copy)
- Point-in-time snapshots
- Portable backup files (single `.db` file)

## Backup Paths

| Environment | Backup Directory |
|---|---|
| **Development** | `<project>/database/backups/` |
| **Production (macOS)** | `~/Library/Application Support/pos-inventory-erp/backups/` |
| **Production (Windows)** | `%APPDATA%\pos-inventory-erp\backups\` |
| **Production (Linux)** | `~/.config/pos-inventory-erp/backups/` |

## Creating a Manual Backup

### Via UI (Recommended)
1. Navigate to **Backup & Restore** in the sidebar
2. Click **Create Backup Now**
3. A timestamped `.db` file will be created in the backups directory

### Via System Health Page
1. Navigate to **System Health** in the sidebar
2. Click the **Backup Status** tab
3. Click **Run Backup Now**

## Backup File Naming

```
erp.backup.2025-01-15T10-30-45-123Z.4872.db
            └─── ISO timestamp ───┘  └──┘
                                      random 4-digit suffix
```

## Automatic Pre-Migration Backups

The system automatically creates a backup before running database migrations if the `backup_before_migrations` setting is enabled:

```sql
-- Check setting
SELECT value FROM backup_settings WHERE key = 'backup_before_migrations';
-- Values: 'true' | 'false'
```

## Restoring from Backup

### Via UI
1. Navigate to **Backup & Restore**
2. Select a backup file from the list
3. Click **Restore**
4. The application will:
   - Validate the backup file integrity
   - Create a safety pre-restore backup
   - Copy the backup over the live database
   - Prompt for restart

> ⚠️ **Always restart the application after a restore.**

### Validation Before Restore

Every backup is validated before restore:
- SQLite `PRAGMA integrity_check` must return `ok`
- Foreign key check must pass
- Core tables (products, customers, users, roles, settings) must exist

## Emergency Recovery

If the application fails to start due to database corruption:

1. Locate the userData directory for your OS (see paths above)
2. Copy a known-good backup `.db` file
3. Rename it to `erp.db`
4. Place it in the `db/` subdirectory
5. Remove any `-wal` or `-shm` sidecar files
6. Launch the application

## Retention Policy

Configure backup retention in **Backup & Restore → Settings**:
- Default: Keep last 30 backups
- Older backups are automatically purged

## Backup Integrity Verification

You can verify any backup file without restoring it:
1. Go to **Backup & Restore**
2. Select a backup from the list
3. Click **Validate**
4. View integrity check results
