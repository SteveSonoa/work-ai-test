import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import TransferPage from '@/app/transfer/page';

global.fetch = jest.fn();

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('@/components/Navigation', () => ({
  Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

const waitForAccountsToLoad = async () => {
  await waitFor(() => {
    const select = document.querySelector('#select-from-account') as HTMLSelectElement;
    expect(select).toBeInTheDocument();
    expect(select.options.length).toBeGreaterThan(1);
  }, { timeout: 3000 });
};

describe('Transfer Page', () => {
  const mockPush = jest.fn();
  const mockAccounts = [
    { id: '1', account_number: '12345', account_name: 'Checking', balance: 1000.00 },
    { id: '2', account_number: '67890', account_name: 'Savings', balance: 5000.00 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseSession.mockReturnValue({ data: null, status: 'authenticated' } as unknown as ReturnType<typeof useSession>);
    mockUseRouter.mockReturnValue({ push: mockPush } as unknown as ReturnType<typeof useRouter>);
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ accounts: mockAccounts }),
    } as Response);
  });

  it('renders the transfer form', async () => {
    render(<TransferPage />);
    
    await waitFor(() => {
      expect(screen.getAllByText('Initiate Transfer')[0]).toBeInTheDocument();
    });
    
    // Wait for accounts to load
    await waitFor(() => {
      const select = document.querySelector('#select-from-account') as HTMLSelectElement;
      return select && select.options.length > 1;
    }, { timeout: 3000 });
    
    expect(screen.getByLabelText(/To Account/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument();
  });

  it('fetches and displays accounts on mount', async () => {
    render(<TransferPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/accounts');
    });
  });

  it('handles successful transfer submission', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accounts: mockAccounts }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          message: 'Transfer initiated successfully',
          transaction: { id: 'txn-123' }
        }),
      } as Response);

    render(<TransferPage />);

    await waitForAccountsToLoad();

    const fromSelect = screen.getByLabelText(/From Account/i);
    const toSelect = screen.getByLabelText(/To Account/i);
    const amountInput = screen.getByLabelText(/Amount/i);
    const submitButton = screen.getByRole('button', { name: /initiate transfer/i });

    fireEvent.change(fromSelect, { target: { value: '1' } });
    fireEvent.change(toSelect, { target: { value: '2' } });
    fireEvent.change(amountInput, { target: { value: '100' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Transfer initiated successfully')).toBeInTheDocument();
    }, { timeout: 3000 });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/transactions/txn-123');
    }, { timeout: 3000 });
  });

  it('redirects to dashboard when transaction ID is not available', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accounts: mockAccounts }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          message: 'Transfer initiated successfully'
        }),
      } as Response);

    render(<TransferPage />);

    await waitForAccountsToLoad();

    const fromSelect = screen.getByLabelText(/From Account/i);
    const toSelect = screen.getByLabelText(/To Account/i);
    const amountInput = screen.getByLabelText(/Amount/i);
    const submitButton = screen.getByRole('button', { name: /initiate transfer/i });

    fireEvent.change(fromSelect, { target: { value: '1' } });
    fireEvent.change(toSelect, { target: { value: '2' } });
    fireEvent.change(amountInput, { target: { value: '100' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    }, { timeout: 3000 });
  });

  it('displays error message on failed transfer', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accounts: mockAccounts }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Insufficient funds' }),
      } as Response);

    render(<TransferPage />);

    await waitForAccountsToLoad();

    const fromSelect = screen.getByLabelText(/From Account/i);
    const toSelect = screen.getByLabelText(/To Account/i);
    const amountInput = screen.getByLabelText(/Amount/i);
    const submitButton = screen.getByRole('button', { name: /initiate transfer/i });

    fireEvent.change(fromSelect, { target: { value: '1' } });
    fireEvent.change(toSelect, { target: { value: '2' } });
    fireEvent.change(amountInput, { target: { value: '10000' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Insufficient funds')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('handles fetch accounts error gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<TransferPage />);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled();
    }, { timeout: 3000 });

    consoleErrorSpy.mockRestore();
  });

  it('handles transfer exception', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accounts: mockAccounts }),
      } as Response)
      .mockRejectedValueOnce(new Error('Network error'));

    render(<TransferPage />);

    await waitForAccountsToLoad();

    const fromSelect = screen.getByLabelText(/From Account/i);
    const toSelect = screen.getByLabelText(/To Account/i);
    const amountInput = screen.getByLabelText(/Amount/i);
    const submitButton = screen.getByRole('button', { name: /initiate transfer/i });

    fireEvent.change(fromSelect, { target: { value: '1' } });
    fireEvent.change(toSelect, { target: { value: '2' } });
    fireEvent.change(amountInput, { target: { value: '100' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('displays loading state during transfer', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ accounts: mockAccounts }),
      } as Response)
      .mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({
        ok: true,
        json: async () => ({ message: 'Success', transaction: { id: 'txn-123' } }),
      } as Response), 100)));

    render(<TransferPage />);

    await waitForAccountsToLoad();

    const fromSelect = screen.getByLabelText(/From Account/i);
    const toSelect = screen.getByLabelText(/To Account/i);
    const amountInput = screen.getByLabelText(/Amount/i);
    const submitButton = screen.getByRole('button', { name: /initiate transfer/i });

    fireEvent.change(fromSelect, { target: { value: '1' } });
    fireEvent.change(toSelect, { target: { value: '2' } });
    fireEvent.change(amountInput, { target: { value: '100' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    }, { timeout: 3000 });
  });

  it('updates form fields on input change', async () => {
    render(<TransferPage />);

    await waitForAccountsToLoad();

    const descriptionInput = screen.getByLabelText('Description (Optional)') as HTMLInputElement;
    fireEvent.change(descriptionInput, { target: { value: 'Test transfer' } });

    expect(descriptionInput.value).toBe('Test transfer');
  });
});
