import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import HomePage from '@/app/page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

jest.mock('@/lib/auth/session', () => ({
  getCurrentUser: jest.fn(),
}));

const mockRedirect = redirect as jest.MockedFunction<typeof redirect>;
const mockGetCurrentUser = getCurrentUser as jest.MockedFunction<typeof getCurrentUser>;

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to dashboard when user is authenticated', async () => {
    mockGetCurrentUser.mockResolvedValueOnce({
      id: 'user-1',
      email: 'user@test.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'ADMIN',
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    await HomePage();

    expect(mockGetCurrentUser).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith('/dashboard');
  });

  it('redirects to signin when user is not authenticated', async () => {
    mockGetCurrentUser.mockResolvedValueOnce(null);

    await HomePage();

    expect(mockGetCurrentUser).toHaveBeenCalled();
    expect(mockRedirect).toHaveBeenCalledWith('/auth/signin');
  });
});
