import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function LandingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      redirect('/dashboard');
    }
  }

  // Fetch showcase feedback directly from DB
  let showcase: any[] = [];
  try {
    showcase = await db.feedback.findMany({
      where: {
        isShowcased: true,
        type: 'positive'
      },
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            name: true,
            businessName: true,
            isEarlyAccess: true
          }
        }
      }
    });
  } catch (err) {
    console.error("Failed to load showcase feedback", err);
  }

  return (
    <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text)]">
      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">

        {/* Layer 1: Base Background & Layer 2: Radial Glow behind H1 */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050816] via-[#0b1230] to-[#050816] -z-20 pointer-events-none" />

        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[800px] bg-[radial-gradient(circle_at_top_center,rgba(56,189,248,0.12),transparent_60%)] blur-[120px] -z-10 pointer-events-none" />

        {/* Layer 3: Ultra-faint tech grid */}
        <div
          className="absolute inset-0 -z-10 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '64px 64px' }}
        />

        {/* Hero Section */}
        <div className="text-center z-10 max-w-4xl mx-auto pt-24 pb-16 relative">

          <div className="flex flex-col items-center mb-6">
            <Image
              src="/assets/text-logo.png"
              alt="Verihub Logo"
              width={600}
              height={150}
              className="w-[280px] sm:w-[400px] md:w-[550px] h-auto object-contain drop-shadow-md"
              priority
            />
          </div>

          <p className="text-base md:text-lg text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed font-medium">
            Generate, store, and verify receipts with audit-ready precision and secure cloud architecture built for serious operators.
          </p>

          {/* modern enterprise CTAs */}
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center mb-16">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-10 py-3.5 h-[52px] rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-lg shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              Start Free
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-10 py-3.5 h-[52px] rounded-lg bg-transparent border-2 border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-800/50 font-semibold text-lg transition-all w-full sm:w-auto"
            >
              Sign In
            </Link>
          </div>

          {/* Trust Strip elements */}
          <div className="flex flex-wrap justify-center gap-x-8 gap-y-4 text-[13px] font-medium text-slate-500 uppercase tracking-widest border-t border-slate-800/60 pt-8 mt-4">
            <span>Secure Cloud Storage</span>
            <span className="hidden sm:inline">·</span>
            <span>Private Access</span>
            <span className="hidden sm:inline">·</span>
            <span>Audit-Ready PDFs</span>
            <span className="hidden sm:inline">·</span>
            <span>Built by Tektriq LLC</span>
          </div>
        </div>

        {/* Feature Strip Section with Added Depth Element */}
        <div className="relative w-full max-w-5xl mx-auto mt-16 mb-12">

          {/* Background Depth Element - Subtle blurred abstract mock */}
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-3/4 h-[120%] bg-gradient-to-b from-indigo-900/10 to-transparent blur-2xl rounded-3xl -z-10 pointer-events-none" />

          <div className="grid md:grid-cols-2 gap-8 relative z-10">
            {/* Feature 1: PDF Generation Engine */}
            <div className="relative bg-[#0b1121] border border-slate-800/80 rounded-2xl p-8 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_8px_30px_rgba(79,70,229,0.12)] hover:-translate-y-1 flex items-start gap-5 group">
              <div className="shrink-0 h-14 w-14 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 text-indigo-400 shadow-inner group-hover:text-indigo-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3 3 0 0016.5 9.75h-3a3 3 0 01-3-3v-3a3 3 0 00-3-3H5.625zM12 3v3.75a.75.75 0 00.75.75H16.5a.75.75 0 00.52-1.29l-3.48-3.47A.75.75 0 0012 3zm4.5 12a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h7.5a.75.75 0 00.75-.75zm0 3.75a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h7.5a.75.75 0 00.75-.75z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-100 mb-2">High-Fidelity PDF Engine</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  Structured, compliant receipt rendering built for professional workflows.
                </p>
              </div>
            </div>

            {/* Feature 2: Vault */}
            <div className="relative bg-[#0b1121] border border-slate-800/80 rounded-2xl p-8 transition-all duration-300 hover:border-indigo-500/50 hover:shadow-[0_8px_30px_rgba(79,70,229,0.12)] hover:-translate-y-1 flex items-start gap-5 group">
              <div className="shrink-0 h-14 w-14 flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50 text-indigo-400 shadow-inner group-hover:text-indigo-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-semibold text-slate-100 mb-2">Encrypted Asset Vault</h3>
                <p className="text-sm text-slate-400 leading-relaxed font-medium">
                  Private, user-scoped cloud storage with controlled access layers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* What Founders Are Saying Section */}
        {showcase.length > 0 && (
          <div className="w-full max-w-7xl mx-auto py-24 relative z-10 px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 relative">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-indigo-500/20 blur-[100px] rounded-full pointer-events-none" />
              <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight relative z-10">
                Trusted by Early Access Operators
              </h2>
              <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
                Infrastructure relied upon by professionals to run serious businesses with absolute confidence.
              </p>
            </div>

            <div
              className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 pt-4 px-4 -mx-4 relative z-10"
              style={{
                scrollbarWidth: 'none', // Firefox
                msOverflowStyle: 'none', // IE/Edge
              }}
            >
              <style>{`
                /* Hide scrollbar for Chrome, Safari and Opera */
                .flex.overflow-x-auto::-webkit-scrollbar {
                  display: none;
                }
              `}</style>

              {showcase.map((fb: any, i: number) => (
                <div
                  key={fb.id}
                  className="shrink-0 w-[85vw] sm:w-[400px] snap-center group relative bg-[var(--card)]/80 backdrop-blur-xl border border-[var(--border)] rounded-2xl p-8 flex flex-col justify-between overflow-hidden shadow-2xl transition-all duration-300 hover:-translate-y-2 hover:shadow-indigo-500/10 hover:border-indigo-500/30"
                >
                  {/* Subtle Gradient Hover Effect within Card */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex text-indigo-400 mb-6 space-x-1">
                      {[...Array(fb.rating || 5)].map((_, idx) => (
                        <svg key={idx} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]">
                          <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
                        </svg>
                      ))}
                    </div>

                    <p className="text-[var(--text)] text-[15px] leading-relaxed mb-8 relative">
                      <span className="text-5xl text-indigo-500/20 absolute -top-4 -left-3 font-serif leading-none">"</span>
                      <span className="relative z-10">{fb.message}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-4 relative z-10 mt-auto">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px]">
                      <div className="w-full h-full rounded-full bg-[var(--card)] flex items-center justify-center text-indigo-300 font-bold text-lg">
                        {(fb.user.businessName || fb.user.name || 'F').charAt(0).toUpperCase()}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-[15px] font-bold text-[var(--text)] tracking-wide">
                        {fb.user.businessName || fb.user.name || 'Anonymous Founder'}
                      </h4>
                      {fb.user.isEarlyAccess && (
                        <span className="inline-block mt-1 text-[11px] font-semibold tracking-wider uppercase text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                          Early Access
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tektriq Branding Section */}
        <div className="w-full max-w-2xl mx-auto py-12 text-center opacity-90">
          <div className="border-t border-[var(--border)] w-24 mx-auto mb-6"></div>
          <p className="text-sm text-[var(--muted)] uppercase tracking-wide mb-4">Built and maintained by</p>
          <div className="flex items-center justify-center gap-3">
            {/* Using the found logo path */}
            <div className="relative h-8 w-auto">
              <Image
                src="/tektriq-logo.png"
                alt="Tektriq Logo"
                width={32}
                height={32}
                className="h-8 w-auto object-contain"
              />
            </div>
            <span className="text-lg font-semibold text-[var(--text)]">Tektriq LLC</span>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-[var(--card)] border-t border-[var(--border)] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">

            {/* Left: Branding */}
            <div className="flex flex-col items-center md:items-start space-y-2">
              <span className="text-lg font-bold text-[var(--text)]">Verihub</span>
              <p className="text-xs text-[var(--muted)]">
                © {new Date().getFullYear()} Verihub. All rights reserved.<br />
                Powered by Tektriq LLC.
              </p>
            </div>

            {/* Center: Links */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-[var(--muted)]">
              <Link href="#" className="hover:text-[var(--text)] transition-colors duration-200">About</Link>
              <Link href="/terms" className="hover:text-[var(--text)] transition-colors duration-200">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-[var(--text)] transition-colors duration-200">Privacy Policy</Link>
              <Link href="/feedback" className="hover:text-indigo-400 transition-colors duration-200">Submit Feedback</Link>
              <Link href="#" className="hover:text-[var(--text)] transition-colors duration-200">Contact</Link>
            </div>

            {/* Right: Contact */}
            <div className="text-center md:text-right text-sm text-[var(--muted)]">
              <a href="mailto:support@tektriq.com" className="hover:text-indigo-400 transition-colors duration-200">
                support@tektriq.com
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
