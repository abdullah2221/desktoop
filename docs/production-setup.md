# Production Setup Guide

This guide covers setting up the Enterprise ERP application for production deployment.

## System Requirements

| Component | Minimum | Recommended |
|---|---|---|
| OS | Windows 10 / macOS 10.15 / Ubuntu 20.04 | Windows 11 / macOS 13+ / Ubuntu 22.04 |
| RAM | 4 GB | 8 GB |
| Disk | 500 MB free | 2 GB free |
| Node.js (build only) | v20.x | v20.x LTS |

## Platform-Specific Data Paths

The application stores all runtime data in the platform user data directory:

| OS | userData Base Path |
|---|---|
| **macOS** | `~/Library/Application Support/pos-inventory-erp/` |
| **Windows** | `%APPDATA%\pos-inventory-erp\` |
| **Linux** | `~/.config/pos-inventory-erp/` |

Within that base:

```
<userData>/
  db/
    erp.db         ← Main SQLite database (production)
  backups/
    erp.backup.*.db ← Rotating timestamped backups
  logs/
    app.log        ← Rotating production log (max 5 MB per file)
```

> **Development** uses the project-local `database/` folder instead of userData.

## First-Time Setup

1. Install the application using the platform installer (`.exe`, `.dmg`, or `.AppImage`)
2. Launch the application — directories are auto-created on first run
3. Log in with default credentials:
   - Username: `admin`
   - Password: `admin123`
4. **Change the admin password immediately** in Users & Roles settings
5. Configure your store settings (name, currency, tax rates)

## Environment Modes

The application detects its execution mode automatically:

| Mode | Detection | Behavior |
|---|---|---|
| `development` | `app.isPackaged === false` | Dev DB path, hot reload, devtools open |
| `staging` | `ERP_ENV=staging` env var | Production paths, mock updater |
| `production` | Packaged + no ERP_ENV | Full production paths, auto-backup |

## Security Hardening

- All IPC channels use `contextBridge` with `contextIsolation: true`
- `nodeIntegration: false` and `sandbox: true` in renderer
- Session tokens are stored in-memory only (never disk)
- Database uses WAL mode + foreign key constraints enforced
- Uncaught exceptions and unhandled rejections are logged and show error dialogs

## Backup Configuration

Configure automatic backups in the Backup & Restore module:
- **Schedule**: Daily/Weekly triggers via automation rules
- **Retention**: Configure how many backups to keep
- **Pre-migration**: Auto-backup before schema migrations (enabled by default)
