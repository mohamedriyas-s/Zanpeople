'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, UserPlus, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import type { Department, Designation, Candidate } from '@/types';
import { Suspense } from 'react';

const convertSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(150),
  email: z.string().email('Valid email is required'),
  phone: z.string().max(20).optional().or(z.literal('')),
  departmentId: z.string().min(1, 'Department is required'),
  designationId: z.string().min(1, 'Designation is required'),
  managerId: z.string().optional().or(z.literal('')),
  joiningDate: z.string().min(1, 'Joining date is required'),
  emergencyContactName: z.string().max(150).optional().or(z.literal('')),
  emergencyContactRelationship: z.string().max(50).optional().or(z.literal('')),
  emergencyContactPhone: z.string().max(20).optional().or(z.literal('')),
});

type ConvertForm = z.infer<typeof convertSchema>;

export default function ConvertCandidatePage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[hsl(var(--primary))] animate-spin" /></div>}>
      <ConvertContent />
    </Suspense>
  );
}

function ConvertContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const candidateId = searchParams.get('candidateId');

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ConvertForm>({
    resolver: zodResolver(convertSchema),
  });

  useEffect(() => {
    if (!candidateId) {
      router.push('/candidates');
      return;
    }

    Promise.all([
      api.get(`/candidates/${candidateId}`),
      api.get('/settings/departments'),
      api.get('/settings/designations'),
      api.get('/employees?status=ACTIVE&limit=100'),
    ]).then(([candRes, deptRes, desigRes, empRes]) => {
      const c = candRes.data.data;
      setCandidate(c);
      setDepartments(deptRes.data.data);
      setDesignations(desigRes.data.data);
      setManagers(empRes.data.data.items);

      // Prefill from candidate data
      setValue('fullName', c.name || '');
      setValue('email', c.email || '');
      setValue('phone', c.phone || '');
      setValue('joiningDate', new Date().toISOString().split('T')[0]);
      setLoading(false);
    }).catch((err: any) => {
      setError(err.response?.data?.error?.message || 'Failed to load candidate');
      setLoading(false);
    });
  }, [candidateId, setValue, router]);

  const onSubmit = async (data: ConvertForm) => {
    setIsSubmitting(true);
    setError('');
    try {
      if (!candidateId) throw new Error('Candidate ID is missing from the URL.');
      
      const payload = { ...data, managerId: data.managerId || null };
      const res = await api.post(`/employees/from-candidate/${candidateId}`, payload);
      router.push(`/employees/${res.data.data.id}`);
    } catch (err: any) {
      console.error('Conversion Error:', err);
      const errorMessage = err.response?.data?.error?.message 
        || err.message 
        || (err.response?.status ? `HTTP Error ${err.response.status}` : 'Failed to convert candidate');
      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth";
  const labelClass = "block text-sm font-medium text-[hsl(var(--foreground))] mb-1";
  const errorClass = "text-xs text-[hsl(var(--destructive))] mt-1";

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 text-[hsl(var(--primary))] animate-spin" /></div>;
  }

  return (
    <div className="max-w-3xl space-y-6">
      <button onClick={() => router.push(candidateId ? `/candidates/${candidateId}` : '/candidates')} className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-smooth">
        <ArrowLeft className="w-4 h-4" /> Back to Candidate
      </button>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[hsl(var(--primary)/0.08)] to-[hsl(var(--primary)/0.02)] border border-[hsl(var(--primary)/0.15)] rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] flex items-center justify-center">
            <UserPlus className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[hsl(var(--foreground))]">Convert to Employee</h1>
            <p className="text-sm text-[hsl(var(--muted-foreground))]">
              Creating employee record for <span className="font-semibold text-[hsl(var(--foreground))]">{candidate?.name}</span>
            </p>
          </div>
        </div>

        {/* Conversion flow visual */}
        <div className="mt-4 flex items-center gap-3 text-sm">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--card))] rounded-lg border border-[hsl(var(--border))]">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Candidate</span>
          </div>
          <ArrowRight className="w-4 h-4 text-[hsl(var(--muted-foreground))]" />
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-lg border border-[hsl(var(--primary)/0.2)] font-medium">
            <UserPlus className="w-4 h-4" />
            <span>Employee</span>
          </div>
        </div>

        {/* Pre-filled info from candidate */}
        {candidate && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2 bg-[hsl(var(--card)/0.7)] rounded-lg">
              <p className="text-[hsl(var(--muted-foreground))]">Position Applied</p>
              <p className="font-medium text-[hsl(var(--foreground))]">{candidate.positionApplied}</p>
            </div>
            {candidate.yearsExperience != null && (
              <div className="p-2 bg-[hsl(var(--card)/0.7)] rounded-lg">
                <p className="text-[hsl(var(--muted-foreground))]">Experience</p>
                <p className="font-medium text-[hsl(var(--foreground))]">{candidate.yearsExperience} years</p>
              </div>
            )}
            {candidate.currentCompany && (
              <div className="p-2 bg-[hsl(var(--card)/0.7)] rounded-lg">
                <p className="text-[hsl(var(--muted-foreground))]">Previous Company</p>
                <p className="font-medium text-[hsl(var(--foreground))]">{candidate.currentCompany}</p>
              </div>
            )}
            {candidate.skills && candidate.skills.length > 0 && (
              <div className="p-2 bg-[hsl(var(--card)/0.7)] rounded-lg">
                <p className="text-[hsl(var(--muted-foreground))]">Skills</p>
                <p className="font-medium text-[hsl(var(--foreground))]">{candidate.skills.slice(0, 3).join(', ')}{candidate.skills.length > 3 ? ` +${candidate.skills.length - 3}` : ''}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.2)] rounded-xl text-sm text-[hsl(var(--destructive))]">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info (prefilled from candidate) */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Employee Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className={labelClass}>Full Name *</label><input {...register('fullName')} className={inputClass} />{errors.fullName && <p className={errorClass}>{errors.fullName.message}</p>}</div>
            <div><label className={labelClass}>Email *</label><input {...register('email')} type="email" className={inputClass} />{errors.email && <p className={errorClass}>{errors.email.message}</p>}</div>
            <div><label className={labelClass}>Phone</label><input {...register('phone')} className={inputClass} /></div>
            <div><label className={labelClass}>Joining Date *</label><input {...register('joiningDate')} type="date" className={inputClass} />{errors.joiningDate && <p className={errorClass}>{errors.joiningDate.message}</p>}</div>
          </div>
        </div>

        {/* Organization (new data) */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Organization</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Department *</label>
              <select {...register('departmentId')} className={inputClass}>
                <option value="">Select department</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.departmentId && <p className={errorClass}>{errors.departmentId.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Designation *</label>
              <select {...register('designationId')} className={inputClass}>
                <option value="">Select designation</option>
                {designations.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              {errors.designationId && <p className={errorClass}>{errors.designationId.message}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Reporting Manager</label>
              <select {...register('managerId')} className={inputClass}>
                <option value="">No manager</option>
                {managers.map((m: any) => <option key={m.id} value={m.id}>{m.fullName} ({m.employeeCode})</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Emergency Contact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label className={labelClass}>Name</label><input {...register('emergencyContactName')} className={inputClass} /></div>
            <div><label className={labelClass}>Relationship</label><input {...register('emergencyContactRelationship')} className={inputClass} /></div>
            <div><label className={labelClass}>Phone</label><input {...register('emergencyContactPhone')} className={inputClass} /></div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.push(candidateId ? `/candidates/${candidateId}` : '/candidates')} className="px-5 py-2.5 border border-[hsl(var(--border))] rounded-lg text-sm font-medium hover:bg-[hsl(var(--accent))] transition-smooth">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white text-sm font-semibold rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-smooth shadow-md shadow-emerald-200">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Converting...</> : <><UserPlus className="w-4 h-4" /> Convert to Employee</>}
          </button>
        </div>
      </form>
    </div>
  );
}
