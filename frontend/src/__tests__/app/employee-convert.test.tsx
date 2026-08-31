/**
 * Unit Tests: Convert Candidate to Employee Page
 */

import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConvertCandidatePage from '../../app/(dashboard)/employees/convert/page';
import api from '../../lib/api';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
let currentSearchParams = new URLSearchParams('?candidateId=c1');
const mockRouter = { push: mockPush };

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useSearchParams: () => currentSearchParams,
}));

jest.mock('../../lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  currentSearchParams = new URLSearchParams('?candidateId=c1');

  (api.get as jest.Mock).mockImplementation((url) => {
    if (url.includes('/candidates/c1')) {
      return Promise.resolve({
        data: {
          data: {
            id: 'c1',
            name: 'John Doe',
            email: 'john@example.com',
            phone: '9876543210',
            positionApplied: 'Developer',
            yearsExperience: 5
          }
        }
      });
    }
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

describe('Convert Candidate Page', () => {
  it('should redirect if no candidateId is provided', async () => {
    currentSearchParams = new URLSearchParams();
    render(<ConvertCandidatePage />);
    
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/candidates');
    });
  });

  it('should load and display candidate details and forms', async () => {
    render(<ConvertCandidatePage />);
    
    // Wait for data to load
    await screen.findByText('John Doe'); // candidate name in hero
    expect(screen.getByText('Developer')).toBeInTheDocument(); // position applied
    
    // Check pre-filled inputs
    const nameInput = screen.getByDisplayValue('John Doe');
    expect(nameInput).toBeInTheDocument();
    
    const emailInput = screen.getByDisplayValue('john@example.com');
    expect(emailInput).toBeInTheDocument();
  });

  it('should show validation errors on submit empty required fields', async () => {
    render(<ConvertCandidatePage />);
    
    await screen.findByText('John Doe');
    
    // Clear pre-filled name to trigger error
    const nameInput = screen.getByDisplayValue('John Doe');
    await userEvent.clear(nameInput);
    
    const submitBtn = screen.getByRole('button', { name: /Convert to Employee/i });
    await act(async () => {
      fireEvent.submit(submitBtn.closest('form')!);
    });
    
    await waitFor(() => {
      expect(screen.getAllByText(/Required|required/i).length).toBeGreaterThan(0);
    });
  });

  it('should successfully submit form and redirect', async () => {
    render(<ConvertCandidatePage />);
    
    await screen.findByText('John Doe');
    
    // Fill required new fields
    const deptSelect = screen.getAllByRole('combobox').find(select => select.innerHTML.includes('Engineering'))!;
    await userEvent.selectOptions(deptSelect, 'd1');
    
    const desigSelect = screen.getAllByRole('combobox').find(select => select.innerHTML.includes('Software Engineer'))!;
    await userEvent.selectOptions(desigSelect, 'ds1');
    
    const submitBtn = screen.getByRole('button', { name: /Convert to Employee/i });
    await act(async () => {
      fireEvent.submit(submitBtn.closest('form')!);
    });
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/employees/from-candidate/c1', expect.objectContaining({
        fullName: 'John Doe',
        email: 'john@example.com',
        departmentId: 'd1',
        designationId: 'ds1',
      }));
      expect(mockPush).toHaveBeenCalledWith('/employees/e1');
    });
  });

  it('should handle api error on submit', async () => {
    (api.post as jest.Mock).mockImplementationOnce(() => Promise.reject({
      response: { data: { error: { message: 'Conversion failed' } } }
    }));

    render(<ConvertCandidatePage />);
    
    await screen.findByText('John Doe');
    
    const deptSelect = screen.getAllByRole('combobox').find(select => select.innerHTML.includes('Engineering'))!;
    await userEvent.selectOptions(deptSelect, 'd1');
    
    const desigSelect = screen.getAllByRole('combobox').find(select => select.innerHTML.includes('Software Engineer'))!;
    await userEvent.selectOptions(desigSelect, 'ds1');
    
    const submitBtn = screen.getByRole('button', { name: /Convert to Employee/i });
    await act(async () => {
      fireEvent.submit(submitBtn.closest('form')!);
    });
    
    expect(await screen.findByText('Conversion failed')).toBeInTheDocument();
  });
});
