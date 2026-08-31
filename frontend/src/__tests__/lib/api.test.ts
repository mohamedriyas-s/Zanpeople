/**
 * Unit Tests: API Interceptors (src/lib/api.ts)
 *
 * Tests that:
 *  - The JWT token is automatically attached to every outgoing request
 *  - A 401 response clears localStorage and redirects to /login
 *  - Non-401 errors are rejected normally (no redirect)
 */

import axios from 'axios';

// ─── Mock axios ─────────────────────────────────────────────────────────────
// We intercept the axios.create call so we can inspect the interceptor logic
// against a real (but sandboxed) axios instance from api.ts

// We need the real module, but we mock localStorage and window.location
const mockLocalStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: jest.fn((key: string) => mockLocalStorageStore[key] ?? null),
  setItem: jest.fn((key: string, value: string) => { mockLocalStorageStore[key] = value; }),
  removeItem: jest.fn((key: string) => { delete mockLocalStorageStore[key]; }),
  clear: jest.fn(() => { Object.keys(mockLocalStorageStore).forEach(k => delete mockLocalStorageStore[k]); }),
};

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

// Mock redirectTo
jest.mock('../../lib/redirect', () => ({
  redirectTo: jest.fn(),
}));
import { redirectTo } from '../../lib/redirect';

// ─── Import after mocks ─────────────────────────────────────────────────────

import api from '../../lib/api';

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('API — Request Interceptor (JWT attachment)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    jest.clearAllMocks();
  });

  it('should attach Bearer token from localStorage to outgoing requests', async () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === 'token') return 'my-jwt-token';
      return null;
    });

    // We inspect via the adapter interceptor — create a test config
    const config = { headers: { Authorization: undefined } } as any;

    // Manually run the request interceptor (index 0)
    const requestInterceptor = (api.interceptors.request as any).handlers[0];
    const result = requestInterceptor.fulfilled(config);
    expect(result.headers.Authorization).toBe('Bearer my-jwt-token');
  });

  it('should NOT attach Authorization header when no token in localStorage', () => {
    localStorageMock.getItem.mockReturnValue(null);
    const config = { headers: {} } as any;
    const requestInterceptor = (api.interceptors.request as any).handlers[0];
    const result = requestInterceptor.fulfilled(config);
    expect(result.headers.Authorization).toBeUndefined();
  });
});

describe('API — Response Interceptor (401 handling)', () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockLocalStorageStore['token'] = 'some-token';
    mockLocalStorageStore['user'] = '{"name":"Jane"}';
    window.history.pushState({}, '', '/dashboard');
    (redirectTo as jest.Mock).mockClear();
    jest.clearAllMocks();
  });

  it('should clear localStorage and redirect on 401 response', async () => {
    const error = { response: { status: 401 } };
    const responseInterceptor = (api.interceptors.response as any).handlers[0];

    await expect(responseInterceptor.rejected(error)).rejects.toEqual(error);

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
    expect(redirectTo).toHaveBeenCalledWith('/login');
  });

  it('should NOT redirect when already on the login page (prevents redirect loops)', async () => {
    window.history.pushState({}, '', '/login');
    const error = { response: { status: 401 } };
    const responseInterceptor = (api.interceptors.response as any).handlers[0];

    await expect(responseInterceptor.rejected(error)).rejects.toEqual(error);
    expect(redirectTo).not.toHaveBeenCalled();
  });

  it('should pass through non-401 errors without redirecting', async () => {
    const error = { response: { status: 500, data: { message: 'Server Error' } } };
    const responseInterceptor = (api.interceptors.response as any).handlers[0];

    await expect(responseInterceptor.rejected(error)).rejects.toEqual(error);
    expect(redirectTo).not.toHaveBeenCalled();
    expect(localStorageMock.removeItem).not.toHaveBeenCalled();
  });

  it('should pass through network errors (no response object) without redirecting', async () => {
    const error = new Error('Network Error');
    const responseInterceptor = (api.interceptors.response as any).handlers[0];

    await expect(responseInterceptor.rejected(error)).rejects.toEqual(error);
    expect(redirectTo).not.toHaveBeenCalled();
  });
});
