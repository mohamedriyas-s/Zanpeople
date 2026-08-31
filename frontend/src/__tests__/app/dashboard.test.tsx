/**
 * Unit Tests: Dashboard Page Component
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DashboardPage from '../../app/(dashboard)/dashboard/page';
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
    if (url === '/dashboard/stats') {
      return Promise.resolve({
        data: {
          data: {
            totalCandidates: 100,
            newCandidates: 10,
            shortlisted: 5,
            interviewScheduled: 3,
            selected: 2,
            rejected: 1,
            joined: 1,
            totalEmployees: 50,
          }
        }
      });
    }
    if (url === '/dashboard/recent-applications') {
      return Promise.resolve({
        data: {
          data: [
            { id: 'c1', name: 'Alice Candidate', positionApplied: 'Developer', status: 'APPLIED' }
          ]
        }
      });
    }
    if (url === '/dashboard/upcoming-interviews') {
      return Promise.resolve({
        data: {
          data: [
            { id: 'c2', name: 'Bob Interviewee', positionApplied: 'Designer', interviewDate: '2023-10-15T10:00:00Z' }
          ]
        }
      });
    }
    if (url === '/dashboard/recent-employees') {
      return Promise.resolve({
        data: {
          data: [
            { id: 'e1', fullName: 'Charlie Employee', department: { name: 'Engineering' }, designation: { name: 'Senior Dev' }, employeeCode: 'EMP-001' }
          ]
        }
      });
    }
    return Promise.resolve({ data: { data: [] } });
  });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Dashboard Page', () => {
  it('should render loading skeletons initially', () => {
    // Delay promises so we can catch the loading state
    let resolveStats: any;
    (api.get as jest.Mock).mockImplementation(() => new Promise((res) => { resolveStats = res; }));
    
    const { container } = render(<DashboardPage />);
    
    // Check for skeleton classes
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('should fetch and display stats and lists', async () => {
    render(<DashboardPage />);

    // Wait for the stats to appear
    expect(await screen.findByText('100')).toBeInTheDocument(); // Total Candidates
    expect(screen.getByText('10')).toBeInTheDocument(); // New Candidates
    expect(screen.getByText('50')).toBeInTheDocument(); // Total Employees
    
    // Lists should appear
    expect(screen.getByText('Alice Candidate')).toBeInTheDocument();
    expect(screen.getByText('Bob Interviewee')).toBeInTheDocument();
    expect(screen.getByText('Charlie Employee')).toBeInTheDocument();
  });

  it('should render empty states when lists are empty', async () => {
    (api.get as jest.Mock).mockImplementation((url) => {
      if (url === '/dashboard/stats') return Promise.resolve({ data: { data: {} } });
      return Promise.resolve({ data: { data: [] } }); // all lists empty
    });

    render(<DashboardPage />);
    
    expect(await screen.findByText('No candidates yet')).toBeInTheDocument();
    expect(screen.getByText('No upcoming interviews')).toBeInTheDocument();
    expect(screen.getByText('No employees yet')).toBeInTheDocument();
  });

  it('should navigate using quick actions', async () => {
    render(<DashboardPage />);
    
    // wait for loading to finish
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /Dashboard/i })).toBeInTheDocument();
    });
    
    const addCandidateBtn = await screen.findByText('Add Candidate');
    const addEmployeeBtn = screen.getByText('Add Employee');

    await userEvent.click(addCandidateBtn);
    expect(mockPush).toHaveBeenCalledWith('/candidates/new');

    await userEvent.click(addEmployeeBtn);
    expect(mockPush).toHaveBeenCalledWith('/employees/new');
  });

  it('should navigate when clicking a stat card', async () => {
    render(<DashboardPage />);
    
    // wait for stats to load
    const totalCandidatesCard = (await screen.findByText('100')).closest('button')!;
    await userEvent.click(totalCandidatesCard);
    
    expect(mockPush).toHaveBeenCalledWith('/candidates');
  });

  it('should navigate when clicking a recent application', async () => {
    render(<DashboardPage />);
    
    const alice = (await screen.findByText('Alice Candidate')).closest('button')!;
    await userEvent.click(alice);
    
    expect(mockPush).toHaveBeenCalledWith('/candidates/c1');
  });
});
