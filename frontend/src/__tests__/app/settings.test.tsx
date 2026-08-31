/**
 * Unit Tests: Settings Page
 */

import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../../app/(dashboard)/settings/page';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import { useAuth } from '../../lib/auth';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('../../lib/auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../../lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockReplace = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  (useAuth as jest.Mock).mockReturnValue({
    isAdmin: true,
    user: { name: 'Admin User', email: 'admin@example.com' },
    updateUser: jest.fn()
  });

  (api.get as jest.Mock).mockImplementation((url) => {
    if (url.includes('/settings/company-profile')) {
      return Promise.resolve({ data: { data: { companyName: 'Tech Corp', address: '123 Main St' } } });
    }
    if (url.includes('/settings/departments')) {
      return Promise.resolve({ data: { data: [{ id: 'd1', name: 'Engineering', isActive: true }] } });
    }
    if (url.includes('/settings/designations')) {
      return Promise.resolve({ data: { data: [{ id: 'ds1', name: 'Software Engineer', isActive: true }] } });
    }
    if (url.includes('/settings/users')) {
      return Promise.resolve({ data: { data: [{ id: 'u1', name: 'HR User', email: 'hr@example.com', role: 'HR' }] } });
    }
    if (url.includes('/pipelines')) {
      return Promise.resolve({ data: { data: [{ id: 'p1', name: 'Standard Pipeline', isDefault: true, stages: [] }] } });
    }
    return Promise.resolve({ data: { data: null } });
  });

  (api.put as jest.Mock).mockResolvedValue({ data: { data: { success: true } } });
  (api.post as jest.Mock).mockResolvedValue({ data: { data: { success: true } } });
  (api.delete as jest.Mock).mockResolvedValue({ data: { data: { success: true } } });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Settings Page', () => {
  it('should redirect if not admin', () => {
    (useAuth as jest.Mock).mockReturnValue({ isAdmin: false, user: null });
    render(<SettingsPage />);
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });

  it('should render company profile tab by default', async () => {
    render(<SettingsPage />);
    expect(await screen.findByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
  });

  it('should edit company profile', async () => {
    render(<SettingsPage />);
    await screen.findByText('Tech Corp');
    
    await act(async () => {
      await userEvent.click(screen.getByText('Edit'));
    });
    
    const nameInput = screen.getByDisplayValue('Tech Corp') as HTMLInputElement;
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'New Tech Corp' } });
    });
    
    await act(async () => {
      await userEvent.click(screen.getByText('Save'));
    });
    
    expect(api.put).toHaveBeenCalledWith('/settings/company-profile', {
      companyName: 'New Tech Corp',
      address: '123 Main St'
    });
  });

  it('should switch to departments tab and list items', async () => {
    render(<SettingsPage />);
    
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Departments/i }));
    });
    
    expect(await screen.findByText('Engineering')).toBeInTheDocument();
  });

  it('should add a new department', async () => {
    render(<SettingsPage />);
    
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Departments/i }));
    });
    
    await screen.findByText('Engineering');
    
    const input = screen.getByPlaceholderText('New department name...');
    await act(async () => {
      fireEvent.change(input, { target: { value: 'Marketing' } });
    });
    
    await act(async () => {
      // Find button by icon since there is no aria-label, using parent element
      fireEvent.click(input.nextElementSibling!);
    });
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/settings/departments', { name: 'Marketing' });
    });
  });

  it('should switch to users tab and list users', async () => {
    render(<SettingsPage />);
    
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Users/i }));
    });
    
    expect(await screen.findByText('HR User')).toBeInTheDocument();
    expect(screen.getByText('hr@example.com')).toBeInTheDocument();
  });

  it('should open create user modal and submit', async () => {
    render(<SettingsPage />);
    
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Users/i }));
    });
    
    await screen.findByText('HR User');
    
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Add User/i }));
    });
    
    const nameInput = screen.getByPlaceholderText('Full name');
    await act(async () => {
      fireEvent.change(nameInput, { target: { value: 'New Admin' } });
      fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'admin2@example.com' } });
      fireEvent.change(screen.getByPlaceholderText('Password (min 8 chars)'), { target: { value: 'password123' } });
    });
    
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Create/i }));
    });
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/settings/users', {
        name: 'New Admin',
        email: 'admin2@example.com',
        password: 'password123',
        role: 'HR'
      });
      expect(toast.success).toHaveBeenCalledWith('User created successfully');
    });
  });

  it('should switch to pipelines tab and list pipelines', async () => {
    render(<SettingsPage />);
    
    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Pipelines/i }));
    });
    
    expect(await screen.findByText('Standard Pipeline')).toBeInTheDocument();
  });
});
