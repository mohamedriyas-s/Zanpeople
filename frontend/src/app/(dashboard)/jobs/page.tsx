'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { JobOpening, PaginatedResponse } from '@/types';
import {
  Briefcase,
  Search,
  Plus,
  Filter,
  Users,
  Building2,
  CalendarDays,
  Loader2,
  MapPin,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function JobOpeningsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchJobs();
  }, [statusFilter]);

  const fetchJobs = async () => {
    try {
      setIsLoading(true);
      const url = statusFilter !== 'ALL' ? `/jobs?status=${statusFilter}` : '/jobs';
      const { data } = await api.get<PaginatedResponse<JobOpening>>(url);
      setJobs(data.data.items);
    } catch (error) {
      toast.error('Failed to load job openings');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredJobs = searchQuery
    ? jobs.filter(j =>
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.department?.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : jobs;

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      OPEN: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      ON_HOLD: 'bg-amber-50 text-amber-700 border-amber-200',
      CLOSED: 'bg-red-50 text-red-700 border-red-200',
      FILLED: 'bg-blue-50 text-blue-700 border-blue-200',
    };
    return (
      <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-full border ${styles[status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const statusCounts = {
    ALL: jobs.length,
    OPEN: jobs.filter(j => j.status === 'OPEN').length,
    ON_HOLD: jobs.filter(j => j.status === 'ON_HOLD').length,
    CLOSED: jobs.filter(j => j.status === 'CLOSED').length,
    FILLED: jobs.filter(j => j.status === 'FILLED').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Job Openings</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            Manage your recruitment pipelines and job postings
          </p>
        </div>
        <Link href="/jobs/new" className="inline-flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)] shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          Create Job Opening
        </Link>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mb-1">
        {(['ALL', 'OPEN', 'ON_HOLD', 'CLOSED', 'FILLED'] as const).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${statusFilter === s
              ? 'bg-[hsl(var(--primary))] text-white shadow-md shadow-[hsl(var(--primary)/0.2)]'
              : 'bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:border-[hsl(var(--primary)/0.3)]'
              }`}
          >
            {s === 'ALL' ? 'All' : s.replace(/_/g, ' ')}
            <span className={`ml-1.5 text-xs ${statusFilter === s ? 'text-white/80' : 'text-[hsl(var(--muted-foreground)/0.6)]'}`}>
              {statusCounts[s]}
            </span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        <input
          type="text"
          placeholder="Search jobs by title or department..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth"
        />
      </div>

      {/* Jobs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-52 bg-[hsl(var(--accent)/0.5)] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-[hsl(var(--primary)/0.1)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-[hsl(var(--primary))]" />
          </div>
          <h3 className="text-lg font-bold text-[hsl(var(--foreground))]">
            {searchQuery ? 'No jobs match your search' : statusFilter !== 'ALL' ? `No ${statusFilter.replace(/_/g, ' ').toLowerCase()} jobs` : 'No Job Openings Yet'}
          </h3>
          <p className="text-[hsl(var(--muted-foreground))] mt-2 max-w-md mx-auto text-sm">
            {searchQuery
              ? 'Try adjusting your search query.'
              : statusFilter !== 'ALL'
                ? 'Try selecting a different status filter.'
                : 'Create your first job opening to start tracking candidates through your pipeline.'}
          </p>
          {!searchQuery && statusFilter === 'ALL' && (
            <Link href="/jobs/new" className="btn-primary mt-6 inline-flex">
              <Plus className="w-4 h-4 mr-2" />
              Create Job Opening
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredJobs.map((job) => (
            <Link
              href={`/jobs/${job.id}`}
              key={job.id}
              className="group bg-[hsl(var(--card))] border border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.4)] hover:shadow-lg hover:shadow-[hsl(var(--primary)/0.06)] rounded-xl transition-all duration-300 block relative overflow-hidden"
            >
              {/* Top Accent */}
              <div className={`h-1 ${job.status === 'OPEN' ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                job.status === 'ON_HOLD' ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                  job.status === 'CLOSED' ? 'bg-gradient-to-r from-red-400 to-red-300' :
                    'bg-gradient-to-r from-blue-500 to-blue-400'
                }`} />

              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary)/0.08)] flex items-center justify-center text-[hsl(var(--primary))] group-hover:scale-110 transition-transform">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  {getStatusBadge(job.status)}
                </div>

                <h3 className="font-bold text-[hsl(var(--foreground))] text-base mb-1 group-hover:text-[hsl(var(--primary))] transition-colors line-clamp-1">
                  {job.title}
                </h3>

                <div className="space-y-2 mt-3">
                  <div className="flex items-center text-sm text-[hsl(var(--muted-foreground))]">
                    <Building2 className="w-3.5 h-3.5 mr-2 shrink-0" />
                    <span className="truncate">{job.department?.name || 'No department'}</span>
                  </div>
                  <div className="flex items-center text-sm text-[hsl(var(--muted-foreground))]">
                    <Users className="w-3.5 h-3.5 mr-2 shrink-0" />
                    <span>{job._count?.applications || 0} Candidates</span>
                    <span className="mx-1.5 text-[hsl(var(--border))]">•</span>
                    <span>{job.vacancies} {job.vacancies === 1 ? 'Vacancy' : 'Vacancies'}</span>
                  </div>
                  <div className="flex items-center text-sm text-[hsl(var(--muted-foreground))]">
                    <CalendarDays className="w-3.5 h-3.5 mr-2 shrink-0" />
                    <span>Posted {new Date(job.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[hsl(var(--border)/0.5)] flex justify-between items-center">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    {job._count?.applications || 0} in pipeline
                  </span>
                  <span className="text-xs font-semibold text-[hsl(var(--primary))] flex items-center group-hover:translate-x-0.5 transition-transform">
                    View Board
                    <svg className="w-3.5 h-3.5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
