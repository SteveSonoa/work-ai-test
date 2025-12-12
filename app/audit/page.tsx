'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Navigation } from '@/components/Navigation';

interface AuditLog {
  id: string;
  action: string;
  user_id: string;
  details: Record<string, unknown>;
  created_at: string;
  user_email?: string;
  user_name?: string;
}

function AuditContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 50;

  const actionTypes = [
    'USER_LOGIN',
    'USER_LOGOUT',
    'TRANSFER_INITIATED',
    'TRANSFER_VALIDATED',
    'TRANSFER_AWAITING_APPROVAL',
    'TRANSFER_APPROVED',
    'TRANSFER_REJECTED',
    'TRANSFER_COMPLETED',
    'TRANSFER_FAILED',
    'BALANCE_CHECKED',
    'USER_ROLE_CHANGED',
    'ACCOUNT_VIEWED',
    'AUDIT_LOG_VIEWED',
  ];

  // Filter states - default to all except AUDIT_LOG_VIEWED
  const defaultActions = actionTypes.filter(action => action !== 'AUDIT_LOG_VIEWED');
  const [actionFilters, setActionFilters] = useState<string[]>(
    searchParams.get('actions') ? searchParams.get('actions')!.split(',') : defaultActions
  );
  const [userFilter, setUserFilter] = useState(searchParams.get('user') || '');
  const [startDate, setStartDate] = useState(searchParams.get('start') || '');
  const [endDate, setEndDate] = useState(searchParams.get('end') || '');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated' && !['ADMIN', 'AUDIT'].includes(session?.user?.role || '')) {
      router.push('/unauthorized');
      return;
    }

    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, session, router, searchParams]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      // Add multiple action filters
      if (actionFilters.length > 0 && actionFilters.length < actionTypes.length) {
        actionFilters.forEach(action => params.append('action', action));
      }
      if (userFilter) params.set('userId', userFilter);
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
      
      // Pagination
      params.set('limit', perPage.toString());
      params.set('offset', ((page - 1) * perPage).toString());

      const response = await fetch(`/api/audit?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');
      const data = await response.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilters = () => {
    const params = new URLSearchParams();
    if (actionFilters.length > 0) params.set('actions', actionFilters.join(','));
    if (userFilter) params.set('user', userFilter);
    if (startDate) params.set('start', startDate);
    if (endDate) params.set('end', endDate);

    setPage(1); // Reset to first page when applying filters
    router.push(`/audit?${params.toString()}`);
    fetchLogs();
  };

  const handleClearFilters = () => {
    setActionFilters(defaultActions);
    setUserFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
    router.push('/audit');
    fetchLogs();
  };

  const toggleActionFilter = (action: string) => {
    setActionFilters(prev => 
      prev.includes(action) 
        ? prev.filter(a => a !== action)
        : [...prev, action]
    );
  };

  const selectAllActions = () => {
    setActionFilters(actionTypes);
  };

  const deselectAllActions = () => {
    setActionFilters([]);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    setTimeout(() => fetchLogs(), 0);
  };

  const totalPages = Math.ceil(total / perPage);
  const startResult = total > 0 ? (page - 1) * perPage + 1 : 0;
  const endResult = Math.min(page * perPage, total);

  const toggleRow = (logId: string) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p className="text-gray-700 mt-2">
            View all system activity and changes
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

        <Card className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
          
          {/* Action Type Filters */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Action Types ({actionFilters.length} selected)
              </label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllActions}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Select All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={deselectAllActions}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {actionTypes.map((action) => (
                <label
                  key={action}
                  className="flex items-center space-x-2 p-2 rounded border border-gray-200 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={actionFilters.includes(action)}
                    onChange={() => toggleActionFilter(action)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">
                    {action.replace(/_/g, ' ')}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Other Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="User ID"
              type="text"
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              placeholder="Enter user ID"
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

          <div className="flex gap-4 mt-4">
            <Button variant="primary" onClick={handleApplyFilters}>
              Apply Filters
            </Button>
            <Button variant="secondary" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        </Card>

        <Card>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Activity Log</h2>
              <p className="text-sm text-gray-700 mt-1">
                {loading ? 'Loading...' : `Showing ${startResult}-${endResult} of ${total} entries`}
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

          {loading ? (
            <div className="text-center py-12">
              <p className="text-gray-700">Loading audit logs...</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-700">No audit logs found</p>
            </div>
          ) : (
            <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Action
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      User
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {logs.map((log) => {
                    const isExpanded = expandedRows.has(log.id);
                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(log.created_at).toLocaleString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                log.action.includes('LOGIN')
                                  ? 'bg-blue-100 text-blue-800'
                                  : log.action.includes('APPROVED')
                                  ? 'bg-green-100 text-green-800'
                                  : log.action.includes('REJECTED')
                                  ? 'bg-red-100 text-red-800'
                                  : log.action.includes('TRANSFER')
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {log.action.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {log.user_email || log.user_name || log.user_id || 'System'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <button
                              onClick={() => toggleRow(log.id)}
                              className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {isExpanded ? '▼ Hide Details' : '▶ View Details'}
                            </button>
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr key={`${log.id}-details`}>
                            <td colSpan={4} className="px-6 py-4 bg-gray-50">
                              <div className="border border-gray-200 rounded-lg p-4 bg-white">
                                <h4 className="text-sm font-semibold text-gray-900 mb-2">Details</h4>
                                <pre className="text-xs text-gray-900 overflow-x-auto whitespace-pre-wrap">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

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

export default function AuditPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <main className="max-w-7xl mx-auto px-4 py-8">
            <div className="text-center">
              <p className="text-gray-700">Loading...</p>
            </div>
          </main>
        </div>
      }
    >
      <AuditContent />
    </Suspense>
  );
}
