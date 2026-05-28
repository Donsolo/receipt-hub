"use client";

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import FintechBackground from '@/components/ui/FintechBackground';

function RegisterForm() {
    const searchParams = useSearchParams();
    const plan = searchParams.get('plan') || 'core';
    const isPro = plan === 'pro';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [error, setError] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name, businessName }),
        });

        const data = await res.json();

        if (res.ok) {
            setIsSuccess(true);
            setTimeout(() => {
                router.refresh();
                if (isPro) {
                    router.push('/billing');
                } else {
                    router.push('/dashboard');
                }
            }, 3000);
        } else {
            setError(data.error || 'Registration failed');
        }
    };

    return (
        <div className="w-full max-w-md bg-gradient-to-br from-[#111827] to-[#0F172A] border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/20 relative z-10 my-12">
            {isSuccess ? (
                <div className="text-center py-10">
                    <div className="h-16 w-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-semibold text-[var(--text)] mb-2">Account Created Successfully.</h2>
                    <p className="text-sm text-[var(--muted)]">Your profile has been secured.</p>
                    <p className="text-xs text-indigo-400 mt-8 animate-pulse">
                        {isPro ? "Redirecting to secure billing portal..." : "Redirecting to your workspace..."}
                    </p>
                </div>
            ) : (
                <>
                    <div className="text-center mb-10">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full mb-6 border ${isPro ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' : 'bg-slate-500/10 border-slate-500/20 text-slate-300'}`}>
                            {isPro && <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>}
                            <span className="text-xs font-medium uppercase tracking-wide">
                                {isPro ? "Pro Plan Selected" : "Core Plan Selected"}
                            </span>
                        </div>
                        <h2 className="text-2xl font-semibold text-[var(--text)]">Create your account</h2>
                        <p className="text-sm text-[var(--muted)] mt-2">
                            {isPro ? "Set up your credentials to continue to secure checkout." : "Secure your free workspace today."}
                        </p>
                    </div>

                    <form className="space-y-6" onSubmit={handleRegister}>
                        <div className="space-y-5">
                            {/* Essential Fields */}
                            <div className="space-y-4">
                                <div>
                                    <input
                                        type="email"
                                        required
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--text)] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                        placeholder="Email address (Required)"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                                <div className="relative">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        required
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-4 pr-12 py-3 text-[var(--text)] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                        placeholder="Password (Required)"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228l-.903-.903M21 21l-1.5-1.5M15.5 15.5l-3.03-3.03M12 12A2.5 2.5 0 109.5 9.5M8.5 8.5l-2.273-2.273M15.5 15.5L12 12m0 0l-3.03 3.03m6.06-6.06l3.03-3.03M21 21L3 3" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        )}
                                    </button>
                                </div>
                                <div className="relative">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        required
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg pl-4 pr-12 py-3 text-[var(--text)] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                        placeholder="Confirm Password (Required)"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-[var(--muted)] hover:text-[var(--text)] transition-colors"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228l-.903-.903M21 21l-1.5-1.5M15.5 15.5l-3.03-3.03M12 12A2.5 2.5 0 109.5 9.5M8.5 8.5l-2.273-2.273M15.5 15.5L12 12m0 0l-3.03 3.03m6.06-6.06l3.03-3.03M21 21L3 3" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        )}
                                    </button>
                                </div>
                                <div>
                                    <input
                                        type="text"
                                        required
                                        className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--text)] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                        placeholder="Business Name (Required)"
                                        value={businessName}
                                        onChange={(e) => setBusinessName(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Optional Fields Container */}
                            <div className="pt-4 border-t border-[var(--border)]">
                                <p className="text-xs font-medium text-[var(--muted)] mb-3 uppercase tracking-wider">Optional Profile Details</p>
                                <div className="space-y-4">
                                    <div>
                                        <input
                                            type="text"
                                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-lg px-4 py-3 text-[var(--text)] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                            placeholder="Full Name (Optional)"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>

                        </div>

                        {error && <div className="text-red-500 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</div>}

                        <button
                            type="submit"
                            className="w-full mt-6 h-12 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-all duration-200 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30"
                        >
                            {isPro ? "Continue to Checkout" : "Create Account"}
                        </button>
                    </form>

                    <p className="text-sm text-[var(--muted)] mt-8 text-center">
                        Already have an account?{' '}
                        <a href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                            Sign in
                        </a>
                    </p>
                </>
            )}
        </div>
    );
}

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 relative overflow-hidden">
            {/* Animated Canvas Layer */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <FintechBackground isDashboard={false} />
            </div>

            {/* Background Glow Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none z-0" />

            <Suspense fallback={
                <div className="w-full max-w-md bg-gradient-to-br from-[#111827] to-[#0F172A] border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/20 relative z-10 my-12 min-h-[400px] flex items-center justify-center">
                    <div className="animate-spin h-8 w-8 text-indigo-500 border-2 border-current border-t-transparent rounded-full" />
                </div>
            }>
                <RegisterForm />
            </Suspense>
        </div>
    );
}
