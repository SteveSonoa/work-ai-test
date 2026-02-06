import { notFound } from 'next/navigation';
import { requireAuth } from '@/lib/auth/session';
import { getAccountById } from '@/lib/services/account.service';
import { query } from '@/lib/db/connection';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { Navigation } from '@/components/Navigation';
import Link from 'next/link';

interface Transaction {
  id: string;
  from_account_id: string;
  to_account_id: string;
  amount: string;
  status: string;
  created_at: string;
  from_account_number?: string;
  to_account_number?: string;
}

async function getAccountTransactions(accountId: string): Promise<Transaction[]> {
  const result = await query<Transaction>(
    `SELECT 
      t.id,
      t.from_account_id,
      t.to_account_id,
      t.amount,
      t.status,
      t.created_at,
      fa.account_number as from_account_number,
      ta.account_number as to_account_number
    FROM "ai-transactions" t
    LEFT JOIN "ai-accounts" fa ON t.from_account_id = fa.id
    LEFT JOIN "ai-accounts" ta ON t.to_account_id = ta.id
    WHERE t.from_account_id = $1 OR t.to_account_id = $1
    ORDER BY t.created_at DESC
    LIMIT 100`,
    [accountId]
  );

  return result.rows;
}

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const account = await getAccountById(id);

  if (!account) {
    notFound();
  }

  const transactions = await getAccountTransactions(id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/accounts"
            className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
          >
            ← Back to Accounts
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Account Details</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Account Information
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-700">Account Number</dt>
                <dd className="text-lg font-semibold text-gray-900">
                  {account.account_number}
                </dd>
              </div>

              <div>
                <dt className="text-sm font-medium text-gray-700">Name</dt>
                <dd className="text-lg text-gray-900">{account.account_name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-700">Status</dt>
                <dd>
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      account.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {account.is_active ? 'Active' : 'Inactive'}
                  </span>
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Balance</h2>
            <p className="text-4xl font-bold text-gray-900">
              ${account.balance.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="text-sm text-gray-700 mt-2">Current Balance</p>
          </Card>
        </div>

        <Card>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              Transaction History
            </h2>
            <span className="text-sm text-gray-700">
              Last 100 transactions
            </span>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-700">No transactions found</p>
            </div>
          ) : (
            <Table
              columns={[
                { key: 'date', label: 'Date' },
                { key: 'type', label: 'Type' },
                { key: 'account', label: 'Account' },
                { key: 'amount', label: 'Amount' },
                { key: 'status', label: 'Status' },
                { key: 'actions', label: 'Actions' },
              ]}
              data={transactions.map((tx) => {
                const isDebit = tx.from_account_id === id;
                return {
                  id: tx.id,
                  date: new Date(tx.created_at).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }),
                  type: (
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        isDebit
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {isDebit ? 'Debit' : 'Credit'}
                    </span>
                  ),
                  account: isDebit ? tx.to_account_number : tx.from_account_number,
                  amount: (
                    <span
                      className={`font-semibold ${
                        isDebit ? 'text-red-600' : 'text-green-600'
                      }`}
                    >
                      {isDebit ? '-' : '+'}$
                      {parseFloat(tx.amount).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  ),
                  status: (
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        tx.status === 'COMPLETED'
                          ? 'bg-green-100 text-green-800'
                          : tx.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-800'
                          : tx.status === 'APPROVED'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {tx.status}
                    </span>
                  ),
                  actions: (
                    <Link
                      href={`/transactions/${tx.id}`}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      View Status →
                    </Link>
                  ),
                };
              })}
            />
          )}
        </Card>
      </main>
    </div>
  );
}
