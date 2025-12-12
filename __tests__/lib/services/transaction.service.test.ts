import { getTransactionById, getTransactionAuditLogs } from '@/lib/services/transaction.service';
import { query } from '@/lib/db/connection';

jest.mock('@/lib/db/connection');
const mockQuery = query as jest.MockedFunction<typeof query>;

describe('Transaction Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTransactionById', () => {
    it('returns transaction with all details when found', async () => {
      const mockTransaction = {
        id: '1',
        from_account_id: 'acc1',
        to_account_id: 'acc2',
        amount: '1000.00',
        status: 'COMPLETED',
        requires_approval: false,
        from_account_number: '1234',
        from_account_name: 'Source Account',
        to_account_number: '5678',
        to_account_name: 'Dest Account',
        initiated_by_email: 'user@test.com',
        initiated_by_first_name: 'John',
        initiated_by_last_name: 'Doe',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockTransaction],
        rowCount: 1,
      } as unknown as Awaited<ReturnType<typeof query>>);

      const result = await getTransactionById('1');
      expect(result).toEqual(mockTransaction);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['1']
      );
    });

    it('returns transaction with approval details when requires_approval is true', async () => {
      const mockTransaction = {
        id: '1',
        requires_approval: true,
        status: 'AWAITING_APPROVAL',
      };

      const mockApproval = {
        id: '1',
        transaction_id: '1',
        status: 'PENDING',
        approved_by: null,
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [mockTransaction], rowCount: 1 } as unknown as Awaited<ReturnType<typeof query>>)
        .mockResolvedValueOnce({ rows: [mockApproval], rowCount: 1 } as unknown as Awaited<ReturnType<typeof query>>);

      const result = await getTransactionById('1');
      expect(result?.approval).toEqual(mockApproval);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('returns null when transaction not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as unknown as Awaited<ReturnType<typeof query>>);

      const result = await getTransactionById('999');
      expect(result).toBeNull();
    });
  });

  describe('getTransactionAuditLogs', () => {
    it('returns audit logs for a transaction', async () => {
      const mockLogs = [
        {
          id: '1',
          transaction_id: 'txn1',
          action: 'TRANSACTION_CREATED',
          user_email: 'user@test.com',
          user_first_name: 'John',
          user_last_name: 'Doe',
          created_at: new Date(),
        },
        {
          id: '2',
          transaction_id: 'txn1',
          action: 'TRANSACTION_APPROVED',
          user_email: 'admin@test.com',
          user_first_name: 'Admin',
          user_last_name: 'User',
          created_at: new Date(),
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockLogs, rowCount: 2 } as unknown as Awaited<ReturnType<typeof query>>);

      const result = await getTransactionAuditLogs('txn1');
      expect(result).toEqual(mockLogs);
      expect(result).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('FROM audit_logs'),
        ['txn1']
      );
    });

    it('returns empty array when no logs found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as unknown as Awaited<ReturnType<typeof query>>);

      const result = await getTransactionAuditLogs('txn999');
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });
});
