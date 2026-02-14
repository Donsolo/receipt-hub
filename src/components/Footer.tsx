import Link from 'next/link';

export default function Footer() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="bg-white border-t border-gray-100 mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="md:flex md:items-center md:justify-between">
                    {/* Branding Section */}
                    <div className="flex flex-col space-y-4">
                        <div className="flex items-center space-x-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/tektriq-logo.png" alt="Tektriq LLC" className="h-5 w-auto object-contain opacity-80" />
                            <span className="text-sm font-semibold text-gray-900">Tektriq LLC</span>
                        </div>
                        <p className="text-xs text-gray-500">
                            &copy; {currentYear} Tektriq LLC. All rights reserved.
                        </p>
                        <p className="text-xs text-gray-400">
                            Powered by Tektriq LLC
                        </p>
                    </div>

                    {/* Links Section */}
                    <div className="mt-8 md:mt-0 flex flex-col md:flex-row md:items-center md:space-x-8 space-y-4 md:space-y-0">
                        <nav className="flex flex-wrap gap-6">
                            <Link href="/about" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                                About
                            </Link>
                            <Link href="/terms" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                                Terms of Service
                            </Link>
                            <Link href="/privacy" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                                Privacy Policy
                            </Link>
                            <a href="mailto:support@tektriq.com" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                                Contact
                            </a>
                        </nav>

                        <div className="hidden md:block w-px h-4 bg-gray-200"></div>

                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Support</span>
                            <a href="mailto:support@tektriq.com" className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
                                support@tektriq.com
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
