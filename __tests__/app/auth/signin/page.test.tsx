import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import SignInPage from '@/app/auth/signin/page';

jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(),
}));

const mockSignIn = signIn as jest.MockedFunction<typeof signIn>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;

const waitForFormToLoad = async () => {
  await waitFor(() => {
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
  }, { timeout: 3000 });
};

describe('SignIn Page', () => {
  const mockPush = jest.fn();
  const mockRefresh = jest.fn();
  const mockGet = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue({
      push: mockPush,
      refresh: mockRefresh,
    } as unknown as ReturnType<typeof useRouter>);
    mockUseSearchParams.mockReturnValue({
      get: mockGet,
    } as unknown as ReturnType<typeof useSearchParams>);
    mockGet.mockReturnValue(null);
  });

  it('renders the sign in form', async () => {
    render(<SignInPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Bank Transfer System')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /email/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('handles successful sign in and redirects to dashboard', async () => {
    mockSignIn.mockResolvedValueOnce({ ok: true, error: null } as unknown as Awaited<ReturnType<typeof mockSignIn>>);

    render(<SignInPage />);

    await waitForFormToLoad();

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('credentials', {
        email: 'test@example.com',
        password: 'password123',
        redirect: false,
      });
    });

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
      expect(mockRefresh).toHaveBeenCalled();
    });
  });

  it('handles successful sign in with callback URL', async () => {
    mockSignIn.mockResolvedValueOnce({ ok: true, error: null } as unknown as Awaited<ReturnType<typeof mockSignIn>>);
    mockGet.mockReturnValue('/transfer');

    render(<SignInPage />);

    await waitForFormToLoad();

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/transfer');
    });
  });

  it('displays error message on failed sign in', async () => {
    mockSignIn.mockResolvedValueOnce({ ok: false, error: 'Invalid credentials' } as unknown as Awaited<ReturnType<typeof signIn>>);

    render(<SignInPage />);

    await waitForFormToLoad();

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('displays loading state during sign in', async () => {
    mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true } as unknown as Awaited<ReturnType<typeof mockSignIn>>), 500)));

    render(<SignInPage />);

    await waitForFormToLoad();

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('disables inputs during loading', async () => {
    mockSignIn.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ ok: true } as unknown as Awaited<ReturnType<typeof mockSignIn>>), 500)));

    render(<SignInPage />);

    await waitForFormToLoad();

    const emailInput = screen.getByRole('textbox', { name: /email/i }) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
    const submitButton = screen.getByRole('button', { name: /sign in/i }) as HTMLButtonElement;

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(emailInput).toBeDisabled();
      expect(passwordInput).toBeDisabled();
      expect(submitButton).toBeDisabled();
    }, { timeout: 1000 });
  });

  it('handles unexpected error during sign in', async () => {
    mockSignIn.mockResolvedValueOnce({ ok: false, error: null } as unknown as Awaited<ReturnType<typeof signIn>>);

    render(<SignInPage />);

    await waitForFormToLoad();

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    });
  });

  it('handles exception during sign in', async () => {
    mockSignIn.mockRejectedValueOnce(new Error('Network error'));

    render(<SignInPage />);

    await waitForFormToLoad();

    const emailInput = screen.getByRole('textbox', { name: /email/i });
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('An error occurred. Please try again.')).toBeInTheDocument();
    });
  });

  it('updates email and password state on input change', async () => {
    render(<SignInPage />);

    await waitForFormToLoad();

    const emailInput = screen.getByRole('textbox', { name: /email/i }) as HTMLInputElement;
    const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'newpassword' } });

    expect(emailInput.value).toBe('new@example.com');
    expect(passwordInput.value).toBe('newpassword');
  });

  it('renders demo credentials section', async () => {
    render(<SignInPage />);
    
    await waitFor(() => {
      expect(screen.getByText('Bank Transfer System')).toBeInTheDocument();
      expect(screen.getByText(/demo credentials/i)).toBeInTheDocument();
    }, { timeout: 3000 });
    
    expect(screen.getByText(/demo credentials/i)).toBeInTheDocument();
  });
});
