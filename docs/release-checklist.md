# Release Checklist

Use this checklist before every production release.

## Pre-Release

### Code Quality
- [ ] `npm run build` passes with zero TypeScript errors
- [ ] `npm test` passes all 22/22 integration tests
- [ ] No `console.error` or `console.warn` output in test run
- [ ] All new features have corresponding tests

### Database
- [ ] All schema migrations are in `migrations.ts` and idempotent
- [ ] No raw SQL in handlers — all queries go through Repository layer
- [ ] Foreign key constraints are enforced (`PRAGMA foreign_keys = ON`)
- [ ] WAL mode is active (`PRAGMA journal_mode = WAL`)
- [ ] Integrity check passes (`PRAGMA integrity_check` returns `ok`)

### Security
- [ ] No hardcoded credentials in source code
- [ ] Session tokens are in-memory only (never written to disk)
- [ ] All IPC handlers validate inputs before DB operations
- [ ] `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` in BrowserWindow
- [ ] No sensitive data logged at INFO level

### System Health
- [ ] System Health page loads without errors
- [ ] App Info tab shows correct version and environment
- [ ] Database State tab shows WAL mode and integrity OK
- [ ] Backup Status tab shows correct paths
- [ ] Diagnostics tab shows all green checkmarks

## Build & Package

- [ ] `npm run clean` to remove stale artifacts
- [ ] `npm run build` to compile renderer + main
- [ ] Native binary confirmed: `database/bin/better_sqlite3_electron.node` exists
- [ ] `npm run build:mac` or `npm run build:win` or `npm run build:linux`
- [ ] Installer file exists in `dist-releases/`
- [ ] Installer tested on a clean machine / VM

## Post-Install Verification

- [ ] Application launches without errors on target OS
- [ ] `userData` directories created: `db/`, `backups/`, `logs/`
- [ ] Database initializes and migrations run on first launch
- [ ] Default admin user login works (admin / admin123)
- [ ] Store settings are configurable
- [ ] Backup can be created from Backup & Restore module
- [ ] System Health page shows production environment mode

## Version Bump

- [ ] Update `version` in `package.json`
- [ ] Update CHANGELOG or release notes
- [ ] Tag git commit: `git tag v1.x.x`
- [ ] Push tag: `git push origin v1.x.x`
