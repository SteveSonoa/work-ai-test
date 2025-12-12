import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApprovalsPage from '@/app/approvals/page';

jest.mock('@/components/Navigation', () => ({
  Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

describe('Approvals Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('renders pending approvals', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        approvals: [
          {
            id: 'txn-1',
            amount: '1000.00',
            status: 'AWAITING_APPROVAL',
            created_at: new Date('2025-12-11').toISOString(),
            initiator: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
            from_account: { account_number: '12345', account_name: 'Savings' },
            to_account: { account_number: '67890', account_name: 'Checking' },
            description: 'Test transfer',
          },
        ],
      }),
    });

    render(<ApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Pending Approvals')).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(screen.getByText('Transfer Request')).toBeInTheDocument();
    }, { timeout: 3000 });
    expect(screen.getByText(/Initiated by John Doe/)).toBeInTheDocument();
    expect(screen.getByText('12345')).toBeInTheDocument();
    expect(screen.getByText('67890')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    expect(screen.getByText('Test transfer')).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));

    render(<ApprovalsPage />);

    expect(screen.getByText('Loading approvals...')).toBeInTheDocument();
  });

  it('shows empty state when no approvals', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ approvals: [] }),
    });

    render(<ApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText('No pending approvals')).toBeInTheDocument();
    });
  });

  it('handles approval action', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          approvals: [
            {
              id: 'txn-1',
              amount: '1000.00',
              created_at: new Date().toISOString(),
              initiator: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
              from_account: { account_number: '12345', account_name: 'Savings' },
              to_account: { account_number: '67890', account_name: 'Checking' },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ approvals: [] }),
      });

    render(<ApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Transfer Request')).toBeInTheDocument();
    });

    const approveButton = screen.getByText('Approve');
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/approvals/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: 'txn-1', decision: 'APPROVED' }),
      });
    });
  });

  it('handles rejection action', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          approvals: [
            {
              id: 'txn-1',
              amount: '1000.00',
              created_at: new Date().toISOString(),
              initiator: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
              from_account: { account_number: '12345', account_name: 'Savings' },
              to_account: { account_number: '67890', account_name: 'Checking' },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ approvals: [] }),
      });

    render(<ApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Transfer Request')).toBeInTheDocument();
    });

    const rejectButton = screen.getByText('Reject');
    fireEvent.click(rejectButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/approvals/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: 'txn-1', decision: 'REJECTED' }),
      });
    });
  });

  it('displays error when approval fails', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          approvals: [
            {
              id: 'txn-1',
              amount: '1000.00',
              created_at: new Date().toISOString(),
              initiator: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
              from_account: { account_number: '12345', account_name: 'Savings' },
              to_account: { account_number: '67890', account_name: 'Checking' },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Insufficient balance' }),
      });

    render(<ApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Transfer Request')).toBeInTheDocument();
    });

    const approveButton = screen.getByText('Approve');
    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(screen.getByText('Insufficient balance')).toBeInTheDocument();
    });
  });

  it('displays error when fetching approvals fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<ApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load approvals')).toBeInTheDocument();
    });
  });

  it('disables buttons during processing', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          approvals: [
            {
              id: 'txn-1',
              amount: '1000.00',
              created_at: new Date().toISOString(),
              initiator: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
              from_account: { account_number: '12345', account_name: 'Savings' },
              to_account: { account_number: '67890', account_name: 'Checking' },
            },
          ],
        }),
      })
      .mockImplementation(() => new Promise(() => {}));

    render(<ApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText('Transfer Request')).toBeInTheDocument();
    });

    const approveButton = screen.getByText('Approve');
    const rejectButton = screen.getByText('Reject');

    fireEvent.click(approveButton);

    await waitFor(() => {
      expect(approveButton).toBeDisabled();
      expect(rejectButton).toBeDisabled();
    });
  });

  it('renders navigation component', () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ approvals: [] }),
    });

    render(<ApprovalsPage />);

    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  it('handles missing initiator email gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        approvals: [
          {
            id: 'txn-1',
            amount: '1000.00',
            created_at: new Date().toISOString(),
            initiator: { first_name: 'John', last_name: 'Doe' },
            from_account: { account_number: '12345', account_name: 'Savings' },
            to_account: { account_number: '67890', account_name: 'Checking' },
          },
        ],
      }),
    });

    render(<ApprovalsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Initiated by John Doe \(Unknown\)/)).toBeInTheDocument();
    });
  });
});
