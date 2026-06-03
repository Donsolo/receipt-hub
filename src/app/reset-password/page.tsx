import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
"use client";

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import FintechBackground from '@/components/ui/FintechBackground';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    
    const token = searchParams.get('token');
    const email = searchParams.get('email');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!token || !email) {
            setStatus('error');
            setErrorMessage('Invalid or missing reset token.');
            return;
        }

        if (password.length < 8) {
            setStatus('error');
            setErrorMessage('Password must be at least 8 characters long.');
            return;
        }

        if (password !== confirmPassword) {
            setStatus('error');
            setErrorMessage('Passwords do not match.');
            return;
        }

        setStatus('loading');
        setErrorMessage('');

        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/reset-password`, {
                method: 'POST',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, token, newPassword: password }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setTimeout(() => {
                    router.push('/login');
                }, 3000);
            } else {
                setStatus('error');
                setErrorMessage(data.error || 'Failed to reset password. The link may have expired.');
            }
        } catch (error) {
            setStatus('error');
            setErrorMessage('Network error. Please try again later.');
        }
    };

    if (!token || !email) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-8 text-left shadow-inner">
                <div className="flex items-center mb-3">
                    <svg className="w-6 h-6 text-red-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h3 className="text-lg font-medium text-red-400">Invalid Link</h3>
                </div>
                <p className="text-[15px] text-[var(--muted)] leading-relaxed mb-4">
                    This password reset link is invalid or missing required information. Please request a new link.
                </p>
                <Link
                    href="/forgot-password"
                    className="inline-block px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-md text-sm text-[var(--text)] hover:bg-[var(--card-hover)] transition-colors"
                >
                    Request New Link
                </Link>
            </div>
        );
    }

    return (
        <>
            {status === 'success' ? (
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 mb-8 text-left shadow-inner">
                    <div className="flex items-center mb-3">
                        <svg className="w-6 h-6 text-emerald-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="text-lg font-medium text-emerald-400">Password Reset Successful</h3>
                    </div>
                    <p className="text-[15px] text-[var(--muted)] leading-relaxed">
                        Your password has been successfully updated. Redirecting you to login...
                    </p>
                </div>
            ) : (
                <>
                    <p className="text-[15px] text-[var(--muted)] mb-6">
                        Create a new secure password for <strong>{email}</strong>.
                    </p>

                    {status === 'error' && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 mb-6 text-left flex items-start">
                            <svg className="w-5 h-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-red-400">{errorMessage}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="text-left mb-8 space-y-4">
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-[var(--muted)] mb-1.5">New Password</label>
                            <input
                                id="password"
                                type="password"
                                required
                                minLength={8}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--muted)] mb-1.5">Confirm New Password</label>
                            <input
                                id="confirmPassword"
                                type="password"
                                required
                                minLength={8}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                placeholder="••••••••"
                            />
                        </div>
                        
                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full h-12 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors duration-200 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-2"
                        >
                            {status === 'loading' ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                'Reset Password'
                            )}
                        </button>
                    </form>
                </>
            )}
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 relative overflow-hidden">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <FintechBackground isDashboard={false} />
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none z-0" />

            <div className="w-full max-w-md bg-gradient-to-br from-[#111827] to-[#0F172A] border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/20 relative z-10 text-center">

                <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4v-3l8.449-8.449A6 6 0 0115 7zm-2 3a1 1 0 100-2 1 1 0 000 2z" />
                    </svg>
                </div>

                <h2 className="text-2xl font-semibold text-[var(--text)] mb-2">Set New Password</h2>
                
                <Suspense fallback={<div className="h-40 flex items-center justify-center"><div className="animate-spin h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full"></div></div>}>
                    <ResetPasswordForm />
                </Suspense>

            </div>
        </div>
    );
}
