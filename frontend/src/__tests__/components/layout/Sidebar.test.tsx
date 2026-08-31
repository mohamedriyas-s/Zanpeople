/**
 * Unit Tests: Sidebar Component
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Sidebar from '../../../components/layout/Sidebar';

// ─── Mocks ────────────────────────────────────────────────────────────────────

let currentPathname = '/dashboard';

jest.mock('next/navigation', () => ({
  usePathname: () => currentPathname,
}));

// Mock Next.js Link since it intercepts clicks in a way that might not trigger onClick in JSDOM easily without a router
jest.mock('next/link', () => {
  return ({ children, onClick, href, className }: any) => {
    return (
      <a href={href} onClick={onClick} className={className} data-testid="nav-link">
        {children}
      </a>
    );
  };
});

// ─── Setup ────────────────────────────────────────────────────────────────────

const mockOnClose = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  currentPathname = '/dashboard';
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Sidebar Component', () => {
  it('should render all navigation links', () => {
    render(<Sidebar isOpen={true} onClose={mockOnClose} />);
    
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Candidates')).toBeInTheDocument();
    expect(screen.getByText('Job Openings')).toBeInTheDocument();
    expect(screen.getByText('Employees')).toBeInTheDocument();
  });

  it('should apply active classes based on pathname', () => {
    // Current pathname is '/dashboard'
    const { rerender } = render(<Sidebar isOpen={true} onClose={mockOnClose} />);
    
    let dashboardLink = screen.getByText('Dashboard').closest('a');
    let candidatesLink = screen.getByText('Candidates').closest('a');
    
    expect(dashboardLink).toHaveClass('text-[hsl(var(--primary))]');
    expect(candidatesLink).not.toHaveClass('text-[hsl(var(--primary))]');

    // Change pathname to /candidates
    currentPathname = '/candidates';
    rerender(<Sidebar isOpen={true} onClose={mockOnClose} />);
    
    dashboardLink = screen.getByText('Dashboard').closest('a');
    candidatesLink = screen.getByText('Candidates').closest('a');
    
    expect(candidatesLink).toHaveClass('text-[hsl(var(--primary))]');
    expect(dashboardLink).not.toHaveClass('text-[hsl(var(--primary))]');
  });

  it('should call onClose when a link is clicked', async () => {
    render(<Sidebar isOpen={true} onClose={mockOnClose} />);
    
    const candidatesLink = screen.getByText('Candidates').closest('a')!;
    await userEvent.click(candidatesLink);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should apply translate-x-0 when isOpen is true', () => {
    render(<Sidebar isOpen={true} onClose={mockOnClose} />);
    const aside = screen.getByRole('complementary'); // aside element
    expect(aside).toHaveClass('translate-x-0');
    expect(aside).not.toHaveClass('-translate-x-full');
  });

  it('should apply -translate-x-full when isOpen is false', () => {
    render(<Sidebar isOpen={false} onClose={mockOnClose} />);
    const aside = screen.getByRole('complementary');
    expect(aside).toHaveClass('-translate-x-full');
    expect(aside).not.toHaveClass('translate-x-0');
  });
});
