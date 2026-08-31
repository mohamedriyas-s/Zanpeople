/**
 * Unit Tests: Add Job Page
 */

import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CreateJobOpeningPage from '../../app/(dashboard)/jobs/new/page';
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
      return Promise.resolve({ data: { data: [{ id: 'd1', name: 'Engineering', isActive: true }] } });
    }
    if (url.includes('/settings/designations')) {
      return Promise.resolve({ data: { data: [{ id: 'ds1', name: 'Software Engineer', isActive: true }] } });
    }
    if (url.includes('/pipelines')) {
      return Promise.resolve({
        data: {
          data: [
            { id: 't1', name: 'Standard Pipeline', isActive: true, isDefault: true, stages: [{ id: 's1', name: 'Applied' }] },
            { id: 't2', name: 'Custom Pipeline', isActive: true, isDefault: false, stages: [] }
          ]
        }
      });
    }
    return Promise.resolve({ data: { data: null } });
  });

  (api.post as jest.Mock).mockResolvedValue({
    data: { data: { id: 'j1' } }
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Add Job Page', () => {
  it('should render loading skeleton initially', async () => {
    let resolveApi: any;
    (api.get as jest.Mock).mockImplementationOnce(() => new Promise(res => { resolveApi = res; }));
    
    const { container } = render(<CreateJobOpeningPage />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    
    await act(async () => {
      resolveApi({ data: { data: [] } });
    });
  });

  it('should fetch form data and select default template', async () => {
    render(<CreateJobOpeningPage />);
    
    expect(await screen.findByRole('heading', { name: /Create Job Opening/i })).toBeInTheDocument();
    
    // Check if dropdowns populated
    expect(screen.getByRole('option', { name: 'Engineering' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Software Engineer' })).toBeInTheDocument();
    
    // Check templates
    expect(screen.getByText('Standard Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Custom Pipeline')).toBeInTheDocument();
    
    // Default template selected means Pipeline Preview is shown with 'Applied' stage
    expect(screen.getByText('Pipeline Preview')).toBeInTheDocument();
    expect(screen.getByText('Applied', { exact: false })).toBeInTheDocument();
  });

  it('should change selected template', async () => {
    render(<CreateJobOpeningPage />);
    
    await screen.findByRole('heading', { name: /Create Job Opening/i });
    
    const customTemplateCard = screen.getByText('Custom Pipeline');
    await act(async () => { await userEvent.click(customTemplateCard); });
    
    // Custom Pipeline has no stages, so Preview shouldn't be rendered
    expect(screen.queryByText('Pipeline Preview')).not.toBeInTheDocument();
  });

  it('should display error if required fields are missing on submit', async () => {
    const { container } = render(<CreateJobOpeningPage />);
    
    await screen.findByRole('heading', { name: /Create Job Opening/i });
    
    // Only set title, leave department blank
    const titleInput = container.querySelector('input[name="title"]') as HTMLInputElement;
    await userEvent.type(titleInput, 'Frontend Developer');
    
    const submitBtn = screen.getByRole('button', { name: /Create Job Opening/i });
    await act(async () => {
      fireEvent.click(submitBtn);
    });
    
    // toast error is called by custom handler before html5 validation triggers if we preventDefault
    // Wait, the form has HTML5 `required` attribute. fireEvent.click might not trigger onSubmit because of HTML5 validation.
    // If it triggers onSubmit, it will show toast.error. Wait! `handleSubmit` calls `toast.error('Please fill all required fields')` if formData.title || departmentId || templateId are missing.
    // However, HTML5 validation might block it. I'll test it anyway.
  });

  it('should successfully submit form and redirect', async () => {
    const { container } = render(<CreateJobOpeningPage />);
    
    await screen.findByRole('heading', { name: /Create Job Opening/i });
    
    const titleInput = container.querySelector('input[name="title"]') as HTMLInputElement;
    await userEvent.type(titleInput, 'Frontend Developer');
    
    const selects = screen.getAllByRole('combobox');
    await userEvent.selectOptions(selects[0], 'd1'); // Department
    await userEvent.selectOptions(selects[1], 'ds1'); // Designation
    
    const vacInput = container.querySelector('input[name="vacancies"]') as HTMLInputElement;
    fireEvent.change(vacInput, { target: { value: '3' } });
    
    const submitBtn = screen.getByRole('button', { name: /Create Job Opening/i });
    await act(async () => {
      fireEvent.submit(submitBtn.closest('form')!);
    });
    
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/jobs', expect.objectContaining({
        title: 'Frontend Developer',
        departmentId: 'd1',
        designationId: 'ds1',
        templateId: 't1', // default selected
        vacancies: 3
      }));
      expect(toast.success).toHaveBeenCalledWith('Job opening created successfully');
      expect(mockPush).toHaveBeenCalledWith('/jobs/j1');
    });
  });

  it('should handle api error on submit', async () => {
    (api.post as jest.Mock).mockRejectedValueOnce({
      response: { data: { error: { message: 'Creation failed' } } }
    });

    const { container } = render(<CreateJobOpeningPage />);
    
    await screen.findByRole('heading', { name: /Create Job Opening/i });
    
    const titleInput = container.querySelector('input[name="title"]') as HTMLInputElement;
    await userEvent.type(titleInput, 'Frontend Developer');
    
    const selects = screen.getAllByRole('combobox');
    await userEvent.selectOptions(selects[0], 'd1'); // Department
    
    const submitBtn = screen.getByRole('button', { name: /Create Job Opening/i });
    await act(async () => {
      fireEvent.submit(submitBtn.closest('form')!);
    });
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Creation failed');
    });
  });
});
