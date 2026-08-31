'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import api from '@/lib/api';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('token')) {
      router.replace('/dashboard');
    }
  }, [router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true);
    setError('');

    try {
      const response = await api.post('/auth/login', data);
      const { token, user } = response.data.data;

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));

      router.push('/dashboard');
    } catch (err: any) {
      const message =
        err.response?.data?.error?.message || 'An unexpected error occurred. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(221,83%,53%,0.03)] to-[hsl(var(--background))] p-4">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[hsl(var(--primary)/0.05)] rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-[hsl(var(--primary)/0.08)] rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-[420px]">
        {/* Logo & Branding */}
        <div className="text-center mb-8">
          <img src="/assets/zanSphereLogo.png" alt="Zansphere Logo" className="h-16 w-auto mx-auto mb-4 object-contain" />
          <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">HR Portal</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl shadow-xl shadow-black/5 p-8">
          {error && (
            <div className="mb-6 p-3 bg-[hsl(var(--destructive)/0.1)] border border-[hsl(var(--destructive)/0.2)] rounded-lg text-sm text-[hsl(var(--destructive))] flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 mt-0.5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                autoComplete="email"
                placeholder="you@zansphere.com"
                {...register('email')}
                className="w-full px-3.5 py-2.5 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-smooth"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-[hsl(var(--destructive))]">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-[hsl(var(--foreground))] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  {...register('password')}
                  className="w-full px-3.5 py-2.5 pr-10 bg-[hsl(var(--background))] border border-[hsl(var(--input))] rounded-lg text-sm text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:border-transparent transition-smooth"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-smooth"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-[hsl(var(--destructive))]">{errors.password.message}</p>
              )}
            </div>

            {/* Forgot Password */}
            <div className="flex justify-end">
              <a
                href="/forgot-password"
                className="text-xs text-[hsl(var(--primary))] hover:text-[hsl(var(--primary)/0.8)] font-medium transition-smooth"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 bg-[hsl(var(--primary))] text-white text-sm font-semibold rounded-lg hover:bg-[hsl(var(--primary)/0.9)] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-smooth shadow-md shadow-[hsl(var(--primary)/0.2)]"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-[hsl(var(--muted-foreground))] mt-6">
          Zansphere Private Limited &middot; Internal HR Portal
        </p>
      </div>
    </div>
  );
}
