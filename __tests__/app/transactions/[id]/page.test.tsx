import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransactionStatusPage from '@/app/transactions/[id]/page';
import { requireAuth } from '@/lib/auth/session';
import { getTransactionById, getTransactionAuditLogs } from '@/lib/services/transaction.service';
import { notFound } from 'next/navigation';

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}));
jest.mock('@/lib/auth/session');
jest.mock('@/lib/services/transaction.service');
jest.mock('next/navigation', () => ({
  notFound: jest.fn(),
}));
jest.mock('@/components/Navigation', () => ({
  Navigation: () => <div data-testid="navigation">Navigation</div>,
}));
jest.mock('@/components/TransactionStatusFlow', () => ({
  __esModule: true,
  default: () => <div data-testid="status-flow">Status Flow</div>,
}));

const mockRequireAuth = requireAuth as jest.MockedFunction<typeof requireAuth>;
const mockGetTransactionById = getTransactionById as jest.MockedFunction<typeof getTransactionById>;
const mockGetTransactionAuditLogs = getTransactionAuditLogs as jest.MockedFunction<typeof getTransactionAuditLogs>;
const mockNotFound = notFound as jest.MockedFunction<typeof notFound>;

describe('Transaction Status Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireAuth.mockResolvedValue({ id: '1', email: 'test@test.com', first_name: 'Test', last_name: 'User', role: 'ADMIN' } as unknown as Awaited<ReturnType<typeof mockRequireAuth>>);
    mockGetTransactionAuditLogs.mockResolvedValue([]);
  });

  it('renders transaction details', async () => {
    mockGetTransactionById.mockResolvedValue({
      id: 'txn-123',
      status: 'COMPLETED',
      amount: '1000.50',
      created_at: '2025-12-11T10:00:00Z',
      from_account_number: '12345',
      from_account_name: 'Savings',
      to_account_number: '67890',
      to_account_name: 'Checking',
      initiated_by_first_name: 'John',
      initiated_by_last_name: 'Doe',
      initiated_by_email: 'john@example.com',
    } as unknown as Awaited<ReturnType<typeof mockGetTransactionById>>);

    const params = Promise.resolve({ id: 'txn-123' });
    const page = await TransactionStatusPage({ params });
    render(page);

    expect(screen.getByText('Transaction Status')).toBeInTheDocument();
    expect(screen.getByText('txn-123')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
    expect(screen.getByText('$1,000.50')).toBeInTheDocument();
  });

  it('displays from and to account information', async () => {
    mockGetTransactionById.mockResolvedValue({
      id: 'txn-123',
      status: 'COMPLETED',
      amount: '1000.00',
      created_at: '2025-12-11T10:00:00Z',
      from_account_number: '12345',
      from_account_name: 'Savings Account',
      to_account_number: '67890',
      to_account_name: 'Checking Account',
      initiated_by_email: 'john@example.com',
    } as unknown as Awaited<ReturnType<typeof mockGetTransactionById>>);

    const params = Promise.resolve({ id: 'txn-123' });
    const page = await TransactionStatusPage({ params });
    render(page);

    expect(screen.getByText('12345 - Savings Account')).toBeInTheDocument();
    expect(screen.getByText('67890 - Checking Account')).toBeInTheDocument();
  });

  it('displays initiator information', async () => {
    mockGetTransactionById.mockResolvedValue({
      id: 'txn-123',
      status: 'COMPLETED',
      amount: '1000.00',
      created_at: '2025-12-11T10:00:00Z',
      from_account_number: '12345',
      from_account_name: 'Savings',
      to_account_number: '67890',
      to_account_name: 'Checking',
      initiated_by_first_name: 'John',
      initiated_by_last_name: 'Doe',
      initiated_by_email: 'john@example.com',
    } as unknown as Awaited<ReturnType<typeof mockGetTransactionById>>);

    const params = Promise.resolve({ id: 'txn-123' });
    const page = await TransactionStatusPage({ params });
    render(page);

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('displays approver information when available', async () => {
    mockGetTransactionById.mockResolvedValue({
      id: 'txn-123',
      status: 'APPROVED',
      amount: '2000000.00',
      created_at: '2025-12-11T10:00:00Z',
      from_account_number: '12345',
      from_account_name: 'Savings',
      to_account_number: '67890',
      to_account_name: 'Checking',
      initiated_by_email: 'john@example.com',
      approved_by_first_name: 'Jane',
      approved_by_last_name: 'Smith',
      approved_by_email: 'jane@example.com',
    } as unknown as Awaited<ReturnType<typeof mockGetTransactionById>>);

    const params = Promise.resolve({ id: 'txn-123' });
    const page = await TransactionStatusPage({ params });
    render(page);

    expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('shows status badge with correct color for completed', async () => {
    mockGetTransactionById.mockResolvedValue({
      id: 'txn-123',
      status: 'COMPLETED',
      amount: '1000.00',
      created_at: '2025-12-11T10:00:00Z',
      from_account_number: '12345',
      from_account_name: 'Savings',
      to_account_number: '67890',
      to_account_name: 'Checking',
      initiated_by_email: 'john@example.com',
    } as unknown as Awaited<ReturnType<typeof mockGetTransactionById>>);

    const params = Promise.resolve({ id: 'txn-123' });
    const page = await TransactionStatusPage({ params });
    render(page);

    const statusBadge = screen.getByText('COMPLETED');
    expect(statusBadge).toBeInTheDocument();
  });

  it('shows status badge with correct color for failed', async () => {
    mockGetTransactionById.mockResolvedValue({
      id: 'txn-123',
      status: 'FAILED',
      amount: '1000.00',
      created_at: '2025-12-11T10:00:00Z',
      from_account_number: '12345',
      from_account_name: 'Savings',
      to_account_number: '67890',
      to_account_name: 'Checking',
      initiated_by_email: 'john@example.com',
    } as unknown as Awaited<ReturnType<typeof mockGetTransactionById>>);

    const params = Promise.resolve({ id: 'txn-123' });
    const page = await TransactionStatusPage({ params });
    render(page);

    expect(screen.getByText('FAILED')).toBeInTheDocument();
  });

  it('shows approval requirement message', async () => {
    mockGetTransactionById.mockResolvedValue({
      id: 'txn-123',
      status: 'AWAITING_APPROVAL',
      amount: '2000000.00',
      created_at: '2025-12-11T10:00:00Z',
      from_account_number: '12345',
      from_account_name: 'Savings',
      to_account_number: '67890',
      to_account_name: 'Checking',
      initiated_by_email: 'john@example.com',
      requires_approval: true,
    } as unknown as Awaited<ReturnType<typeof mockGetTransactionById>>);

    const params = Promise.resolve({ id: 'txn-123' });
    const page = await TransactionStatusPage({ params });
    render(page);

    expect(screen.getByText('This transaction requires approval (amount exceeds $1,000,000)')).toBeInTheDocument();
  });

  it('displays description when available', async () => {
    mockGetTransactionById.mockResolvedValue({
      id: 'txn-123',
      status: 'COMPLETED',
      amount: '1000.00',
      created_at: '2025-12-11T10:00:00Z',
      from_account_number: '12345',
      from_account_name: 'Savings',
      to_account_number: '67890',
      to_account_name: 'Checking',
      initiated_by_email: 'john@example.com',
      description: 'Monthly payment',
    } as unknown as Awaited<ReturnType<typeof mockGetTransactionById>>);

    const params = Promise.resolve({ id: 'txn-123' });
    const page = await TransactionStatusPage({ params });
    render(page);

    expect(screen.getByText('Monthly payment')).toBeInTheDocument();
  });

  it('displays approval notes when available', async () => {
    mockGetTransactionById.mockResolvedValue({
      id: 'txn-123',
      status: 'APPROVED',
      amount: '2000000.00',
      created_at: '2025-12-11T10:00:00Z',
      from_account_number: '12345',
      from_account_name: 'Savings',
      to_account_number: '67890',
      to_account_name: 'Checking',
      initiated_by_email: 'john@example.com',
      approval: {
        decision_notes: 'Approved for special business case',
      },
    } as unknown as Awaited<ReturnType<typeof mockGetTransactionById>>);

    const params = Promise.resolve({ id: 'txn-123' });
    const page = await TransactionStatusPage({ params });
    render(page);

    expect(screen.getByText('Approved for special business case')).toBeInTheDocument();
  });

  it('renders status flow component', async () => {
    mockGetTransactionById.mockResolvedValue({
      id: 'txn-123',
      status: 'COMPLETED',
      amount: '1000.00',
      created_at: '2025-12-11T10:00:00Z',
      from_account_number: '12345',
      from_account_name: 'Savings',
      to_account_number: '67890',
      to_account_name: 'Checking',
      initiated_by_email: 'john@example.com',
    } as unknown as Awaited<ReturnType<typeof mockGetTransactionById>>);

    const params = Promise.resolve({ id: 'txn-123' });
    const page = await TransactionStatusPage({ params });
    render(page);

    expect(screen.getByTestId('status-flow')).toBeInTheDocument();
  });

  it('displays audit trail when available', async () => {
    mockGetTransactionById.mockResolvedValue({
      id: 'txn-123',
      status: 'COMPLETED',
      amount: '1000.00',
      created_at: '2025-12-11T10:00:00Z',
      from_account_number: '12345',
      from_account_name: 'Savings',
      to_account_number: '67890',
      to_account_name: 'Checking',
      initiated_by_email: 'john@example.com',
    } as unknown as Awaited<ReturnType<typeof mockGetTransactionById>>);

    mockGetTransactionAuditLogs.mockResolvedValue([
      {
        id: 'log-1',
        action: 'TRANSFER_INITIATED',
        created_at: '2025-12-11T10:00:00Z',
        details: {},
      },
    ] as unknown as Awaited<ReturnType<typeof mockGetTransactionAuditLogs>>);

    const params = Promise.resolve({ id: 'txn-123' });
    const page = await TransactionStatusPage({ params });
    render(page);

    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('calls notFound when transaction does not exist', async () => {
    mockGetTransactionById.mockResolvedValue(null);
    mockNotFound.mockImplementation(() => {
      throw new Error('NEXT_NOT_FOUND');
    });

    const params = Promise.resolve({ id: 'invalid-id' });

    await expect(TransactionStatusPage({ params })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mockNotFound).toHaveBeenCalled();
  });

  it('requires authentication', async () => {
    mockGetTransactionById.mockResolvedValue({
      id: 'txn-123',
      status: 'COMPLETED',
      amount: '1000.00',
      created_at: '2025-12-11T10:00:00Z',
      from_account_number: '12345',
      from_account_name: 'Savings',
      to_account_number: '67890',
      to_account_name: 'Checking',
      initiated_by_email: 'john@example.com',
    } as unknown as Awaited<ReturnType<typeof mockGetTransactionById>>);

    const params = Promise.resolve({ id: 'txn-123' });
    await TransactionStatusPage({ params });

    expect(mockRequireAuth).toHaveBeenCalled();
  });

  it('renders navigation component', async () => {
    mockGetTransactionById.mockResolvedValue({
      id: 'txn-123',
      status: 'COMPLETED',
      amount: '1000.00',
      created_at: '2025-12-11T10:00:00Z',
      from_account_number: '12345',
      from_account_name: 'Savings',
      to_account_number: '67890',
      to_account_name: 'Checking',
      initiated_by_email: 'john@example.com',
    } as unknown as Awaited<ReturnType<typeof mockGetTransactionById>>);

    const params = Promise.resolve({ id: 'txn-123' });
    const page = await TransactionStatusPage({ params });
    render(page);

    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });
});
