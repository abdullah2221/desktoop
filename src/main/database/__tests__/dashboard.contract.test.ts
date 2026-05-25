import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Dashboard Contracts', () => {
  const root = process.cwd();
  const repo = fs.readFileSync(path.resolve(root, 'src/main/database/repositories/DashboardRepository.ts'), 'utf8');
  const handlers = fs.readFileSync(path.resolve(root, 'src/main/database/ipc/dashboard.handlers.ts'), 'utf8');
  const preload = fs.readFileSync(path.resolve(root, 'src/preload/preload.ts'), 'utf8');
  const rendererTypes = fs.readFileSync(path.resolve(root, 'src/renderer/types.d.ts'), 'utf8');

  const methods = [
    'getOverview',
    'getSalesTrend',
    'getPaymentBreakdown',
    'getTopProducts',
    'getRecentActivity',
    'getShiftSummary',
    'getLowStock',
    'getReceivablesPayables',
    'getDateDetail',
    'getMetricDetail'
  ];

  it('should define all required dashboard repository methods', () => {
    for (const method of methods) {
      expect(repo.includes(`static ${method}(`)).toBe(true);
    }
  });

  it('should register all dashboard ipc handlers', () => {
    for (const method of methods) {
      expect(handlers.includes(`dashboard:${method}`)).toBe(true);
    }
  });

  it('should expose dashboard APIs in preload and renderer types', () => {
    for (const method of methods) {
      expect(preload.includes(`${method}:`)).toBe(true);
      expect(rendererTypes.includes(`${method}:`)).toBe(true);
    }
  });
});
