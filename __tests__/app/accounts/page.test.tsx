import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AccountsPage from '@/app/accounts/page';
import { requireAuth } from '@/lib/auth/session';
import { getAllAccounts } from '@/lib/services/account.service';

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@/lib/auth/session');
jest.mock('@/lib/services/account.service');
jest.mock('@/components/Navigation', () => ({
  Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockGetAllAccounts = getAllAccounts as jest.MockedFunction<typeof getAllAccounts>;

describe('Accounts Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ id: '1', email: 'test@test.com', first_name: 'Test', last_name: 'User', role: 'ADMIN' } as unknown as Awaited<ReturnType<typeof mockRequireAuth>>);
  });

  it('renders accounts list', async () => {
    mockGetAllAccounts.mockResolvedValue([
      {
        id: '1',
        account_name: 'Savings Account',
        account_number: '12345',
        balance: '10000.50',
        minimum_balance: '1000.00',
      } as unknown as Awaited<ReturnType<typeof mockGetAllAccounts>>[0],
      {
        id: '2',
        account_name: 'Checking Account',
        account_number: '67890',
        balance: '5000.25',
        minimum_balance: '500.00',
      } as unknown as Awaited<ReturnType<typeof mockGetAllAccounts>>[0],
    ]);

    const page = await AccountsPage();
    render(page);

    expect(screen.getByText('Bank Accounts')).toBeInTheDocument();
    expect(screen.getByText('Savings Account')).toBeInTheDocument();
    expect(screen.getByText('12345')).toBeInTheDocument();
    expect(screen.getByText('$10,000.50')).toBeInTheDocument();
    expect(screen.getByText('Minimum Balance: $1,000.00')).toBeInTheDocument();
    expect(screen.getByText('Checking Account')).toBeInTheDocument();
    expect(screen.getByText('67890')).toBeInTheDocument();
  });

  it('renders navigation component', async () => {
    mockGetAllAccounts.mockResolvedValue([]);

    const page = await AccountsPage();
    render(page);

    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  it('renders empty state when no accounts', async () => {
    mockGetAllAccounts.mockResolvedValue([]);

    const page = await AccountsPage();
    const { container } = render(page);

    expect(screen.getByText('Bank Accounts')).toBeInTheDocument();
    const accountCards = container.querySelectorAll('a[href^="/accounts/"]');
    expect(accountCards).toHaveLength(0);
  });

  it('creates links to account detail pages', async () => {
    mockGetAllAccounts.mockResolvedValue([
      {
        id: 'acc-123',
        account_name: 'Test Account',
        account_number: '11111',
        balance: '1000.00',
        minimum_balance: '100.00',
      } as unknown as Awaited<ReturnType<typeof mockGetAllAccounts>>[0],
    ]);

    const page = await AccountsPage();
    const { container } = render(page);

    const link = container.querySelector('a[href="/accounts/acc-123"]');
    expect(link).toBeInTheDocument();
  });

  it('requires authentication', async () => {
    mockGetAllAccounts.mockResolvedValue([]);

    await AccountsPage();

    expect(mockRequireAuth).toHaveBeenCalled();
  });
});
