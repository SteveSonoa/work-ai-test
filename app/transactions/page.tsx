'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import Link from 'next/link';
import type { UserWithoutPassword } from '@/lib/types/database';

interface Transaction {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: string;
  status: string;
  created_at: string;
  from_account_number: string;
  from_account_name: string;
  to_account_number: string;
  to_account_name: string;
  initiated_by_email: string;
  initiated_by_first_name: string;
  initiated_by_last_name: string;
  approved_by_email?: string;
  approved_by_first_name?: string;
  approved_by_last_name?: string;
}

export default function TransactionsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserWithoutPassword[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 50;

  // Filters
  const [initiatedBy, setInitiatedBy] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (initiatedBy) params.append('initiatedBy', initiatedBy);
      if (approvedBy) params.append('approvedBy', approvedBy);
      if (minAmount) params.append('minAmount', minAmount);
      if (maxAmount) params.append('maxAmount', maxAmount);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (statusFilter) params.append('status', statusFilter);
      
      // Pagination
      params.append('limit', perPage.toString());
      params.append('offset', ((page - 1) * perPage).toString());

      const response = await fetch(`/api/transactions?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      
      const data = await response.json();
      setTransactions(data.transactions || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError('Failed to load transactions');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, initiatedBy, approvedBy, minAmount, maxAmount, startDate, endDate, statusFilter]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated') {
      fetchUsers();
      fetchTransactions();
    }
  }, [status, router, fetchTransactions]);

  const handleApplyFilters = () => {
    setPage(1); // Reset to first page when applying filters
    fetchTransactions();
  };

  const handleClearFilters = () => {
    setInitiatedBy('');
    setApprovedBy('');
    setMinAmount('');
    setMaxAmount('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('');
    setPage(1);
    // Fetch will be triggered by useEffect watching these states
    setTimeout(() => fetchTransactions(), 0);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setTimeout(() => fetchTransactions(), 0);
  };

  const totalPages = Math.ceil(total / perPage);
  const startResult = total > 0 ? (page - 1) * perPage + 1 : 0;
  const endResult = Math.min(page * perPage, total);

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-gray-700">Loading transactions...</p>
          </div>
        </main>
      </div>
    );
  }

  const userOptions = [
    { value: '', label: 'All Users' },
    ...users.map(user => ({
      value: user.id,
      label: `${user.first_name} ${user.last_name} (${user.email})`,
    })),
  ];

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'PENDING', label: 'Pending' },
    { value: 'AWAITING_APPROVAL', label: 'Awaiting Approval' },
    { value: 'APPROVED', label: 'Approved' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'REJECTED', label: 'Rejected' },
    { value: 'FAILED', label: 'Failed' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-700 mt-2">
            View and filter all transactions across accounts
          </p>
        </div>

        {/* Filters Card */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Filters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <Select
              label="Initiated By"
              options={userOptions}
              value={initiatedBy}
              onChange={(e) => setInitiatedBy(e.target.value)}
            />

            <Select
              label="Approved By"
              options={userOptions}
              value={approvedBy}
              onChange={(e) => setApprovedBy(e.target.value)}
            />

            <Select
              label="Status"
              options={statusOptions}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />

            <Input
              label="Min Amount"
              type="number"
              step="0.01"
              min="0"
              value={minAmount}
              onChange={(e) => setMinAmount(e.target.value)}
              placeholder="0.00"
            />

            <Input
              label="Max Amount"
              type="number"
              step="0.01"
              min="0"
              value={maxAmount}
              onChange={(e) => setMaxAmount(e.target.value)}
              placeholder="0.00"
            />

            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="flex gap-3">
            <Button variant="primary" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
            <Button variant="secondary" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        </Card>

        {error && (
          <div
            className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Results Card */}
        <Card>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">All Transactions</h2>
              <p className="text-sm text-gray-700 mt-1">
                Showing {startResult}-{endResult} of {total} transactions
              </p>
            </div>

            {/* Pagination Controls - Top */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1 || loading}
                >
                  ← Previous
                </Button>
                <span className="text-sm text-gray-700 px-3">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages || loading}
                >
                  Next →
                </Button>
              </div>
            )}
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-700">No transactions found</p>
            </div>
          ) : (
            <>
            <Table
              columns={[
                { key: 'date', label: 'Date' },
                { key: 'from', label: 'From Account' },
                { key: 'to', label: 'To Account' },
                { key: 'amount', label: 'Amount' },
                { key: 'initiatedBy', label: 'Initiated By' },
                { key: 'approvedBy', label: 'Approved By' },
                { key: 'status', label: 'Status' },
                { key: 'actions', label: 'Actions' },
              ]}
              data={transactions.map((tx) => ({
                date: new Date(tx.created_at).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                }),
                from: (
                  <div>
                    <p className="font-semibold text-gray-900">{tx.from_account_number}</p>
                    <p className="text-xs text-gray-700">{tx.from_account_name}</p>
                  </div>
                ),
                to: (
                  <div>
                    <p className="font-semibold text-gray-900">{tx.to_account_number}</p>
                    <p className="text-xs text-gray-700">{tx.to_account_name}</p>
                  </div>
                ),
                amount: (
                  <span className="font-semibold text-gray-900">
                    ${parseFloat(tx.amount).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                ),
                initiatedBy: (
                  <div>
                    <p className="text-sm text-gray-900">
                      {tx.initiated_by_first_name} {tx.initiated_by_last_name}
                    </p>
                    <p className="text-xs text-gray-700">{tx.initiated_by_email}</p>
                  </div>
                ),
                approvedBy: tx.approved_by_email ? (
                  <div>
                    <p className="text-sm text-gray-900">
                      {tx.approved_by_first_name} {tx.approved_by_last_name}
                    </p>
                    <p className="text-xs text-gray-700">{tx.approved_by_email}</p>
                  </div>
                ) : (
                  <span className="text-sm text-gray-700">—</span>
                ),
                status: (
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      tx.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : tx.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-800'
                        : tx.status === 'AWAITING_APPROVAL'
                        ? 'bg-orange-100 text-orange-800'
                        : tx.status === 'APPROVED'
                        ? 'bg-blue-100 text-blue-800'
                        : tx.status === 'REJECTED'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {tx.status.replace(/_/g, ' ')}
                  </span>
                ),
                actions: (
                  <Link
                    href={`/transactions/${tx.id}`}
                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  >
                    View Details →
                  </Link>
                ),
              }))}
            />

            {/* Pagination Controls - Bottom */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1 || loading}
                >
                  ← Previous
                </Button>
                <span className="text-sm text-gray-700 px-3">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages || loading}
                >
                  Next →
                </Button>
              </div>
            )}
            </>
          )}
        </Card>
      </main>
    </div>
  );
}
