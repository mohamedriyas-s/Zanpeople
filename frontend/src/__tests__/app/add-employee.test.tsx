/**
 * Unit Tests: Add Employee Page
 */

import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddEmployeePage from '../../app/(dashboard)/employees/new/page';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  (api.get as jest.Mock).mockImplementation((url) => {
    if (url.includes('/settings/departments')) {
      return Promise.resolve({ data: { data: [{ id: 'd1', name: 'Engineering' }] } });
    }
    if (url.includes('/settings/designations')) {
      return Promise.resolve({ data: { data: [{ id: 'ds1', name: 'Software Engineer' }] } });
    }
    if (url.includes('/employees')) {
      return Promise.resolve({ data: { data: { items: [{ id: 'm1', fullName: 'Manager One', employeeCode: 'M1' }] } } });
    }
    return Promise.resolve({ data: { data: null } });
  });

  (api.post as jest.Mock).mockResolvedValue({
    data: { data: { id: 'e1' } }
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Add Employee Page', () => {
  it('should render form and load dropdown data', async () => {
    render(<AddEmployeePage />);
    
    expect(screen.getByRole('heading', { name: /Add Employee/i })).toBeInTheDocument();
    
    // Check if dropdowns populated
    await waitFor(() => {
      expect(screen.getAllByRole('combobox').find(s => s.innerHTML.includes('Engineering'))).toBeInTheDocument();
      expect(screen.getAllByRole('combobox').find(s => s.innerHTML.includes('Software Engineer'))).toBeInTheDocument();
      expect(screen.getAllByRole('combobox').find(s => s.innerHTML.includes('Manager One'))).toBeInTheDocument();
    });
  });

  it('should show validation errors on submit empty required fields', async () => {
    render(<AddEmployeePage />);
    
    const submitBtn = screen.getByRole('button', { name: /Add Employee/i });
    await act(async () => {
      fireEvent.submit(submitBtn.closest('form')!);
    });
    
    await waitFor(() => {
      expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0);
    });
  });

  it('should successfully submit form and redirect', async () => {
    const { container } = render(<AddEmployeePage />);
    
    await screen.findByRole('button', { name: /Add Employee/i });
    
    const nameInput = container.querySelector('input[name="fullName"]') as HTMLInputElement;
    await userEvent.type(nameInput, 'Alice Bob');
    
    const emailInput = container.querySelector('input[name="email"]') as HTMLInputElement;
    await userEvent.type(emailInput, 'alice@example.com');
    
    const dateInput = container.querySelector('input[name="joiningDate"]') as HTMLInputElement;
    await userEvent.type(dateInput, '2023-01-01');
    
    const selects = screen.getAllByRole('combobox');
    await userEvent.selectOptions(selects[0], 'd1');
    await userEvent.selectOptions(selects[1], 'ds1');
    await userEvent.selectOptions(selects[2], 'm1'); // Manager
    
    const submitBtn = screen.getByRole('button', { name: /Add Employee/i });
    await act(async () => {
      fireEvent.submit(submitBtn.closest('form')!);
    });
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/employees', expect.objectContaining({
        fullName: 'Alice Bob',
        email: 'alice@example.com',
        joiningDate: '2023-01-01',
        departmentId: 'd1',
        designationId: 'ds1',
        managerId: 'm1'
      }));
      expect(toast.success).toHaveBeenCalledWith('Employee created successfully');
      expect(mockPush).toHaveBeenCalledWith('/employees/e1');
    });
  });

  it('should handle api error on submit', async () => {
    (api.post as jest.Mock).mockImplementationOnce(() => Promise.reject({
      response: { data: { error: { message: 'Creation failed' } } }
    }));

    const { container } = render(<AddEmployeePage />);
    
    const nameInput = container.querySelector('input[name="fullName"]') as HTMLInputElement;
    await userEvent.type(nameInput, 'Alice Bob');
    
    const emailInput = container.querySelector('input[name="email"]') as HTMLInputElement;
    await userEvent.type(emailInput, 'alice@example.com');
    
    const dateInput = container.querySelector('input[name="joiningDate"]') as HTMLInputElement;
    await userEvent.type(dateInput, '2023-01-01');
    
    const selects = screen.getAllByRole('combobox');
    await userEvent.selectOptions(selects[0], 'd1');
    await userEvent.selectOptions(selects[1], 'ds1');
    
    const submitBtn = screen.getByRole('button', { name: /Add Employee/i });
    await act(async () => {
      fireEvent.submit(submitBtn.closest('form')!);
    });
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Creation failed');
    });
  });
});
