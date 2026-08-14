'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, X, ChevronLeft, ChevronRight, Users, ArrowUpDown } from 'lucide-react';
import api from '@/lib/api';
import type { Department, EmploymentStatus } from '@/types';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  INACTIVE: 'bg-gray-100 text-gray-500',
};

export default function EmployeesPage() {
  return (
    <Suspense fallback={<div className="p-8 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>}>
      <EmployeesContent />
    </Suspense>
  );
}

function EmployeesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [employees, setEmployees] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);

  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1'));
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [department, setDepartment] = useState(searchParams.get('department') || '');

  useEffect(() => {
    api.get('/settings/departments').then(res => setDepartments(res.data.data)).catch(() => {});
  }, []);

  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '20');
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      if (department) params.set('department', department);

      const res = await api.get(`/employees?${params}`);
      setEmployees(res.data.data.items);
      setTotal(res.data.data.total);
      setTotalPages(res.data.data.totalPages);
    } catch {}
    setLoading(false);
  }, [page, search, status, department]);

  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);

  const clearFilters = () => { setSearch(''); setStatus(''); setDepartment(''); setPage(1); };
  const hasActiveFilters = search || status || department;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Employees</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">{total} employees</p>
        </div>
        <button onClick={() => router.push('/employees/new')} className="inline-flex items-center gap-1.5 px-4 py-2 bg-[hsl(var(--primary))] text-white text-sm font-medium rounded-lg hover:bg-[hsl(var(--primary)/0.9)] transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)]">
          <Plus className="w-4 h-4" /> Add Employee
        </button>
      </div>

      {/* Filters */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
            <input type="text" placeholder="Search by name, ID, email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth" />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <select value={department} onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1 px-3 py-2 text-sm text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive)/0.1)] rounded-lg transition-smooth">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-lg" />)}</div>
        ) : employees.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-3 text-[hsl(var(--muted-foreground)/0.3)]" />
            <h3 className="text-base font-semibold text-[hsl(var(--foreground))] mb-1">{hasActiveFilters ? 'No matches found' : 'No employees yet'}</h3>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">{hasActiveFilters ? 'Try adjusting your filters.' : 'Add your first employee to get started.'}</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Employee</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">ID</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Department</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Designation</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Status</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[hsl(var(--border)/0.5)]">
                  {employees.map((e) => (
                    <tr key={e.id} onClick={() => router.push(`/employees/${e.id}`)} className="hover:bg-[hsl(var(--accent)/0.5)] cursor-pointer transition-smooth">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold shrink-0">{e.fullName?.charAt(0)?.toUpperCase()}</div>
                          <div>
                            <p className="text-sm font-medium text-[hsl(var(--foreground))]">{e.fullName}</p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))]">{e.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-mono text-[hsl(var(--muted-foreground))]">{e.employeeCode}</td>
                      <td className="px-5 py-3.5 text-sm text-[hsl(var(--foreground))]">{e.department?.name}</td>
                      <td className="px-5 py-3.5 text-sm text-[hsl(var(--foreground))]">{e.designation?.name}</td>
                      <td className="px-5 py-3.5">
                        <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${statusColors[e.employmentStatus]}`}>{e.employmentStatus}</span>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-[hsl(var(--muted-foreground))]">
                        {new Date(e.joiningDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-[hsl(var(--border)/0.5)]">
              {employees.map((e) => (
                <button key={e.id} onClick={() => router.push(`/employees/${e.id}`)} className="w-full p-4 text-left hover:bg-[hsl(var(--accent)/0.5)] transition-smooth">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">{e.fullName?.charAt(0)?.toUpperCase()}</div>
                      <div>
                        <p className="text-sm font-medium text-[hsl(var(--foreground))]">{e.fullName}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">{e.department?.name} · {e.designation?.name}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[hsl(var(--muted-foreground))]">{e.employeeCode}</span>
                  </div>
                </button>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-[hsl(var(--border))]">
                <p className="text-xs text-[hsl(var(--muted-foreground))]">Page {page} of {totalPages}</p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="p-1.5 rounded-lg hover:bg-[hsl(var(--accent))] disabled:opacity-30 transition-smooth"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="p-1.5 rounded-lg hover:bg-[hsl(var(--accent))] disabled:opacity-30 transition-smooth"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
