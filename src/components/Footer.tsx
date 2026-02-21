"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Footer() {
    const pathname = usePathname();
    const currentYear = new Date().getFullYear();

    // Hide global footer on landing page since it has its own custom footer
    if (pathname === '/') {
        return null;
    }

    return (
        <footer className="bg-[var(--bg-surface)] border-t border-[var(--border-subtle)] mt-auto">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="md:flex md:items-center md:justify-between">
                    {/* Branding Section */}
                    <div className="flex flex-col space-y-4">
                        <div className="flex items-center space-x-2">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src="/tektriq-logo.png" alt="Tektriq LLC" className="h-5 w-auto object-contain opacity-80 invert" />
                            <span className="text-sm font-semibold text-[var(--text-primary)]">Tektriq LLC</span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">
                            &copy; {currentYear} Tektriq LLC. All rights reserved.
                        </p>
                        <p className="text-xs text-gray-500">
                            Powered by Tektriq LLC
                        </p>
                    </div>

                    {/* Links Section */}
                    <div className="mt-8 md:mt-0 flex flex-col md:flex-row md:items-center md:space-x-8 space-y-4 md:space-y-0">
                        <nav className="flex flex-wrap gap-6">
                            <Link href="/about" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                About
                            </Link>
                            <Link href="/terms" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                Terms of Service
                            </Link>
                            <Link href="/privacy" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                Privacy Policy
                            </Link>
                            <a href="mailto:support@tektriq.com" className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                                Contact
                            </a>
                        </nav>

                        <div className="hidden md:block w-px h-4 bg-[var(--border-subtle)]"></div>

                        <div className="flex flex-col">
                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Support</span>
                            <a href="mailto:support@tektriq.com" className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors">
                                support@tektriq.com
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
