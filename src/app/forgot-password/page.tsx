"use client";

import Link from 'next/link';
import FintechBackground from '@/components/ui/FintechBackground';

export default function ForgotPasswordPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] px-4 relative overflow-hidden">
            {/* Animated Canvas Layer */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <FintechBackground isDashboard={false} />
            </div>

            {/* Background Glow Overlay */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_70%)] pointer-events-none z-0" />

            <div className="w-full max-w-md bg-gradient-to-br from-[#111827] to-[#0F172A] border border-[var(--border)] rounded-2xl p-8 shadow-xl shadow-black/20 relative z-10 text-center">

                <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                </div>

                <h2 className="text-2xl font-semibold text-[var(--text)] mb-2">Password Reset</h2>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-5 mb-8 text-left shadow-inner">
                    <p className="text-[15px] text-[var(--muted)] leading-relaxed">
                        For security purposes, automated email password resets are disabled on this workspace.
                    </p>
                    <p className="text-[15px] text-[var(--muted)] leading-relaxed mt-4">
                        If you have forgotten your password and cannot log in, please contact your workspace <strong>Administrator</strong> or reach out to <a href="mailto:support@tektriq.com" className="text-indigo-400 hover:text-indigo-300 transition-colors">support@tektriq.com</a> to have a new temporary password securely generated for you.
                    </p>
                </div>

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
