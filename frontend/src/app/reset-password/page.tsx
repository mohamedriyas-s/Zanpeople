'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[hsl(var(--primary))] border-t-transparent rounded-full animate-spin" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match'); return; }
    if (password.length < 8 || !/\d/.test(password)) { setError('Password must be at least 8 characters with at least 1 number'); return; }
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword: password });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to reset password');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[hsl(var(--primary))] text-white text-xl font-bold mb-4 shadow-lg shadow-[hsl(var(--primary)/0.25)]">Z</div>
          <h1 className="text-2xl font-bold">Reset Password</h1>
        </div>
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-xl p-8">
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-3 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">✓</div>
              <h3 className="text-sm font-semibold mb-1">Password Updated!</h3>
              <a href="/login" className="mt-4 inline-block text-sm text-[hsl(var(--primary))] hover:underline">Go to Login →</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && <div className="p-3 bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.2)] rounded-lg text-sm text-[hsl(var(--destructive))]">{error}</div>}
              <div><label className="block text-sm font-medium mb-1.5">New Password</label><input type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Min 8 chars + 1 number"
                className="w-full px-3.5 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" /></div>
              <div><label className="block text-sm font-medium mb-1.5">Confirm Password</label><input type="password" required value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter password"
                className="w-full px-3.5 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]" /></div>
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-[hsl(var(--primary))] text-white text-sm font-semibold rounded-lg hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 transition-smooth shadow-md">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Resetting...</span> : 'Reset Password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
