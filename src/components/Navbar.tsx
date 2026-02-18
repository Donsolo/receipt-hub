"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';

export default function Navbar({ isAuthenticated, role }: { isAuthenticated: boolean; role?: string }) {
    const pathname = usePathname();
    const router = useRouter();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.refresh();
        router.push('/');
    };

    const authLinks = [
        { href: '/dashboard', label: 'Dashboard' },
        { href: '/history', label: 'Receipt History' },
        { href: '/create', label: 'Generator' },
        { href: '/uploads', label: 'Upload' },
    ];

    if (role === 'ADMIN') {
        authLinks.push({ href: '/admin', label: 'Admin' });
    }

    const guestLinks = [
        { href: '/login', label: 'Login' },
        { href: '/register', label: 'Register' },
    ];

    const links = isAuthenticated ? authLinks : guestLinks;

    return (
        <nav className="border-b border-gray-800 bg-[#0B1220] relative z-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link href="/" className="flex-shrink-0 flex items-center">
                            <span className="text-xl font-bold text-gray-100">Receipt Hub</span>
                        </Link>
                    </div>

                    {/* Desktop Menu */}
                    <div className="hidden md:flex items-center space-x-4">
                        {isAuthenticated ? (
                            <>
                                {authLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                                {role === 'ADMIN' || role === 'SUPER_ADMIN' ? (
                                    <Link
                                        href="/admin"
                                        className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                                    >
                                        Admin
                                    </Link>
                                ) : null}
                                <button
                                    onClick={handleLogout}
                                    className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Sign Out
                                </button>
                            </>
                        ) : null}
                    </div>

                    {/* Mobile Menu Button */}
                    <div className="flex items-center md:hidden">
                        {isAuthenticated && (
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
                            >
                                <span className="sr-only">Open main menu</span>
                                {!isMenuOpen ? (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                                    </svg>
                                ) : (
                                    <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Menu Dropdown */}
            {isAuthenticated && isMenuOpen && (
                <div className="md:hidden absolute top-16 left-0 w-full bg-[#0B1220] border-b border-gray-800 shadow-xl">
                    <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                        {authLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setIsMenuOpen(false)}
                                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-800"
                            >
                                {link.label}
                            </Link>
                        ))}
                        {role === 'ADMIN' || role === 'SUPER_ADMIN' ? (
                            <Link
                                href="/admin"
                                onClick={() => setIsMenuOpen(false)}
                                className="text-gray-300 hover:text-white block px-3 py-2 rounded-md text-base font-medium hover:bg-gray-800"
                            >
                                Admin
                            </Link>
                        ) : null}
                        <button
                            onClick={() => {
                                setIsMenuOpen(false);
                                handleLogout();
                            }}
                            className="text-gray-300 hover:text-white block w-full text-left px-3 py-2 rounded-md text-base font-medium hover:bg-gray-800"
                        >
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}
