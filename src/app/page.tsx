import Link from 'next/link';
import Image from 'next/image';

export default function LandingPage() {
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
