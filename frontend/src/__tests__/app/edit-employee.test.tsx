/**
 * Unit Tests: Edit Employee Page
 */

import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditEmployeePage from '../../app/(dashboard)/employees/[id]/edit/page';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
const mockRouter = { push: mockPush };
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: () => ({ id: 'e1' }),
}));

jest.mock('../../lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    put: jest.fn(),
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
    if (url.includes('/employees/e1')) {
      return Promise.resolve({
        data: {
          data: {
            id: 'e1',
            fullName: 'John Doe',
            email: 'john@example.com',
            phone: '9876543210',
            employeeCode: 'EMP001',
            departmentId: 'd1',
            designationId: 'ds1',
            managerId: 'm1',
            joiningDate: '2023-01-01T00:00:00.000Z',
          }
        }
      });
    }
    if (url.includes('/settings/departments')) {
      return Promise.resolve({ data: { data: [{ id: 'd1', name: 'Engineering' }, { id: 'd2', name: 'HR' }] } });
    }
    if (url.includes('/settings/designations')) {
      return Promise.resolve({ data: { data: [{ id: 'ds1', name: 'Software Engineer' }] } });
    }
    if (url.includes('/employees?status=ACTIVE')) {
      // Return e1 to verify it gets filtered out of managers list, and m1 as a valid manager
      return Promise.resolve({ 
        data: { 
          data: { 
            items: [
              { id: 'm1', fullName: 'Manager One', employeeCode: 'M1' },
              { id: 'e1', fullName: 'John Doe', employeeCode: 'EMP001' }
            ] 
          } 
        } 
      });
    }
    return Promise.resolve({ data: { data: null } });
  });

  (api.put as jest.Mock).mockResolvedValue({
    data: { data: { id: 'e1' } }
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Edit Employee Page', () => {
  it('should render loading skeleton initially', async () => {
    let resolveApi: any;
    (api.get as jest.Mock).mockImplementationOnce(() => new Promise(res => { resolveApi = res; }));
    
    const { container } = render(<EditEmployeePage />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    
    await act(async () => {
      resolveApi({ data: { data: {} } });
    });
  });

  it('should redirect if employee fetch fails', async () => {
    (api.get as jest.Mock).mockImplementationOnce(() => Promise.reject(new Error('Not found')));
    
    render(<EditEmployeePage />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/employees');
    });
  });

  it('should load employee data and populate forms', async () => {
    const { container } = render(<EditEmployeePage />);
    
    await waitFor(() => {
      expect((container.querySelector('input[name="fullName"]') as HTMLInputElement).value).toBe('John Doe');
    });
    
    expect((container.querySelector('input[name="email"]') as HTMLInputElement).value).toBe('john@example.com');
    expect((container.querySelector('input[name="phone"]') as HTMLInputElement).value).toBe('9876543210');
    expect(screen.getByText('EMP001')).toBeInTheDocument(); // employee code text
    
    // Check dropdowns
    const selects = screen.getAllByRole('combobox');
    expect((selects[0] as HTMLSelectElement).value).toBe('d1'); // dept
    expect((selects[1] as HTMLSelectElement).value).toBe('ds1'); // desig
    expect((selects[2] as HTMLSelectElement).value).toBe('m1'); // manager
    
    // Check that 'John Doe' (e1) is NOT in the manager list (excluded self)
    expect(screen.queryByText(/John Doe \(EMP001\)/)).not.toBeInTheDocument();
  });

  it('should successfully submit form and redirect', async () => {
    const { container } = render(<EditEmployeePage />);
    
    await waitFor(() => {
      expect((container.querySelector('input[name="fullName"]') as HTMLInputElement).value).toBe('John Doe');
    });
    
    const nameInput = container.querySelector('input[name="fullName"]') as HTMLInputElement;
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Johnathan Doe');
    
    const selects = screen.getAllByRole('combobox');
    await userEvent.selectOptions(selects[0], 'd2'); // Change dept
    
    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    await act(async () => {
      fireEvent.submit(submitBtn.closest('form')!);
    });
    
    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/employees/e1', expect.objectContaining({
        fullName: 'Johnathan Doe',
        departmentId: 'd2'
      }));
      expect(toast.success).toHaveBeenCalledWith('Employee updated successfully');
      expect(mockPush).toHaveBeenCalledWith('/employees/e1');
    });
  });

  it('should handle api error on submit', async () => {
    (api.put as jest.Mock).mockImplementationOnce(() => Promise.reject({
      response: { data: { error: { message: 'Update failed' } } }
    }));

    render(<EditEmployeePage />);
    
    await screen.findByDisplayValue('John Doe');
    
    const submitBtn = screen.getByRole('button', { name: /Save Changes/i });
    await act(async () => {
      fireEvent.submit(submitBtn.closest('form')!);
    });
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Update failed');
    });
  });
});
