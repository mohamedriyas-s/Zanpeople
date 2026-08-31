/**
 * Unit Tests: Employees Page
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmployeesPage from '../../app/(dashboard)/employees/page';
import api from '../../lib/api';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
let currentSearchParams = new URLSearchParams();
const mockRouter = { push: mockPush };

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => currentSearchParams,
}));

jest.mock('../../lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  currentSearchParams = new URLSearchParams();

  (api.get as jest.Mock).mockImplementation((url) => {
    if (url.includes('/settings/departments')) {
      return Promise.resolve({
        data: {
          data: [
            { id: 'd1', name: 'Engineering' },
            { id: 'd2', name: 'HR' }
          ]
        }
      });
    }
    if (url.includes('/employees')) {
      return Promise.resolve({
        data: {
          data: {
            items: [
              {
                id: 'e1',
                fullName: 'John Doe',
                email: 'john@example.com',
                employeeCode: 'EMP001',
                employmentStatus: 'ACTIVE',
                joiningDate: '2023-01-01',
                department: { name: 'Engineering' },
                designation: { name: 'Developer' }
              }
            ],
            total: 1,
            totalPages: 1
          }
        }
      });
    }
    return Promise.resolve({ data: { data: null } });
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Employees Page', () => {
  it('should render loading skeletons initially', async () => {
    let resolveApi: any;
    (api.get as jest.Mock).mockImplementation(() => new Promise(res => { resolveApi = res; }));
    
    const { container } = render(<EmployeesPage />);
    
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    
    await act(async () => {
      resolveApi({ data: { data: { items: [], total: 0, totalPages: 0 } } });
    });
  });

  it('should fetch and display employees and departments', async () => {
    render(<EmployeesPage />);
    
    expect((await screen.findAllByText('John Doe'))[0]).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
    expect(screen.getAllByText('EMP001').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Engineering').length).toBeGreaterThan(0);
    expect(screen.getByText('1 employees')).toBeInTheDocument();
  });

  it('should filter by search, status, and department', async () => {
    render(<EmployeesPage />);
    
    await screen.findAllByText('John Doe');
    
    // Type in search
    const searchInput = screen.getByPlaceholderText('Search by name, ID, email...');
    await userEvent.type(searchInput, 'John');
    
    // Select status
    const selects = screen.getAllByRole('combobox');
    
    await userEvent.selectOptions(selects[0], 'ACTIVE');
    
    // wait for department to load
    await waitFor(async () => {
      expect((await screen.findAllByText('Engineering')).length).toBeGreaterThan(0);
    });
    
    await userEvent.selectOptions(selects[1], 'd1');
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('search=John'));
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('status=ACTIVE'));
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('department=d1'));
    });
  });

  it('should clear filters', async () => {
    render(<EmployeesPage />);
    
    await screen.findAllByText('John Doe');
    
    const searchInput = screen.getByPlaceholderText('Search by name, ID, email...');
    await userEvent.type(searchInput, 'Jane');
    
    const clearBtn = await screen.findByRole('button', { name: /clear/i });
    await act(async () => { await userEvent.click(clearBtn); });
    
    expect(searchInput).toHaveValue('');
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('page=1'));
    });
  });

  it('should handle pagination', async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url.includes('/settings/departments')) {
        return Promise.resolve({ data: { data: [{ id: 'd1', name: 'Engineering' }] } });
      }
      if (url.includes('/employees')) {
        return Promise.resolve({
          data: {
            data: {
              items: [{ id: 'e1', fullName: 'John', employeeCode: 'E1', employmentStatus: 'ACTIVE', joiningDate: '2023-01-01' }],
              total: 40,
              totalPages: 2
            }
          }
        });
      }
      return Promise.resolve({ data: { data: [] } });
    });

    render(<EmployeesPage />);
    
    await screen.findByText('Page 1 of 2');
    
    const nextBtn = screen.getAllByRole('button').find(b => b.innerHTML.includes('lucide-chevron-right'))!;
    await act(async () => { await userEvent.click(nextBtn); });
    
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('page=2'));
    });
  });

  it('should navigate to employee detail on row click', async () => {
    render(<EmployeesPage />);
    
    await screen.findAllByText('John Doe');
    
    // Using getAllByText because mobile and desktop views duplicate the name
    const johnElements = screen.getAllByText('John Doe');
    await act(async () => { await userEvent.click(johnElements[0].closest('tr')!); });
    
    expect(mockPush).toHaveBeenCalledWith('/employees/e1');
  });

  it('should navigate to new employee page', async () => {
    render(<EmployeesPage />);
    
    const addBtn = screen.getByRole('button', { name: /add employee/i });
    await act(async () => { await userEvent.click(addBtn); });
    
    expect(mockPush).toHaveBeenCalledWith('/employees/new');
  });
});
