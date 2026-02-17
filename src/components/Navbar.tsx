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
        <nav className="bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
                <div className="flex justify-between h-14 sm:h-16 items-center">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 flex items-center">
                            <Link href={isAuthenticated ? "/dashboard" : "/"} className="relative flex items-center h-10 sm:h-12">
                                <Image
                                    src="/logo-v2.png"
                                    alt="Receipt Hub logo"
                                    width={0}
                                    height={0}
                                    sizes="(max-width: 640px) 150px, 200px"
                                    className="h-full w-auto object-contain"
                                    priority
                                    style={{ width: 'auto', height: '100%' }}
                                />
                            </Link>
                        </div>
                        <div className="hidden sm:ml-10 sm:flex sm:space-x-8">
                            {links.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={clsx(
                                        'inline-flex items-center px-1 pt-1 text-sm font-medium transition-colors duration-200',
                                        pathname === link.href
                                            ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)]'
                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                                    )}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                    {isAuthenticated && (
                        <div className="hidden sm:flex sm:items-center sm:ml-6">
                            <button
                                onClick={handleLogout}
                                className="text-red-500 hover:text-red-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {/* Mobile menu */}
            <div className="sm:hidden flex flex-wrap justify-around border-t border-[var(--border-subtle)] py-2 bg-[var(--bg-surface)]">
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={clsx(
                            'text-xs font-medium px-2 py-1',
                            pathname === link.href ? 'text-[var(--accent-primary)]' : 'text-[var(--text-secondary)]'
                        )}
                    >
                        {link.label}
                    </Link>
                ))}
                {isAuthenticated && (
                    <button
                        onClick={handleLogout}
                        className="text-xs font-medium px-2 py-1 text-red-500 hover:text-red-400"
                    >
                        Logout
                    </button>
                )}
            </div>
        </nav>
    );
}
