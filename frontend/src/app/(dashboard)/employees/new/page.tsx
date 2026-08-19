'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import type { Department, Designation } from '@/types';

const employeeSchema = z.object({
  fullName: z.string().min(1, 'Full name is required').max(150),
  email: z.string().email('Valid email is required'),
  phone: z.string().max(20).optional(),
  departmentId: z.string().min(1, 'Department is required'),
  designationId: z.string().min(1, 'Designation is required'),
  managerId: z.string().optional(),
  joiningDate: z.string().min(1, 'Joining date is required'),
  emergencyContactName: z.string().max(150).optional(),
  emergencyContactRelationship: z.string().max(50).optional(),
  emergencyContactPhone: z.string().max(20).optional(),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

export default function AddEmployeePage() {
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [managers, setManagers] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
  });

  useEffect(() => {
    Promise.all([
      api.get('/settings/departments'),
      api.get('/settings/designations'),
      api.get('/employees?status=ACTIVE&limit=100'),
    ]).then(([deptRes, desigRes, empRes]) => {
      setDepartments(deptRes.data.data);
      setDesignations(desigRes.data.data);
      setManagers(empRes.data.data.items);
    }).catch(() => {});
  }, []);

  const onSubmit = async (data: EmployeeForm) => {
    setIsSubmitting(true);
    try {
      const payload = { ...data, managerId: data.managerId || null };
      const res = await api.post('/employees', payload);
      toast.success('Employee created successfully');
      router.push(`/employees/${res.data.data.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Failed to create employee');
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth";
  const labelClass = "block text-sm font-medium text-[hsl(var(--foreground))] mb-1";
  const errorClass = "text-xs text-[hsl(var(--destructive))] mt-1";

  return (
    <div className="max-w-3xl space-y-6">
      <button onClick={() => router.push('/employees')} className="inline-flex items-center gap-1.5 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-smooth">
        <ArrowLeft className="w-4 h-4" /> Back to Employees
      </button>

      <div>
        <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Add Employee</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">Enter employee details to add them to the organization.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-5">
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><label className={labelClass}>Full Name *</label><input {...register('fullName')} className={inputClass} placeholder="Jane Doe" />{errors.fullName && <p className={errorClass}>{errors.fullName.message}</p>}</div>
            <div><label className={labelClass}>Email *</label><input {...register('email')} type="email" className={inputClass} placeholder="jane@zansphere.com" />{errors.email && <p className={errorClass}>{errors.email.message}</p>}</div>
            <div><label className={labelClass}>Phone</label><input {...register('phone')} className={inputClass} placeholder="+91 98765 43210" /></div>
            <div><label className={labelClass}>Joining Date *</label><input {...register('joiningDate')} type="date" className={inputClass} />{errors.joiningDate && <p className={errorClass}>{errors.joiningDate.message}</p>}</div>
          </div>
        </div>

        {/* Organization */}
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
            <div><label className={labelClass}>Name</label><input {...register('emergencyContactName')} className={inputClass} placeholder="Contact name" /></div>
            <div><label className={labelClass}>Relationship</label><input {...register('emergencyContactRelationship')} className={inputClass} placeholder="e.g. Spouse, Parent" /></div>
            <div><label className={labelClass}>Phone</label><input {...register('emergencyContactPhone')} className={inputClass} placeholder="+91 ..." /></div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button type="button" onClick={() => router.push('/employees')} className="px-5 py-2.5 border border-[hsl(var(--border))] rounded-lg text-sm font-medium hover:bg-[hsl(var(--accent))] transition-smooth">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 bg-[hsl(var(--primary))] text-white text-sm font-semibold rounded-lg hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)]">
            {isSubmitting ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Creating...</span> : 'Add Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}
