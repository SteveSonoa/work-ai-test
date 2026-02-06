import bcrypt from 'bcryptjs';
import { query } from '@/lib/db/connection';
import { User, UserRole, UserWithoutPassword } from '@/lib/types/database';
import { createAuditLog } from './audit.service';

/**
 * Get user by email
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await query<User>(
    'SELECT * FROM "ai-users" WHERE email = $1',
    [email]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Get user by ID
 */
export async function getUserById(id: string): Promise<UserWithoutPassword | null> {
  const result = await query<User>(
    'SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at FROM "ai-users" WHERE id = $1',
    [id]
  );

  return result.rows.length > 0 ? result.rows[0] : null;
}

/**
 * Verify user password
 */
export async function verifyPassword(
  email: string,
  password: string
): Promise<UserWithoutPassword | null> {
  const user = await getUserByEmail(email);
  
  if (!user || !user.is_active) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  
  if (!isValid) {
    return null;
  }

  // Return user without password
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword as UserWithoutPassword;
}

/**
 * Get all users
 */
export async function getAllUsers(): Promise<UserWithoutPassword[]> {
  const result = await query<User>(
    `SELECT id, email, first_name, last_name, role, is_active, created_at, updated_at 
     FROM "ai-users" 
     ORDER BY last_name, first_name`
  );

  return result.rows;
}

/**
 * Update user role
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  updatedBy: string,
  ipAddress?: string,
  userAgent?: string
): Promise<UserWithoutPassword> {
  const result = await query<User>(
    `UPDATE "ai-users" 
     SET role = $1 
     WHERE id = $2 
     RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at`,
    [newRole, userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  // Create audit log
  await createAuditLog({
    action: 'USER_ROLE_CHANGED',
    userId: updatedBy,
    details: {
      target_user_id: userId,
      new_role: newRole,
    },
    ipAddress,
    userAgent,
  });

  return result.rows[0];
}

/**
 * Create a new user
 */
export async function createUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: UserRole = 'NONE'
): Promise<UserWithoutPassword> {
  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  const result = await query<User>(
    `INSERT INTO "ai-users" (email, password_hash, first_name, last_name, role)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at`,
    [email, passwordHash, firstName, lastName, role]
  );

  return result.rows[0];
}

/**
 * Deactivate user
 */
export async function deactivateUser(
  userId: string,
  deactivatedBy: string,
  ipAddress?: string,
  userAgent?: string
): Promise<UserWithoutPassword> {
  const result = await query<User>(
    `UPDATE "ai-users" 
     SET is_active = false 
     WHERE id = $1 
     RETURNING id, email, first_name, last_name, role, is_active, created_at, updated_at`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  // Create audit log
  await createAuditLog({
    action: 'USER_ROLE_CHANGED',
    userId: deactivatedBy,
    details: {
      target_user_id: userId,
      action: 'deactivated',
    },
    ipAddress,
    userAgent,
  });

  return result.rows[0];
}

/**
 * Check if user has required role
 */
export function hasRole(user: UserWithoutPassword, roles: UserRole[]): boolean {
  return roles.includes(user.role);
}

/**
 * Check if user can initiate transfers
 */
export function canInitiateTransfers(user: UserWithoutPassword): boolean {
  return hasRole(user, ['CONTROLLER', 'ADMIN']);
}

/**
 * Check if user can approve transfers
 */
export function canApproveTransfers(user: UserWithoutPassword): boolean {
  return hasRole(user, ['ADMIN']);
}

/**
 * Check if user can view audit logs
 */
export function canViewAuditLogs(user: UserWithoutPassword): boolean {
  return hasRole(user, ['AUDIT', 'ADMIN']);
}

/**
 * Check if user can manage users
 */
export function canManageUsers(user: UserWithoutPassword): boolean {
  return hasRole(user, ['ADMIN']);
}
