"use client";

import React, { useState } from 'react';

export default function ActivatePage() {
    const [loading, setLoading] = useState(false);

    const handleActivate = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/activate/create-session', { method: 'POST' });
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                alert(data.error || 'Failed to start activation.');
            }
        } catch (error) {
            alert('A network error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4">
            <div className="bg-[#111A2C] border border-white/5 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden relative">
                <div className="p-8 text-center space-y-6">
                    <div className="mx-auto h-16 w-16 bg-indigo-500/10 rounded-full flex items-center justify-center mb-6 border border-indigo-500/20">
                        <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>

                    <div>
                        <h1 className="text-2xl font-bold text-gray-100 mb-2">Activate Your Core Workspace</h1>
                        <p className="text-[15px] text-gray-400 leading-relaxed">
                            Core access requires a one-time activation fee.
                        </p>
                    </div>

                    <div className="pt-4">
                        <button
                            className={`w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-lg shadow-indigo-500/20 transition-all duration-200 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            onClick={handleActivate}
                            disabled={loading}
                        >
                            {loading ? 'Processing...' : 'Activate for $4.99'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
