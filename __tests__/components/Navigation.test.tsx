import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Navigation } from '@/components/Navigation';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';

jest.mock('next-auth/react');
jest.mock('next/navigation');

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>;

describe('Navigation Component', () => {
  const mockPush = jest.fn();
  const mockRouter = { push: mockPush };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseRouter.mockReturnValue(mockRouter as unknown as ReturnType<typeof useRouter>);
    mockUsePathname.mockReturnValue('/dashboard');
  });

  it('renders navigation with user name when authenticated', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'ADMIN',
        },
      },
      status: 'authenticated',
    } as ReturnType<typeof useSession>);

    render(<Navigation />);
    expect(screen.getByText(/John Doe/i)).toBeInTheDocument();
  });

  it('renders all navigation links', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'ADMIN',
        },
      },
      status: 'authenticated',
    } as ReturnType<typeof useSession>);

    render(<Navigation />);
    expect(screen.getAllByText('Dashboard')[0]).toBeInTheDocument();
    expect(screen.getAllByText('New Transfer')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Transactions')[0]).toBeInTheDocument();
  });

  it('shows admin-specific links for admin users', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          email: 'admin@example.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'ADMIN',
        },
      },
      status: 'authenticated',
    } as ReturnType<typeof useSession>);

    render(<Navigation />);
    expect(screen.getAllByText('Users')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Approvals')[0]).toBeInTheDocument();
  });

  it('does not show admin links for non-admin users', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          email: 'user@example.com',
          first_name: 'Regular',
          last_name: 'User',
          role: 'CONTROLLER',
        },
      },
      status: 'authenticated',
    } as ReturnType<typeof useSession>);

    render(<Navigation />);
    expect(screen.queryAllByText('Users')).toHaveLength(0);
  });

  it('shows audit link for AUDIT role', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          email: 'audit@example.com',
          first_name: 'Audit',
          last_name: 'User',
          role: 'AUDIT',
        },
      },
      status: 'authenticated',
    } as ReturnType<typeof useSession>);

    render(<Navigation />);
    expect(screen.getAllByText('Audit Logs')[0]).toBeInTheDocument();
  });

  it('shows audit link for ADMIN with Transfers option', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          email: 'admin@example.com',
          first_name: 'Admin',
          last_name: 'User',
          role: 'ADMIN',
        },
      },
      status: 'authenticated',
    } as ReturnType<typeof useSession>);

    render(<Navigation />);
    expect(screen.getAllByText('Audit Logs')[0]).toBeInTheDocument();
    expect(screen.getAllByText('New Transfer')[0]).toBeInTheDocument();
  });

  it('handles loading state by returning null', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'loading',
    } as ReturnType<typeof useSession>);

    const { container } = render(<Navigation />);
    expect(container.firstChild).toBeNull();
  });

  it('handles unauthenticated state by returning null', () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    } as ReturnType<typeof useSession>);

    const { container } = render(<Navigation />);
    expect(container.firstChild).toBeNull();
  });

  it('handles sign out', () => {
    mockUseSession.mockReturnValue({
      data: {
        user: {
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe',
          role: 'ADMIN',
        },
      },
      status: 'authenticated',
    } as ReturnType<typeof useSession>);

    render(<Navigation />);
    const signOutButton = screen.getByLabelText('Sign out');
    expect(signOutButton).toBeInTheDocument();
  });
});
