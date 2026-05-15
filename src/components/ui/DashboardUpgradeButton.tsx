"use client";

import Link from 'next/link';
import { usePlatform } from '@/lib/platform';

export default function DashboardUpgradeButton() {
    const { isNativeAndroid } = usePlatform();

    if (isNativeAndroid) {
        return null;
    }

    return (
        <Link href="/upgrade" className="inline-flex w-fit items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow hover:shadow-md transition-shadow">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
            </svg>
            Upgrade
        </Link>
    );
}
