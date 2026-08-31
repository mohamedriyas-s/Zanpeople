/**
 * Unit Tests: Job Openings Page
 */

import React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import JobOpeningsPage from '../../app/(dashboard)/jobs/page';
import api from '../../lib/api';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
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

  (api.get as jest.Mock).mockImplementation((url) => {
    if (url.includes('/jobs')) {
      return Promise.resolve({
        data: {
          data: {
            items: [
              {
                id: 'j1',
                title: 'Frontend Developer',
                department: { name: 'Engineering' },
                status: 'OPEN',
                vacancies: 2,
                _count: { applications: 5 },
                createdAt: '2023-01-01T00:00:00.000Z'
              },
              {
                id: 'j2',
                title: 'HR Manager',
                department: { name: 'Human Resources' },
                status: 'CLOSED',
                vacancies: 1,
                _count: { applications: 12 },
                createdAt: '2023-01-02T00:00:00.000Z'
              }
            ],
            total: 2,
            totalPages: 1
          }
        }
      });
    }
    return Promise.resolve({ data: { data: null } });
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Job Openings Page', () => {
  it('should render loading skeleton initially', async () => {
    let resolveApi: any;
    (api.get as jest.Mock).mockImplementation(() => new Promise(res => { resolveApi = res; }));
    
    const { container } = render(<JobOpeningsPage />);
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0);
    
    await act(async () => {
      resolveApi({ data: { data: { items: [], total: 0, totalPages: 0 } } });
    });
  });

  it('should fetch and display job openings', async () => {
    render(<JobOpeningsPage />);
    
    expect(await screen.findByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('HR Manager')).toBeInTheDocument();
    
    // Check status counts via button name
    expect(screen.getByRole('button', { name: /All 2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /OPEN 1/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /CLOSED 1/i })).toBeInTheDocument();
    
    // Check badges
    expect(screen.getAllByText('OPEN').length).toBeGreaterThan(0);
  });

  it('should filter jobs by status', async () => {
    render(<JobOpeningsPage />);
    
    await screen.findByText('Frontend Developer');
    
    // Filter to OPEN
    const openTab = screen.getByRole('button', { name: /OPEN/i });
    await act(async () => { await userEvent.click(openTab); });
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/jobs?status=OPEN');
    });
  });

  it('should filter jobs by search query locally', async () => {
    const { container } = render(<JobOpeningsPage />);
    
    await screen.findByText('Frontend Developer');
    expect(screen.getByText('HR Manager')).toBeInTheDocument();
    
    const searchInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    await userEvent.type(searchInput, 'HR');
    
    await waitFor(() => {
      expect(screen.queryByText('Frontend Developer')).not.toBeInTheDocument();
      expect(screen.getByText('HR Manager')).toBeInTheDocument();
    });
  });

  it('should display empty state when no jobs match search', async () => {
    const { container } = render(<JobOpeningsPage />);
    
    await screen.findByText('Frontend Developer');
    
    const searchInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    await userEvent.type(searchInput, 'XYZ');
    
    await waitFor(() => {
      expect(screen.getByText('No jobs match your search')).toBeInTheDocument();
    });
  });

  it('should display empty state when api returns empty array', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: { data: { items: [], total: 0, totalPages: 0 } }
    });

    render(<JobOpeningsPage />);
    
    expect(await screen.findByText('No Job Openings Yet')).toBeInTheDocument();
  });
});
