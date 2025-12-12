'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Navigation } from '@/components/Navigation';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string | null;
  is_active: boolean;
  created_at: string;
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated' && session?.user?.role !== 'ADMIN') {
      router.push('/unauthorized');
      return;
    }

    fetchUsers();
  }, [status, session, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole || null }),
      });

      if (!response.ok) throw new Error('Failed to update role');

      await fetchUsers();
      setEditingUserId(null);
      setSelectedRole('');
    } catch {
      setError('Failed to update user role');
    }
  };

  const handleToggleActive = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      await fetchUsers();
    } catch {
      setError('Failed to update user status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-700">Loading users...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-700 mt-2">
            Manage user roles and access permissions
          </p>
        </div>

        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
            role="alert"
          >
            {error}
          </div>
        )}

        <Card>
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900">All Users</h2>
            <p className="text-sm text-gray-700 mt-1">
              Total: {users.length} users
            </p>
          </div>

          <Table
            columns={[
              { key: 'name', label: 'Name' },
              { key: 'email', label: 'Email' },
              { key: 'role', label: 'Role' },
              { key: 'status', label: 'Status' },
              { key: 'actions', label: 'Actions' },
            ]}
            data={users.map((user) => ({
              name: `${user.first_name} ${user.last_name}`,
              email: user.email,
              role:
                editingUserId === user.id ? (
                  <div className="flex items-center gap-2">
                    <Select
                      label="Role"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value)}
                      options={[
                        { value: '', label: 'No Role' },
                        { value: 'ADMIN', label: 'Admin' },
                        { value: 'CONTROLLER', label: 'Controller' },
                        { value: 'AUDIT', label: 'Audit' },
                      ]}
                      className="w-40"
                      aria-label="Select role"
                    />
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleUpdateRole(user.id, selectedRole)}
                    >
                      Save
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setEditingUserId(null);
                        setSelectedRole('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'ADMIN'
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === 'CONTROLLER'
                        ? 'bg-blue-100 text-blue-800'
                        : user.role === 'AUDIT'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {user.role || 'No Role'}
                  </span>
                ),
              status: (
                <span
                  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    user.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {user.is_active ? 'Active' : 'Inactive'}
                </span>
              ),
              actions: (
                <div className="flex gap-2">
                  {editingUserId !== user.id && (
                    <>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingUserId(user.id);
                          setSelectedRole(user.role || '');
                        }}
                      >
                        Edit Role
                      </Button>
                      <Button
                        variant={user.is_active ? 'secondary' : 'primary'}
                        size="sm"
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </>
                  )}
                </div>
              ),
            }))}
          />
        </Card>
      </main>
    </div>
  );
}
