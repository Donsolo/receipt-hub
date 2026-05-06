import Link from 'next/link';
import FintechBackground from '@/components/ui/FintechBackground';

export default function PricingPage() {
    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text)]">
            <div className="absolute inset-0 z-0 pointer-events-none">
                <FintechBackground isDashboard={false} />
            </div>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-[radial-gradient(circle_at_top_center,rgba(99,102,241,0.1),transparent_60%)] blur-[120px] -z-10 pointer-events-none" />

            {/* Header */}
            <header className="relative z-10 pt-16 pb-8 text-center px-4">
                <Link href="/" className="inline-flex items-center text-indigo-400 hover:text-indigo-300 transition-colors font-medium mb-8">
                    <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                    Back to Home
                </Link>
                <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight mb-4">
                    Simple, transparent pricing.
                </h1>
                <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto">
                    Choose the plan that's right for your business. Whether you are just starting out or handling massive volumes of receipts.
                </p>
            </header>

            {/* Main Content */}
            <main className="flex-grow relative z-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full pb-24">
                
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 mt-8 items-start">
                    
                    {/* Core Plan */}
                    <div className="bg-[var(--card)]/90 backdrop-blur-xl border border-[var(--border)] rounded-3xl p-8 lg:p-12 shadow-2xl relative">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-white mb-2">Core Founder</h2>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-5xl font-extrabold text-white">Free</span>
                            </div>
                            <p className="text-[var(--muted)]">Everything you need to securely generate and store receipts natively in the cloud.</p>
                        </div>

                        <Link
                            href="/register?plan=core"
                            className="w-full inline-flex justify-center items-center h-14 rounded-xl bg-[var(--border)] hover:bg-slate-700 text-white font-semibold text-lg transition-colors duration-200 mb-8"
                        >
                            Select Core
                        </Link>

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-6">Core Features Include</h4>
                            
                            {[
                                "Lifetime Core activation",
                                "Standard Receipt Generation",
                                "Basic Cloud Vault Storage",
                                "30-Day Summary Reports",
                                "Client Directory Management",
                                "Audit-Ready PDF Exports"
                            ].map((feature, i) => (
                                <div key={i} className="flex items-start">
                                    <svg className="w-6 h-6 text-indigo-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-[var(--muted)] text-[15px]">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Pro Plan */}
                    <div className="bg-gradient-to-br from-[#111827] to-[#0F172A] border border-indigo-500/30 rounded-3xl p-8 lg:p-12 shadow-[0_0_40px_rgba(79,70,229,0.15)] relative">
                        <div className="absolute top-0 right-8 bg-indigo-500 text-white text-xs font-bold px-4 py-1.5 rounded-b-lg tracking-wider">RECOMMENDED</div>
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-indigo-400 mb-2">Pro Business</h2>
                            <div className="flex items-baseline gap-1 mb-4">
                                <span className="text-5xl font-extrabold text-white">$12.99</span>
                                <span className="text-lg text-[var(--muted)]">/mo</span>
                            </div>
                            <p className="text-[var(--muted)]">Advanced automated tooling and custom branding designed for high-volume operators.</p>
                        </div>

                        <Link
                            href="/register?plan=pro"
                            className="w-full inline-flex justify-center items-center h-14 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-lg transition-colors duration-200 shadow-lg shadow-indigo-600/20 mb-8"
                        >
                            Select Pro
                        </Link>

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-[var(--text)] uppercase tracking-wider mb-6">Everything in Core, plus:</h4>
                            
                            {[
                                "Unlimited Invoice Generation",
                                "Advanced Custom Reports",
                                "Unlimited History Access",
                                "Intelligent Item Memory",
                                "Custom Logo Branding on PDFs",
                                "AI-Powered OCR Scanning",
                                "Priority Customer Support"
                            ].map((feature, i) => (
                                <div key={i} className="flex items-start">
                                    <svg className="w-6 h-6 text-indigo-400 mr-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    <span className="text-white font-medium text-[15px]">{feature}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
