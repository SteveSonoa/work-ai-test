import bcrypt from 'bcryptjs';
import { 
  verifyPassword, 
  getUserByEmail, 
  updateUserRole, 
  getUserById,
  getAllUsers,
  createUser,
  deactivateUser,
  hasRole,
  canInitiateTransfers,
  canApproveTransfers,
  canViewAuditLogs,
  canManageUsers
} from '@/lib/services/user.service';
import { query } from '@/lib/db/connection';

jest.mock('@/lib/db/connection');
jest.mock('bcryptjs');
jest.mock('@/lib/services/audit.service');

const mockQuery = query as jest.MockedFunction<typeof query>;
const mockBcryptCompare = bcrypt.compare as jest.MockedFunction<typeof bcrypt.compare>;

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
  });

  describe('getUserByEmail', () => {
    it('returns user when found', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'ADMIN',
        is_active: true,
        password_hash: 'hashed_password',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getUserByEmail('test@example.com');
      
      expect(result).toEqual(mockUser);
      expect(mockQuery).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE email = $1',
        ['test@example.com']
      );
    });

    it('returns null when user not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getUserByEmail('nonexistent@example.com');
      expect(result).toBeNull();
    });
  });

  describe('verifyPassword', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'ADMIN',
      is_active: true,
      password_hash: 'hashed_password',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    it('returns user without password when credentials are valid', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockBcryptCompare.mockResolvedValueOnce(true as never);

      const result = await verifyPassword('test@example.com', 'password123');
      
      expect(result).toBeTruthy();
      expect(result?.email).toBe('test@example.com');
      expect(result).not.toHaveProperty('password_hash');
    });

    it('returns null when password is incorrect', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      mockBcryptCompare.mockResolvedValueOnce(false as never);

      const result = await verifyPassword('test@example.com', 'wrong_password');
      expect(result).toBeNull();
    });

    it('returns null when user is inactive', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockUser, is_active: false }],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await verifyPassword('test@example.com', 'password123');
      expect(result).toBeNull();
    });

    it('returns null when user does not exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await verifyPassword('nonexistent@example.com', 'password123');
      expect(result).toBeNull();
    });
  });

  describe('updateUserRole', () => {
    it('updates user role successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ 
          id: 'user-123', 
          email: 'test@example.com',
          role: 'CONTROLLER' 
        }],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'audit-1' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await updateUserRole('user-123', 'CONTROLLER', 'admin-123');
      
      expect(result).toBeTruthy();
      expect(result?.role).toBe('CONTROLLER');
    });
  });

  describe('getUserById', () => {
    it('returns user when found', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'ADMIN',
        is_active: true,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getUserById('user-123');
      expect(result).toEqual(mockUser);
    });

    it('returns null when user not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getUserById('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getAllUsers', () => {
    it('returns all users ordered by name', async () => {
      const mockUsers = [
        { id: '1', email: 'alice@test.com', first_name: 'Alice', last_name: 'Anderson' },
        { id: '2', email: 'bob@test.com', first_name: 'Bob', last_name: 'Brown' },
      ];

      mockQuery.mockResolvedValueOnce({
        rows: mockUsers,
        rowCount: 2,
        command: 'SELECT',
        oid: 0,
        fields: [],
      });

      const result = await getAllUsers();
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });
  });

  describe('createUser', () => {
    it('creates a new user with hashed password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'new@test.com',
        first_name: 'New',
        last_name: 'User',
        role: 'CONTROLLER',
        is_active: true,
      };

      (bcrypt.hash as jest.MockedFunction<typeof bcrypt.hash>).mockResolvedValueOnce('hashed_password' as never);
      
      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await createUser('new@test.com', 'password123', 'New', 'User', 'CONTROLLER');
      expect(result).toEqual(mockUser);
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });
  });

  describe('deactivateUser', () => {
    it('deactivates a user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@test.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'CONTROLLER',
        is_active: false,
      };

      mockQuery.mockResolvedValueOnce({
        rows: [mockUser],
        rowCount: 1,
        command: 'UPDATE',
        oid: 0,
        fields: [],
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 'audit-1' }],
        rowCount: 1,
        command: 'INSERT',
        oid: 0,
        fields: [],
      });

      const result = await deactivateUser('user-123', 'admin-123');
      expect(result.is_active).toBe(false);
    });
  });

  describe('permission helpers', () => {
    const adminUser = { id: '1', email: 'admin@test.com', first_name: 'Admin', last_name: 'User', role: 'ADMIN' as const, is_active: true, created_at: new Date(), updated_at: new Date() };
    const controllerUser = { id: '2', email: 'controller@test.com', first_name: 'Controller', last_name: 'User', role: 'CONTROLLER' as const, is_active: true, created_at: new Date(), updated_at: new Date() };
    const auditUser = { id: '3', email: 'audit@test.com', first_name: 'Audit', last_name: 'User', role: 'AUDIT' as const, is_active: true, created_at: new Date(), updated_at: new Date() };
    const noneUser = { id: '4', email: 'none@test.com', first_name: 'None', last_name: 'User', role: 'NONE' as const, is_active: true, created_at: new Date(), updated_at: new Date() };

    describe('hasRole', () => {
      it('returns true when user has one of the roles', () => {
        expect(hasRole(adminUser, ['ADMIN', 'CONTROLLER'])).toBe(true);
        expect(hasRole(controllerUser, ['ADMIN', 'CONTROLLER'])).toBe(true);
      });

      it('returns false when user does not have any of the roles', () => {
        expect(hasRole(noneUser, ['ADMIN', 'CONTROLLER'])).toBe(false);
      });
    });

    describe('canInitiateTransfers', () => {
      it('returns true for CONTROLLER and ADMIN', () => {
        expect(canInitiateTransfers(adminUser)).toBe(true);
        expect(canInitiateTransfers(controllerUser)).toBe(true);
      });

      it('returns false for other roles', () => {
        expect(canInitiateTransfers(auditUser)).toBe(false);
        expect(canInitiateTransfers(noneUser)).toBe(false);
      });
    });

    describe('canApproveTransfers', () => {
      it('returns true for ADMIN only', () => {
        expect(canApproveTransfers(adminUser)).toBe(true);
      });

      it('returns false for non-admin roles', () => {
        expect(canApproveTransfers(controllerUser)).toBe(false);
        expect(canApproveTransfers(auditUser)).toBe(false);
        expect(canApproveTransfers(noneUser)).toBe(false);
      });
    });

    describe('canViewAuditLogs', () => {
      it('returns true for AUDIT and ADMIN', () => {
        expect(canViewAuditLogs(adminUser)).toBe(true);
        expect(canViewAuditLogs(auditUser)).toBe(true);
      });

      it('returns false for other roles', () => {
        expect(canViewAuditLogs(controllerUser)).toBe(false);
        expect(canViewAuditLogs(noneUser)).toBe(false);
      });
    });

    describe('canManageUsers', () => {
      it('returns true for ADMIN only', () => {
        expect(canManageUsers(adminUser)).toBe(true);
      });

      it('returns false for non-admin roles', () => {
        expect(canManageUsers(controllerUser)).toBe(false);
        expect(canManageUsers(auditUser)).toBe(false);
        expect(canManageUsers(noneUser)).toBe(false);
      });
    });
  });
});
