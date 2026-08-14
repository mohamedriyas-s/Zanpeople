'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { JobOpening, Candidate, ApiResponse, PaginatedResponse } from '@/types';
import { ArrowLeft, UserPlus, Loader2, Search } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ApplyToJobPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<JobOpening | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [applying, setApplying] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [jobRes, candRes] = await Promise.all([
        api.get<ApiResponse<JobOpening>>(`/jobs/${params.id}`),
        api.get<PaginatedResponse<Candidate>>('/candidates?limit=100'),
      ]);
      setJob(jobRes.data.data);
      setCandidates(candRes.data.data.items);
    } catch (error) {
      toast.error('Failed to load data');
      router.push(`/jobs/${params.id}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async (candidateId: string) => {
    setApplying(candidateId);
    try {
      await api.post(`/jobs/${params.id}/apply`, { candidateId });
      toast.success('Candidate added to pipeline');
      router.push(`/jobs/${params.id}`);
    } catch (error: any) {
      const msg = error.response?.data?.error?.message || 'Failed to apply candidate';
      toast.error(msg);
    } finally {
      setApplying(null);
    }
  };

  const filteredCandidates = candidates.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.positionApplied.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (!job) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          href={`/jobs/${params.id}`}
          className="p-2 rounded-lg hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">Add Candidate to Job</h1>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-0.5 truncate">
            Select a candidate to add to <strong className="text-[hsl(var(--foreground))]">{job.title}</strong>
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search candidates to apply..." className="w-full pl-10 pr-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth" />
      </div>

      {/* Candidate List */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        {filteredCandidates.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {search ? 'No candidates match your search.' : 'No candidates available.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[hsl(var(--border))]">
            {filteredCandidates.map((candidate) => (
              <div key={candidate.id} className="p-4 flex items-center justify-between hover:bg-[hsl(var(--accent)/0.5)] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center text-sm font-bold shrink-0">
                    {candidate.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{candidate.name}</p>
                    <div className="flex items-center gap-3 text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                      <span>{candidate.email}</span>
                      <span>•</span>
                      <span>{candidate.positionApplied}</span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleApply(candidate.id)}
                  disabled={applying === candidate.id}
                  className="px-3 py-1.5 bg-[hsl(var(--primary))] text-white text-xs font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 flex items-center gap-1.5 transition-colors"
                >
                  {applying === candidate.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <UserPlus className="w-3.5 h-3.5" />
                  )}
                  {applying === candidate.id ? 'Adding...' : 'Add to Pipeline'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
