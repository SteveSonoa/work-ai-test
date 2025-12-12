import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TransactionsPage from '@/app/transactions/page';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

jest.mock('next-auth/react');
jest.mock('next/navigation');
jest.mock('@/components/Navigation', () => ({
  Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockPush = jest.fn();

describe('Transactions Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    mockUseRouter.mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('redirects to signin when unauthenticated', async () => {
    mockUseSession.mockReturnValue({ data: null, status: 'unauthenticated' } as unknown as ReturnType<typeof useSession>);

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/signin');
    });
  });

  it('renders transactions with filters', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [
            {
              id: 'txn-1',
              from_account_number: '12345',
              to_account_number: '67890',
              amount: '1000.00',
              status: 'COMPLETED',
              created_at: '2025-12-11',
              initiated_by_first_name: 'John',
              initiated_by_last_name: 'Doe',
            },
          ],
          total: 1,
        }),
      });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Transactions')).toBeInTheDocument();
    });

    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByLabelText('Initiated By')).toBeInTheDocument();
    expect(screen.getByLabelText('Status')).toBeInTheDocument();
    expect(screen.getByText('Apply Filters')).toBeInTheDocument();
  });

  it('displays transactions in table', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [
            {
              id: 'txn-1',
              from_account_number: '12345',
              from_account_name: 'Savings',
              to_account_number: '67890',
              to_account_name: 'Checking',
              amount: '1000.00',
              status: 'COMPLETED',
              created_at: '2025-12-11',
              initiated_by_first_name: 'John',
              initiated_by_last_name: 'Doe',
              initiated_by_email: 'john@example.com',
            },
          ],
          total: 1,
        }),
      });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('12345')).toBeInTheDocument();
    });

    expect(screen.getByText('67890')).toBeInTheDocument();
    expect(screen.getByText('$1,000.00')).toBeInTheDocument();
    expect(screen.getByText('COMPLETED')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseSession.mockReturnValue({ data: null, status: 'loading' } as unknown as ReturnType<typeof useSession>);

    render(<TransactionsPage />);

    expect(screen.getByText('Loading transactions...')).toBeInTheDocument();
  });

  it('shows empty state when no transactions', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0 }),
      });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('No transactions found')).toBeInTheDocument();
    });
  });

  it('applies filters', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          users: [{ id: 'user-1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' }],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0 }),
      });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Apply Filters')).toBeInTheDocument();
    });

    const applyButton = screen.getByText('Apply Filters');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  it('clears filters', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0 }),
      });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Clear Filters')).toBeInTheDocument();
    });

    const clearButton = screen.getByText('Clear Filters');
    fireEvent.click(clearButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  it('handles pagination', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: Array(50).fill({ id: '1', status: 'COMPLETED', amount: '100' }), total: 100 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 100 }),
      });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getAllByText('Page 1 of 2')[0]).toBeInTheDocument();
    });

    const initialFetchCount = (global.fetch as jest.Mock).mock.calls.length;
    const nextButton = screen.getAllByText('Next →')[0];
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect((global.fetch as jest.Mock).mock.calls.length).toBeGreaterThan(initialFetchCount);
    });
  });

  it('displays error when fetch fails', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [] }),
      })
      .mockRejectedValueOnce(new Error('Network error'));

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to load transactions')).toBeInTheDocument();
    });
  });

  it('renders navigation component', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ users: [] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [], total: 0 }),
      });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('navigation')).toBeInTheDocument();
    });
  });

  it('handles apply filters', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ users: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0 }) });

    const { container } = render(<TransactionsPage />);

    await waitFor(() => {
      const buttons = container.querySelectorAll('button');
      const applyButton = Array.from(buttons).find(btn => btn.textContent === 'Apply Filters');
      expect(applyButton).toBeTruthy();
    });

    const buttons = container.querySelectorAll('button');
    const applyButton = Array.from(buttons).find(btn => btn.textContent === 'Apply Filters');
    
    if (applyButton) {
      fireEvent.click(applyButton);
    }

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  it('handles clear filters', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ users: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0 }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0 }) });

    const { container } = render(<TransactionsPage />);

    await waitFor(() => {
      const buttons = container.querySelectorAll('button');
      const clearButton = Array.from(buttons).find(btn => btn.textContent === 'Clear Filters');
      expect(clearButton).toBeTruthy();
    });

    const buttons = container.querySelectorAll('button');
    const clearButton = Array.from(buttons).find(btn => btn.textContent === 'Clear Filters');
    
    if (clearButton) {
      fireEvent.click(clearButton);
    }

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });
  });

  it('handles status filter change', async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: '1', email: 'test@example.com' } },
      status: 'authenticated',
    } as unknown as ReturnType<typeof useSession>);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ users: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ transactions: [], total: 0 }) });

    const { container } = render(<TransactionsPage />);

    await waitFor(() => {
      const selects = container.querySelectorAll('select');
      expect(selects.length).toBeGreaterThan(0);
    });

    const selects = container.querySelectorAll('select');
    const statusSelect = Array.from(selects).find(select => {
      const options = Array.from(select.options);
      return options.some(opt => opt.value === 'COMPLETED');
    });
    
    if (statusSelect) {
      fireEvent.change(statusSelect, { target: { value: 'COMPLETED' } });
    }

    await waitFor(() => {
      expect(statusSelect?.value).toBe('COMPLETED');
    });
  });
});
