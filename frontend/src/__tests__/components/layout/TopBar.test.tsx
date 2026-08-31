/**
 * Unit Tests: TopBar Component
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TopBar from '../../../components/layout/TopBar';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockLogout = jest.fn();
jest.mock('../../../lib/auth', () => ({
  useAuth: () => ({
    user: { name: 'Jane Doe', role: 'HR_MANAGER' },
    isAdmin: false,
    logout: mockLogout,
  }),
}));

const mockApiGet = jest.fn();
const mockApiPatch = jest.fn();
jest.mock('../../../lib/api', () => ({
  __esModule: true,
  default: {
    get: (...args: any[]) => mockApiGet(...args),
    patch: (...args: any[]) => mockApiPatch(...args),
  },
}));

// Mock react-hot-toast just to prevent console errors on toast calls
jest.mock('react-hot-toast', () => ({
  error: jest.fn(),
}));

const mockOnMenuClick = jest.fn();

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  // Default API responses
  mockApiGet.mockImplementation((url) => {
    if (url === '/notifications/unread-count') {
      return Promise.resolve({ data: { data: { unreadCount: 0 } } });
    }
    if (url.includes('/notifications')) {
      return Promise.resolve({ data: { data: { items: [] } } });
    }
    if (url.includes('/search')) {
      return Promise.resolve({ data: { data: { candidates: [], employees: [] } } });
    }
    return Promise.resolve({ data: {} });
  });

  mockApiPatch.mockResolvedValue({});
});

// (afterEach block removed since fake timers are gone)

// ─── Profile Menu Tests ────────────────────────────────────────────────────────

describe('TopBar — Profile Menu', () => {
  it('should render the user name and role', () => {
    render(<TopBar onMenuClick={mockOnMenuClick} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('HR_MANAGER')).toBeInTheDocument();
  });

  it('should toggle profile menu and trigger logout', async () => {
    render(<TopBar onMenuClick={mockOnMenuClick} />);
    
    const profileBtn = screen.getByText('Jane Doe').closest('button')!;
    await userEvent.click(profileBtn);
    
    const signOutBtn = await screen.findByText(/sign out/i);
    expect(signOutBtn).toBeInTheDocument();

    await userEvent.click(signOutBtn);
    expect(mockLogout).toHaveBeenCalled();
  });
});

// ─── Notification Tests ────────────────────────────────────────────────────────

describe('TopBar — Notifications', () => {
  it('should fetch unread count on mount and display badge if > 0', async () => {
    mockApiGet.mockImplementation((url) => {
      if (url === '/notifications/unread-count') {
        return Promise.resolve({ data: { data: { unreadCount: 5 } } });
      }
      return Promise.resolve({ data: {} });
    });

    render(<TopBar onMenuClick={mockOnMenuClick} />);
    
    // Check if the badge with '5' is rendered
    expect(await screen.findByText('5')).toBeInTheDocument();
    expect(mockApiGet).toHaveBeenCalledWith('/notifications/unread-count');
  });

  it('should open notifications dropdown and fetch items on click', async () => {
    mockApiGet.mockImplementation((url) => {
      if (url === '/notifications/unread-count') {
        return Promise.resolve({ data: { data: { unreadCount: 1 } } });
      }
      if (url.includes('/notifications?limit')) {
        return Promise.resolve({
          data: {
            data: {
              items: [
                { id: 'n1', message: 'New candidate applied', isRead: false, createdAt: new Date().toISOString(), referenceType: 'CANDIDATE', referenceId: 'c1' }
              ]
            }
          }
        });
      }
      return Promise.resolve({ data: {} });
    });

    render(<TopBar onMenuClick={mockOnMenuClick} />);
    
    // Find the bell button by locating the badge or the generic button that triggers it
    const bellBtn = (await screen.findByText('1')).closest('button')!;
    
    // Open dropdown
    await act(async () => {
      await userEvent.click(bellBtn);
    });

    // The notification message should appear
    expect(await screen.findByText('New candidate applied')).toBeInTheDocument();
  });

  it('should mark all as read and remove the badge', async () => {
    mockApiGet.mockImplementation((url) => {
      if (url === '/notifications/unread-count') {
        return Promise.resolve({ data: { data: { unreadCount: 2 } } });
      }
      if (url.includes('/notifications?limit')) {
        return Promise.resolve({ data: { data: { items: [{ id: 'n1', isRead: false, createdAt: new Date().toISOString() }] } } });
      }
      return Promise.resolve({ data: {} });
    });

    render(<TopBar onMenuClick={mockOnMenuClick} />);
    
    // badge is '2'
    const bellBtn = (await screen.findByText('2')).closest('button')!;
    
    await act(async () => { await userEvent.click(bellBtn); });

    const markAllReadBtn = await screen.findByText(/mark all read/i);
    
    await act(async () => { await userEvent.click(markAllReadBtn); });

    expect(mockApiPatch).toHaveBeenCalledWith('/notifications/read-all');
    // badge should disappear
    expect(screen.queryByText('2')).not.toBeInTheDocument();
  });
});

// ─── Search Tests ──────────────────────────────────────────────────────────────

describe('TopBar — Search', () => {
  it('should trigger search API after typing with debounce', async () => {
    render(<TopBar onMenuClick={mockOnMenuClick} />);
    
    // The desktop search input
    const searchInput = screen.getByPlaceholderText(/search candidates & employees/i);
    
    await userEvent.type(searchInput, 'john');
    
    // debounce is 300ms, API should not be called immediately
    expect(mockApiGet).not.toHaveBeenCalledWith(expect.stringContaining('/search'));
    
    await act(async () => {
      await new Promise(r => setTimeout(r, 350));
    });
    
    expect(mockApiGet).toHaveBeenCalledWith('/search?q=john');
  });

  it('should display search results and navigate on click', async () => {
    mockApiGet.mockImplementation((url) => {
      if (url.includes('/search')) {
        return Promise.resolve({
          data: {
            data: {
              candidates: [{ id: 'c1', name: 'John Candidate', positionApplied: 'Developer', status: 'NEW' }],
              employees: [],
            }
          }
        });
      }
      if (url === '/notifications/unread-count') {
        return Promise.resolve({ data: { data: { unreadCount: 0 } } });
      }
      return Promise.resolve({ data: {} });
    });

    render(<TopBar onMenuClick={mockOnMenuClick} />);
    const searchInput = screen.getByPlaceholderText(/search candidates & employees/i);
    
    await userEvent.type(searchInput, 'john');
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    
    // Expect the result to show up
    const resultBtn = await screen.findByText('John Candidate');
    expect(resultBtn).toBeInTheDocument();
    
    // Click result
    await act(async () => { await userEvent.click(resultBtn.closest('button')!); });
    
    expect(mockPush).toHaveBeenCalledWith('/candidates/c1');
  });
});
