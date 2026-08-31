/**
 * Unit Tests: Add Candidate Page
 */

import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddCandidatePage from '../../app/(dashboard)/candidates/new/page';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
let currentSearchParams = new URLSearchParams();

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useSearchParams: () => currentSearchParams,
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
  currentSearchParams = new URLSearchParams();

  (api.get as jest.Mock).mockImplementation((url) => {
    if (url.includes('/jobs')) {
      return Promise.resolve({
        data: {
          data: {
            items: [
              { id: 'j1', title: 'Frontend Developer', department: { name: 'Engineering' } }
            ]
          }
        }
      });
    }
    return Promise.resolve({ data: { data: { items: [] } } });
  });

  (api.post as jest.Mock).mockResolvedValue({ data: { data: { id: 'c1' } } });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Add Candidate Page', () => {
  it('should render form fields and fetch jobs', async () => {
    render(<AddCandidatePage />);
    
    expect(screen.getAllByText('Add Candidate')[0]).toBeInTheDocument();
    
    // Wait for jobs
    expect(await screen.findByText(/Frontend Developer.*Engineering/)).toBeInTheDocument();
  });



  it('should toggle fresher fields', async () => {
    render(<AddCandidatePage />);
    
    const fresherCheckbox = screen.getByRole('checkbox');
    expect(screen.getByText('Years of Experience')).toBeInTheDocument();
    
    await act(async () => { await userEvent.click(fresherCheckbox); });
    
    expect(screen.queryByText('Years of Experience')).not.toBeInTheDocument();
  });

  it('should add and remove skills', async () => {
    render(<AddCandidatePage />);
    
    const skillInput = screen.getByPlaceholderText('Type a skill and press Enter...');
    
    await userEvent.type(skillInput, 'React');
    await act(async () => { await userEvent.keyboard('{Enter}'); });
    
    expect(screen.getByText('React')).toBeInTheDocument();
    
    const removeBtn = screen.getAllByRole('button').find(b => b.className.includes('destructive'))!;
    await act(async () => { await userEvent.click(removeBtn); });
    
    expect(screen.queryByText('React')).not.toBeInTheDocument();
  });

  it('should parse resume and autofill fields', async () => {
    (api.post as jest.Mock).mockImplementation((url, data) => {
      if (url === '/candidates/parse-resume') {
        return Promise.resolve({
          data: {
            data: {
              name: 'Parsed Name',
              email: 'parsed@example.com',
              phone: '9876543210',
              skills: ['ParsedSkill']
            }
          }
        });
      }
      return Promise.resolve({ data: { data: { id: 'c1' } } });
    });

    render(<AddCandidatePage />);
    
    const file = new File(['dummy content'], 'resume.pdf', { type: 'application/pdf' });
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    
    expect(api.post).toHaveBeenCalledWith('/candidates/parse-resume', expect.any(FormData), expect.any(Object));
    
    await waitFor(() => {
      expect(screen.getByText(/Autofilled \d+ fields/)).toBeInTheDocument();
    });
    
    // Check if input values changed
    const nameInput = screen.getByPlaceholderText('John Doe') as HTMLInputElement;
    expect(nameInput.value).toBe('Parsed Name');
    expect(screen.getByText('ParsedSkill')).toBeInTheDocument();
  });

  it('should submit form successfully', async () => {
    render(<AddCandidatePage />);
    
    await screen.findByText(/Frontend Developer.*Engineering/);
    
    // Fill required fields
    const jobSelect = screen.getByRole('combobox');
    await userEvent.selectOptions(jobSelect, 'j1');
    
    await userEvent.type(screen.getByPlaceholderText('John Doe'), 'John Doe');
    await userEvent.type(screen.getByPlaceholderText('john@example.com'), 'john@example.com');
    await userEvent.type(screen.getByPlaceholderText('+91 98765 43210'), '9876543210');
    await userEvent.type(screen.getByPlaceholderText('Senior Software Engineer'), 'Dev');
    
    const submitBtn = screen.getByRole('button', { name: 'Add Candidate' });
    await act(async () => { await userEvent.click(submitBtn); });
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/candidates', expect.objectContaining({
        name: 'John Doe',
        email: 'john@example.com'
      }));
      expect(api.post).toHaveBeenCalledWith('/jobs/j1/apply', { candidateId: 'c1' });
      expect(mockPush).toHaveBeenCalledWith('/jobs/j1');
    });
  });

});
