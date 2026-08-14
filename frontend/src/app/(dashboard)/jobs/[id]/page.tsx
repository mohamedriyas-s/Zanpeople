'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { JobOpening, CandidateApplication, ApiResponse, StageType } from '@/types';
import {
  ArrowLeft, Loader2, UserPlus, Briefcase, Building2, Calendar,
  Users, ChevronRight, Search, Filter, Clock, CheckCircle2, XCircle,
  AlertCircle, PauseCircle, ExternalLink,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BoardData {
  jobTitle: string;
  stages: Array<{
    id: string;
    name: string;
    stageType: string;
    stageOrder: number;
    candidates: CandidateApplication[];
  }>;
}

export default function JobDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [job, setJob] = useState<JobOpening | null>(null);
  const [applicants, setApplicants] = useState<CandidateApplication[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [statusChanging, setStatusChanging] = useState(false);

  useEffect(() => { fetchData(); }, [params.id]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [jobRes, boardRes] = await Promise.all([
        api.get<ApiResponse<JobOpening>>(`/jobs/${params.id}`),
        api.get<ApiResponse<BoardData>>(`/jobs/${params.id}/board`),
      ]);
      setJob(jobRes.data.data);
      // Flatten all candidates from all stages into a single list
      const allApplicants = boardRes.data.data.stages.flatMap(stage =>
        stage.candidates.map(c => ({ ...c, currentStage: { id: stage.id, name: stage.name, stageType: stage.stageType as StageType, stageOrder: stage.stageOrder, templateId: '', isEliminatory: false, createdAt: '' } }))
      );
      setApplicants(allApplicants);
    } catch {
      toast.error('Failed to load job details');
      router.push('/jobs');
    } finally { setIsLoading(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setStatusChanging(true);
      await api.patch(`/jobs/${params.id}/status`, { status: newStatus });
      toast.success(`Job status updated to ${newStatus}`);
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update status');
    } finally { setStatusChanging(false); }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-200px)]">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  if (!job) return null;

  const stages = job.template?.stages || [];

  // Filtering
  const filtered = applicants.filter(a => {
    const matchesSearch = !search || a.candidate?.name?.toLowerCase().includes(search.toLowerCase()) || a.candidate?.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStage = stageFilter === 'all' || a.currentStage?.id === stageFilter;
    const matchesStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchesSearch && matchesStage && matchesStatus;
  });

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      OPEN: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      ON_HOLD: 'bg-amber-100 text-amber-700 border-amber-200',
      CLOSED: 'bg-gray-100 text-gray-600 border-gray-200',
      FILLED: 'bg-blue-100 text-blue-700 border-blue-200',
    };
    return <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${styles[status] || styles.CLOSED}`}>{status.replace('_', ' ')}</span>;
  };

  const appStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      IN_PIPELINE: 'bg-blue-50 text-blue-700',
      SELECTED: 'bg-emerald-50 text-emerald-700',
      REJECTED: 'bg-red-50 text-red-700',
      WITHDRAWN: 'bg-gray-50 text-gray-600',
      ON_HOLD: 'bg-amber-50 text-amber-600',
    };
    return <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${styles[status] || styles.IN_PIPELINE}`}>{status.replace('_', ' ')}</span>;
  };

  const counts = {
    total: applicants.length,
    inPipeline: applicants.filter(a => a.status === 'IN_PIPELINE').length,
    selected: applicants.filter(a => a.status === 'SELECTED').length,
    rejected: applicants.filter(a => a.status === 'REJECTED').length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/jobs" className="p-2 rounded-lg hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] shrink-0 mt-0.5">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))] truncate">{job.title}</h1>
            {statusBadge(job.status)}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            {job.department && <span className="flex items-center"><Building2 className="w-3 h-3 mr-1" /> {job.department.name}</span>}
            {job.designation && <span className="flex items-center"><Briefcase className="w-3 h-3 mr-1" /> {job.designation.name}</span>}
            <span className="flex items-center"><Users className="w-3 h-3 mr-1" /> {job.vacancies} {job.vacancies === 1 ? 'vacancy' : 'vacancies'}</span>
            <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {new Date(job.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Job Info + Actions Bar */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="text-center px-3">
              <div className="text-lg font-bold text-[hsl(var(--foreground))]">{counts.total}</div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Applicants</div>
            </div>
            <div className="w-px bg-[hsl(var(--border))]" />
            <div className="text-center px-3">
              <div className="text-lg font-bold text-blue-600">{counts.inPipeline}</div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">In Pipeline</div>
            </div>
            <div className="w-px bg-[hsl(var(--border))]" />
            <div className="text-center px-3">
              <div className="text-lg font-bold text-emerald-600">{counts.selected}</div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Selected</div>
            </div>
            <div className="w-px bg-[hsl(var(--border))]" />
            <div className="text-center px-3">
              <div className="text-lg font-bold text-red-600">{counts.rejected}</div>
              <div className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Rejected</div>
            </div>
          </div>

          <div className="flex gap-2">
            {job.status === 'OPEN' && (
              <Link href={`/jobs/${job.id}/apply`} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)]">
                <UserPlus className="w-4 h-4 mr-2" /> Add Candidate
              </Link>
            )}
            {job.status === 'OPEN' && (
              <button onClick={() => handleStatusChange('ON_HOLD')} disabled={statusChanging}
                className="px-3 py-2 border border-amber-300 text-amber-700 bg-amber-50 rounded-lg text-xs font-medium hover:bg-amber-100 transition-colors">
                <PauseCircle className="w-3.5 h-3.5 inline mr-1" /> Hold
              </button>
            )}
            {job.status === 'ON_HOLD' && (
              <button onClick={() => handleStatusChange('OPEN')} disabled={statusChanging}
                className="px-3 py-2 border border-emerald-300 text-emerald-700 bg-emerald-50 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors">
                Resume
              </button>
            )}
            {(job.status === 'OPEN' || job.status === 'ON_HOLD') && (
              <button onClick={() => handleStatusChange('CLOSED')} disabled={statusChanging}
                className="px-3 py-2 border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] rounded-lg text-xs font-medium hover:bg-[hsl(var(--accent))] transition-colors">
                Close Job
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Pipeline Preview */}
      {stages.length > 0 && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4">
          <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-3">Pipeline: {job.template?.name}</h3>
          <div className="flex items-center overflow-x-auto pb-1 gap-1">
            {stages.map((stage, index) => {
              const count = applicants.filter(a => a.currentStage?.id === stage.id && a.status === 'IN_PIPELINE').length;
              return (
                <div key={stage.id} className="flex items-center shrink-0">
                  <button
                    onClick={() => setStageFilter(stageFilter === stage.id ? 'all' : stage.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${stageFilter === stage.id
                      ? 'bg-[hsl(var(--primary))] text-white border-[hsl(var(--primary))]'
                      : 'bg-[hsl(var(--accent))] text-[hsl(var(--foreground))] border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)]'
                      }`}>
                    {stage.name} {count > 0 && <span className="ml-1 opacity-70">({count})</span>}
                  </button>
                  {index < stages.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-[hsl(var(--muted-foreground))] mx-0.5 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Applicant Table */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        {/* Search + Filters */}
        <div className="p-4 border-b border-[hsl(var(--border))]">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search applicants..." className="w-full pl-10 pr-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth" />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-auto min-w-[130px] px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth">
              <option value="all">All Statuses</option>
              <option value="IN_PIPELINE">In Pipeline</option>
              <option value="SELECTED">Selected</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3 opacity-30" />
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              {applicants.length === 0 ? 'No candidates have been added to this job yet.' : 'No applicants match your filters.'}
            </p>
            {applicants.length === 0 && job.status === 'OPEN' && (
              <Link href={`/jobs/${job.id}/apply`} className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)]">
                <UserPlus className="w-4 h-4 mr-2" /> Add First Candidate
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--accent)/0.5)]">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Candidate</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider hidden sm:table-cell">Current Stage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider hidden md:table-cell">Applied</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[hsl(var(--border))]">
                {filtered.map(a => (
                  <tr key={a.id} className="hover:bg-[hsl(var(--accent)/0.3)] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-[hsl(var(--primary))] font-bold text-xs shrink-0">
                          {a.candidate?.name?.charAt(0)?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-[hsl(var(--foreground))] text-sm truncate">{a.candidate?.name}</p>
                          <p className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{a.candidate?.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="px-2 py-1 bg-[hsl(var(--accent))] rounded text-xs font-medium text-[hsl(var(--foreground))] border border-[hsl(var(--border))]">
                        {a.currentStage?.name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(a.appliedAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {appStatusBadge(a.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/applications/${a.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[hsl(var(--primary))] hover:underline">
                        Manage <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Description */}
      {job.description && (
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-2">Job Description</h3>
          <p className="text-sm text-[hsl(var(--muted-foreground))] whitespace-pre-wrap">{job.description}</p>
        </div>
      )}
    </div>
  );
}
