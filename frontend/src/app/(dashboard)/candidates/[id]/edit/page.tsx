'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Plus, X, Loader2, Save } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';

const candidateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(7).max(15).regex(/^\+?[\d\s-]+$/, 'Invalid phone format'),
  positionApplied: z.string().min(1, 'Position is required').max(150),
  address: z.string().max(255).optional().or(z.literal('')),
  city: z.string().max(100).optional().or(z.literal('')),
  state: z.string().max(100).optional().or(z.literal('')),
  country: z.string().max(100).optional().or(z.literal('')),
  yearsExperience: z.string().optional().or(z.literal('')),
  currentCompany: z.string().max(150).optional().or(z.literal('')),
  noticePeriod: z.string().max(50).optional().or(z.literal('')),
  currentSalary: z.string().optional().or(z.literal('')),
  expectedSalary: z.string().optional().or(z.literal('')),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
  personalWebsiteUrl: z.string().url().optional().or(z.literal('')),
  interviewDate: z.string().optional().or(z.literal('')),
});

type CandidateForm = z.infer<typeof candidateSchema>;

export default function EditCandidatePage() {
  const router = useRouter();
  const params = useParams();
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CandidateForm>({
    resolver: zodResolver(candidateSchema),
  });

  useEffect(() => {
    api.get(`/candidates/${params.id}`).then(res => {
      const c = res.data.data;
      setValue('name', c.name || '');
      setValue('email', c.email || '');
      setValue('phone', c.phone || '');
      setValue('positionApplied', c.positionApplied || '');
      setValue('address', c.address || '');
      setValue('city', c.city || '');
      setValue('state', c.state || '');
      setValue('country', c.country || '');
      setValue('yearsExperience', c.yearsExperience?.toString() || '');
      setValue('currentCompany', c.currentCompany || '');
      setValue('noticePeriod', c.noticePeriod || '');
      setValue('currentSalary', c.currentSalary?.toString() || '');
      setValue('expectedSalary', c.expectedSalary?.toString() || '');
      setValue('linkedinUrl', c.linkedinUrl || '');
      setValue('githubUrl', c.githubUrl || '');
      setValue('portfolioUrl', c.portfolioUrl || '');
      setValue('personalWebsiteUrl', c.personalWebsiteUrl || '');
      setValue('interviewDate', c.interviewDate ? c.interviewDate.split('T')[0] : '');
      setSkills(c.skills || []);
      setLoading(false);
    }).catch(() => {
      router.push('/candidates');
    });
  }, [params.id, setValue, router]);

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) setSkills([...skills, trimmed]);
    setSkillInput('');
  };

  const removeSkill = (skill: string) => setSkills(skills.filter(s => s !== skill));

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (skillInput.trim()) addSkill(skillInput);
    }
  };

  const onSubmit = async (data: CandidateForm) => {
    setIsSubmitting(true);
    try {
      const payload = {
        ...data,
        yearsExperience: data.yearsExperience ? parseFloat(data.yearsExperience) : null,
        currentSalary: data.currentSalary ? parseFloat(data.currentSalary) : null,
        expectedSalary: data.expectedSalary ? parseFloat(data.expectedSalary) : null,
        skills,
      };
      await api.put(`/candidates/${params.id}`, payload);
      router.push(`/candidates/${params.id}`);
    } catch (err: any) {
      alert(err.response?.data?.error?.message || 'Failed to update candidate');
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth";
  const labelClass = "block text-sm font-medium text-[hsl(var(--foreground))] mb-1";
  const errorClass = "text-xs text-[hsl(var(--destructive))] mt-1";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-[hsl(var(--primary))] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <button onClick={() => router.push(`/candidates/${params.id}`)} className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-smooth">
        <ArrowLeft className="w-4 h-4" /> Back to Candidate
      </button>

      <h1 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">Edit Candidate</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Full Name *</label>
              <input {...register('name')} className={inputClass} />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input {...register('email')} type="email" className={inputClass} />
              {errors.email && <p className={errorClass}>{errors.email.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Phone *</label>
              <input {...register('phone')} className={inputClass} />
              {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input {...register('city')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input {...register('state')} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Professional Details */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Professional Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Position Applied *</label>
              <input {...register('positionApplied')} className={inputClass} />
              {errors.positionApplied && <p className={errorClass}>{errors.positionApplied.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Years of Experience</label>
              <input {...register('yearsExperience')} type="number" step="0.5" min="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Current Company</label>
              <input {...register('currentCompany')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Notice Period</label>
              <input {...register('noticePeriod')} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Interview Date</label>
              <input {...register('interviewDate')} type="date" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Current Salary (₹)</label>
              <input {...register('currentSalary')} type="number" min="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Expected Salary (₹)</label>
              <input {...register('expectedSalary')} type="number" min="0" className={inputClass} />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Skills</h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {skills.map(skill => (
              <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-md text-xs font-medium">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} className="hover:text-[hsl(var(--destructive))]"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={handleSkillKeyDown}
              className={`${inputClass} flex-1`} placeholder="Type a skill and press Enter..." />
            <button type="button" onClick={() => addSkill(skillInput)} disabled={!skillInput.trim()} className="px-3 py-2 bg-[hsl(var(--muted))] rounded-lg text-sm hover:bg-[hsl(var(--accent))] disabled:opacity-30 transition-smooth">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Links */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 sm:p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelClass}>LinkedIn</label><input {...register('linkedinUrl')} className={inputClass} /></div>
            <div><label className={labelClass}>GitHub</label><input {...register('githubUrl')} className={inputClass} /></div>
            <div><label className={labelClass}>Portfolio</label><input {...register('portfolioUrl')} className={inputClass} /></div>
            <div><label className={labelClass}>Personal Website</label><input {...register('personalWebsiteUrl')} className={inputClass} /></div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.push(`/candidates/${params.id}`)} className="px-5 py-2.5 border border-[hsl(var(--border))] rounded-lg text-sm font-medium hover:bg-[hsl(var(--accent))] transition-smooth text-center">
            Cancel
          </button>
          <button type="submit" disabled={isSubmitting} className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[hsl(var(--primary))] text-white text-sm font-semibold rounded-lg hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)]">
            {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
          </button>
        </div>
      </form>
    </div>
  );
}
