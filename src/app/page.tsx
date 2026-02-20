import Link from 'next/link';
import Image from 'next/image';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function LandingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      redirect('/dashboard');
    }
  }

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col font-sans text-gray-100">
      {/* Main Content Area */}
      <main className="flex-grow flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">

        {/* Hero Glow Effect */}
        <div className="absolute inset-0 flex justify-center overflow-hidden pointer-events-none">
          <div className="w-[800px] h-[800px] bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.15),transparent_60%)] blur-3xl" />
        </div>

        {/* Hero Section */}
        <div className="text-center z-10 max-w-4xl mx-auto py-20 relative">

          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-white mb-6">
            Professional Receipts. <span className="block bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">Secure Storage.</span>
          </h1>

          <p className="text-lg text-gray-400 mt-4 max-w-xl mx-auto mb-10 leading-relaxed">
            Generate clean PDF receipts or securely upload and store receipt images with enterprise-grade reliability.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-6">
            <Link
              href="/login"
              className="inline-flex items-center justify-center px-8 py-3 h-12 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/20 transition-colors w-full sm:w-auto"
            >
              Login
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-8 py-3 h-12 rounded-lg bg-transparent border border-[#2D3748] text-gray-200 hover:bg-[#1F2937] font-medium transition-colors w-full sm:w-auto"
            >
              Register
            </Link>
          </div>
        </div>

        {/* Feature Strip Section */}
        <div className="relative w-full max-w-4xl mx-auto mt-10">

          {/* Background Glow */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.08),transparent_70%)] pointer-events-none" />

          <div className="grid md:grid-cols-2 gap-6 relative z-10">
            {/* Feature 1: PDF Generation */}
            <div className="relative bg-gradient-to-br from-[#111827] to-[#0F172A] border border-[#1F2937] rounded-2xl p-6 transition-all duration-300 hover:border-indigo-500/40 hover:-translate-y-1 flex items-start gap-4 group">
              <div className="shrink-0 h-12 w-12 flex items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-400 shadow-inner group-hover:text-indigo-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                  <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3 3 0 0016.5 9.75h-3a3 3 0 01-3-3v-3a3 3 0 00-3-3H5.625zM12 3v3.75a.75.75 0 00.75.75H16.5a.75.75 0 00.52-1.29l-3.48-3.47A.75.75 0 0012 3zm4.5 12a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h7.5a.75.75 0 00.75-.75zm0 3.75a.75.75 0 00-.75-.75h-7.5a.75.75 0 000 1.5h7.5a.75.75 0 00.75-.75z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Instant PDF Generation</h3>
                <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                  Create professional, formatted receipts instantly using the built-in generator.
                </p>
              </div>
            </div>

            {/* Feature 2: Secure Storage */}
            <div className="relative bg-gradient-to-br from-[#111827] to-[#0F172A] border border-[#1F2937] rounded-2xl p-6 transition-all duration-300 hover:border-indigo-500/40 hover:-translate-y-1 flex items-start gap-4 group">
              <div className="shrink-0 h-12 w-12 flex items-center justify-center rounded-xl bg-indigo-600/10 text-indigo-400 shadow-inner group-hover:text-indigo-300 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Secure Image Storage</h3>
                <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                  Upload and store receipt images securely with private, user-based access.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tektriq Branding Section */}
        <div className="w-full max-w-2xl mx-auto py-12 text-center opacity-90">
          <div className="border-t border-[#2D3748] w-24 mx-auto mb-6"></div>
          <p className="text-sm text-gray-400 uppercase tracking-wide mb-4">Built and maintained by</p>
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
            <span className="text-lg font-semibold text-gray-300">Tektriq LLC</span>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="bg-[#111827] border-t border-[#2D3748] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">

            {/* Left: Branding */}
            <div className="flex flex-col items-center md:items-start space-y-2">
              <div className="flex items-center gap-2">
                <Image
                  src="/tektriq-logo.png"
                  alt="Tektriq Logo"
                  width={20}
                  height={20}
                  className="h-5 w-auto object-contain opacity-70"
                />
                <span className="text-gray-500 font-medium">Tektriq LLC</span>
              </div>
              <p className="text-xs text-gray-600">
                © 2026 Tektriq LLC. All rights reserved.
              </p>
            </div>

            {/* Center: Links */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <Link href="#" className="hover:text-white transition-colors duration-200">About</Link>
              <Link href="/terms" className="hover:text-white transition-colors duration-200">Terms of Service</Link>
              <Link href="/privacy" className="hover:text-white transition-colors duration-200">Privacy Policy</Link>
              <Link href="#" className="hover:text-white transition-colors duration-200">Contact</Link>
            </div>

            {/* Right: Contact */}
            <div className="text-center md:text-right text-sm text-gray-500">
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
