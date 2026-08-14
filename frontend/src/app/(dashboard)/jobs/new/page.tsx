'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Department, Designation, PipelineTemplate, ApiResponse } from '@/types';
import { ArrowLeft, Save, Loader2, Briefcase, GitMerge } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CreateJobOpeningPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [templates, setTemplates] = useState<PipelineTemplate[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [formData, setFormData] = useState({
    title: '',
    departmentId: '',
    designationId: '',
    templateId: '',
    vacancies: 1,
    description: '',
  });

  useEffect(() => {
    fetchFormData();
  }, []);

  const fetchFormData = async () => {
    try {
      setIsLoading(true);
      const [deptRes, desigRes, tmplRes] = await Promise.all([
        api.get<ApiResponse<Department[]>>('/settings/departments'),
        api.get<ApiResponse<Designation[]>>('/settings/designations'),
        api.get<ApiResponse<PipelineTemplate[]>>('/pipelines'),
      ]);
      
      setDepartments(deptRes.data.data.filter(d => d.isActive));
      setDesignations(desigRes.data.data.filter(d => d.isActive));
      
      const activeTemplates = tmplRes.data.data.filter(t => t.isActive);
      setTemplates(activeTemplates);
      
      // Select default template if available
      const defaultTemplate = activeTemplates.find(t => t.isDefault);
      if (defaultTemplate) {
        setFormData(prev => ({ ...prev, templateId: defaultTemplate.id }));
      }
    } catch (error) {
      toast.error('Failed to load form data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'vacancies' ? parseInt(value) || 1 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.departmentId || !formData.templateId) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      setIsSubmitting(true);
      const { data } = await api.post<ApiResponse<{ id: string }>>('/jobs', {
        ...formData,
        designationId: formData.designationId || undefined,
        description: formData.description || undefined,
      });
      
      toast.success('Job opening created successfully');
      router.push(`/jobs/${data.data.id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create job opening');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTemplate = templates.find(t => t.id === formData.templateId);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[hsl(var(--primary))]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 sm:gap-4">
        <Link
          href="/jobs"
          className="p-2 rounded-lg hover:bg-[hsl(var(--accent))] text-[hsl(var(--muted-foreground))] transition-colors shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-[hsl(var(--foreground))]">Create Job Opening</h1>
          <p className="text-xs sm:text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
            Publish a new position and configure its recruitment pipeline
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Details */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4 sm:p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[hsl(var(--border))]">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-[hsl(var(--primary))]">
              <Briefcase className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Job Details</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                Job Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="e.g. Senior Frontend Developer"
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                Department *
              </label>
              <select
                name="departmentId"
                value={formData.departmentId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth appearance-none bg-[hsl(var(--background))] cursor-pointer"
                required
              >
                <option value="">Select department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                Designation
              </label>
              <select
                name="designationId"
                value={formData.designationId}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth appearance-none bg-[hsl(var(--background))] cursor-pointer"
              >
                <option value="">Select designation (optional)</option>
                {designations.map(desig => (
                  <option key={desig.id} value={desig.id}>{desig.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                Number of Vacancies *
              </label>
              <input
                type="number"
                name="vacancies"
                value={formData.vacancies}
                onChange={handleChange}
                min="1"
                className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth"
                required
              />
            </div>
          </div>
        </div>

        {/* Pipeline Configuration */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[hsl(var(--border))]">
            <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary)/0.1)] flex items-center justify-center text-[hsl(var(--primary))]">
              <GitMerge className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[hsl(var(--foreground))]">Recruitment Pipeline</h2>
              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">Select the workflow candidates will go through</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-3">
              Pipeline Template *
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map(template => (
                <div 
                  key={template.id}
                  onClick={() => setFormData(prev => ({ ...prev, templateId: template.id }))}
                  className={`
                    p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 relative
                    ${formData.templateId === template.id 
                      ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.05)]' 
                      : 'border-[hsl(var(--border))] hover:border-[hsl(var(--primary)/0.5)] hover:bg-[hsl(var(--accent))]'
                    }
                  `}
                >
                  {formData.templateId === template.id && (
                    <div className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                    </div>
                  )}
                  <div className="font-semibold text-[hsl(var(--foreground))] mb-1 pr-6">{template.name}</div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))] line-clamp-2 mb-3">
                    {template.description || 'No description provided'}
                  </div>
                  <div className="text-xs font-medium text-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.1)] px-2 py-1 rounded-md inline-block">
                    {template.stages?.length || 0} Stages
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pipeline Preview */}
          {selectedTemplate && selectedTemplate.stages && selectedTemplate.stages.length > 0 && (
            <div className="mt-6 p-4 rounded-xl bg-[hsl(var(--accent))] border border-[hsl(var(--border))]">
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Pipeline Preview</h3>
              <div className="flex items-center overflow-x-auto pb-2">
                {selectedTemplate.stages.map((stage, index) => (
                  <div key={stage.id} className="flex items-center shrink-0">
                    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-lg px-3 py-2 shadow-sm text-sm font-medium whitespace-nowrap">
                      <span className="text-[hsl(var(--muted-foreground))] mr-2 text-xs">{index + 1}.</span>
                      {stage.name}
                    </div>
                    {index < (selectedTemplate.stages?.length || 0) - 1 && (
                      <div className="w-8 h-px bg-[hsl(var(--border))] mx-2"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-6 shadow-sm">
          <label className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
            Job Description / Internal Notes
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={4}
            className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth resize-none"
            placeholder="Enter job requirements, responsibilities, or internal notes..."
          ></textarea>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-2">
          <Link
            href="/jobs"
            className="px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)]"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Create Job Opening
          </button>
        </div>
      </form>
    </div>
  );
}
