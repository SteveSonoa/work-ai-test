import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { UserWithoutPassword, UserRole } from '@/lib/types/database';
import { redirect } from 'next/navigation';

/**
 * Get current user session
 */
export async function getCurrentUser(): Promise<UserWithoutPassword | null> {
  const session = await getServerSession(authOptions);
  return session?.user || null;
}

/**
 * Require authentication (redirect to login if not authenticated)
 */
export async function requireAuth(): Promise<UserWithoutPassword> {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/auth/signin');
  }
  
  return user;
}

/**
 * Require specific role (redirect if not authorized)
 */
export async function requireRole(roles: UserRole[]): Promise<UserWithoutPassword> {
  const user = await requireAuth();
  
  if (!roles.includes(user.role)) {
    redirect('/unauthorized');
  }
  
  return user;
}

/**
 * Check if user has role (for conditional rendering)
 */
export function hasRole(user: UserWithoutPassword | null, roles: UserRole[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
