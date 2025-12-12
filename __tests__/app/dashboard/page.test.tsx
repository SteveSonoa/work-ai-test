import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DashboardPage from '@/app/dashboard/page';
import { requireAuth } from '@/lib/auth/session';
import {
  getDashboardStats,
  getRecentTransactions,
  getTransactionTrends,
  getVolumeTrends,
  getStatusBreakdown,
} from '@/lib/services/dashboard.service';
import { checkDatabaseHealth } from '@/lib/db/connection';

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@/lib/auth/session');
jest.mock('@/lib/services/dashboard.service');
jest.mock('@/lib/db/connection');
jest.mock('@/components/Navigation', () => ({
  Navigation: () => <div data-testid="navigation">Navigation</div>,
}));
jest.mock('@/components/DashboardCharts', () => ({
  __esModule: true,
  default: () => <div data-testid="dashboard-charts">Charts</div>,
}));

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockGetDashboardStats = getDashboardStats as jest.MockedFunction<typeof getDashboardStats>;
const mockGetRecentTransactions = getRecentTransactions as jest.MockedFunction<typeof getRecentTransactions>;
const mockCheckDatabaseHealth = checkDatabaseHealth as jest.MockedFunction<typeof checkDatabaseHealth>;
const mockGetTransactionTrends = getTransactionTrends as jest.MockedFunction<typeof getTransactionTrends>;
const mockGetVolumeTrends = getVolumeTrends as jest.MockedFunction<typeof getVolumeTrends>;
const mockGetStatusBreakdown = getStatusBreakdown as jest.MockedFunction<typeof getStatusBreakdown>;

describe('Dashboard Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ id: '1', email: 'test@test.com', first_name: 'Test', last_name: 'User', role: 'ADMIN' } as unknown as Awaited<ReturnType<typeof mockRequireAuth>>);
  });

  it('renders dashboard with all data', async () => {
    mockGetDashboardStats.mockResolvedValue({
      total_transactions: 100,
      pending_approvals: 5,
      completed_today: 10,
      total_volume_today: 50000,
      failed_transactions: 2,
      active_accounts: 50,
    });

    mockGetRecentTransactions.mockResolvedValue([
      {
        id: 'txn-1',
        from_account_id: 'acc-1',
        to_account_id: 'acc-2',
        amount: '1000.00',
        status: 'COMPLETED',
        created_at: new Date('2025-12-11'),
        from_account: { account_number: '12345' },
        to_account: { account_number: '67890' },
      } as unknown as Awaited<ReturnType<typeof mockGetRecentTransactions>>[0],
    ]);

    mockCheckDatabaseHealth.mockResolvedValue({
      healthy: true,
      message: 'Database is healthy',
      responseTime: 10,
    });

    mockGetTransactionTrends.mockResolvedValue([]);
    mockGetVolumeTrends.mockResolvedValue([]);
    mockGetStatusBreakdown.mockResolvedValue([]);

    const page = await DashboardPage();
    render(page);

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument(); // Total transactions
    expect(screen.getByText('5')).toBeInTheDocument(); // Pending approvals
    expect(screen.getByText('10')).toBeInTheDocument(); // Completed today
  });

  it('displays recent transactions table', async () => {
    mockGetDashboardStats.mockResolvedValue({
      total_transactions: 100,
      pending_approvals: 5,
      completed_today: 10,
      total_volume_today: 50000,
      failed_transactions: 2,
      active_accounts: 50,
    });

    mockGetRecentTransactions.mockResolvedValue([
      {
        id: 'txn-1',
        from_account_id: 'acc-1',
        to_account_id: 'acc-2',
        amount: '1000.50',
        status: 'COMPLETED',
        created_at: new Date('2025-12-11'),
        from_account: { account_number: '12345' },
        to_account: { account_number: '67890' },
      } as unknown as Awaited<ReturnType<typeof mockGetRecentTransactions>>[0],
    ]);

    mockCheckDatabaseHealth.mockResolvedValue({ healthy: true, message: 'Database is healthy' });
    mockGetTransactionTrends.mockResolvedValue([]);
    mockGetVolumeTrends.mockResolvedValue([]);
    mockGetStatusBreakdown.mockResolvedValue([]);

    const page = await DashboardPage();
    render(page);

    expect(screen.getByText('Recent Transactions')).toBeInTheDocument();
    expect(screen.getByText('12345')).toBeInTheDocument();
    expect(screen.getByText('67890')).toBeInTheDocument();
    expect(screen.getByText('$1,000.50')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('displays empty state when no transactions', async () => {
    mockGetDashboardStats.mockResolvedValue({
      total_transactions: 0,
      pending_approvals: 0,
      completed_today: 0,
      total_volume_today: 0,
      failed_transactions: 0,
      active_accounts: 0,
    });

    mockGetRecentTransactions.mockResolvedValue([]);
    mockCheckDatabaseHealth.mockResolvedValue({ healthy: true, message: 'Database is healthy' });
    mockGetTransactionTrends.mockResolvedValue([]);
    mockGetVolumeTrends.mockResolvedValue([]);
    mockGetStatusBreakdown.mockResolvedValue([]);

    const page = await DashboardPage();
    render(page);

    expect(screen.getByText('No recent transactions')).toBeInTheDocument();
  });

  it('displays database health status as healthy', async () => {
    mockGetDashboardStats.mockResolvedValue({
      total_transactions: 100,
      pending_approvals: 5,
      completed_today: 10,
      total_volume_today: 50000,
      failed_transactions: 2,
      active_accounts: 50,
    });

    mockGetRecentTransactions.mockResolvedValue([]);
    mockCheckDatabaseHealth.mockResolvedValue({
      healthy: true,
      message: 'Database is healthy',
      responseTime: 15,
    });
    mockGetTransactionTrends.mockResolvedValue([]);
    mockGetVolumeTrends.mockResolvedValue([]);
    mockGetStatusBreakdown.mockResolvedValue([]);

    const page = await DashboardPage();
    render(page);

    expect(screen.getByText('System Health')).toBeInTheDocument();
    expect(screen.getAllByText('✓ Healthy')[0]).toBeInTheDocument();
    expect(screen.getByText('15ms')).toBeInTheDocument();
  });

  it('displays database health status as unhealthy', async () => {
    mockGetDashboardStats.mockResolvedValue({
      total_transactions: 100,
      pending_approvals: 5,
      completed_today: 10,
      total_volume_today: 50000,
      failed_transactions: 2,
      active_accounts: 50,
    });

    mockGetRecentTransactions.mockResolvedValue([]);
    mockCheckDatabaseHealth.mockResolvedValue({
      healthy: false,
      message: 'Database is unhealthy',
    });
    mockGetTransactionTrends.mockResolvedValue([]);
    mockGetVolumeTrends.mockResolvedValue([]);
    mockGetStatusBreakdown.mockResolvedValue([]);

    const page = await DashboardPage();
    render(page);

    expect(screen.getByText('✗ Unhealthy')).toBeInTheDocument();
  });

  it('displays error state when data fetch fails', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockGetDashboardStats.mockRejectedValue(new Error('Database error'));

    const page = await DashboardPage();
    render(page);

    expect(screen.getByText('Failed to load dashboard data. Please make sure the database is running.')).toBeInTheDocument();
    
    consoleErrorSpy.mockRestore();
  });

  it('displays transaction status colors correctly', async () => {
    mockGetDashboardStats.mockResolvedValue({
      total_transactions: 100,
      pending_approvals: 5,
      completed_today: 10,
      total_volume_today: 50000,
      failed_transactions: 2,
      active_accounts: 50,
    });

    mockGetRecentTransactions.mockResolvedValue([
      {
        id: 'txn-1',
        amount: '1000.00',
        status: 'AWAITING_APPROVAL',
        created_at: new Date('2025-12-11'),
        from_account: { account_number: '12345' },
        to_account: { account_number: '67890' },
      } as unknown as Awaited<ReturnType<typeof mockGetRecentTransactions>>[0],
      {
        id: 'txn-2',
        amount: '2000.00',
        status: 'FAILED',
        created_at: new Date('2025-12-11'),
        from_account: { account_number: '11111' },
        to_account: { account_number: '22222' },
      } as unknown as Awaited<ReturnType<typeof mockGetRecentTransactions>>[0],
      {
        id: 'txn-3',
        amount: '3000.00',
        status: 'PENDING',
        created_at: new Date('2025-12-11'),
        from_account: { account_number: '33333' },
        to_account: { account_number: '44444' },
      } as unknown as Awaited<ReturnType<typeof mockGetRecentTransactions>>[0],
    ]);

    mockCheckDatabaseHealth.mockResolvedValue({ healthy: true, message: 'Database is healthy' });
    mockGetTransactionTrends.mockResolvedValue([]);
    mockGetVolumeTrends.mockResolvedValue([]);
    mockGetStatusBreakdown.mockResolvedValue([]);

    const page = await DashboardPage();
    render(page);

    expect(screen.getByText('AWAITING_APPROVAL')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('handles transactions with null account data', async () => {
    mockGetDashboardStats.mockResolvedValue({
      total_transactions: 100,
      pending_approvals: 5,
      completed_today: 10,
      total_volume_today: 50000,
      failed_transactions: 2,
      active_accounts: 50,
    });

    mockGetRecentTransactions.mockResolvedValue([
      {
        id: 'txn-1',
        amount: '1000.00',
        status: 'COMPLETED',
        created_at: new Date('2025-12-11'),
        from_account: null,
        to_account: null,
      } as unknown as Awaited<ReturnType<typeof mockGetRecentTransactions>>[0],
    ]);

    mockCheckDatabaseHealth.mockResolvedValue({ healthy: true, message: 'Database is healthy' });
    mockGetTransactionTrends.mockResolvedValue([]);
    mockGetVolumeTrends.mockResolvedValue([]);
    mockGetStatusBreakdown.mockResolvedValue([]);

    const page = await DashboardPage();
    render(page);

    expect(screen.getAllByText('N/A')).toHaveLength(2);
  });

  it('renders navigation component', async () => {
    mockGetDashboardStats.mockResolvedValue({
      total_transactions: 100,
      pending_approvals: 5,
      completed_today: 10,
      total_volume_today: 50000,
      failed_transactions: 2,
      active_accounts: 50,
    });

    mockGetRecentTransactions.mockResolvedValue([]);
    mockCheckDatabaseHealth.mockResolvedValue({ healthy: true, message: 'Database is healthy' });
    mockGetTransactionTrends.mockResolvedValue([]);
    mockGetVolumeTrends.mockResolvedValue([]);
    mockGetStatusBreakdown.mockResolvedValue([]);

    const page = await DashboardPage();
    render(page);

    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  it('renders dashboard charts', async () => {
    mockGetDashboardStats.mockResolvedValue({
      total_transactions: 100,
      pending_approvals: 5,
      completed_today: 10,
      total_volume_today: 50000,
      failed_transactions: 2,
      active_accounts: 50,
    });

    mockGetRecentTransactions.mockResolvedValue([]);
    mockCheckDatabaseHealth.mockResolvedValue({ healthy: true, message: 'Database is healthy' });
    mockGetTransactionTrends.mockResolvedValue([]);
    mockGetVolumeTrends.mockResolvedValue([]);
    mockGetStatusBreakdown.mockResolvedValue([]);

    const page = await DashboardPage();
    render(page);

    expect(screen.getByTestId('dashboard-charts')).toBeInTheDocument();
  });
});
