/**
 * Unit Tests: Login Page (src/app/login/page.tsx)
 *
 * Tests:
 *  - Page renders the email and password fields + submit button
 *  - Shows email validation error when invalid email is submitted
 *  - Shows password required error when password is empty
 *  - Calls the API on valid submission
 *  - Shows spinner while loading
 *  - Shows API error message on failed login
 *  - Redirects to /dashboard on success
 *  - Password visibility toggle works
 */

import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}));

jest.mock('../../lib/api', () => ({
  __esModule: true,
  default: { post: jest.fn() },
}));

// ─── Imports after mocks ─────────────────────────────────────────────────────

import LoginPage from '../../app/login/page';
import api from '../../lib/api';

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
  // Prevent unhandled promise rejections from polluting other tests
  (api.post as jest.Mock).mockResolvedValue({ data: { data: {} } });
});

// ─── Helper ───────────────────────────────────────────────────────────────────
// Use fireEvent.change (not userEvent.type) for reliable value-setting in jsdom.
// userEvent.type on type="email" inputs in jsdom can swallow characters it
// considers invalid, and a bare space ' ' causes a userEvent v14 parse error.

async function fillAndSubmit(email: string, password: string) {
  const emailInput = screen.getByLabelText(/email/i);
  const passwordInput = screen.getByLabelText(/password/i);
  
  await userEvent.clear(emailInput);
  if (email) await userEvent.type(emailInput, email);
  
  await userEvent.clear(passwordInput);
  if (password) await userEvent.type(passwordInput, password);
  
  // We use fireEvent.submit to bypass JSDOM's native HTML5 validation blocking
  // (which prevents the submit event from firing on invalid type="email").
  const form = screen.getByRole('button', { name: /sign in/i }).closest('form')!;
  await act(async () => {
    fireEvent.submit(form);
  });
}

// The password visibility toggle is a type="button" with an SVG icon only (no text label).
// We find it by filtering all buttons to get the non-submit one.
function getToggleButton() {
  return screen.getAllByRole('button').find(b => b.getAttribute('type') !== 'submit')!;
}

// ─── Render Tests ─────────────────────────────────────────────────────────────

describe('Login Page — rendering', () => {
  it('should render the email input', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('should render the password input', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('should render the Sign In button', () => {
    render(<LoginPage />);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('should render the Forgot password link', () => {
    render(<LoginPage />);
    expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
  });

  it('should render the HR Portal heading', () => {
    render(<LoginPage />);
    expect(screen.getByRole('heading', { name: /HR Portal/i })).toBeInTheDocument();
  });
});

// ─── Validation Tests ─────────────────────────────────────────────────────────

describe('Login Page — form validation', () => {
  it('should show email validation error for invalid email', async () => {
    render(<LoginPage />);
    await fillAndSubmit('not-an-email', 'Password1!');
    expect(await screen.findByText(/valid email/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('should show required error when password is empty', async () => {
    render(<LoginPage />);
    await fillAndSubmit('user@test.com', '');
    expect(await screen.findByText(/password is required/i)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });
});

// ─── Submission Tests ──────────────────────────────────────────────────────────

describe('Login Page — form submission', () => {
  it('should call /auth/login API with the entered credentials', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { data: { token: 'jwt123', user: { id: '1', name: 'Jane', email: 'jane@test.com', role: 'ADMIN' } } },
    });
    render(<LoginPage />);
    await fillAndSubmit('jane@test.com', 'Password1!');
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'jane@test.com',
        password: 'Password1!',
      });
    });
  });

  it('should store token in localStorage on successful login', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { data: { token: 'jwt123', user: { id: '1', name: 'Jane', email: 'jane@test.com', role: 'ADMIN' } } },
    });
    render(<LoginPage />);
    await fillAndSubmit('jane@test.com', 'Password1!');
    await waitFor(() => {
      expect(localStorage.getItem('token')).toBe('jwt123');
    });
  });

  it('should redirect to /dashboard on successful login', async () => {
    (api.post as jest.Mock).mockResolvedValue({
      data: { data: { token: 'jwt123', user: { id: '1', name: 'Jane', email: 'jane@test.com', role: 'ADMIN' } } },
    });
    render(<LoginPage />);
    await fillAndSubmit('jane@test.com', 'Password1!');
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('should display API error message on failed login', async () => {
    (api.post as jest.Mock).mockRejectedValue({
      response: { data: { error: { message: 'Invalid email or password' } } },
    });
    render(<LoginPage />);
    await fillAndSubmit('jane@test.com', 'WrongPass!');
    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeInTheDocument();
    });
  });

  it('should display generic error on network failure', async () => {
    (api.post as jest.Mock).mockRejectedValue(new Error('Network Error'));
    render(<LoginPage />);
    await fillAndSubmit('jane@test.com', 'Password1!');
    await waitFor(() => {
      expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
    });
  });

  it('should disable the submit button while the request is in flight', async () => {
    let resolveLogin!: (v: any) => void;
    (api.post as jest.Mock).mockReturnValue(
      new Promise(res => { resolveLogin = res; })
    );
    render(<LoginPage />);
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    await userEvent.type(emailInput, 'jane@test.com');
    await userEvent.type(passwordInput, 'Password1!');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled();
    });

    // cleanup: resolve the hanging promise
    resolveLogin({ data: { data: { token: 'x', user: {} } } });
  });
});

// ─── Password Toggle Tests ────────────────────────────────────────────────────

describe('Login Page — password visibility toggle', () => {
  it('should start with password type=password (hidden)', () => {
    render(<LoginPage />);
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });

  it('should toggle to type=text when show button is clicked', async () => {
    render(<LoginPage />);
    await userEvent.click(getToggleButton());
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'text');
  });

  it('should toggle back to type=password on second click', async () => {
    render(<LoginPage />);
    await userEvent.click(getToggleButton());
    await userEvent.click(getToggleButton());
    expect(screen.getByLabelText(/password/i)).toHaveAttribute('type', 'password');
  });
});
