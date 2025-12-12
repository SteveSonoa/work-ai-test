import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import {
  getTransactionById,
  getTransactionAuditLogs,
} from '@/lib/services/transaction.service';
import { formatCurrency, formatDate } from '@/lib/utils/format';
import { Card } from '@/components/ui/Card';
import TransactionStatusFlow from '@/components/TransactionStatusFlow';
import { Navigation } from '@/components/Navigation';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TransactionStatusPage({ params }: PageProps) {
  await requireAuth();
  const { id } = await params;

  // Fetch transaction details
  const transaction = await getTransactionById(id);

  if (!transaction) {
    notFound();
  }

  // Fetch audit logs for this transaction
  const auditLogs = await getTransactionAuditLogs(id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="max-w-5xl mx-auto p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Transaction Status</h1>
          <p className="text-gray-700">Track the progress of your transfer</p>
        </div>

        {/* Transaction Details Card */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-700">Transaction ID</p>
              <p className="font-mono text-sm text-gray-900">{transaction.id}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700">Status</p>
              <p className="font-semibold">
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm ${
                    transaction.status === 'COMPLETED'
                      ? 'bg-green-100 text-green-800'
                      : transaction.status === 'FAILED' || transaction.status === 'REJECTED'
                      ? 'bg-red-100 text-red-800'
                      : transaction.status === 'AWAITING_APPROVAL'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {transaction.status}
                </span>
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-700">Amount</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(transaction.amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700">Created</p>
              <p className="text-gray-900">{formatDate(transaction.created_at)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-700">From Account</p>
              <p className="font-semibold text-gray-900">
                {transaction.from_account_number} - {transaction.from_account_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-700">To Account</p>
              <p className="font-semibold text-gray-900">
                {transaction.to_account_number} - {transaction.to_account_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-700">Initiated By</p>
              <p className="text-gray-900">
                {transaction.initiated_by_first_name && transaction.initiated_by_last_name 
                  ? `${transaction.initiated_by_first_name} ${transaction.initiated_by_last_name}` 
                  : transaction.initiated_by_email || 'Unknown'}
              </p>
              {transaction.initiated_by_email && (
                <p className="text-xs text-gray-700">{transaction.initiated_by_email}</p>
              )}
            </div>
            {transaction.approved_by_email && (
              <div>
                <p className="text-sm text-gray-700">Approved By</p>
                <p className="text-gray-900">
                  {transaction.approved_by_first_name && transaction.approved_by_last_name 
                    ? `${transaction.approved_by_first_name} ${transaction.approved_by_last_name}` 
                    : transaction.approved_by_email}
                </p>
                <p className="text-xs text-gray-700">{transaction.approved_by_email}</p>
              </div>
            )}
            {transaction.description && (
              <div className="col-span-2">
                <p className="text-sm text-gray-700">Description</p>
                <p className="text-gray-900">{transaction.description}</p>
              </div>
            )}
            {transaction.requires_approval && (
              <div className="col-span-2">
                <p className="text-sm text-gray-700">Approval Status</p>
                <p className="text-sm text-gray-900">
                  This transaction requires approval (amount exceeds $1,000,000)
                </p>
              </div>
            )}
            {transaction.approval?.decision_notes && (
              <div className="col-span-2">
                <p className="text-sm text-gray-700">Approval Notes</p>
                <p className="text-sm italic text-gray-900">{transaction.approval.decision_notes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Status Flow Visualization */}
        <Card className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Transfer Progress</h2>
          <TransactionStatusFlow
            transactionStatus={transaction.status}
            requiresApproval={transaction.requires_approval}
            errorMessage={transaction.error_message}
            createdAt={transaction.created_at}
            approvedAt={transaction.approved_at}
            completedAt={transaction.completed_at}
          />
        </Card>

        {/* Audit Trail */}
        {auditLogs.length > 0 && (
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Audit Trail</h2>
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="border-l-4 border-blue-500 pl-4 py-2 bg-gray-50 rounded"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-700">
                        by System
                      </p>
                      {log.details && (
                        <details className="mt-1">
                          <summary className="text-xs text-blue-600 cursor-pointer hover:underline">
                            View details
                          </summary>
                          <pre className="text-xs text-gray-900 mt-1 bg-white p-2 rounded border overflow-x-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                    <span className="text-xs text-gray-700">
                      {formatDate(log.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
