'use client';

import { useState, useEffect } from 'react';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TransactionWithDetails } from '@/lib/types/database';

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<TransactionWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchApprovals();
  }, []);

  const fetchApprovals = async () => {
    try {
      const response = await fetch('/api/approvals/pending');
      const data = await response.json();
      setApprovals(data.approvals || []);
    } catch {
      setError('Failed to load approvals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = async (transactionId: string, decision: 'APPROVED' | 'REJECTED') => {
    setProcessingId(transactionId);
    setError('');

    try {
      const response = await fetch('/api/approvals/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId, decision }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      // Refresh approvals
      await fetchApprovals();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Pending Approvals</h1>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6" role="alert">
            {error}
          </div>
        )}

        {isLoading ? (
          <Card>
            <p className="text-gray-500 text-center">Loading approvals...</p>
          </Card>
        ) : approvals.length === 0 ? (
          <Card>
            <p className="text-gray-500 text-center">No pending approvals</p>
          </Card>
        ) : (
          <div className="space-y-6">
            {approvals.map((approval) => (
              <Card key={approval.id}>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Transfer Request</h3>
                      <p className="text-sm text-gray-700">
                        Initiated by {approval.initiator?.first_name} {approval.initiator?.last_name} ({approval.initiator?.email || 'Unknown'})
                      </p>
                    </div>
                    <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">
                      Awaiting Approval
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4 border-t border-b border-gray-200">
                    <div>
                      <p className="text-sm font-medium text-gray-700">From Account</p>
                      <p className="text-sm text-gray-900">{approval.from_account?.account_number || 'N/A'}</p>
                      <p className="text-xs text-gray-800">{approval.from_account?.account_name || ''}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-700">To Account</p>
                      <p className="text-xs text-gray-900">{approval.to_account?.account_number || 'N/A'}</p>
                      <p className="text-xs text-gray-800">{approval.to_account?.account_name || ''}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-700">Amount</p>
                    <p className="text-3xl font-bold text-gray-900">
                      ${Number(approval.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>

                  {approval.description && (
                    <div>
                      <p className="text-sm font-medium text-gray-700">Description</p>
                      <p className="text-sm text-gray-900">{approval.description}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-sm font-medium text-gray-700">Requested On</p>
                    <p className="text-sm text-gray-900">{new Date(approval.created_at).toLocaleString()}</p>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <Button
                      variant="success"
                      onClick={() => handleApproval(approval.id, 'APPROVED')}
                      disabled={processingId !== null}
                      isLoading={processingId === approval.id}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => handleApproval(approval.id, 'REJECTED')}
                      disabled={processingId !== null}
                      isLoading={processingId === approval.id}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
