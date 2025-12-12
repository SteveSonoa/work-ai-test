import {
  getAllAccounts,
  getAccountById,
  getAccountTransactionHistory,
  createAccount,
  updateAccountBalance,
  getAccountByNumber,
  getAccountBalance,
} from '@/lib/services/account.service';
import { query } from '@/lib/db/connection';
import { createAuditLog } from '@/lib/services/audit.service';

jest.mock('@/lib/db/connection');
jest.mock('@/lib/services/audit.service');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockCreateAuditLog = createAuditLog as jest.MockedFunction<typeof createAuditLog>;

describe('Account Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAllAccounts', () => {
    it('returns all accounts', async () => {
      const mockAccounts = [
        { id: '1', account_number: '1234', account_name: 'Account 1', balance: 1000 },
        { id: '2', account_number: '5678', account_name: 'Account 2', balance: 2000 },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockAccounts,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAllAccounts();
      expect(result).toEqual(mockAccounts);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('WHERE is_active = true'));
    });
  });

  describe('getAccountById', () => {
    it('returns account when found', async () => {
      const mockAccount = {
        id: '1',
        account_number: '1234',
        account_name: 'Test Account',
        balance: 1000,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockAccount],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAccountById('1', 'user-123');
      expect(result).toEqual(mockAccount);
      expect(mockCreateAuditLog).toHaveBeenCalledWith({
        action: 'ACCOUNT_VIEWED',
        userId: 'user-123',
        accountId: '1',
        details: {
          account_number: '1234',
        },
        ipAddress: undefined,
        userAgent: undefined,
      });
    });

    it('returns null when account not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAccountById('999', 'user-123');
      expect(result).toBeNull();
    });
  });

  describe('getAccountTransactionHistory', () => {
    it('returns transaction history with pagination', async () => {
      const mockTransactions = [
        { id: 'tx-1', amount: 100, status: 'COMPLETED' },
        { id: 'tx-2', amount: 200, status: 'COMPLETED' },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '10' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockQuery.mockResolvedValueOnce({
        rows: mockTransactions,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAccountTransactionHistory('account-1', 50, 0);
      expect(result.total).toBe(10);
      expect(result.transactions).toHaveLength(2);
    });
  });

  describe('getAccountByNumber', () => {
    it('returns account when found by account number', async () => {
      const mockAccount = {
        id: '1',
        account_number: '1234567',
        account_name: 'Test Account',
        balance: 5000,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockAccount],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAccountByNumber('1234567');
      expect(result).toEqual(mockAccount);
    });

    it('returns null when account not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAccountByNumber('9999999');
      expect(result).toBeNull();
    });
  });

  describe('getAccountBalance', () => {
    it('returns account balance', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ balance: '5000.50' }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAccountBalance('account-1');
      expect(result).toBe(5000.50);
    });

    it('throws error when account not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      await expect(getAccountBalance('account-999')).rejects.toThrow('Account not found');
    });
  });

  describe('createAccount', () => {
    it('creates a new account', async () => {
      const mockAccount = {
        id: '1',
        account_number: '1234567',
        account_name: 'New Account',
        balance: 1000,
        minimum_balance: 100,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockAccount],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await createAccount('1234567', 'New Account', 1000, 100);
      expect(result).toEqual(mockAccount);
    });
  });

  describe('updateAccountBalance', () => {
    it('updates account balance', async () => {
      const mockAccount = {
        id: '1',
        account_number: '1234567',
        account_name: 'Test Account',
        balance: 2000,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockAccount],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      const result = await updateAccountBalance('1', 2000);
      expect(result).toEqual(mockAccount);
      expect(result.balance).toBe(2000);
    });

    it('throws error when account not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      await expect(updateAccountBalance('999', 2000)).rejects.toThrow('Account not found');
    });
  });
});
