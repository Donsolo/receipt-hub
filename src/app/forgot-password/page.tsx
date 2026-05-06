"use client";

import { useState } from 'react';
import Link from 'next/link';
import FintechBackground from '@/components/ui/FintechBackground';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        setErrorMessage('');

        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (res.ok) {
                setStatus('success');
            } else {
                setStatus('error');
                setErrorMessage(data.error || 'Something went wrong. Please try again.');
            }
        } catch (error) {
            setStatus('error');
            setErrorMessage('Network error. Please try again later.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 relative overflow-hidden">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <FintechBackground isDashboard={false} />
            </div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none z-0" />

            <div className="w-full max-w-md bg-gradient-to-br from-[#111827] to-[#0F172A] border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/20 relative z-10 text-center">

                <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>

                <h2 className="text-2xl font-semibold text-[var(--text)] mb-2">Password Reset</h2>
                
                {status === 'success' ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-6 mb-8 text-left shadow-inner">
                        <div className="flex items-center mb-3">
                            <svg className="w-6 h-6 text-emerald-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h3 className="text-lg font-medium text-emerald-400">Check your email</h3>
                        </div>
                        <p className="text-[15px] text-[var(--muted)] leading-relaxed">
                            If an account exists for <strong>{email}</strong>, we have sent a password reset link. Please check your inbox and spam folder.
                        </p>
                    </div>
                ) : (
                    <>
                        <p className="text-[15px] text-[var(--muted)] mb-6">
                            Enter the email address associated with your account, and we'll send you a secure link to reset your password.
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
                                <label htmlFor="email" className="block text-sm font-medium text-[var(--muted)] mb-1.5">Email Address</label>
                                <input
                                    id="email"
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[var(--card)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                                    placeholder="name@company.com"
                                />
                            </div>
                            
                            <button
                                type="submit"
                                disabled={status === 'loading'}
                                className="w-full h-12 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors duration-200 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                            >
                                {status === 'loading' ? (
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    'Send Reset Link'
                                )}
                            </button>
                        </form>
                    </>
                )}

                <Link
                    href="/login"
                    className="w-full inline-flex justify-center items-center h-12 rounded-lg bg-[var(--card)] hover:bg-[var(--card-hover)] border border-[var(--border)] text-[var(--text)] font-medium transition-colors duration-200 shadow-sm"
                >
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Return to Login
                </Link>
            </div>
        </div>
    );
}
