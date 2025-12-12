'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { UserWithoutPassword } from '@/lib/types/database';

export function Navigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const user = session?.user as UserWithoutPassword | undefined;

  if (!user) return null;

  const canInitiateTransfers = ['CONTROLLER', 'ADMIN'].includes(user.role);
  const canApprove = user.role === 'ADMIN';
  const canViewAudit = ['AUDIT', 'ADMIN'].includes(user.role);
  const canManageUsers = user.role === 'ADMIN';

  const navLinks = [
    { href: '/dashboard', label: 'Dashboard', show: true },
    { href: '/accounts', label: 'Accounts', show: true },
    { href: '/transactions', label: 'Transactions', show: true },
    { href: '/transfer', label: 'New Transfer', show: canInitiateTransfers },
    { href: '/approvals', label: 'Approvals', show: canApprove },
    { href: '/audit', label: 'Audit Logs', show: canViewAudit },
    { href: '/users', label: 'Users', show: canManageUsers },
  ];

  return (
    <nav className="bg-blue-900 text-white shadow-lg" role="navigation" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <Link href="/dashboard" className="flex items-center px-2 text-xl font-bold hover:text-blue-200 transition-colors">
              Bank Transfer System
            </Link>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-4">
              {navLinks.filter(link => link.show).map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    pathname === link.href
                      ? 'bg-blue-800 text-white'
                      : 'text-blue-100 hover:bg-blue-800 hover:text-white'
                  }`}
                  aria-current={pathname === link.href ? 'page' : undefined}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <p className="font-medium">{user.first_name} {user.last_name}</p>
              <p className="text-blue-200 text-xs">{user.role}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="px-4 py-2 bg-blue-800 hover:bg-blue-700 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Sign out"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div className="sm:hidden px-2 pt-2 pb-3 space-y-1">
        {navLinks.filter(link => link.show).map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              pathname === link.href
                ? 'bg-blue-800 text-white'
                : 'text-blue-100 hover:bg-blue-800 hover:text-white'
            }`}
            aria-current={pathname === link.href ? 'page' : undefined}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
