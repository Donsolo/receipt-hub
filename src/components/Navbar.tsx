"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { clsx } from 'clsx';

export default function Navbar({ isAuthenticated, role }: { isAuthenticated: boolean; role?: string }) {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.refresh(); // Refresh to update server components (layout)
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
        <nav className="border-b border-gray-800 bg-[#0B1220]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex">
                        <Link href="/" className="flex-shrink-0 flex items-center">
                            <span className="text-xl font-bold text-gray-100">Receipt Hub</span>
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        {isAuthenticated ? (
                            <>
                                <Link
                                    href="/dashboard"
                                    className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                                >
                                    Dashboard
                                </Link>
                                {role === 'ADMIN' || role === 'SUPER_ADMIN' ? (
                                    <Link
                                        href="/admin"
                                        className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                                    >
                                        Admin
                                    </Link>
                                ) : null}
                                <form action="/api/auth/logout" method="POST">
                                    <button
                                        type="submit"
                                        className="text-gray-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
                                    >
                                        Sign Out
                                    </button>
                                </form>
                            </>
                        ) : null}
                    </div>
                </div>
            </div>
        </nav>
    );
}
