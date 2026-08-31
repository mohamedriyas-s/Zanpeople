/**
 * Unit Tests: Employee Detail Page
 */

import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmployeeDetailPage from '../../app/(dashboard)/employees/[id]/page';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'e1' }),
}));

jest.mock('../../lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

const mockEmployee = {
  id: 'e1',
  fullName: 'John Doe',
  email: 'john@example.com',
  phone: '9876543210',
  employeeCode: 'EMP001',
  employmentStatus: 'ACTIVE',
  joiningDate: '2023-01-01',
  department: { name: 'Engineering' },
  designation: { name: 'Developer' },
  manager: { id: 'm1', fullName: 'Manager One', employeeCode: 'M001' },
  reports: [
    { id: 'r1', fullName: 'Report One', employeeCode: 'R001' }
  ],
  emergencyContactName: 'Jane Doe',
  emergencyContactRelationship: 'Spouse',
  emergencyContactPhone: '1122334455',
  documents: [
    { id: 'doc1', fileName: 'offer_letter.pdf', docType: 'OFFER_LETTER', downloadUrl: 'http://example.com/doc' }
  ]
};

beforeEach(() => {
  jest.clearAllMocks();
  (api.get as jest.Mock).mockResolvedValue({
    data: { data: mockEmployee }
  });
  (api.patch as jest.Mock).mockResolvedValue({});
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Employee Detail Page', () => {
  it('should render loading skeleton initially', async () => {
    let resolveApi: any;
    (api.get as jest.Mock).mockImplementation(() => new Promise(res => { resolveApi = res; }));
    
    const { container } = render(<EmployeeDetailPage />);
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    
    await act(async () => {
      resolveApi({ data: { data: mockEmployee } });
    });
  });

  it('should display employee details and documents', async () => {
    render(<EmployeeDetailPage />);
    
    await screen.findByText('John Doe'); // Hero Name
    expect(screen.getByText('EMP001')).toBeInTheDocument();
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    
    // Manager
    expect(screen.getByText(/Manager One/)).toBeInTheDocument();
    
    // Reports
    expect(screen.getByText(/Direct Reports \(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/Report One/)).toBeInTheDocument();
    
    // Emergency Contact
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Spouse')).toBeInTheDocument();
    
    // Documents
    expect(screen.getByText('offer_letter.pdf')).toBeInTheDocument();
    expect(screen.getByText('OFFER LETTER')).toBeInTheDocument();
  });

  it('should navigate to edit page', async () => {
    render(<EmployeeDetailPage />);
    
    const editBtn = await screen.findByRole('button', { name: /Edit/i });
    await act(async () => { await userEvent.click(editBtn); });
    
    expect(mockPush).toHaveBeenCalledWith('/employees/e1/edit');
  });

  it('should navigate to manager and report profiles', async () => {
    render(<EmployeeDetailPage />);
    
    const managerLink = await screen.findByText(/Manager One/);
    await act(async () => { await userEvent.click(managerLink); });
    expect(mockPush).toHaveBeenCalledWith('/employees/m1');
    
    const reportLink = screen.getByText(/Report One/);
    await act(async () => { await userEvent.click(reportLink); });
    expect(mockPush).toHaveBeenCalledWith('/employees/r1');
  });

  it('should deactivate employee successfully', async () => {
    render(<EmployeeDetailPage />);
    
    const deactivateBtn = await screen.findByRole('button', { name: /Deactivate/i });
    await act(async () => { await userEvent.click(deactivateBtn); });
    
    // Confirm modal
    const confirmBtns = screen.getAllByRole('button', { name: 'Deactivate' });
    await act(async () => { await userEvent.click(confirmBtns[confirmBtns.length - 1]); });
    
    expect(api.patch).toHaveBeenCalledWith('/employees/e1/deactivate');
    expect(toast.success).toHaveBeenCalledWith('Employee deactivated successfully');
  });

  it('should handle HAS_ACTIVE_REPORTS warning on deactivate', async () => {
    (api.patch as jest.Mock).mockImplementationOnce(() => Promise.reject({
      response: { data: { error: { code: 'HAS_ACTIVE_REPORTS', message: 'Employee has 1 active reports.' } } }
    }));

    render(<EmployeeDetailPage />);
    
    const deactivateBtn = await screen.findByRole('button', { name: /Deactivate/i });
    await act(async () => { await userEvent.click(deactivateBtn); });
    
    // Click initial deactivate
    const initialConfirmBtns = screen.getAllByRole('button', { name: 'Deactivate' });
    await act(async () => { await userEvent.click(initialConfirmBtns[initialConfirmBtns.length - 1]); });
    
    // Warning should appear
    expect(await screen.findByText('Employee has 1 active reports.')).toBeInTheDocument();
    
    // Mock success for force deactivate
    (api.patch as jest.Mock).mockResolvedValueOnce({});
    
    // Click Deactivate Anyway
    const forceConfirmBtn = screen.getByRole('button', { name: 'Deactivate Anyway' });
    await act(async () => { await userEvent.click(forceConfirmBtn); });
    
    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/employees/e1/deactivate?confirm=true');
      expect(toast.success).toHaveBeenCalledWith('Employee deactivated successfully');
    });
  });

  it('should hide deactivate button if status is INACTIVE', async () => {
    (api.get as jest.Mock).mockResolvedValue({
      data: { data: { ...mockEmployee, employmentStatus: 'INACTIVE' } }
    });

    render(<EmployeeDetailPage />);
    
    await screen.findByText('John Doe');
    
    expect(screen.queryByRole('button', { name: /Deactivate/i })).not.toBeInTheDocument();
  });
});
