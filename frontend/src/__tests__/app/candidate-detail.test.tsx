/**
 * Unit Tests: Candidate Detail Page
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CandidateDetailPage from '../../app/(dashboard)/candidates/[id]/page';
import api from '../../lib/api';
import toast from 'react-hot-toast';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();

jest.mock('next/navigation', () => ({
  useParams: () => ({ id: 'c1' }),
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('../../lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    delete: jest.fn(),
    patch: jest.fn(),
  },
}));

jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockImplementation(() => Promise.resolve()),
  },
});

// ─── Setup ────────────────────────────────────────────────────────────────────

const mockCandidate = {
  id: 'c1',
  name: 'Alice Candidate',
  email: 'alice@example.com',
  phone: '1234567890',
  positionApplied: 'Developer',
  status: 'ACCEPTED',
  yearsExperience: 3,
  skills: ['React', 'Node'],
  publicToken: 'abc-123',
  publicLinkEnabled: true,
  applications: [
    { id: 'app1', jobOpening: { title: 'Frontend Developer' }, appliedAt: '2023-10-01', status: 'APPLIED' }
  ],
  notes: [
    { id: 'n1', content: 'Good interview', noteType: 'INTERVIEW_COMMENT', createdBy: { name: 'HR' }, createdAt: '2023-10-02T10:00:00Z', visibleToPublic: false }
  ],
  timeline: [
    { id: 't1', description: 'Applied', createdAt: '2023-10-01T10:00:00Z' }
  ]
};

beforeEach(() => {
  jest.clearAllMocks();

  (api.get as jest.Mock).mockImplementation((url) => {
    if (url === '/candidates/c1') {
      return Promise.resolve({ data: { data: mockCandidate } });
    }
    if (url === '/candidates/c1/resume') {
      return Promise.resolve({ data: { data: { previewUrl: 'http://example.com/resume.pdf', downloadUrl: 'http://example.com/resume.pdf', fileName: 'resume.pdf' } } });
    }
    return Promise.resolve({ data: { data: null } });
  });

  (api.post as jest.Mock).mockResolvedValue({ data: {} });
  (api.delete as jest.Mock).mockResolvedValue({ data: {} });
  (api.patch as jest.Mock).mockResolvedValue({ data: {} });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Candidate Detail Page', () => {
  it('should render skeletons initially', async () => {
    let resolveApi: any;
    (api.get as jest.Mock).mockImplementation(() => new Promise(res => { resolveApi = res; }));
    
    const { container } = render(<CandidateDetailPage />);
    
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
    
    await act(async () => {
      resolveApi({ data: { data: mockCandidate } });
    });
  });

  it('should render candidate details', async () => {
    render(<CandidateDetailPage />);
    
    expect(await screen.findByText('Alice Candidate')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Node')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /convert to employee/i })).toBeInTheDocument();
  });

  it('should switch tabs and show content', async () => {
    render(<CandidateDetailPage />);
    
    // Default is applications
    expect(await screen.findByText('Frontend Developer')).toBeInTheDocument();
    
    // Switch to Notes
    const notesTab = screen.getByRole('button', { name: /notes/i });
    await act(async () => { await userEvent.click(notesTab); });
    expect(screen.getByText('Good interview')).toBeInTheDocument();
    
    // Switch to Timeline
    const timelineTab = screen.getByRole('button', { name: /timeline/i });
    await act(async () => { await userEvent.click(timelineTab); });
    expect(screen.getByText('Applied')).toBeInTheDocument();
    
    // Switch to Resume
    const resumeTab = screen.getByRole('button', { name: /resume/i });
    await act(async () => { await userEvent.click(resumeTab); });
    
    expect(api.get).toHaveBeenCalledWith('/candidates/c1/resume');
    expect(await screen.findByText('resume.pdf')).toBeInTheDocument();
    
    // check iframe rendered
    const iframe = screen.getByTitle('Resume Preview');
    expect(iframe).toHaveAttribute('src', 'http://example.com/resume.pdf');
  });

  it('should add a note', async () => {
    render(<CandidateDetailPage />);
    
    // Switch to Notes
    const notesTab = await screen.findByRole('button', { name: /notes/i });
    await act(async () => { await userEvent.click(notesTab); });
    
    const textarea = screen.getByPlaceholderText('Add a note...');
    await userEvent.type(textarea, 'New note');
    
    const addBtn = screen.getByRole('button', { name: 'Add' });
    await act(async () => { await userEvent.click(addBtn); });
    
    expect(api.post).toHaveBeenCalledWith('/candidates/c1/notes', {
      noteType: 'HR_COMMENT',
      content: 'New note',
      visibleToPublic: false,
    });
    expect(toast.success).toHaveBeenCalledWith('Note added successfully');
    
    // Check if re-fetched
    expect(api.get).toHaveBeenCalledTimes(2); // Initial + refetch
  });

  it('should delete candidate', async () => {
    render(<CandidateDetailPage />);
    
    const deleteBtn = await screen.findByRole('button', { name: /delete/i });
    await act(async () => { await userEvent.click(deleteBtn); });
    
    // Confirm modal opens
    expect(screen.getByText('Delete Candidate')).toBeInTheDocument();
    
    const confirmBtn = screen.getAllByRole('button', { name: 'Delete' }).find(b => b.className.includes('bg-[hsl(var(--destructive))]'))!;
    await act(async () => { await userEvent.click(confirmBtn); });
    
    expect(api.delete).toHaveBeenCalledWith('/candidates/c1');
    expect(toast.success).toHaveBeenCalledWith('Candidate deleted successfully');
    expect(mockPush).toHaveBeenCalledWith('/candidates');
  });

  it('should copy public link', async () => {
    render(<CandidateDetailPage />);
    
    const copyBtn = await screen.findByRole('button', { name: /copy link/i });
    await act(async () => { await userEvent.click(copyBtn); });
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringContaining('/candidate/abc-123'));
    expect(toast.success).toHaveBeenCalledWith('Public link copied to clipboard');
  });

  it('should toggle public link', async () => {
    render(<CandidateDetailPage />);
    
    const toggleBtn = await screen.findByRole('button', { name: /disable/i });
    await act(async () => { await userEvent.click(toggleBtn); });
    
    expect(api.patch).toHaveBeenCalledWith('/candidates/c1/toggle-public-link');
    expect(toast.success).toHaveBeenCalledWith('Link status updated');
  });
});
