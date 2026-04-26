import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { getSystemSettings } from "@/lib/settings";

export const metadata: Metadata = {
    title: "Download Android Beta | Verihub",
    description: "Install the latest Verihub release directly to your Android device securely.",
};

export default async function DownloadBetaPage() {
    const settings = await getSystemSettings();
    const downloadUrl = settings.BETA_APK_URL || null;

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans">
            <header className="py-6 px-4 border-b border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <Link href="/" className="font-bold text-xl text-[var(--text)] tracking-tight">Verihub</Link>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">Secure Beta Channel</span>
                </div>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
                
                <div className="flex flex-col items-center text-center mb-16">
                    <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl shadow-xl shadow-emerald-500/20 flex items-center justify-center mb-8 rotate-3 transition-transform hover:rotate-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1h3a2 2 0 012 2v2.174a1.996 1.996 0 00-.586.23l-7 4.666a2 2 0 01-2.022-.058L4.697 12H4a2 2 0 01-2-2V6a2 2 0 012-2h3V3a1 1 0 011-1zm1 5h2a1 1 0 011 1v1l-3 2v-4zm-4 4l-3-2V8a1 1 0 011-1h2v4z" clipRule="evenodd" />
                        </svg>
                    </div>
                    
                    <h1 className="text-4xl sm:text-5xl font-extrabold text-[var(--text)] tracking-tight mb-4">
                        Verihub for Android
                    </h1>
                    <p className="text-lg text-[var(--muted)] max-w-2xl mb-10">
                        Get advanced access to the official Android application before it launches on the Google Play Store. Highly optimized for mobile workflows.
                    </p>

                    {downloadUrl ? (
                        <div className="flex flex-col items-center">
                            <a 
                                href={downloadUrl}
                                className="group relative inline-flex items-center justify-center px-8 py-4 text-base font-bold text-white transition-all duration-200 bg-emerald-600 border border-transparent rounded-full hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] w-full sm:w-auto"
                            >
                                <svg className="w-6 h-6 mr-3 -ml-1 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Download APK Binary
                            </a>
                            <p className="mt-4 text-xs text-[var(--muted)]">Requires Android 8.0+ | Direct encrypted file transfer</p>
                        </div>
                    ) : (
                        <div className="inline-flex items-center justify-center px-8 py-4 text-base font-bold text-gray-500 bg-gray-800/50 border border-gray-700 rounded-full w-full sm:w-auto cursor-not-allowed">
                            Release Currently Unavailable
                        </div>
                    )}
                </div>

                {downloadUrl && (
                    <div className="mt-20">
                        <h2 className="text-2xl font-bold text-[var(--text)] text-center mb-10">Installation Guide</h2>
                        
                        <div className="grid md:grid-cols-3 gap-8">
                            {/* Step 1 */}
                            <div className="relative p-6 bg-[var(--card)] rounded-2xl border border-[var(--border)] isolate overflow-hidden group">
                                <div className="absolute -z-10 -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>
                                <div className="text-5xl font-black text-[var(--border)] mb-4">01</div>
                                <h3 className="text-lg font-bold text-[var(--text)] mb-2">Enable Security</h3>
                                <p className="text-sm text-[var(--muted)]">Open your device <strong className="text-[var(--text)]">Settings &gt; Security</strong> and enable <strong className="text-[var(--text)]">"Install Unknown Apps"</strong> for your web browser (Chrome).</p>
                            </div>

                            {/* Step 2 */}
                            <div className="relative p-6 bg-[var(--card)] rounded-2xl border border-[var(--border)] isolate overflow-hidden group">
                                <div className="absolute -z-10 -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-colors"></div>
                                <div className="text-5xl font-black text-[var(--border)] mb-4">02</div>
                                <h3 className="text-lg font-bold text-[var(--text)] mb-2">Download File</h3>
                                <p className="text-sm text-[var(--muted)]">Tap the download button above. If Android warns you about downloading `.apk` files, tap <strong className="text-[var(--text)]">"Download anyway"</strong>. It is 100% secure.</p>
                            </div>

                            {/* Step 3 */}
                            <div className="relative p-6 bg-[var(--card)] rounded-2xl border border-[var(--border)] isolate overflow-hidden group">
                                <div className="absolute -z-10 -top-10 -right-10 w-32 h-32 bg-fuchsia-500/10 rounded-full blur-2xl group-hover:bg-fuchsia-500/20 transition-colors"></div>
                                <div className="text-5xl font-black text-[var(--border)] mb-4">03</div>
                                <h3 className="text-lg font-bold text-[var(--text)] mb-2">Install & Launch</h3>
                                <p className="text-sm text-[var(--muted)]">Open the downloaded <strong className="text-[var(--text)]">verihub.apk</strong> file from your notifications or Downloads folder and tap <strong className="text-[var(--text)]">Install</strong>.</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
