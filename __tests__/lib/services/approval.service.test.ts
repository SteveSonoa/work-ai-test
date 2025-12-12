/* eslint-disable @typescript-eslint/no-explicit-any */
import { processApproval, getPendingApprovalsForAdmin, getAllPendingApprovals, getApprovalByTransactionId } from '@/lib/services/approval.service';
import { transaction, query } from '@/lib/db/connection';
import { createAuditLog } from '@/lib/services/audit.service';
import { executeTransfer } from '@/lib/services/transfer.service';
import { AuditLog } from '@/lib/types/database';

jest.mock('@/lib/db/connection');
jest.mock('@/lib/services/audit.service');
jest.mock('@/lib/services/transfer.service');

const mockTransaction = transaction as jest.MockedFunction<typeof transaction>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockCreateAuditLog = createAuditLog as jest.MockedFunction<typeof createAuditLog>;
const mockExecuteTransfer = executeTransfer as jest.MockedFunction<typeof executeTransfer>;

describe('Approval Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processApproval', () => {
    const mockApprovalData = {
      transactionId: 'transfer-123',
      approverId: 'admin-123',
      decision: 'APPROVED' as const,
      notes: 'Approved for processing',
    };

    it('approves transfer successfully', async () => {
      const mockTxn = {
        id: 'transfer-123',
        status: 'AWAITING_APPROVAL' as const,
        from_account_id: 'acc-1',
        to_account_id: 'acc-2',
        amount: 1500000,
        requires_approval: true,
        initiated_by: 'controller-123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [mockTxn], rowCount: 1 })  // Get transaction
          .mockResolvedValueOnce({ rows: [], rowCount: 1 })          // Update approval
          .mockResolvedValueOnce({ rows: [], rowCount: 1 })          // Update transaction
          .mockResolvedValueOnce({ rows: [{ ...mockTxn, status: 'COMPLETED' }], rowCount: 1 }), // Get updated
      };

      mockTransaction.mockImplementation(async (callback) => {
        return await callback(mockClient as any);
      });

      mockCreateAuditLog.mockResolvedValue({
        id: 'audit-123',
        action: 'TRANSFER_APPROVED',
        user_id: 'admin-123',
        created_at: new Date(),
        updated_at: new Date(),
      } as AuditLog);

      mockExecuteTransfer.mockResolvedValue(undefined);

      const result = await processApproval(mockApprovalData);
      
      expect(result.id).toBe('transfer-123');
      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TRANSFER_APPROVED',
          userId: 'admin-123',
        })
      );
    });

    it('rejects transfer successfully', async () => {
      const rejectData = { ...mockApprovalData, decision: 'REJECTED' as const };
      const mockTxn = {
        id: 'transfer-123',
        status: 'AWAITING_APPROVAL' as const,
        from_account_id: 'acc-1',
        to_account_id: 'acc-2',
        amount: 1500000,
        requires_approval: true,
        initiated_by: 'controller-123',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const mockClient = {
        query: jest.fn()
          .mockResolvedValueOnce({ rows: [mockTxn], rowCount: 1 })  // Get transaction
          .mockResolvedValueOnce({ rows: [], rowCount: 1 })          // Update approval
          .mockResolvedValueOnce({ rows: [], rowCount: 1 })          // Update transaction
          .mockResolvedValueOnce({ rows: [{ ...mockTxn, status: 'REJECTED' }], rowCount: 1 }), // Get updated
      };

      mockTransaction.mockImplementation(async (callback) => {
        return await callback(mockClient as any);
      });

      mockCreateAuditLog.mockResolvedValue({
        id: 'audit-123',
        action: 'TRANSFER_REJECTED',
        user_id: 'admin-123',
        created_at: new Date(),
        updated_at: new Date(),
      } as AuditLog);

      const result = await processApproval(rejectData);
      
      expect(result.status).toBe('REJECTED');
      expect(mockCreateAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TRANSFER_REJECTED',
          userId: 'admin-123',
        })
      );
    });

    it('fails when transfer not found', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({ rows: [], rowCount: 0 }),
      };

      mockTransaction.mockImplementation(async (callback) => {
        return await callback(mockClient as any);
      });

      await expect(processApproval(mockApprovalData)).rejects.toThrow('Transaction not found');
    });

    it('fails when transfer not awaiting approval', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [{
            id: 'transfer-123',
            status: 'COMPLETED',
            from_account_id: 'acc-1',
            to_account_id: 'acc-2',
            amount: 1500000,
            requires_approval: true,
            initiated_by: 'controller-123',
          }],
          rowCount: 1,
        }),
      };

      mockTransaction.mockImplementation(async (callback) => {
        return await callback(mockClient as any);
      });

      await expect(processApproval(mockApprovalData)).rejects.toThrow('Transaction is not awaiting approval');
    });

    it('fails when approver is the initiator', async () => {
      const selfApprovalData = {
        ...mockApprovalData,
        approverId: 'controller-123', // Same as initiator
      };

      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({
          rows: [{
            id: 'transfer-123',
            status: 'AWAITING_APPROVAL',
            from_account_id: 'acc-1',
            to_account_id: 'acc-2',
            amount: 1500000,
            requires_approval: true,
            initiated_by: 'controller-123',
          }],
          rowCount: 1,
        }),
      };

      mockTransaction.mockImplementation(async (callback: (client: any) => Promise<unknown>) => {
        return await callback(mockClient);
      });

      await expect(processApproval(selfApprovalData)).rejects.toThrow('Cannot approve your own transaction');
    });
  });

  describe('getPendingApprovalsForAdmin', () => {
    it('returns pending approvals excluding own transactions', async () => {
      const mockApprovals = [
        {
          id: 'tx-1',
          status: 'AWAITING_APPROVAL',
          amount: 500000,
          from_account: { account_number: '1234', account_name: 'Source' },
          to_account: { account_number: '5678', account_name: 'Dest' },
          initiator: { email: 'user@test.com', first_name: 'John', last_name: 'Doe' },
        },
        {
          id: 'tx-2',
          status: 'AWAITING_APPROVAL',
          amount: 750000,
          from_account: { account_number: '2345', account_name: 'Source2' },
          to_account: { account_number: '6789', account_name: 'Dest2' },
          initiator: { email: 'user2@test.com', first_name: 'Jane', last_name: 'Smith' },
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockApprovals,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getPendingApprovalsForAdmin('admin-123');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('tx-1');
    });

    it('returns empty array when no pending approvals', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getPendingApprovalsForAdmin('admin-123');
      expect(result).toEqual([]);
    });
  });

  describe('getAllPendingApprovals', () => {
    it('returns all pending approvals', async () => {
      const mockApprovals = [
        {
          id: 'tx-1',
          status: 'AWAITING_APPROVAL',
          amount: 500000,
          from_account: { account_number: '1234', account_name: 'Source' },
          to_account: { account_number: '5678', account_name: 'Dest' },
          initiator: { email: 'user@test.com', first_name: 'John', last_name: 'Doe' },
        },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockApprovals,
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAllPendingApprovals();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('tx-1');
    });

    it('returns empty array when no approvals', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAllPendingApprovals();
      expect(result).toEqual([]);
    });
  });

  describe('getApprovalByTransactionId', () => {
    it('returns approval for transaction', async () => {
      const mockApproval = {
        id: 'approval-1',
        transaction_id: 'txn-123',
        status: 'PENDING',
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockApproval],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getApprovalByTransactionId('txn-123');
      expect(result).not.toBeNull();
      expect(result?.id).toBe('approval-1');
    });

    it('returns null when approval not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getApprovalByTransactionId('txn-999');
      expect(result).toBeNull();
    });
  });
});