"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (res.ok) {
            // Auto-login successful, redirect to dashboard
            router.refresh();
            router.push('/dashboard');
        } else {
            setError(data.error || 'Registration failed');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0B1220] px-4 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.1),transparent_70%)] pointer-events-none" />

            <div className="w-full max-w-md bg-gradient-to-br from-[#111827] to-[#0F172A] border border-[#1F2937] rounded-2xl p-8 shadow-xl shadow-black/20 relative z-10">
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-semibold text-white">Create Your Account</h2>
                    <p className="text-sm text-gray-400 mt-2">Create an account to generate and store receipts securely.</p>
                </div>

                <form className="space-y-6" onSubmit={handleRegister}>
                    <div className="space-y-6">
                        <div>
                            <input
                                type="email"
                                required
                                className="w-full bg-[#0F172A] border border-[#2D3748] rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                placeholder="Email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div>
                            <input
                                type="password"
                                required
                                className="w-full bg-[#0F172A] border border-[#2D3748] rounded-lg px-4 py-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                    </div>

                    {error && <div className="text-red-500 text-sm text-center bg-red-500/10 py-2 rounded-lg border border-red-500/20">{error}</div>}

                    <button
                        type="submit"
                        className="w-full mt-6 h-12 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors duration-200 shadow-lg shadow-indigo-600/20"
                    >
                        Register
                    </button>
                </form>

                <p className="text-sm text-gray-400 mt-6 text-center">
                    Already have an account?{' '}
                    <a href="/login" className="text-indigo-400 hover:text-indigo-300 transition-colors">
                        Sign in
                    </a>
                </p>
            </div>
        </div>
    );
}
