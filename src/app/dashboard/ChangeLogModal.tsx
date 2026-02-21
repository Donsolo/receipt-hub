"use client";

import { useState } from 'react';

export default function ChangeLogModal({ version }: { version: string }) {
    const [isOpen, setIsOpen] = useState(true);
    const [isLoading, setIsLoading] = useState(false);

    if (!isOpen) return null;

    const handleAcknowledge = async () => {
        setIsLoading(true);
        try {
            await fetch('/api/user/changelog', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ version })
            });
            setIsOpen(false);
        } catch (error) {
            console.error('Failed to update changelog version');
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

            <div className="relative w-full max-w-md bg-[#111A2C] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 border-b border-white/5">
                    <h2 className="text-xl font-semibold text-gray-100">What&apos;s New in Receipt Hub</h2>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    <div>
                        <h3 className="text-sm font-semibold text-gray-200 mb-1">Business Network Messaging</h3>
                        <p className="text-sm text-gray-400">Secure private messaging between connections.</p>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-200 mb-1">Secure Receipt Attachments</h3>
                        <p className="text-sm text-gray-400">Attach existing receipts safely inside conversations.</p>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-200 mb-1">Smart Item Auto-Populate</h3>
                        <p className="text-sm text-gray-400">Frequently used items now appear instantly while typing.</p>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-gray-200 mb-1">Dashboard Enhancements</h3>
                        <p className="text-sm text-gray-400">Improved layout and personalized greeting.</p>
                    </div>
                </div>

                <div className="p-6 border-t border-white/5 bg-[#0F172A]/50">
                    <button
                        onClick={handleAcknowledge}
                        disabled={isLoading}
                        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg shadow-md transition-colors"
                    >
                        {isLoading ? 'Saving...' : 'Got It'}
                    </button>
                </div>
            </div>
        </div>
    );
}
