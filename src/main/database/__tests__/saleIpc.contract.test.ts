import { describe, it, expect, vi, beforeEach } from 'vitest';

const handleMock = vi.fn();

vi.mock('electron', () => ({
  ipcMain: {
    handle: handleMock
  }
}));

const authHasPermission = vi.fn(() => true);
const authGetCurrentUser = vi.fn(() => ({ id: 'U001', username: 'admin', full_name: 'Admin' }));
const authRequirePermission = vi.fn();
const authRequireBranchAccess = vi.fn();

vi.mock('../repositories/AuthRepository', () => ({
  AuthRepository: {
    hasPermission: authHasPermission,
    getCurrentUser: authGetCurrentUser,
    requirePermission: authRequirePermission,
    requireBranchAccess: authRequireBranchAccess
  }
}));

const getReceiptDetailMock = vi.fn((invoiceNo: string) => ({
  sale: { invoiceNo },
  items: [{ id: 'SI1' }],
  summary: { total: 100 }
}));

vi.mock('../repositories/SaleRepository', () => ({
  SaleRepository: {
    getHistory: vi.fn(() => []),
    getByCashier: vi.fn(() => []),
    getById: vi.fn(() => ({ invoiceNo: 'INV-1', branch_id: 'B001', cashier_id: 'U001' })),
    getItems: vi.fn(() => []),
    getByCustomer: vi.fn(() => []),
    getByShift: vi.fn(() => []),
    getByBranch: vi.fn(() => []),
    getReceiptDetail: getReceiptDetailMock,
    getAuditTrail: vi.fn(() => []),
    voidSale: vi.fn(() => ({ success: true })),
    create: vi.fn(() => true)
  }
}));

describe('Sale IPC Contract', () => {
  beforeEach(() => {
    handleMock.mockClear();
    getReceiptDetailMock.mockClear();
    authHasPermission.mockImplementation(() => true);
  });

  it('registers sales:getReceiptDetail, sales:void, and sales:getAuditTrail handlers', async () => {
    const { registerSaleHandlers } = await import('../ipc/sale.handlers');
    registerSaleHandlers();

    const channels = handleMock.mock.calls.map((c) => c[0]);
    expect(channels).toContain('sales:getReceiptDetail');
    expect(channels).toContain('sales:void');
    expect(channels).toContain('sales:getAuditTrail');
  });

  it('sales:getReceiptDetail handler calls SaleRepository.getReceiptDetail and returns sale+items metadata', async () => {
    const { registerSaleHandlers } = await import('../ipc/sale.handlers');
    registerSaleHandlers();

    const entry = handleMock.mock.calls.find((call) => call[0] === 'sales:getReceiptDetail');
    expect(entry).toBeDefined();
    const handler = entry?.[1] as (_evt: unknown, token: string, invoiceNo: string) => any;

    const result = handler({}, 'token-1', 'INV-123');
    expect(getReceiptDetailMock).toHaveBeenCalledWith('INV-123');
    expect(result?.sale?.invoiceNo).toBe('INV-123');
    expect(Array.isArray(result?.items)).toBe(true);
    expect(result?.summary).toBeDefined();
  });
});
