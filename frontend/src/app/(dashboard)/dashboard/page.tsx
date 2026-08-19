'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  UserCheck,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Briefcase,
  Clock,
  Plus,
} from 'lucide-react';
import api from '@/lib/api';
import type { DashboardStats, Candidate, Employee } from '@/types';

// ─── Status Color Map ────────────────────────────────

const statusColors: Record<string, string> = {
  APPLIED: 'bg-blue-100 text-blue-700',
  SHORTLISTED: 'bg-amber-100 text-amber-700',
  INTERVIEW_SCHEDULED: 'bg-purple-100 text-purple-700',
  SELECTED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-red-100 text-red-700',
  ACCEPTED: 'bg-teal-100 text-teal-700',
};

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCandidates, setRecentCandidates] = useState<any[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<any[]>([]);
  const [recentEmployees, setRecentEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [statsRes, recentRes, interviewRes, empRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/dashboard/recent-applications'),
          api.get('/dashboard/upcoming-interviews'),
          api.get('/dashboard/recent-employees'),
        ]);
        setStats(statsRes.data.data);
        setRecentCandidates(recentRes.data.data);
        setUpcomingInterviews(interviewRes.data.data);
        setRecentEmployees(empRes.data.data);
      } catch (err) {
        console.error('Dashboard fetch error:', err);
      }
      setLoading(false);
    }
    fetchDashboard();
  }, []);

  const statCards = stats ? [
    { label: 'Total Candidates', value: stats.totalCandidates, icon: Users, color: 'from-blue-500 to-blue-600', bgLight: 'bg-blue-50', textColor: 'text-blue-600', href: '/candidates' },
    { label: 'New Applications', value: stats.newCandidates, icon: UserPlus, color: 'from-emerald-500 to-emerald-600', bgLight: 'bg-emerald-50', textColor: 'text-emerald-600', href: '/candidates?status=APPLIED', subtitle: 'Last 7 days' },
    { label: 'Shortlisted', value: stats.shortlisted, icon: UserCheck, color: 'from-amber-500 to-amber-600', bgLight: 'bg-amber-50', textColor: 'text-amber-600', href: '/candidates?status=SHORTLISTED' },
    { label: 'Interviews', value: stats.interviewScheduled, icon: Calendar, color: 'from-purple-500 to-purple-600', bgLight: 'bg-purple-50', textColor: 'text-purple-600', href: '/candidates?status=INTERVIEW_SCHEDULED' },
    { label: 'Selected', value: stats.selected, icon: CheckCircle2, color: 'from-teal-500 to-teal-600', bgLight: 'bg-teal-50', textColor: 'text-teal-600', href: '/candidates?status=SELECTED' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'from-red-500 to-red-600', bgLight: 'bg-red-50', textColor: 'text-red-600', href: '/candidates?status=REJECTED' },
    { label: 'Accepted', value: stats.joined, icon: ArrowRight, color: 'from-cyan-500 to-cyan-600', bgLight: 'bg-cyan-50', textColor: 'text-cyan-600', href: '/candidates?status=ACCEPTED' },
    { label: 'Active Employees', value: stats.totalEmployees, icon: Briefcase, color: 'from-indigo-500 to-indigo-600', bgLight: 'bg-indigo-50', textColor: 'text-indigo-600', href: '/employees' },
  ] : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-72 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Dashboard</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Welcome back! Here&apos;s your HR overview.</p>
        </div>

        {/* Quick Actions (FR-DASH-07) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push('/candidates/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)]"
          >
            <Plus className="w-4 h-4" />
            Add Candidate
          </button>
          <button
            onClick={() => router.push('/employees/new')}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] text-sm font-medium text-[hsl(var(--foreground))] rounded-lg hover:bg-[hsl(var(--accent))] transition-smooth"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
        </div>
      </div>

      {/* Stat Cards (FR-DASH-01, FR-DASH-02, FR-DASH-03) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <button
            key={card.label}
            onClick={() => router.push(card.href)}
            className="group relative bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5 text-left hover:shadow-lg hover:shadow-black/5 hover:border-[hsl(var(--border)/0.5)] transition-all duration-300 hover:-translate-y-0.5"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2.5 rounded-xl ${card.bgLight} transition-smooth group-hover:scale-110`}>
                <card.icon className={`w-5 h-5 ${card.textColor}`} />
              </div>
              <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))] opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-0.5" />
            </div>
            <p className="text-2xl font-bold text-[hsl(var(--foreground))]">{card.value}</p>
            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">{card.label}</p>
            {card.subtitle && (
              <p className="text-[10px] text-[hsl(var(--muted-foreground)/0.7)] mt-0.5">{card.subtitle}</p>
            )}
          </button>
        ))}
      </div>

      {/* Recent Lists (FR-DASH-04, FR-DASH-05, FR-DASH-06) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">Recent Applications</h2>
            <button onClick={() => router.push('/candidates')} className="text-xs text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.8)] font-medium transition-smooth">
              View all →
            </button>
          </div>
          <div className="divide-y divide-[hsl(var(--border)/0.5)]">
            {recentCandidates.length === 0 ? (
              <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                <UserPlus className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--muted-foreground)/0.5)]" />
                No candidates yet
              </div>
            ) : (
              recentCandidates.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/candidates/${c.id}`)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[hsl(var(--accent)/0.5)] transition-smooth text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center text-xs font-bold shrink-0">
                    {c.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{c.name}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{c.positionApplied}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${statusColors[c.status] || 'bg-gray-100 text-gray-600'}`}>
                    {c.status.replace(/_/g, ' ')}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Interviews */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">Upcoming Interviews</h2>
            <button onClick={() => router.push('/candidates?status=INTERVIEW_SCHEDULED')} className="text-xs text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.8)] font-medium transition-smooth">
              View all →
            </button>
          </div>
          <div className="divide-y divide-[hsl(var(--border)/0.5)]">
            {upcomingInterviews.length === 0 ? (
              <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                <Calendar className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--muted-foreground)/0.5)]" />
                No upcoming interviews
              </div>
            ) : (
              upcomingInterviews.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => router.push(`/candidates/${c.id}`)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[hsl(var(--accent)/0.5)] transition-smooth text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{c.name}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{c.positionApplied}</p>
                  </div>
                  <span className="text-xs text-purple-600 font-medium whitespace-nowrap">
                    {c.interviewDate ? new Date(c.interviewDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Recently Joined Employees */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[hsl(var(--border))]">
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">Recent Employees</h2>
            <button onClick={() => router.push('/employees')} className="text-xs text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.8)] font-medium transition-smooth">
              View all →
            </button>
          </div>
          <div className="divide-y divide-[hsl(var(--border)/0.5)]">
            {recentEmployees.length === 0 ? (
              <div className="p-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
                <Briefcase className="w-8 h-8 mx-auto mb-2 text-[hsl(var(--muted-foreground)/0.5)]" />
                No employees yet
              </div>
            ) : (
              recentEmployees.map((e: any) => (
                <button
                  key={e.id}
                  onClick={() => router.push(`/employees/${e.id}`)}
                  className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[hsl(var(--accent)/0.5)] transition-smooth text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">
                    {e.fullName?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[hsl(var(--foreground))] truncate">{e.fullName}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">{e.department?.name} · {e.designation?.name}</p>
                  </div>
                  <span className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono">
                    {e.employeeCode}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
