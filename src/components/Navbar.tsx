"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';

export default function Navbar() {
    const pathname = usePathname();

    const links = [
        { href: '/create', label: 'Create Receipt' },
        { href: '/history', label: 'Receipt History' },
        { href: '/settings', label: 'Business Settings' },
    ];

    return (
        <nav className="bg-white border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 overflow-hidden">
                <div className="flex justify-between h-14 sm:h-16 items-center">
                    <div className="flex items-center">
                        {/* Logo Wrapper: strict fixed height, flex alignment */}
                        <div className="flex-shrink-0 flex items-center">
                            <Link href="/" className="relative flex items-center h-10 sm:h-12">
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
                                        pathname === link.href || (pathname === '/' && link.href === '/create')
                                            ? 'text-gray-900'
                                            : 'text-gray-500 hover:text-gray-900'
                                    )}
                                >
                                    {link.label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            {/* Mobile menu (simple implementation) */}
            <div className="sm:hidden flex justify-around border-t py-2">
                {links.map((link) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={clsx(
                            'text-xs font-medium px-2 py-1',
                            pathname === link.href ? 'text-blue-600' : 'text-gray-500'
                        )}
                    >
                        {link.label}
                    </Link>
                ))}
            </div>
        </nav>
    );
}
