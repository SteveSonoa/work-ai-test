import { requireAuth } from '@/lib/auth/session';
import { Navigation } from '@/components/Navigation';
import { Card } from '@/components/ui/Card';
import {
  getDashboardStats,
  getRecentTransactions,
  getTransactionTrends,
  getVolumeTrends,
  getStatusBreakdown,
} from '@/lib/services/dashboard.service';
import { checkDatabaseHealth } from '@/lib/db/connection';
import DashboardCharts from '@/components/DashboardCharts';

async function getDashboardData() {
  try {
    const days = 28; // Default to 28 days
    const [stats, recentTransactions, dbHealth, transactionTrends, volumeTrends, statusBreakdown] = await Promise.all([
      getDashboardStats(),
      getRecentTransactions(10),
      checkDatabaseHealth(),
      getTransactionTrends(days),
      getVolumeTrends(days),
      getStatusBreakdown(days),
    ]);

    return {
      stats,
      recent_transactions: recentTransactions,
      health: {
        database: dbHealth,
        api: {
          healthy: true,
        },
      },
      charts: {
        transactionTrends,
        volumeTrends,
        statusBreakdown,
        days,
      },
    };
  } catch (error) {
    console.error('Dashboard data fetch error:', error);
    return null;
  }
}

export default async function DashboardPage() {
  await requireAuth();
  const data = await getDashboardData();

  if (!data) {
    return (
      <>
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg" role="alert">
            Failed to load dashboard data. Please make sure the database is running.
          </div>
        </main>
      </>
    );
  }

  const { stats, recent_transactions, health, charts } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* Charts Section */}
        <DashboardCharts
          initialTransactionTrends={charts.transactionTrends}
          initialVolumeTrends={charts.volumeTrends}
          initialStatusBreakdown={charts.statusBreakdown}
          initialDays={charts.days}
        />

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8 mt-8">
          <Card title="Total Transactions" className="bg-blue-50 border-blue-200">
            <p className="text-4xl font-bold text-blue-900">{stats.total_transactions.toLocaleString()}</p>
          </Card>

          <Card title="Pending Approvals" className="bg-yellow-50 border-yellow-200">
            <p className="text-4xl font-bold text-yellow-900">{stats.pending_approvals.toLocaleString()}</p>
          </Card>

          <Card title="Completed Today" className="bg-green-50 border-green-200">
            <p className="text-4xl font-bold text-green-900">{stats.completed_today.toLocaleString()}</p>
          </Card>

          <Card title="Volume Today" className="bg-purple-50 border-purple-200">
            <p className="text-4xl font-bold text-purple-900">
              ${stats.total_volume_today.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </Card>

          <Card title="Failed Transactions" className="bg-red-50 border-red-200">
            <p className="text-4xl font-bold text-red-900">{stats.failed_transactions.toLocaleString()}</p>
          </Card>

          <Card title="Active Accounts" className="bg-indigo-50 border-indigo-200">
            <p className="text-4xl font-bold text-indigo-900">{stats.active_accounts.toLocaleString()}</p>
          </Card>
        </div>

        {/* System Health */}
        <Card title="System Health" className="mb-8">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Database</span>
              <div className="flex items-center">
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    health.database.healthy ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {health.database.healthy ? '✓ Healthy' : '✗ Unhealthy'}
                </span>
                {health.database.responseTime && (
                  <span className="ml-2 text-xs text-gray-700">
                    {health.database.responseTime}ms
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">API</span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                ✓ Healthy
              </span>
            </div>
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card title="Recent Transactions">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200" aria-label="Recent transactions">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    From
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    To
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recent_transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-700">
                      No recent transactions
                    </td>
                  </tr>
                ) : (
                  recent_transactions.map((txn) => (
                    <tr key={txn.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {txn.from_account?.account_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {txn.to_account?.account_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${Number(txn.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            txn.status === 'COMPLETED'
                              ? 'bg-green-100 text-green-800'
                              : txn.status === 'AWAITING_APPROVAL'
                              ? 'bg-yellow-100 text-yellow-800'
                              : txn.status === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {txn.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(txn.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </main>
    </div>
  );
}
