'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { FileText, Download, Globe, ExternalLink, Briefcase, User } from 'lucide-react';
import type { PublicCandidateProfile } from '@/types';

export default function PublicCandidatePage() {
  const params = useParams();
  const [profile, setProfile] = useState<PublicCandidateProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/public/candidate/${params.token}`);
        const data = await res.json();
        if (!data.success) {
          setError(data.error);
        } else {
          setProfile(data.data);
        }
      } catch {
        setError({ code: 'NETWORK_ERROR', message: 'Unable to load profile' });
      }
      setLoading(false);
    }
    fetchProfile();
  }, [params.token]);

  const statusColors: Record<string, string> = {
    APPLIED: 'bg-blue-100 text-blue-700',
    SHORTLISTED: 'bg-amber-100 text-amber-700',
    INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-700',
    SELECTED: 'bg-emerald-100 text-emerald-700',
    REJECTED: 'bg-red-100 text-red-700',
    JOINED: 'bg-teal-100 text-teal-700',
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="w-8 h-8 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    const isDisabled = error.code === 'LINK_DISABLED';
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 mx-auto mb-4 bg-[hsl(var(--muted))] rounded-full flex items-center justify-center text-2xl">
            {isDisabled ? '🔒' : '🔗'}
          </div>
          <h1 className="text-xl font-bold text-[hsl(var(--foreground))] mb-2">
            {isDisabled ? 'Link Disabled' : 'Link Not Found'}
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {isDisabled
              ? 'This profile link has been disabled by HR.'
              : 'This link is invalid or no longer available.'
            }
          </p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--background))] to-[hsl(var(--muted)/0.3)]">
      {/* Header */}
      <header className="border-b border-[hsl(var(--border))] bg-[hsl(var(--card)/0.8)] backdrop-blur-xl">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))] text-white flex items-center justify-center text-sm font-bold shadow-md">Z</div>
          <span className="text-sm font-semibold text-[hsl(var(--foreground))]">{profile.company?.name || 'Zansphere'}</span>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Profile Card */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-5 mb-6">
            <div className="w-20 h-20 rounded-2xl bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center text-3xl font-bold shrink-0">
              {profile.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[hsl(var(--foreground))] mb-1">{profile.name}</h1>
              <p className="text-base text-[hsl(var(--muted-foreground))] mb-2">{profile.positionApplied}</p>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${statusColors[profile.status] || 'bg-gray-100 text-gray-600'}`}>
                  {profile.status.replace(/_/g, ' ')}
                </span>
                {profile.yearsExperience != null && (
                  <span className="inline-flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))]">
                    <Briefcase className="w-3.5 h-3.5" /> {profile.yearsExperience} years experience
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Skills */}
          {profile.skills.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profile.skills.map((skill) => (
                  <span key={skill} className="text-sm px-3 py-1 bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] rounded-lg font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Links */}
          {(profile.linkedinUrl || profile.githubUrl || profile.portfolioUrl || profile.personalWebsiteUrl) && (
            <div className="flex flex-wrap gap-2">
              {profile.linkedinUrl && (
                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--muted))] rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-smooth">
                  <ExternalLink className="w-4 h-4" /> LinkedIn <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {profile.githubUrl && (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--muted))] rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-smooth">
                  <ExternalLink className="w-4 h-4" /> GitHub <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {profile.portfolioUrl && (
                <a href={profile.portfolioUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--muted))] rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-smooth">
                  <Globe className="w-4 h-4" /> Portfolio <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {profile.personalWebsiteUrl && (
                <a href={profile.personalWebsiteUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--muted))] rounded-lg text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-smooth">
                  <Globe className="w-4 h-4" /> Website <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}
        </div>

        {/* Resume Preview */}
        {profile.resumePreviewUrl && (
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] flex items-center gap-1.5">
                <FileText className="w-4 h-4" /> Resume
              </h2>
              <a href={profile.resumeDownloadUrl || '#'} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 px-3 py-1.5 bg-[hsl(var(--primary))] text-white text-sm rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth">
                <Download className="w-3.5 h-3.5" /> Download
              </a>
            </div>
            {profile.resumeMimeType === 'application/pdf' ? (
              <iframe src={profile.resumePreviewUrl} className="w-full h-[600px] rounded-lg border border-[hsl(var(--border))]" />
            ) : (
              <div className="text-center py-8 text-sm text-[hsl(var(--muted-foreground))]">
                <FileText className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--muted-foreground)/0.5)]" />
                <p>{profile.resumeFileName}</p>
                <p className="text-xs mt-1">This document format cannot be previewed. Click Download to view.</p>
              </div>
            )}
          </div>
        )}

        {/* Public Notes */}
        {profile.publicNotes.length > 0 && (
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Notes</h2>
            <div className="space-y-3">
              {profile.publicNotes.map((note, idx) => (
                <div key={idx} className="p-3 bg-[hsl(var(--muted)/0.3)] rounded-lg">
                  <p className="text-sm text-[hsl(var(--foreground))]">{note.content}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                    {note.noteType.replace(/_/g, ' ')} · {new Date(note.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[hsl(var(--border))] py-6 text-center">
        <p className="text-xs text-[hsl(var(--muted-foreground))]">
          Shared via <span className="font-medium">{profile.company?.name || 'Zansphere'} HR Portal</span>
          {profile.company?.address && <> · {profile.company.address}</>}
        </p>
      </footer>
    </div>
  );
}
