/**
 * Unit Tests: Job Detail Page
 */

import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobDetailPage from '../../app/(dashboard)/jobs/[id]/page';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  useParams: () => ({ id: 'j1' }),
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

beforeEach(() => {
  jest.clearAllMocks();

  (api.get as jest.Mock).mockImplementation((url) => {
    if (url.includes('/board')) {
      return Promise.resolve({
        data: {
          data: {
            stages: [
              {
                id: 's1',
                name: 'Applied',
                stageType: 'APPLIED',
                stageOrder: 1,
                candidates: [
                  {
                    id: 'a1',
                    status: 'IN_PIPELINE',
                    appliedAt: '2023-01-01T00:00:00.000Z',
                    candidate: { name: 'Alice Bob', email: 'alice@example.com' }
                  }
                ]
              },
              {
                id: 's2',
                name: 'Interview',
                stageType: 'INTERVIEW',
                stageOrder: 2,
                candidates: [
                  {
                    id: 'a2',
                    status: 'SELECTED',
                    appliedAt: '2023-01-02T00:00:00.000Z',
                    candidate: { name: 'Charlie Dave', email: 'charlie@example.com' }
                  }
                ]
              }
            ]
          }
        }
      });
    }
    
    if (url.includes('/jobs/j1')) {
      return Promise.resolve({
        data: {
          data: {
            id: 'j1',
            title: 'Frontend Developer',
            status: 'OPEN',
            department: { name: 'Engineering' },
            designation: { name: 'Engineer' },
            vacancies: 2,
            createdAt: '2023-01-01T00:00:00.000Z',
            description: 'Job description text.',
            template: {
              name: 'Standard Pipeline',
              stages: [
                { id: 's1', name: 'Applied' },
                { id: 's2', name: 'Interview' }
              ]
            }
          }
        }
      });
    }
    
    return Promise.resolve({ data: { data: null } });
  });

  (api.patch as jest.Mock).mockResolvedValue({
    data: { data: { success: true } }
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Job Detail Page', () => {
  it('should render loading state initially', async () => {
    let resolveApi: any;
    (api.get as jest.Mock).mockImplementation(() => new Promise(res => { resolveApi = res; }));
    
    const { container } = render(<JobDetailPage />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    
    await act(async () => {
      resolveApi({ data: { data: { stages: [] } } });
    });
  });

  it('should display job details and board stats', async () => {
    render(<JobDetailPage />);
    
    expect(await screen.findByText('Frontend Developer')).toBeInTheDocument();
    
    // Status and tags
    expect(screen.getByText('Engineering')).toBeInTheDocument();
    expect(screen.getByText('Engineer')).toBeInTheDocument();
    
    // Stats (Total 2, In Pipeline 1, Selected 1)
    expect(screen.getByText('2', { selector: '.text-lg.font-bold.text-\\[hsl\\(var\\(--foreground\\)\\)\\]' })).toBeInTheDocument();
    expect(screen.getByText('1', { selector: '.text-blue-600' })).toBeInTheDocument();
    expect(screen.getByText('1', { selector: '.text-emerald-600' })).toBeInTheDocument();
    
    // Pipeline preview
    expect(screen.getByText('Pipeline: Standard Pipeline')).toBeInTheDocument();
    
    // Candidate rows
    expect(screen.getByText('Alice Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie Dave')).toBeInTheDocument();
  });

  it('should handle api failure and redirect', async () => {
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('Failed'));
    
    render(<JobDetailPage />);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Failed to load job details');
      expect(mockPush).toHaveBeenCalledWith('/jobs');
    });
  });

  it('should change job status to ON_HOLD', async () => {
    render(<JobDetailPage />);
    
    await screen.findByText('Frontend Developer');
    
    const holdBtn = screen.getByRole('button', { name: /Hold/i });
    await act(async () => { await userEvent.click(holdBtn); });
    
    expect(api.patch).toHaveBeenCalledWith('/jobs/j1/status', { status: 'ON_HOLD' });
    expect(toast.success).toHaveBeenCalledWith('Job status updated to ON_HOLD');
  });

  it('should handle job status update failure', async () => {
    (api.patch as jest.Mock).mockRejectedValueOnce({
      response: { data: { error: { message: 'Update error' } } }
    });
    
    render(<JobDetailPage />);
    
    await screen.findByText('Frontend Developer');
    
    const closeBtn = screen.getByRole('button', { name: /Close Job/i });
    await act(async () => { await userEvent.click(closeBtn); });
    
    expect(toast.error).toHaveBeenCalledWith('Update error');
  });

  it('should filter applicants by search text', async () => {
    const { container } = render(<JobDetailPage />);
    
    await screen.findByText('Alice Bob');
    expect(screen.getByText('Charlie Dave')).toBeInTheDocument();
    
    const searchInput = container.querySelector('input[placeholder="Search applicants..."]') as HTMLInputElement;
    await userEvent.type(searchInput, 'Alice');
    
    await waitFor(() => {
      expect(screen.queryByText('Charlie Dave')).not.toBeInTheDocument();
      expect(screen.getByText('Alice Bob')).toBeInTheDocument();
    });
  });

  it('should filter applicants by stage', async () => {
    render(<JobDetailPage />);
    
    await screen.findByText('Alice Bob');
    
    // Click 'Interview' stage tab
    const interviewBtn = screen.getByRole('button', { name: /Interview/i });
    await act(async () => { await userEvent.click(interviewBtn); });
    
    await waitFor(() => {
      expect(screen.queryByText('Alice Bob')).not.toBeInTheDocument();
      expect(screen.getByText('Charlie Dave')).toBeInTheDocument();
    });
  });
  
  it('should filter applicants by status dropdown', async () => {
    render(<JobDetailPage />);
    
    await screen.findByText('Alice Bob');
    
    // Select IN_PIPELINE
    const selects = screen.getAllByRole('combobox');
    await userEvent.selectOptions(selects[0], 'IN_PIPELINE');
    
    await waitFor(() => {
      expect(screen.queryByText('Charlie Dave')).not.toBeInTheDocument();
      expect(screen.getByText('Alice Bob')).toBeInTheDocument();
    });
  });
});
