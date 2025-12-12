import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import UnauthorizedPage from '@/app/unauthorized/page';

jest.mock('@/components/Navigation', () => ({
  Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

describe('Unauthorized Page', () => {
  it('renders the unauthorized message', () => {
    render(<UnauthorizedPage />);
    
    expect(screen.getByText('Access Denied')).toBeInTheDocument();
    expect(screen.getByText("You don't have permission to access this page.")).toBeInTheDocument();
  });

  it('renders the navigation component', () => {
    render(<UnauthorizedPage />);
    
    expect(screen.getByTestId('navigation')).toBeInTheDocument();
  });

  it('displays the emoji icon', () => {
    render(<UnauthorizedPage />);
    
    expect(screen.getByText('🚫')).toBeInTheDocument();
  });

  it('renders a link back to dashboard', () => {
    render(<UnauthorizedPage />);
    
    const link = screen.getByRole('link', { name: /return to dashboard/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/dashboard');
  });

  it('displays contact administrator message', () => {
    render(<UnauthorizedPage />);
    
    expect(screen.getByText(/contact your administrator/i)).toBeInTheDocument();
  });
});
