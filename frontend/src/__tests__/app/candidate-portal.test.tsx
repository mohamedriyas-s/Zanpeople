/**
 * Unit Tests: Candidate Portal Page (Public)
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import PublicCandidatePage from '../../app/candidate/[token]/page';

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock('next/navigation', () => ({
  useParams: () => ({ token: 'abc-123' }),
}));

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();

  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({
        success: true,
        data: {
          name: 'Alice Bob',
          positionApplied: 'Frontend Developer',
          status: 'INTERVIEW_SCHEDULED',
          yearsExperience: 4,
          skills: ['React', 'TypeScript'],
          linkedinUrl: 'https://linkedin.com/in/alice',
          resumePreviewUrl: 'https://example.com/resume.pdf',
          resumeMimeType: 'application/pdf',
          company: { name: 'Tech Corp' },
          publicNotes: [
            { content: 'Good communication', noteType: 'INTERVIEW_NOTE', createdAt: '2023-01-01T00:00:00.000Z' }
          ]
        }
      })
    })
  ) as jest.Mock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Candidate Portal Page', () => {
  it('should render loading state initially', async () => {
    let resolveFetch: any;
    global.fetch = jest.fn(() => new Promise(res => { resolveFetch = res; })) as jest.Mock;
    
    const { container } = render(<PublicCandidatePage />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    
    await act(async () => {
      resolveFetch({ json: () => Promise.resolve({ success: true, data: { name: 'Test', status: 'APPLIED', skills: [], publicNotes: [] } }) });
    });
  });

  it('should display candidate profile successfully', async () => {
    render(<PublicCandidatePage />);
    
    expect(await screen.findByText('Alice Bob')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('INTERVIEW SCHEDULED')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Tech Corp')).toBeInTheDocument();
    expect(screen.getByText('Good communication')).toBeInTheDocument();
  });

  it('should display error if link is disabled', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          success: false,
          error: { code: 'LINK_DISABLED', message: 'Disabled' }
        })
      })
    ) as jest.Mock;

    render(<PublicCandidatePage />);
    
    expect(await screen.findByText('Link Disabled')).toBeInTheDocument();
  });

  it('should display error if link is not found', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Not Found' }
        })
      })
    ) as jest.Mock;

    render(<PublicCandidatePage />);
    
    expect(await screen.findByText('Link Not Found')).toBeInTheDocument();
  });

  it('should handle network errors gracefully', async () => {
    global.fetch = jest.fn(() => Promise.reject(new Error('Network failure'))) as jest.Mock;

    render(<PublicCandidatePage />);
    
    expect(await screen.findByText('Link Not Found')).toBeInTheDocument();
  });
});
