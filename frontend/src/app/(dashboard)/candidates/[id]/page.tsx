'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Edit, Trash2, Copy, Link2, Link2Off, RefreshCw,
  Mail, Phone, MapPin, Briefcase, Clock, DollarSign,
  ExternalLink, FileText, MessageSquare, History, Loader2,
  CheckCircle2, Calendar, Globe, UserPlus,
} from 'lucide-react';
import api from '@/lib/api';
import type { Candidate, CandidateApplication } from '@/types';
import Link from 'next/link';
import toast from 'react-hot-toast';

const statusColors: Record<string, string> = {
  APPLIED: 'bg-blue-100 text-blue-700 border-blue-200',
  SHORTLISTED: 'bg-amber-100 text-amber-700 border-amber-200',
  INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-700 border-purple-200',
  SELECTED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
  ACCEPTED: 'bg-teal-100 text-teal-700 border-teal-200',
  IN_PIPELINE: 'bg-blue-100 text-blue-700 border-blue-200',
};

export default function CandidateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'timeline' | 'applications'>('applications');

  useEffect(() => {
    fetchCandidate();
  }, [params.id]);

  async function fetchCandidate() {
    try {
      const res = await api.get(`/candidates/${params.id}`);
      setCandidate(res.data.data);
    } catch (err) {
      console.error('Failed to fetch candidate:', err);
    }
    setLoading(false);
  }

  // Note form state
  const [noteType, setNoteType] = useState<'INTERVIEW_COMMENT' | 'HR_COMMENT'>('HR_COMMENT');
  const [noteContent, setNoteContent] = useState('');
  const [notePublic, setNotePublic] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  async function handleDelete() {
    if (!candidate) return;
    setDeleting(true);
    try {
      await api.delete(`/candidates/${candidate.id}`);
      toast.success('Candidate deleted successfully');
      router.push('/candidates');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to delete');
      setDeleting(false);
    }
  }

  async function handleAddNote() {
    if (!noteContent.trim() || !candidate) return;
    setAddingNote(true);
    try {
      await api.post(`/candidates/${candidate.id}/notes`, {
        noteType, content: noteContent, visibleToPublic: notePublic,
      });
      setNoteContent('');
      setNotePublic(false);
      toast.success('Note added successfully');
      await fetchCandidate();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to add note');
    }
    setAddingNote(false);
  }

  async function copyPublicLink() {
    if (!candidate) return;
    const url = `${window.location.origin}/candidate/${candidate.publicToken}`;
    await navigator.clipboard.writeText(url);
    toast.success('Public link copied to clipboard');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerateLink() {
    if (!candidate) return;
    try {
      await api.post(`/candidates/${candidate.id}/regenerate-link`);
      toast.success('Link regenerated successfully');
      await fetchCandidate();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to regenerate link');
    }
  }

  async function togglePublicLink() {
    if (!candidate) return;
    try {
      await api.patch(`/candidates/${candidate.id}/toggle-public-link`);
      toast.success('Link status updated');
      await fetchCandidate();
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to toggle link');
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-10 w-32 rounded-lg" />
        <div className="skeleton h-64 rounded-xl" />
        <div className="skeleton h-48 rounded-xl" />
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Candidate not found</h2>
        <button onClick={() => router.push('/candidates')} className="mt-4 text-sm text-[hsl(var(--primary))]">← Back to Candidates</button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Back + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button onClick={() => router.push('/candidates')} className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-smooth self-start">
          <ArrowLeft className="w-4 h-4" /> Back to Candidates
        </button>
        <div className="flex items-center gap-2 flex-wrap">
          {candidate.employee ? (
            <button onClick={() => router.push(`/employees/${candidate.employee!.id}`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-smooth shadow-sm">
              <Briefcase className="w-3.5 h-3.5" /> View Employee Profile
            </button>
          ) : (candidate.status === 'ACCEPTED' || candidate.status === 'SELECTED') && (
            <button onClick={() => router.push(`/employees/convert?candidateId=${candidate.id}`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-smooth shadow-sm">
              <UserPlus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Convert to</span> Employee
            </button>
          )}
          <button onClick={() => router.push(`/candidates/${candidate.id}/edit`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[hsl(var(--border))] rounded-lg text-sm hover:bg-[hsl(var(--accent))] transition-smooth">
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
          <button onClick={() => setShowDeleteConfirm(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[hsl(var(--destructive)/0.3)] text-[hsl(var(--destructive))] rounded-lg text-sm hover:bg-[hsl(var(--destructive)/0.1)] transition-smooth">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center text-2xl font-bold shrink-0">
            {candidate.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">{candidate.name}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${statusColors[candidate.status]}`}>
                {candidate.status.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{candidate.positionApplied}</p>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-xs sm:text-sm text-[hsl(var(--muted-foreground))]">
              <span className="inline-flex items-center gap-1 break-all"><Mail className="w-3.5 h-3.5 shrink-0" /> {candidate.email}</span>
              <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5 shrink-0" /> {candidate.phone}</span>
              {candidate.yearsExperience != null && (
                <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {candidate.yearsExperience} yrs exp</span>
              )}
              {candidate.currentCompany && (
                <span className="inline-flex items-center gap-1"><Briefcase className="w-3.5 h-3.5" /> {candidate.currentCompany}</span>
              )}
            </div>

            {/* Skills */}
            {candidate.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {candidate.skills.map((skill) => (
                  <span key={skill} className="text-xs px-2 py-0.5 bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] rounded-md font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            )}

            {/* Links */}
            <div className="flex flex-wrap gap-2 mt-3">
              {candidate.linkedinUrl && (
                <a href={candidate.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--muted))] rounded-lg text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-smooth">
                  <ExternalLink className="w-3 h-3" /> LinkedIn
                </a>
              )}
              {candidate.githubUrl && (
                <a href={candidate.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--muted))] rounded-lg text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-smooth">
                  <ExternalLink className="w-3 h-3" /> GitHub
                </a>
              )}
              {candidate.portfolioUrl && (
                <a href={candidate.portfolioUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--muted))] rounded-lg text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-smooth">
                  <Globe className="w-3 h-3" /> Portfolio
                </a>
              )}
              {candidate.personalWebsiteUrl && (
                <a href={candidate.personalWebsiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-2 py-1 bg-[hsl(var(--muted))] rounded-lg text-xs text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-smooth">
                  <Globe className="w-3 h-3" /> Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Public Link + Professional Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Public Link */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">Public Profile Link</h3>
          <div className="flex items-center gap-2 mb-3">
            <code className="flex-1 px-3 py-1.5 bg-[hsl(var(--muted))] rounded-lg text-xs text-[hsl(var(--muted-foreground))] truncate">
              {`${typeof window !== 'undefined' ? window.location.origin : ''}/candidate/${candidate.publicToken}`}
            </code>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={copyPublicLink} className="inline-flex items-center gap-1 px-3 py-1.5 border border-[hsl(var(--border))] rounded-lg text-xs hover:bg-[hsl(var(--accent))] transition-smooth">
              {copied ? <><CheckCircle2 className="w-3 h-3 text-emerald-500" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy Link</>}
            </button>
            <button onClick={regenerateLink} className="inline-flex items-center gap-1 px-3 py-1.5 border border-[hsl(var(--border))] rounded-lg text-xs hover:bg-[hsl(var(--accent))] transition-smooth">
              <RefreshCw className="w-3 h-3" /> Regenerate
            </button>
            <button onClick={togglePublicLink} className={`inline-flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs transition-smooth ${candidate.publicLinkEnabled ? 'border-[hsl(var(--destructive)/0.3)] text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)]' : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
              }`}>
              {candidate.publicLinkEnabled ? <><Link2Off className="w-3 h-3" /> Disable</> : <><Link2 className="w-3 h-3" /> Enable</>}
            </button>
          </div>
          <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-2">
            Status: {candidate.publicLinkEnabled ? '✅ Active' : '❌ Disabled'}
          </p>
        </div>

      {/* Professional Details */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Professional Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Notice Period</p>
            <p className="text-sm font-medium text-[hsl(var(--foreground))] mt-0.5">{candidate.noticePeriod || '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Current Salary</p>
            <p className="text-sm font-medium text-[hsl(var(--foreground))] mt-0.5">{candidate.currentSalary ? `₹${Number(candidate.currentSalary).toLocaleString('en-IN')}` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Expected Salary</p>
            <p className="text-sm font-medium text-[hsl(var(--foreground))] mt-0.5">{candidate.expectedSalary ? `₹${Number(candidate.expectedSalary).toLocaleString('en-IN')}` : '—'}</p>
          </div>
          <div>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">Location</p>
            <p className="text-sm font-medium text-[hsl(var(--foreground))] mt-0.5">{[candidate.city, candidate.state, candidate.country].filter(Boolean).join(', ') || '—'}</p>
          </div>
        </div>
        </div>
      </div>

      {/* Notes & Timeline Tabs */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        <div className="flex border-b border-[hsl(var(--border))]">
          <button
            onClick={() => setActiveTab('applications')}
            className={`flex-1 px-5 py-3 text-sm font-medium transition-smooth ${activeTab === 'applications' ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
          >
            <Briefcase className="w-4 h-4 inline mr-1.5" />
            Applications ({candidate.applications?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex-1 px-5 py-3 text-sm font-medium transition-smooth ${activeTab === 'notes' ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
          >
            <MessageSquare className="w-4 h-4 inline mr-1.5" />
            Notes ({candidate.notes?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 px-5 py-3 text-sm font-medium transition-smooth ${activeTab === 'timeline' ? 'text-[hsl(var(--primary))] border-b-2 border-[hsl(var(--primary))]' : 'text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'}`}
          >
            <History className="w-4 h-4 inline mr-1.5" />
            Timeline ({candidate.timeline?.length || 0})
          </button>
        </div>

        <div className="p-5">
          {activeTab === 'applications' ? (
            <div className="space-y-4">
              {(candidate.applications || []).length === 0 ? (
                <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-6">No job applications yet</p>
              ) : (
                (candidate.applications || []).map((app: CandidateApplication) => (
                  <Link href={`/applications/${app.id}`} key={app.id} className="block group">
                    <div className="p-4 border border-[hsl(var(--border))] rounded-lg hover:border-[hsl(var(--primary)/0.5)] hover:bg-[hsl(var(--accent))] transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))] transition-colors">
                            {app.jobOpening?.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-[hsl(var(--muted-foreground))] flex items-center">
                              <Calendar className="w-3 h-3 mr-1" />
                              Applied {new Date(app.appliedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${app.status === 'SELECTED' ? 'bg-[hsl(var(--success)/0.1)] text-[hsl(var(--success))]' :
                              app.status === 'REJECTED' ? 'bg-[hsl(var(--destructive)/0.1)] text-[hsl(var(--destructive))]' :
                                'bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))]'
                            }`}>
                            {app.status.replace('_', ' ')}
                          </span>
                          {app.currentStage && (
                            <span className="text-xs font-medium text-[hsl(var(--muted-foreground))] bg-[hsl(var(--accent))] px-2 py-0.5 rounded border border-[hsl(var(--border))]">
                              Stage: {app.currentStage.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          ) : activeTab === 'notes' ? (
            <div className="space-y-4">
              {/* Add Note Form */}
              <div className="space-y-3 pb-4 border-b border-[hsl(var(--border)/0.5)]">
                <div className="flex gap-2">
                  <select
                    value={noteType}
                    onChange={(e) => setNoteType(e.target.value as any)}
                    className="px-3 py-1.5 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  >
                    <option value="HR_COMMENT">HR Comment</option>
                    <option value="INTERVIEW_COMMENT">Interview Comment</option>
                  </select>
                  <label className="inline-flex items-center gap-1.5 text-xs text-[hsl(var(--muted-foreground))]">
                    <input type="checkbox" checked={notePublic} onChange={(e) => setNotePublic(e.target.checked)} className="rounded" />
                    Visible on public profile
                  </label>
                </div>
                <div className="flex gap-2">
                  <textarea
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Add a note..."
                    rows={2}
                    className="flex-1 px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
                  />
                  <button
                    onClick={handleAddNote}
                    disabled={!noteContent.trim() || addingNote}
                    className="self-end px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 transition-smooth"
                  >
                    {addingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                  </button>
                </div>
              </div>

              {/* Notes List */}
              {(candidate.notes || []).length === 0 ? (
                <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-6">No notes yet</p>
              ) : (
                (candidate.notes || []).map((note) => (
                  <div key={note.id} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))] flex items-center justify-center text-xs font-bold shrink-0">
                      {note.createdBy?.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-medium text-[hsl(var(--foreground))]">{note.createdBy?.name || 'Unknown'}</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-[hsl(var(--muted))] rounded text-[hsl(var(--muted-foreground))]">
                          {note.noteType.replace(/_/g, ' ')}
                        </span>
                        {note.visibleToPublic && <span className="text-[10px] text-emerald-600">🌐 Public</span>}
                      </div>
                      <p className="text-sm text-[hsl(var(--foreground))]">{note.content}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-1">
                        {new Date(note.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-0">
              {(candidate.timeline || []).length === 0 ? (
                <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-6">No timeline entries</p>
              ) : (
                (candidate.timeline || []).map((entry, idx) => (
                  <div key={entry.id} className="flex gap-3 relative">
                    {idx < (candidate.timeline?.length || 0) - 1 && (
                      <div className="absolute left-[13px] top-7 bottom-0 w-px bg-[hsl(var(--border))]" />
                    )}
                    <div className="w-7 h-7 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center shrink-0 z-10">
                      <History className="w-3 h-3" />
                    </div>
                    <div className="flex-1 pb-4">
                      <p className="text-sm text-[hsl(var(--foreground))]">{entry.description}</p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))] mt-0.5">
                        {entry.createdBy?.name ? `by ${entry.createdBy.name} · ` : ''}
                        {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-semibold text-[hsl(var(--foreground))] mb-2">Delete Candidate</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-5">
              Are you sure you want to permanently delete <strong>{candidate.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-sm hover:bg-[hsl(var(--accent))] transition-smooth">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 bg-[hsl(var(--destructive))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--destructive)/0.9)] disabled:opacity-50 transition-smooth"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// HMR trigger
