import { checkBalance, validateTransfer, initiateTransfer, executeTransfer, getTransactionById, getTransactions } from '@/lib/services/transfer.service';
import { query, transaction } from '@/lib/db/connection';
import { createAuditLog } from '@/lib/services/audit.service';
import { PoolClient } from 'pg';

// Mock dependencies
jest.mock('@/lib/db/connection');
jest.mock('@/lib/services/audit.service');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockTransaction = transaction as jest.MockedFunction<typeof transaction>;
const mockCreateAuditLog = createAuditLog as jest.MockedFunction<typeof createAuditLog>;

describe('Transfer Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  describe('checkBalance', () => {
    it('returns valid when balance is sufficient', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ balance: 10000, minimum_balance: 100 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await checkBalance('account-123', 5000);
      expect(result.valid).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM accounts WHERE id = $1 AND is_active = true',
        ['account-123']
      );
    });

    it('returns invalid when balance is insufficient', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ balance: 1000, minimum_balance: 100 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await checkBalance('account-123', 5000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Insufficient funds');
    });

    it('returns invalid when account not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await checkBalance('account-123', 5000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Account not found');
    });

    it('returns invalid when minimum balance would be violated', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ balance: 5500, minimum_balance: 1000 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await checkBalance('account-123', 5000);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('minimum balance requirement');
    });
  });

  describe('validateTransfer', () => {
    it('validates valid transfer', async () => {
      // Mock from account check
      mockQuery.mockResolvedValueOnce({
        rows: [{ balance: 10000, minimum_balance: 100 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });
      // Mock to account check
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'account-2' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await validateTransfer('account-1', 'account-2', 5000);
      
      expect(result.valid).toBe(true);
    });

    it('rejects transfer with insufficient balance', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ balance: 1000, minimum_balance: 100 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await validateTransfer('account-1', 'account-2', 5000);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Insufficient funds');
    });

    it('rejects transfer to same account', async () => {
      const result = await validateTransfer('account-1', 'account-1', 100);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('same account');
    });

    it('rejects negative amounts', async () => {
      const result = await validateTransfer('account-1', 'account-2', -100);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('greater than 0');
    });

    it('rejects transfer when destination account not found', async () => {
      // Mock from account check
      mockQuery.mockResolvedValueOnce({
        rows: [{ balance: 10000, minimum_balance: 100 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });
      // Mock to account check - not found
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await validateTransfer('account-1', 'account-2', 5000);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Destination account not found');
    });
  });

  describe('initiateTransfer', () => {
    it('calls transaction function with proper parameters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ balance: 10000, minimum_balance: 100 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'acc-2' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const mockTxn = { id: 'txn-1', status: 'PENDING', amount: 5000, from_account_id: 'acc-1', to_account_id: 'acc-2', initiated_by: 'user-1' };
      mockTransaction.mockResolvedValue(mockTxn);
      mockCreateAuditLog.mockResolvedValue({ id: 'audit-1', action: 'TRANSFER_INITIATED' as const, created_at: new Date() });

      const result = await initiateTransfer({
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amount: 5000,
        initiatedBy: 'user-1',
      });

      expect(result.id).toBe('txn-1');
      expect(mockTransaction).toHaveBeenCalled();
    });

    it('initiates transfer requiring approval', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ balance: 2000000, minimum_balance: 100 }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'acc-2' }], rowCount: 1, command: 'SELECT', oid: 0, fields: [] });

      const mockTxn = { id: 'txn-1', status: 'AWAITING_APPROVAL', amount: 1500000, from_account_id: 'acc-1', to_account_id: 'acc-2', initiated_by: 'user-1' };
      mockTransaction.mockResolvedValue(mockTxn);
      mockCreateAuditLog.mockResolvedValue({ id: 'audit-1', action: 'TRANSFER_INITIATED' as const, created_at: new Date() });

      const result = await initiateTransfer({
        fromAccountId: 'acc-1',
        toAccountId: 'acc-2',
        amount: 1500000,
        initiatedBy: 'user-1',
      });

      expect(result.id).toBe('txn-1');
      expect(mockTransaction).toHaveBeenCalled();
    });
  });

  describe('executeTransfer', () => {
    it('executes transfer successfully', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id: 'txn-1', amount: 5000, from_account_id: 'acc-1', to_account_id: 'acc-2', initiated_by: 'user-1' }] }) // get transaction
          .mockResolvedValueOnce({ rows: [] }) // deduct from source
          .mockResolvedValueOnce({ rows: [] }) // add to destination
          .mockResolvedValueOnce({ rows: [] }), // update transaction status
      };

      mockCreateAuditLog.mockResolvedValue({ id: 'audit-1', action: 'TRANSFER_COMPLETED' as const, created_at: new Date() });

      await executeTransfer(mockClient as unknown as PoolClient, 'txn-1');

      expect(mockClient.query).toHaveBeenCalledTimes(4);
      expect(mockCreateAuditLog).toHaveBeenCalledWith(expect.objectContaining({
        action: 'TRANSFER_COMPLETED',
      }));
    });

    it('handles transfer execution error', async () => {
      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [{ id: 'txn-1', amount: 5000, from_account_id: 'acc-1', to_account_id: 'acc-2', initiated_by: 'user-1' }] }) // get transaction
          .mockRejectedValueOnce(new Error('Database error')), // deduct fails
      };

      mockCreateAuditLog.mockResolvedValue({ id: 'audit-1', action: 'TRANSFER_COMPLETED' as const, created_at: new Date() });

      await expect(executeTransfer(mockClient as unknown as PoolClient, 'txn-1')).rejects.toThrow('Database error');
    });
  });

  describe('getTransactionById', () => {
    it('retrieves transaction with details', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'txn-1', amount: 5000 }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getTransactionById('txn-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('txn-1');
    });

    it('returns null when transaction not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getTransactionById('txn-999');

      expect(result).toBeNull();
    });
  });

  describe('getTransactions', () => {
    it('retrieves transactions with filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ // count query
          rows: [{ count: '5' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({ // data query
          rows: [
            { id: 'txn-1', amount: 1000 },
            { id: 'txn-2', amount: 2000 },
          ],
          rowCount: 2,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });

      const result = await getTransactions({
        accountId: 'acc-1',
        status: 'COMPLETED',
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(5);
      expect(result.transactions).toHaveLength(2);
    });

    it('handles empty result set', async () => {
      mockQuery
        .mockResolvedValueOnce({ // count query
          rows: [{ count: '0' }],
          rowCount: 1,
          command: 'SELECT',
          oid: 0,
          fields: [],
        })
        .mockResolvedValueOnce({ // data query
          rows: [],
          rowCount: 0,
          command: 'SELECT',
          oid: 0,
          fields: [],
        });

      const result = await getTransactions({});

      expect(result.total).toBe(0);
      expect(result.transactions).toHaveLength(0);
    });
  });
});
