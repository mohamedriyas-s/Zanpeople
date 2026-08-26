'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus, Search, Filter, X, ChevronLeft, ChevronRight,
  ArrowUpDown, Eye, Trash2, MoreHorizontal, Loader2,
  UserPlus,
} from 'lucide-react';
import api from '@/lib/api';
import type { Candidate, CandidateStatus } from '@/types';

const statusColors: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  APPLIED: 'bg-blue-100 text-blue-700',
  SHORTLISTED: 'bg-amber-100 text-amber-700',
  INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-700',
  SELECTED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  ACCEPTED: 'bg-teal-100 text-teal-700',
};

const allStatuses: CandidateStatus[] = ['DRAFT', 'APPLIED', 'SHORTLISTED', 'INTERVIEW_SCHEDULED', 'SELECTED', 'REJECTED', 'ACCEPTED'];

export default function CandidatesPage() {
  return (
    <Suspense fallback={<div className="p-8 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>}>
      <CandidatesContent />
    </Suspense>
  );
}

function CandidatesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [candidates, setCandidates] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters from URL
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sortBy') || 'createdAt');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'desc');
  const [showFilters, setShowFilters] = useState(false);

  const fetchCandidates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      params.set('sortBy', sortBy);
      params.set('sortOrder', sortOrder);

      const res = await api.get(`/candidates?${params}`);
      setCandidates(res.data.data.items);
      setTotal(res.data.data.total);
      setTotalPages(res.data.data.totalPages);

      // Sync URL
      const urlParams = new URLSearchParams();
      if (page > 1) urlParams.set('page', page.toString());
      if (search) urlParams.set('search', search);
      if (status) urlParams.set('status', status);
      if (sortBy !== 'createdAt') urlParams.set('sortBy', sortBy);
      if (sortOrder !== 'desc') urlParams.set('sortOrder', sortOrder);
      const qs = urlParams.toString();
      const newUrl = `/candidates${qs ? `?${qs}` : ''}`;
      // Use history.replaceState to avoid interrupting Next.js navigation (like router.push to details)
      window.history.replaceState(null, '', newUrl);
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    }
    setLoading(false);
  }, [page, search, status, sortBy, sortOrder, router]);

  useEffect(() => { fetchCandidates(); }, [fetchCandidates]);

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setSortBy('createdAt');
    setSortOrder('desc');
    setPage(1);
  };

  const hasActiveFilters = search || status;

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">Candidates</h1>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-0.5">{total} total candidates</p>
        </div>
        <button
          onClick={() => router.push('/candidates/new')}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)]"
        >
          <Plus className="w-4 h-4" />
          Add Candidate
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input
              type="text"
              placeholder="Search by name, email, position..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth"
            >
              <option value="">All Statuses</option>
              {allStatuses.map(s => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-smooth"
              >
                <X className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-[hsl(var(--border)/0.5)]">
            {status && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-xs font-medium rounded-full">
                Status: {status.replace(/_/g, ' ')}
                <button onClick={() => setStatus('')} className="hover:text-[hsl(var(--primary)/0.7)]"><X className="w-3 h-3" /></button>
              </span>
            )}
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] text-xs font-medium rounded-full">
                Search: &quot;{search}&quot;
                <button onClick={() => setSearch('')} className="hover:text-[hsl(var(--primary)/0.7)]"><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="skeleton h-14 rounded-lg" />
            ))}
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-12 text-center">
            <UserPlus className="w-12 h-12 mx-auto mb-3 text-[hsl(var(--muted-foreground)/0.3)]" />
            <h3 className="text-base font-semibold text-[hsl(var(--foreground))] mb-1">
              {hasActiveFilters ? 'No matches found' : 'No candidates yet'}
            </h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
              {hasActiveFilters ? 'Try adjusting your filters.' : 'Add your first candidate to get started.'}
            </p>
            {!hasActiveFilters && (
              <button
                onClick={() => router.push('/candidates/new')}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth"
              >
                <Plus className="w-4 h-4" />
                Add Candidate
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                    <th className="text-left px-5 py-3">
                      <button onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                        Name <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Position</th>
                    <th className="text-left px-5 py-3">
                      <button onClick={() => toggleSort('status')} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                        Status <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Experience</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Skills</th>
                    <th className="text-left px-5 py-3">
                      <button onClick={() => toggleSort('createdAt')} className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]">
                        Applied <ArrowUpDown className="w-3 h-3" />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border)/0.5)]">
                  {candidates.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => router.push(`/candidates/${c.id}`)}
                      className="hover:bg-[hsl(var(--accent)/0.5)] cursor-pointer transition-smooth"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center text-xs font-bold shrink-0">
                            {c.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-[hsl(var(--foreground))]">{c.name}</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[hsl(var(--foreground))]">{c.positionApplied}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${statusColors[c.status] || 'bg-gray-100 text-gray-600'}`}>
                          {c.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[hsl(var(--muted-foreground))]">
                        {c.yearsExperience != null ? `${c.yearsExperience} yrs` : '—'}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(c.skills || []).slice(0, 3).map((skill: string) => (
                            <span key={skill} className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded font-medium">
                              {skill}
                            </span>
                          ))}
                          {(c.skills || []).length > 3 && (
                            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">+{c.skills.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[hsl(var(--muted-foreground))]">
                        {new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[hsl(var(--border)/0.5)]">
              {candidates.map((c) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/candidates/${c.id}`)}
                  className="w-full p-3 sm:p-4 text-left hover:bg-[hsl(var(--accent)/0.5)] transition-smooth"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center text-xs font-bold">
                        {c.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{c.name}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{c.positionApplied}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[c.status]}`}>
                      {c.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(c.skills || []).slice(0, 4).map((skill: string) => (
                      <span key={skill} className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] rounded">
                        {skill}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[hsl(var(--border))]">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">
                  Page {page} of {totalPages} ({total} results)
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="p-1.5 rounded-lg hover:bg-[hsl(var(--accent))] disabled:opacity-30 disabled:cursor-not-allowed transition-smooth"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page >= totalPages}
                    className="p-1.5 rounded-lg hover:bg-[hsl(var(--accent))] disabled:opacity-30 disabled:cursor-not-allowed transition-smooth"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// HMR trigger
