"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRepository = void 0;
const crypto_1 = __importDefault(require("crypto"));
const connection_1 = require("../connection");
const AuditLogRepository_1 = require("./AuditLogRepository");
const BranchRepository_1 = require("./BranchRepository");
const SESSION_DAYS = 7;
const HASH_ITERATIONS = 120000;
class AuthRepository {
    static hashPassword(password, salt = crypto_1.default.randomBytes(16).toString('hex')) {
        const hash = crypto_1.default.pbkdf2Sync(password, salt, HASH_ITERATIONS, 32, 'sha256').toString('hex');
        return `pbkdf2$${HASH_ITERATIONS}$${salt}$${hash}`;
    }
    static verifyPassword(password, storedHash) {
        if (!storedHash)
            return false;
        const [scheme, iterationsRaw, salt, expected] = storedHash.split('$');
        if (scheme !== 'pbkdf2' || !iterationsRaw || !salt || !expected)
            return false;
        const actual = crypto_1.default.pbkdf2Sync(password, salt, Number(iterationsRaw), 32, 'sha256');
        const expectedBuffer = Buffer.from(expected, 'hex');
        return expectedBuffer.length === actual.length && crypto_1.default.timingSafeEqual(actual, expectedBuffer);
    }
    static hashToken(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    }
    static publicUser(row) {
        return {
            id: row.id,
            username: row.username,
            full_name: row.full_name || row.username,
            email: row.email || '',
            role_id: row.role_id,
            role_name: row.role_name,
            status: row.status,
            last_login: row.last_login,
            branch_id: row.branch_id,
            branches: BranchRepository_1.BranchRepository.getAccessibleForUser(row.id),
            permissions: row.permissions ? String(row.permissions).split(',').filter(Boolean) : []
        };
    }
    static login(username, password) {
        const db = (0, connection_1.getDatabase)();
        const row = db.prepare(`
      SELECT u.*, r.name as role_name,
             GROUP_CONCAT(p.name) as permissions
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE u.username = ?
      GROUP BY u.id
    `).get(username);
        if (!row || row.status !== 'active' || !this.verifyPassword(password, row.password_hash)) {
            AuditLogRepository_1.AuditLogRepository.write({ action: 'AUTH_LOGIN_FAILED', details: `Failed login for ${username}` });
            throw new Error('Invalid username or password.');
        }
        const token = crypto_1.default.randomBytes(32).toString('hex');
        const sessionId = `SES-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000).toISOString();
        db.prepare(`
      INSERT INTO user_sessions (id, user_id, token_hash, expires_at, last_seen_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    `).run(sessionId, row.id, this.hashToken(token), expiresAt);
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(row.id);
        AuditLogRepository_1.AuditLogRepository.write({ action: 'AUTH_LOGIN', user_id: row.id, details: `User ${row.username} logged in` });
        return { token, expires_at: expiresAt, user: this.getCurrentUser(token) };
    }
    static logout(token) {
        const db = (0, connection_1.getDatabase)();
        const session = this.getSession(token);
        if (!session)
            return false;
        const info = db.prepare('UPDATE user_sessions SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ? AND revoked_at IS NULL').run(this.hashToken(token));
        AuditLogRepository_1.AuditLogRepository.write({ action: 'AUTH_LOGOUT', user_id: session.user_id, details: 'User logged out' });
        return info.changes > 0;
    }
    static getSession(token) {
        if (!token)
            return null;
        const db = (0, connection_1.getDatabase)();
        return db.prepare(`
      SELECT * FROM user_sessions
      WHERE token_hash = ?
        AND revoked_at IS NULL
        AND datetime(expires_at) > datetime('now')
    `).get(this.hashToken(token));
    }
    static getCurrentUser(token) {
        const session = this.getSession(token);
        if (!session)
            return null;
        const db = (0, connection_1.getDatabase)();
        db.prepare('UPDATE user_sessions SET last_seen_at = CURRENT_TIMESTAMP WHERE token_hash = ?').run(this.hashToken(token));
        const row = db.prepare(`
      SELECT u.*, r.name as role_name,
             GROUP_CONCAT(p.name) as permissions
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = ? AND u.status = 'active'
      GROUP BY u.id
    `).get(session.user_id);
        return row ? this.publicUser(row) : null;
    }
    static hasPermission(token, permission) {
        const user = this.getCurrentUser(token);
        return Boolean(user?.permissions.includes(permission) || user?.permissions.includes('ENTERPRISE_FULL'));
    }
    static requirePermission(token, permission) {
        if (!this.hasPermission(token, permission)) {
            throw new Error(`Unauthorized: ${permission} permission is required.`);
        }
    }
    static requireBranchAccess(token, branchId) {
        const user = this.getCurrentUser(token);
        if (!user || !BranchRepository_1.BranchRepository.userCanAccessBranch(user.id, branchId)) {
            throw new Error('Unauthorized: user is not assigned to this branch.');
        }
        return user;
    }
}
exports.AuthRepository = AuthRepository;
