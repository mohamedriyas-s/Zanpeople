'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email });
    } catch {}
    setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4">
      <div className="w-full max-w-[420px]">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[hsl(var(--primary))] text-white text-xl font-bold mb-4 shadow-lg shadow-[hsl(var(--primary)/0.25)]">Z</div>
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">Forgot Password</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">We&apos;ll send you a reset link</p>
        </div>

        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-xl p-8">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-3 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center">✓</div>
              <h3 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-1">Check your email</h3>
              <p className="text-sm text-[hsl(var(--muted-foreground))]">If this email exists, a reset link has been sent.</p>
              <a href="/login" className="inline-block mt-4 text-sm text-[hsl(var(--primary))] hover:underline">← Back to login</a>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5">Email</label>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@zansphere.com"
                  className="w-full px-3.5 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] transition-smooth" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-2.5 bg-[hsl(var(--primary))] text-white text-sm font-semibold rounded-lg hover:bg-[hsl(var(--primary)/0.9)] disabled:opacity-50 transition-smooth shadow-md">
                {loading ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Sending...</span> : 'Send Reset Link'}
              </button>
              <p className="text-center"><a href="/login" className="text-xs text-[hsl(var(--primary))] hover:underline">← Back to login</a></p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
