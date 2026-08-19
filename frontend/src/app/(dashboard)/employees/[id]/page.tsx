'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Edit, UserMinus, Mail, Phone, Calendar, MapPin, Building2, Briefcase, Users, FileText, Download, AlertTriangle, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import type { Employee } from '@/types';
import toast from 'react-hot-toast';

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDeactivate, setShowDeactivate] = useState(false);
  const [deactivating, setDeactivating] = useState(false);
  const [hasReportsWarning, setHasReportsWarning] = useState('');

  useEffect(() => { fetchEmployee(); }, [params.id]);

  async function fetchEmployee() {
    try {
      const res = await api.get(`/employees/${params.id}`);
      setEmployee(res.data.data);
    } catch {}
    setLoading(false);
  }

  async function handleDeactivate(confirm = false) {
    if (!employee) return;
    setDeactivating(true);
    try {
      const url = confirm ? `/employees/${employee.id}/deactivate?confirm=true` : `/employees/${employee.id}/deactivate`;
      await api.patch(url);
      toast.success('Employee deactivated successfully');
      await fetchEmployee();
      setShowDeactivate(false);
      setHasReportsWarning('');
    } catch (err: any) {
      if (err.response?.data?.error?.code === 'HAS_ACTIVE_REPORTS') {
        setHasReportsWarning(err.response.data.error.message);
      } else {
        toast.error(err.response?.data?.error?.message || 'Failed to deactivate');
      }
    }
    setDeactivating(false);
  }

  if (loading) {
    return <div className="space-y-4"><div className="skeleton h-10 w-32 rounded-lg" /><div className="skeleton h-64 rounded-xl" /></div>;
  }

  if (!employee) {
    return <div className="text-center py-16"><h2 className="text-lg font-semibold">Employee not found</h2></div>;
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button onClick={() => router.push('/employees')} className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-smooth">
          <ArrowLeft className="w-4 h-4" /> Back to Employees
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push(`/employees/${employee.id}/edit`)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[hsl(var(--border))] rounded-lg text-sm hover:bg-[hsl(var(--accent))] transition-smooth">
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
          {employee.employmentStatus === 'ACTIVE' && (
            <button onClick={() => setShowDeactivate(true)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-amber-200 text-amber-600 rounded-lg text-sm hover:bg-amber-50 transition-smooth">
              <UserMinus className="w-3.5 h-3.5" /> Deactivate
            </button>
          )}
        </div>
      </div>

      {/* Profile Header */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6">
        <div className="flex flex-col md:flex-row md:items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-2xl font-bold shrink-0">
            {employee.fullName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">{employee.fullName}</h1>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${employee.employmentStatus === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {employee.employmentStatus}
              </span>
              <span className="text-xs font-mono text-[hsl(var(--muted-foreground))] bg-[hsl(var(--muted))] px-2 py-0.5 rounded">{employee.employeeCode}</span>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">{employee.designation?.name} · {employee.department?.name}</p>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-[hsl(var(--muted-foreground))]">
              <span className="inline-flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {employee.email}</span>
              {employee.phone && <span className="inline-flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {employee.phone}</span>}
              <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Joined {new Date(employee.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Organization */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Organization</h3>
          <div className="space-y-3">
            <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Department</p><p className="text-sm font-medium">{employee.department?.name}</p></div>
            <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Designation</p><p className="text-sm font-medium">{employee.designation?.name}</p></div>
            <div>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Manager</p>
              {employee.manager ? (
                <button onClick={() => router.push(`/employees/${employee.manager!.id}`)} className="text-sm font-medium text-[hsl(var(--primary))] hover:underline">
                  {employee.manager.fullName} ({employee.manager.employeeCode})
                </button>
              ) : <p className="text-sm text-[hsl(var(--muted-foreground))]">—</p>}
            </div>
            {employee.reports && employee.reports.length > 0 && (
              <div>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-1">Direct Reports ({employee.reports.length})</p>
                <div className="space-y-1">
                  {employee.reports.map(r => (
                    <button key={r.id} onClick={() => router.push(`/employees/${r.id}`)} className="block text-sm text-[hsl(var(--primary))] hover:underline">
                      {r.fullName} ({r.employeeCode})
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Emergency Contact</h3>
          <div className="space-y-3">
            <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Name</p><p className="text-sm font-medium">{employee.emergencyContactName || '—'}</p></div>
            <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Relationship</p><p className="text-sm font-medium">{employee.emergencyContactRelationship || '—'}</p></div>
            <div><p className="text-xs text-[hsl(var(--muted-foreground))]">Phone</p><p className="text-sm font-medium">{employee.emergencyContactPhone || '—'}</p></div>
          </div>
        </div>
      </div>

      {/* Documents */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
        <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Documents</h3>
        {(employee.documents || []).length === 0 ? (
          <p className="text-sm text-[hsl(var(--muted-foreground))] text-center py-4">No documents uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {(employee.documents || []).map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-[hsl(var(--muted)/0.5)] rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  <div>
                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">{doc.fileName}</p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">{doc.docType.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                {doc.downloadUrl && (
                  <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-[hsl(var(--accent))] rounded-lg transition-smooth">
                    <Download className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Deactivate Modal */}
      {showDeactivate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-base font-semibold text-[hsl(var(--foreground))] mb-2">Deactivate Employee</h3>
            {hasReportsWarning ? (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                <AlertTriangle className="w-4 h-4 inline mr-1" /> {hasReportsWarning}
              </div>
            ) : (
              <p className="text-sm text-[hsl(var(--muted-foreground))] mb-5">
                Are you sure you want to deactivate <strong>{employee.fullName}</strong>?
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowDeactivate(false); setHasReportsWarning(''); }} className="px-4 py-2 border border-[hsl(var(--border))] rounded-lg text-sm hover:bg-[hsl(var(--accent))] transition-smooth">Cancel</button>
              <button onClick={() => handleDeactivate(!!hasReportsWarning)} disabled={deactivating}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 disabled:opacity-50 transition-smooth">
                {deactivating ? 'Processing...' : hasReportsWarning ? 'Deactivate Anyway' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
