/**
 * Unit Tests: AuthContext (src/lib/auth.tsx)
 *
 * Tests:
 *  - Session restore from localStorage on mount
 *  - Login: stores token and user, updates context
 *  - Logout: clears localStorage and redirects
 *  - updateUser: merges new data into existing user
 *  - isAdmin flag based on user role
 *  - useAuth throws when used outside AuthProvider
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Mock the api module before importing AuthProvider
jest.mock('../../lib/api', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
  },
}));

// Mock redirectTo
jest.mock('../../lib/redirect', () => ({
  redirectTo: jest.fn(),
}));
import { redirectTo } from '../../lib/redirect';

// ─── Imports after mocks ─────────────────────────────────────────────────────

import { AuthProvider, useAuth } from '../../lib/auth';
import api from '../../lib/api';

// ─── Test Helpers ─────────────────────────────────────────────────────────────

/**
 * A test consumer component that displays auth state and provides interaction buttons.
 */
function TestConsumer() {
  const { user, isAdmin, isLoading, login, logout, updateUser } = useAuth();
  return (
    <div>
      <div data-testid="loading">{String(isLoading)}</div>
      <div data-testid="user-name">{user?.name ?? 'null'}</div>
      <div data-testid="user-role">{user?.role ?? 'null'}</div>
      <div data-testid="is-admin">{String(isAdmin)}</div>
      <button onClick={() => login('admin@test.com', 'Pass1!')}>Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => updateUser({ name: 'Updated Name' })}>UpdateUser</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <TestConsumer />
    </AuthProvider>
  );
}

const MOCK_USER = { id: 'u1', name: 'Jane Doe', email: 'jane@test.com', role: 'ADMIN' as const };
const MOCK_TOKEN = 'mock.jwt.token';

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AuthProvider — session restore from localStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should start with isLoading=true then resolve to false', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
  });

  it('should load user from localStorage on mount', async () => {
    localStorage.setItem('token', MOCK_TOKEN);
    localStorage.setItem('user', JSON.stringify(MOCK_USER));
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('Jane Doe');
    });
  });

  it('should show null user when localStorage is empty', async () => {
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('null');
    });
  });

  it('should clear localStorage and show null user when stored JSON is corrupt', async () => {
    localStorage.setItem('token', MOCK_TOKEN);
    localStorage.setItem('user', 'NOT_VALID_JSON{{{');
    renderWithProvider();
    await waitFor(() => {
      expect(screen.getByTestId('user-name').textContent).toBe('null');
    });
    expect(localStorage.getItem('token')).toBeNull();
  });
});

describe('AuthProvider — login()', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should store token and user in localStorage on successful login', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { data: { token: MOCK_TOKEN, user: MOCK_USER } },
    });
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });

    expect(localStorage.getItem('token')).toBe(MOCK_TOKEN);
    expect(JSON.parse(localStorage.getItem('user')!)).toMatchObject({ name: 'Jane Doe' });
  });

  it('should update user context state after login', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { data: { token: MOCK_TOKEN, user: MOCK_USER } },
    });
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));

    await act(async () => {
      await userEvent.click(screen.getByText('Login'));
    });

    expect(screen.getByTestId('user-name').textContent).toBe('Jane Doe');
    expect(screen.getByTestId('user-role').textContent).toBe('ADMIN');
  });
});

describe('AuthProvider — logout()', () => {
  beforeEach(() => {
    localStorage.setItem('token', MOCK_TOKEN);
    localStorage.setItem('user', JSON.stringify(MOCK_USER));
    (redirectTo as jest.Mock).mockClear();
    jest.clearAllMocks();
    // fire-and-forget server logout
    (api.post as jest.Mock).mockResolvedValue({});
  });

  it('should clear localStorage on logout', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('user-name').textContent).toBe('Jane Doe'));

    act(() => { screen.getByText('Logout').click(); });

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('should redirect to /login on logout', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('user-name').textContent).toBe('Jane Doe'));

    act(() => { screen.getByText('Logout').click(); });

    expect(redirectTo).toHaveBeenCalledWith('/login');
  });
});

describe('AuthProvider — updateUser()', () => {
  beforeEach(() => {
    localStorage.setItem('token', MOCK_TOKEN);
    localStorage.setItem('user', JSON.stringify(MOCK_USER));
    jest.clearAllMocks();
  });

  it('should merge new data into existing user', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('user-name').textContent).toBe('Jane Doe'));

    act(() => { screen.getByText('UpdateUser').click(); });

    expect(screen.getByTestId('user-name').textContent).toBe('Updated Name');
  });

  it('should persist updated user to localStorage', async () => {
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('user-name').textContent).toBe('Jane Doe'));

    act(() => { screen.getByText('UpdateUser').click(); });

    const stored = JSON.parse(localStorage.getItem('user')!);
    expect(stored.name).toBe('Updated Name');
  });
});

describe('AuthProvider — isAdmin flag', () => {
  beforeEach(() => localStorage.clear());

  it('should set isAdmin=true for ADMIN role', async () => {
    localStorage.setItem('token', MOCK_TOKEN);
    localStorage.setItem('user', JSON.stringify({ ...MOCK_USER, role: 'ADMIN' }));
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('is-admin').textContent).toBe('true'));
  });

  it('should set isAdmin=false for HR role', async () => {
    localStorage.setItem('token', MOCK_TOKEN);
    localStorage.setItem('user', JSON.stringify({ ...MOCK_USER, role: 'HR' }));
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('is-admin').textContent).toBe('false'));
  });
});

describe('useAuth — outside provider', () => {
  it('should throw an error when used outside of AuthProvider', () => {
    // Suppress the error boundary output
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    function BareConsumer() {
      useAuth();
      return null;
    }
    expect(() => render(<BareConsumer />)).toThrow('useAuth must be used within an AuthProvider');
    consoleSpy.mockRestore();
  });
});
