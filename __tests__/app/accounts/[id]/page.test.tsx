import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccountDetailPage from '@/app/accounts/[id]/page';
import { requireAuth } from '@/lib/auth/session';
import { getAccountById } from '@/lib/services/account.service';
import { query } from '@/lib/db/connection';
import { notFound } from 'next/navigation';

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@/lib/auth/session');
jest.mock('@/lib/services/account.service');
jest.mock('@/lib/db/connection');
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
}));
jest.mock('@/components/Navigation', () => ({
  Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockGetAccountById = getAccountById as jest.MockedFunction<typeof getAccountById>;
const mockQuery = query as jest.MockedFunction<typeof query>;
const mockNotFound = notFound as jest.MockedFunction<typeof notFound>;

describe('Account Detail Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ id: '1', email: 'test@test.com', first_name: 'Test', last_name: 'User', role: 'ADMIN' } as unknown as Awaited<ReturnType<typeof mockRequireAuth>>);
  });

  it('renders account details', async () => {
    mockGetAccountById.mockResolvedValue({
      id: 'acc-1',
      account_number: '12345',
      account_name: 'Savings Account',
      balance: 10000.50,
      minimum_balance: 1000.00,
      is_active: true,
    } as unknown as Awaited<ReturnType<typeof mockGetAccountById>>);

    mockQuery.mockResolvedValue({ rows: [] } as unknown as Awaited<ReturnType<typeof query>>);

    const params = Promise.resolve({ id: 'acc-1' });
    const page = await AccountDetailPage({ params });
    render(page);

    expect(screen.getByText('Account Details')).toBeInTheDocument();
    expect(screen.getByText('12345')).toBeInTheDocument();
    expect(screen.getByText('Savings Account')).toBeInTheDocument();
    expect(screen.getByText(/10,000\.50/)).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('displays transaction history', async () => {
    mockGetAccountById.mockResolvedValue({
      id: 'acc-1',
      account_number: '12345',
      account_name: 'Savings Account',
      balance: 10000.50,
      is_active: true,
    } as Awaited<ReturnType<typeof mockGetAccountById>>);

    mockQuery.mockResolvedValue({
      rows: [
        {
          id: 'txn-1',
          from_account_id: 'acc-1',
          to_account_id: 'acc-2',
          amount: '1000.00',
          status: 'COMPLETED',
          created_at: '2025-12-11',
          from_account_number: '12345',
          to_account_number: '67890',
        },
      ],
    } as unknown as Awaited<ReturnType<typeof mockQuery>>);

    const params = Promise.resolve({ id: 'acc-1' });
    const page = await AccountDetailPage({ params });
    render(page);

    expect(screen.getByText('Transaction History')).toBeInTheDocument();
  });

  it('shows inactive status badge', async () => {
    mockGetAccountById.mockResolvedValue({
      id: 'acc-1',
      account_number: '12345',
      account_name: 'Savings Account',
      balance: 10000.50,
      is_active: false,
    } as unknown as Awaited<ReturnType<typeof mockGetAccountById>>);

    mockQuery.mockResolvedValue({ rows: [] } as unknown as Awaited<ReturnType<typeof mockQuery>>);

    const params = Promise.resolve({ id: 'acc-1' });
    const page = await AccountDetailPage({ params });
    render(page);

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('shows empty state when no transactions', async () => {
    mockGetAccountById.mockResolvedValue({
      id: 'acc-1',
      account_number: '12345',
      account_name: 'Savings Account',
      balance: 10000.50,
      is_active: true,
    } as unknown as Awaited<ReturnType<typeof mockGetAccountById>>);

    mockQuery.mockResolvedValue({ rows: [] } as unknown as Awaited<ReturnType<typeof mockQuery>>);

    const params = Promise.resolve({ id: 'acc-1' });
    const page = await AccountDetailPage({ params });
    render(page);

    expect(screen.getByText('No transactions found')).toBeInTheDocument();
  });

  it('calls notFound when account does not exist', async () => {
    mockGetAccountById.mockResolvedValue(null);
    mockNotFound.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });

    const params = Promise.resolve({ id: 'invalid-id' });

    await expect(AccountDetailPage({ params })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    mockGetAccountById.mockResolvedValue({
      id: 'acc-1',
      account_number: '12345',
      account_name: 'Savings Account',
      balance: 10000.50,
      is_active: true,
    } as unknown as Awaited<ReturnType<typeof mockGetAccountById>>);

    mockQuery.mockResolvedValue({ rows: [] } as unknown as Awaited<ReturnType<typeof query>>);

    const params = Promise.resolve({ id: 'acc-1' });
    await AccountDetailPage({ params });

    expect(mockRequireAuth).toHaveBeenCalled();
  });

  it('renders navigation component', async () => {
    mockGetAccountById.mockResolvedValue({
      id: 'acc-1',
      account_number: '12345',
      account_name: 'Savings Account',
      balance: 10000.50,
      is_active: true,
    } as unknown as Awaited<ReturnType<typeof mockGetAccountById>>);

    mockQuery.mockResolvedValue({ rows: [] } as unknown as Awaited<ReturnType<typeof query>>);

    const params = Promise.resolve({ id: 'acc-1' });
    const page = await AccountDetailPage({ params });
    render(page);

    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  it('displays back to accounts link', async () => {
    mockGetAccountById.mockResolvedValue({
      id: 'acc-1',
      account_number: '12345',
      account_name: 'Savings Account',
      balance: 10000.50,
      is_active: true,
    } as unknown as Awaited<ReturnType<typeof mockGetAccountById>>);

    mockQuery.mockResolvedValue({ rows: [] } as unknown as Awaited<ReturnType<typeof query>>);

    const params = Promise.resolve({ id: 'acc-1' });
    const page = await AccountDetailPage({ params });
    render(page);

    expect(screen.getByText('← Back to Accounts')).toBeInTheDocument();
  });
});
