'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, X, Loader2, Upload, Sparkles, FileText, CheckCircle2, AlertCircle, Briefcase } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import { JobOpening, PaginatedResponse } from '@/types';
import toast from 'react-hot-toast';

const candidateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  email: z.string().email('Valid email is required'),
  phone: z.string().min(7, 'Phone must be at least 7 digits').max(15).regex(/^\+?[\d\s-]+$/, 'Invalid phone format'),
  positionApplied: z.string().min(1, 'Position is required').max(150),
  address: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).optional(),
  yearsExperience: z.string().optional(),
  currentCompany: z.string().max(150).optional(),
  noticePeriod: z.string().max(50).optional(),
  currentSalary: z.string().optional(),
  expectedSalary: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
  personalWebsiteUrl: z.string().url().optional().or(z.literal('')),
  interviewDate: z.string().optional(),
});

type CandidateForm = z.infer<typeof candidateSchema>;

export default function AddCandidatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState('');

  // Job assignment
  const [jobs, setJobs] = useState<JobOpening[]>([]);
  const [selectedJobId, setSelectedJobId] = useState(searchParams.get('jobId') || '');
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Autofill state
  const [isParsing, setIsParsing] = useState(false);
  const [parseStatus, setParseStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [parseMessage, setParseMessage] = useState('');
  const [autofillFields, setAutofillFields] = useState<string[]>([]);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<CandidateForm>({
    resolver: zodResolver(candidateSchema),
  });

  useEffect(() => {
    api.get<PaginatedResponse<JobOpening>>('/jobs?status=OPEN&limit=100')
      .then(res => setJobs(res.data.data.items))
      .catch(() => {})
      .finally(() => setLoadingJobs(false));
  }, []);

  // ─── Resume Autofill Handler ─────────────────────────

  async function handleResumeUpload(file: File) {
    setResumeFile(file);
    setParseStatus('idle');
    setParseMessage('');
    setAutofillFields([]);

    // Auto-trigger parse if it's a PDF
    if (file.type === 'application/pdf') {
      await parseAndAutofill(file);
    }
  }

  async function parseAndAutofill(file: File) {
    setIsParsing(true);
    setParseStatus('idle');
    setParseMessage('');
    setAutofillFields([]);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/candidates/parse-resume', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const parsed = res.data.data;
      const filled: string[] = [];

      // Autofill each field if parsed value exists
      if (parsed.name) { setValue('name', parsed.name); filled.push('Name'); }
      if (parsed.email) { setValue('email', parsed.email); filled.push('Email'); }
      if (parsed.phone) { setValue('phone', parsed.phone); filled.push('Phone'); }
      if (parsed.positionApplied) { setValue('positionApplied', parsed.positionApplied); filled.push('Position'); }
      if (parsed.city) { setValue('city', parsed.city); filled.push('City'); }
      if (parsed.state) { setValue('state', parsed.state); filled.push('State'); }
      if (parsed.country) { setValue('country', parsed.country); filled.push('Country'); }
      if (parsed.address) { setValue('address', parsed.address); filled.push('Address'); }
      if (parsed.yearsExperience != null) { setValue('yearsExperience', parsed.yearsExperience.toString()); filled.push('Experience'); }
      if (parsed.currentCompany) { setValue('currentCompany', parsed.currentCompany); filled.push('Company'); }
      if (parsed.noticePeriod) { setValue('noticePeriod', parsed.noticePeriod); filled.push('Notice Period'); }
      if (parsed.linkedinUrl) { setValue('linkedinUrl', parsed.linkedinUrl); filled.push('LinkedIn'); }
      if (parsed.githubUrl) { setValue('githubUrl', parsed.githubUrl); filled.push('GitHub'); }
      if (parsed.portfolioUrl) { setValue('portfolioUrl', parsed.portfolioUrl); filled.push('Portfolio'); }
      if (parsed.personalWebsiteUrl) { setValue('personalWebsiteUrl', parsed.personalWebsiteUrl); filled.push('Website'); }

      // Set skills
      if (parsed.skills && parsed.skills.length > 0) {
        setSkills(prev => {
          const combined = new Set([...prev, ...parsed.skills]);
          return Array.from(combined);
        });
        filled.push(`${parsed.skills.length} Skills`);
      }

      setAutofillFields(filled);
      if (filled.length > 0) {
        setParseStatus('success');
        setParseMessage(`Autofilled ${filled.length} fields from resume`);
      } else {
        setParseStatus('error');
        setParseMessage('Could not extract details from this resume. Please fill manually.');
      }
    } catch (err: any) {
      setParseStatus('error');
      setParseMessage(err.response?.data?.error?.message || 'Failed to parse resume. Please fill manually.');
    }

    setIsParsing(false);
  }

  // ─── Skills helpers ──────────────────────────────────

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
    }
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (skillInput.trim()) addSkill(skillInput);
    }
  };

  // ─── Submit ──────────────────────────────────────────

  const onSubmit = async (data: CandidateForm, force = false) => {
    if (!selectedJobId) {
      toast.error('Please select a job opening');
      return;
    }
    setIsSubmitting(true);
    setDuplicateWarning('');

    try {
      const payload = {
        ...data,
        yearsExperience: data.yearsExperience ? parseFloat(data.yearsExperience) : null,
        currentSalary: data.currentSalary ? parseFloat(data.currentSalary) : null,
        expectedSalary: data.expectedSalary ? parseFloat(data.expectedSalary) : null,
        skills,
      };

      const url = force ? '/candidates?force=true' : '/candidates';
      const res = await api.post(url, payload);
      const candidateId = res.data.data.id;

      // Upload resume if provided
      if (resumeFile) {
        const formData = new FormData();
        formData.append('file', resumeFile);
        await api.post(`/candidates/${candidateId}/resume`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Apply candidate to the selected job
      try {
        await api.post(`/jobs/${selectedJobId}/apply`, { candidateId });
        toast.success('Candidate created and applied to job!');
      } catch (applyErr: any) {
        toast.error(applyErr.response?.data?.error?.message || 'Candidate created but failed to apply to job');
      }

      router.push(`/jobs/${selectedJobId}`);
    } catch (err: any) {
      if (err.response?.data?.error?.code === 'DUPLICATE_CANDIDATE') {
        setDuplicateWarning(err.response.data.error.message);
      } else {
        alert(err.response?.data?.error?.message || 'Failed to create candidate');
      }
      setIsSubmitting(false);
    }
  };

  const handleFormSubmit = handleSubmit((data) => onSubmit(data, false));
  const handleForceSubmit = handleSubmit((data) => onSubmit(data, true));

  const inputClass = "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth";
  const labelClass = "block text-sm font-medium text-[hsl(var(--foreground))] mb-1";
  const errorClass = "text-xs text-[hsl(var(--destructive))] mt-1";

  return (
    <div className="max-w-3xl space-y-6">
      <button onClick={() => router.push('/candidates')} className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-smooth">
        <ArrowLeft className="w-4 h-4" /> Back to Candidates
      </button>

      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">Add Candidate</h1>
        <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Upload a resume to autofill details, or enter them manually.</p>
      </div>

      {/* ═══════════════ RESUME UPLOAD + AUTOFILL ═══════════════ */}
      <div className="bg-gradient-to-br from-[hsl(var(--primary)/0.04)] to-[hsl(var(--primary)/0.01)] border-2 border-dashed border-[hsl(var(--primary)/0.2)] rounded-2xl p-4 sm:p-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[hsl(var(--primary)/0.05)] rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-[hsl(var(--primary)/0.03)] rounded-full blur-2xl pointer-events-none" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Autofill from Resume</h3>
              <p className="text-xs text-[hsl(var(--muted-foreground))]">Upload a PDF and we&apos;ll extract candidate details automatically</p>
            </div>
          </div>

          {/* Upload Zone */}
          <div
            className={`mt-4 border border-[hsl(var(--border))] bg-[hsl(var(--card))] rounded-xl p-5 text-center cursor-pointer hover:border-[hsl(var(--primary)/0.5)] hover:bg-[hsl(var(--primary)/0.02)] transition-all duration-300 ${isParsing ? 'pointer-events-none opacity-70' : ''}`}
            onClick={() => !isParsing && document.getElementById('resume-upload')?.click()}
            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-[hsl(var(--primary))]', 'bg-[hsl(var(--primary)/0.05)]'); }}
            onDragLeave={(e) => { e.currentTarget.classList.remove('border-[hsl(var(--primary))]', 'bg-[hsl(var(--primary)/0.05)]'); }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-[hsl(var(--primary))]', 'bg-[hsl(var(--primary)/0.05)]');
              const file = e.dataTransfer.files[0];
              if (file) handleResumeUpload(file);
            }}
          >
            <input
              id="resume-upload"
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) handleResumeUpload(e.target.files[0]); }}
            />

            {isParsing ? (
              <div className="flex flex-col items-center gap-3 py-2">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full border-2 border-[hsl(var(--primary)/0.2)] flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-[hsl(var(--primary))] animate-spin" />
                  </div>
                  <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[hsl(var(--primary))] animate-spin" style={{ animationDuration: '1.5s' }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">Parsing resume...</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">Extracting name, skills, experience, and more</p>
                </div>
              </div>
            ) : resumeFile ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-red-50 text-red-500 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium text-[hsl(var(--foreground))]">{resumeFile.name}</p>
                  <p className="text-xs text-[hsl(var(--muted-foreground))]">{(resumeFile.size / 1024).toFixed(1)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setResumeFile(null);
                    setParseStatus('idle');
                    setParseMessage('');
                    setAutofillFields([]);
                  }}
                  className="ml-2 p-1.5 rounded-lg text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--destructive)/0.1)] hover:text-[hsl(var(--destructive))] transition-smooth"
                >
                  <X className="w-4 h-4" />
                </button>
                {parseStatus !== 'success' && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); parseAndAutofill(resumeFile); }}
                    className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)]"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Autofill
                  </button>
                )}
              </div>
            ) : (
              <>
                <Upload className="w-10 h-10 mx-auto mb-2 text-[hsl(var(--primary)/0.4)]" />
                <p className="text-sm font-medium text-[hsl(var(--foreground))]">Drop a resume PDF here or click to browse</p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">PDF only, max 5MB — Fields will be autofilled instantly</p>
              </>
            )}
          </div>

          {/* Parse Result Banner */}
          {parseStatus === 'success' && (
            <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl animate-[fadeIn_0.3s_ease-out]">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-emerald-800">{parseMessage}</p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {autofillFields.map((field) => (
                      <span key={field} className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded font-medium">
                        ✓ {field}
                      </span>
                    ))}
                  </div>
                  <p className="text-[11px] text-emerald-600 mt-1.5">Review and adjust the fields below, then submit.</p>
                </div>
              </div>
            </div>
          )}

          {parseStatus === 'error' && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm text-amber-800">{parseMessage}</p>
                  <button
                    type="button"
                    onClick={() => resumeFile && parseAndAutofill(resumeFile)}
                    className="text-xs text-amber-700 underline mt-1 hover:text-amber-900"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Duplicate Warning */}
      {duplicateWarning && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm text-amber-800 font-medium mb-2">⚠️ {duplicateWarning}</p>
          <div className="flex gap-2">
            <button onClick={handleForceSubmit} className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-smooth">
              Add Anyway
            </button>
            <button onClick={() => setDuplicateWarning('')} className="px-3 py-1.5 border border-amber-300 text-amber-700 text-sm rounded-lg hover:bg-amber-100 transition-smooth">
              Cancel
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleFormSubmit} className="space-y-6">
        {/* Job Opening Selection */}
        <div className="bg-[hsl(var(--card))] border-2 border-[hsl(var(--primary)/0.2)] rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] flex items-center justify-center">
              <Briefcase className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">Assign to Job Opening *</h3>
          </div>
          {loadingJobs ? (
            <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading open positions...
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-xs text-[hsl(var(--muted-foreground))]">No open job positions. <a href="/jobs/new" className="text-[hsl(var(--primary))] hover:underline">Create one first</a>.</p>
          ) : (
            <select value={selectedJobId} onChange={e => setSelectedJobId(e.target.value)}
              className="input-field w-full text-sm" required>
              <option value="">Select a job opening...</option>
              {jobs.map(j => (
                <option key={j.id} value={j.id}>
                  {j.title}{j.department ? ` — ${j.department.name}` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
        {/* Personal Information */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Personal Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Full Name *</label>
              <input {...register('name')} className={inputClass} placeholder="John Doe" />
              {errors.name && <p className={errorClass}>{errors.name.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Email *</label>
              <input {...register('email')} type="email" className={inputClass} placeholder="john@example.com" />
              {errors.email && <p className={errorClass}>{errors.email.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Phone *</label>
              <input {...register('phone')} className={inputClass} placeholder="+91 98765 43210" />
              {errors.phone && <p className={errorClass}>{errors.phone.message}</p>}
            </div>
            <div>
              <label className={labelClass}>City</label>
              <input {...register('city')} className={inputClass} placeholder="Hyderabad" />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input {...register('state')} className={inputClass} placeholder="Telangana" />
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Professional Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Position Applied *</label>
              <input {...register('positionApplied')} className={inputClass} placeholder="Senior Software Engineer" />
              {errors.positionApplied && <p className={errorClass}>{errors.positionApplied.message}</p>}
            </div>
            <div>
              <label className={labelClass}>Years of Experience</label>
              <input {...register('yearsExperience')} type="number" step="0.5" min="0" className={inputClass} placeholder="5" />
            </div>
            <div>
              <label className={labelClass}>Current Company</label>
              <input {...register('currentCompany')} className={inputClass} placeholder="TechCorp" />
            </div>
            <div>
              <label className={labelClass}>Notice Period</label>
              <input {...register('noticePeriod')} className={inputClass} placeholder="30 days" />
            </div>
            <div>
              <label className={labelClass}>Interview Date</label>
              <input {...register('interviewDate')} type="date" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Current Salary (₹)</label>
              <input {...register('currentSalary')} type="number" min="0" className={inputClass} placeholder="1200000" />
            </div>
            <div>
              <label className={labelClass}>Expected Salary (₹)</label>
              <input {...register('expectedSalary')} type="number" min="0" className={inputClass} placeholder="1600000" />
            </div>
          </div>
        </div>

        {/* Skills */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Skills</h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {skills.map((skill) => (
              <span key={skill} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] rounded-md text-xs font-medium">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} className="hover:text-[hsl(var(--destructive))]"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              className={`${inputClass} flex-1`}
              placeholder="Type a skill and press Enter..."
            />
            <button type="button" onClick={() => addSkill(skillInput)} disabled={!skillInput.trim()} className="px-3 py-2 bg-[hsl(var(--muted))] rounded-lg text-sm hover:bg-[hsl(var(--accent))] disabled:opacity-30 transition-smooth">
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Links */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Links</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelClass}>LinkedIn</label><input {...register('linkedinUrl')} className={inputClass} placeholder="https://linkedin.com/in/..." /></div>
            <div><label className={labelClass}>GitHub</label><input {...register('githubUrl')} className={inputClass} placeholder="https://github.com/..." /></div>
            <div><label className={labelClass}>Portfolio</label><input {...register('portfolioUrl')} className={inputClass} placeholder="https://portfolio.com" /></div>
            <div><label className={labelClass}>Personal Website</label><input {...register('personalWebsiteUrl')} className={inputClass} placeholder="https://website.com" /></div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.push('/candidates')} className="px-5 py-2.5 border border-[hsl(var(--border))] rounded-lg text-sm font-medium hover:bg-[hsl(var(--accent))] transition-smooth">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-[hsl(var(--primary))] text-white text-sm font-semibold rounded-lg hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)]"
          >
            {isSubmitting ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating...</span> : 'Add Candidate'}
          </button>
        </div>
      </form>
    </div>
  );
}
