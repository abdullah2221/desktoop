import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('SQLite runtime preparation scripts', () => {
  const projectRoot = path.resolve(__dirname, '../../../..');
  const nodeCache = path.join(projectRoot, 'database/bin/better_sqlite3_node.node');
  const electronCache = path.join(projectRoot, 'database/bin/better_sqlite3_electron.node');

  it('should keep node and electron cached binaries available', () => {
    expect(fs.existsSync(nodeCache)).toBe(true);
    expect(fs.existsSync(electronCache)).toBe(true);
  });

  it('should include runtime preparation script with both runtime modes', () => {
    const scriptPath = path.join(projectRoot, 'scripts/sqlite-runtime.cjs');
    const scriptBody = fs.readFileSync(scriptPath, 'utf8');
    expect(scriptBody).toContain('prepare-node');
    expect(scriptBody).toContain('prepare-electron');
  });
});
