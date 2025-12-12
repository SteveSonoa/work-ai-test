import {
  createAuditLog,
  getAuditLogs,
  getAuditLogsWithDetails,
} from '@/lib/services/audit.service';
import { query } from '@/lib/db/connection';

jest.mock('@/lib/db/connection');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Audit Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createAuditLog', () => {
    it('creates an audit log entry', async () => {
      const mockAuditLog = {
        id: 'audit-1',
        action: 'USER_LOGIN',
        user_id: 'user-123',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockAuditLog],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await createAuditLog({
        action: 'USER_LOGIN',
        userId: 'user-123',
        details: { ip_address: '127.0.0.1' },
      });

      expect(result).toEqual(mockAuditLog);
      expect(mockQuery).toHaveBeenCalled();
    });

    it('creates audit log without optional fields', async () => {
      const mockAuditLog = {
        id: 'audit-2',
        action: 'BALANCE_CHECKED',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockAuditLog],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await createAuditLog({
        action: 'BALANCE_CHECKED',
        details: {},
      });

      expect(result).toEqual(mockAuditLog);
    });
  });

  describe('getAuditLogs', () => {
    it('returns paginated audit logs', async () => {
      const mockLogs = [
        { id: 'log-1', action: 'USER_LOGIN' },
        { id: 'log-2', action: 'TRANSFER_INITIATED' },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '100' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockQuery.mockResolvedValueOnce({
        rows: mockLogs,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAuditLogs({
        limit: 50,
        offset: 0,
      });

      expect(result.logs).toHaveLength(2);
      expect(result.total).toBe(100);
    });

    it('filters by user ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '10' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await getAuditLogs({
        userId: 'user-123',
        limit: 50,
        offset: 0,
      });

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('filters by action', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '5' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await getAuditLogs({
        action: 'USER_LOGIN',
        limit: 50,
        offset: 0,
      });

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('filters by date range', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '20' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await getAuditLogs({
        startDate: new Date('2025-12-01'),
        endDate: new Date('2025-12-11'),
        limit: 50,
        offset: 0,
      });

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });
  });

  describe('getAuditLogsWithDetails', () => {
    it('returns audit logs with user and transaction details', async () => {
      const mockLogs = [
        {
          id: 'log-1',
          action: 'USER_LOGIN',
          user: { first_name: 'John', last_name: 'Doe' },
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '1' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockQuery.mockResolvedValueOnce({
        rows: mockLogs,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAuditLogsWithDetails({
        limit: 50,
        offset: 0,
      });

      expect(result.logs).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('filters by multiple actions', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '5' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAuditLogsWithDetails({
        action: ['USER_LOGIN', 'USER_LOGOUT'],
        limit: 50,
        offset: 0,
      });

      expect(result.total).toBe(5);
    });

    it('filters by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-12-31');

      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '20' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAuditLogsWithDetails({
        startDate,
        endDate,
        limit: 50,
        offset: 0,
      });

      expect(result.total).toBe(20);
    });

    it('filters by amount range', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '15' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAuditLogsWithDetails({
        amountMin: 1000,
        amountMax: 10000,
        limit: 50,
        offset: 0,
      });

      expect(result.total).toBe(15);
    });

    it('filters by exact amount', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '3' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAuditLogsWithDetails({
        amountExact: 5000,
        limit: 50,
        offset: 0,
      });

      expect(result.total).toBe(3);
    });
  });
});
