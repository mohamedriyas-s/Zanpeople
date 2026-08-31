/**
 * Unit Tests: Candidates Page Component
 */

import React from 'react';
import { render, screen, act, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CandidatesPage from '../../app/(dashboard)/candidates/page';
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

// We need to mock window.history.replaceState
const originalReplaceState = window.history.replaceState;

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  currentSearchParams = new URLSearchParams();
  window.history.replaceState = jest.fn();

  (api.get as jest.Mock).mockImplementation((url) => {
    if (url.includes('/candidates')) {
      return Promise.resolve({
        data: {
          data: {
            items: [
              {
                id: 'c1',
                name: 'Alice Candidate',
                email: 'alice@example.com',
                positionApplied: 'Developer',
                status: 'APPLIED',
                yearsExperience: 3,
                skills: ['React', 'Node'],
                createdAt: '2023-10-01T10:00:00Z',
              },
              {
                id: 'c2',
                name: 'Bob',
                email: 'bob@example.com',
                positionApplied: 'Designer',
                status: 'SHORTLISTED',
                yearsExperience: 5,
                skills: ['Figma'],
                createdAt: '2023-10-02T10:00:00Z',
              },
            ],
            total: 2,
            totalPages: 1,
          }
        }
      });
    }
    return Promise.resolve({ data: { data: { items: [], total: 0, totalPages: 0 } } });
  });
});

afterAll(() => {
  window.history.replaceState = originalReplaceState;
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Candidates Page', () => {
  it('should render loading skeletons initially', async () => {
    let resolveApi: any;
    (api.get as jest.Mock).mockImplementation(() => new Promise(res => { resolveApi = res; }));
    
    const { container } = render(<CandidatesPage />);
    
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    
    await act(async () => {
      resolveApi({ data: { data: { items: [], total: 0, totalPages: 0 } } });
    });
  });

  it('should fetch and display candidates', async () => {
    render(<CandidatesPage />);
    
    const elements = await screen.findAllByText('Alice Candidate');
    expect(elements[0]).toBeInTheDocument();
    expect(screen.getAllByText('alice@example.com')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Bob')[0]).toBeInTheDocument();
  });

  it('should filter by search and status', async () => {
    render(<CandidatesPage />);
    
    // wait for load
    await screen.findAllByText('Alice Candidate');
    
    const searchInput = screen.getByPlaceholderText(/search by name, email/i);
    await userEvent.type(searchInput, 'Alice');
    
    const statusSelect = screen.getByRole('combobox');
    await userEvent.selectOptions(statusSelect, 'APPLIED');
    
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('search=Alice'));
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('status=APPLIED'));
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it('should clear filters', async () => {
    // Start with filters in URL
    currentSearchParams.set('search', 'Alice');
    currentSearchParams.set('status', 'APPLIED');
    
    render(<CandidatesPage />);
    
    // wait for load
    await screen.findAllByText('Alice Candidate');
    
    const clearBtn = screen.getByText('Clear');
    await userEvent.click(clearBtn);
    
    expect(api.get).toHaveBeenLastCalledWith('/candidates?page=1&limit=20&sortBy=createdAt&sortOrder=desc');
  });

  it('should sort when clicking table headers', async () => {
    render(<CandidatesPage />);
    await screen.findAllByText('Alice Candidate');
    
    // Name header is first one with text "Name" inside it
    const nameHeader = screen.getByRole('button', { name: /name/i });
    
    // Initial sort is createdAt desc. Clicking Name should set to name desc
    await act(async () => { await userEvent.click(nameHeader); });
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('sortBy=name&sortOrder=desc'));
    });
    
    // Click again should toggle to asc
    await act(async () => { await userEvent.click(nameHeader); });
    
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('sortBy=name&sortOrder=asc'));
    });
  });

  it('should handle pagination', async () => {
    (api.get as jest.Mock).mockImplementation(() => {
      return Promise.resolve({
        data: {
          data: {
            items: [{ id: 'c1', name: 'Pagination Test', status: 'APPLIED', createdAt: '2023-10-01' }],
            total: 40,
            totalPages: 2,
          }
        }
      });
    });

    render(<CandidatesPage />);
    
    // wait for load
    await screen.findByText(/page 1 of 2/i);
    
    // Find next button (it's the one with ChevronRight, we can just grab it by finding buttons)
    // The second button in pagination div is Next
    const nextBtn = screen.getAllByRole('button').find(b => b.innerHTML.includes('lucide-chevron-right'));
    
    await userEvent.click(nextBtn!);
    
    expect(api.get).toHaveBeenCalledWith(expect.stringContaining('page=2'));
  });

  it('should navigate to candidate detail on row click', async () => {
    render(<CandidatesPage />);
    const aliceElements = await screen.findAllByText('Alice Candidate');
    const aliceRow = aliceElements[0].closest('tr')!;
    
    await userEvent.click(aliceRow);
    
    expect(mockPush).toHaveBeenCalledWith('/candidates/c1');
  });

  it('should navigate to new candidate page', async () => {
    render(<CandidatesPage />);
    await screen.findAllByText('Alice Candidate');
    
    const addBtn = screen.getByRole('button', { name: /add candidate/i });
    await userEvent.click(addBtn);
    
    expect(mockPush).toHaveBeenCalledWith('/candidates/new');
  });
});
