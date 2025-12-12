import {
  getDashboardStats,
  getRecentTransactions,
  getTransactionsByStatus,
  getDailyTransactionVolume,
  getVolumeTrends,
  getStatusBreakdown,
} from '@/lib/services/dashboard.service';
import { query } from '@/lib/db/connection';

jest.mock('@/lib/db/connection');

const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Dashboard Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    it('returns dashboard statistics', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '100' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '10' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ total: '50000' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ count: '50' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const result = await getDashboardStats();
      
      expect(result.total_transactions).toBe(100);
      expect(result.pending_approvals).toBe(5);
      expect(result.completed_today).toBe(10);
      expect(result.total_volume_today).toBe(50000);
      expect(result.failed_transactions).toBe(2);
      expect(result.active_accounts).toBe(50);
    });
  });

  describe('getRecentTransactions', () => {
    it('returns recent transactions', async () => {
      const mockTransactions = [
        { id: 'tx-1', amount: 100 },
        { id: 'tx-2', amount: 200 },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockTransactions,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getRecentTransactions(10);
      expect(result).toHaveLength(2);
    });
  });

  describe('getTransactionsByStatus', () => {
    it('returns transaction counts by status', async () => {
      const mockStatusData = [
        { status: 'COMPLETED', count: '50', total_amount: '500000' },
        { status: 'PENDING', count: '10', total_amount: '100000' },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockStatusData,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getTransactionsByStatus();
      expect(result).toHaveLength(2);
      expect(result[0].status).toBe('COMPLETED');
    });
  });

  describe('getDailyTransactionVolume', () => {
    it('returns daily transaction volume', async () => {
      const mockVolumeData = [
        { date: '2025-12-11', count: '10', total_volume: '50000' },
        { date: '2025-12-10', count: '8', total_volume: '40000' },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockVolumeData,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getDailyTransactionVolume(7);
      expect(result).toHaveLength(2);
    });
  });

  describe('getVolumeTrends', () => {
    it('returns volume trends for specified days', async () => {
      const mockTrends = [
        { date: '2025-12-11', volume: '50000' },
        { date: '2025-12-10', volume: '40000' },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockTrends,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getVolumeTrends(7);
      expect(result).toHaveLength(2);
      expect(result[0].volume).toBe(50000);
    });
  });

  describe('getStatusBreakdown', () => {
    it('returns status breakdown for specified days', async () => {
      const mockBreakdown = [
        { status: 'Success', count: '100' },
        { status: 'In Progress', count: '20' },
        { status: 'Failed', count: '5' },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockBreakdown,
        rowCount: 3,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getStatusBreakdown(30);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('Success');
      expect(result[0].value).toBe(100);
    });
  });
});
