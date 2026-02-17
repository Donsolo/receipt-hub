"use client";

import Link from 'next/link';

export default function Dashboard() {
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-8">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-3xl font-bold mb-10">Dashboard</h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Create New Receipt */}
                    <Link href="/create" className="block group">
                        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-indigo-500 transition-colors shadow-lg h-full flex flex-col items-center text-center">
                            <div className="h-16 w-16 bg-indigo-900/50 rounded-full flex items-center justify-center mb-6 text-indigo-400 group-hover:text-indigo-300 group-hover:bg-indigo-900/80 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Create Receipt</h2>
                            <p className="text-gray-400 text-sm">Generate a professional PDF receipt using the form generator.</p>
                        </div>
                    </Link>

                    {/* Upload Receipt */}
                    <Link href="/uploads" className="block group">
                        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-teal-500 transition-colors shadow-lg h-full flex flex-col items-center text-center">
                            <div className="h-16 w-16 bg-teal-900/50 rounded-full flex items-center justify-center mb-6 text-teal-400 group-hover:text-teal-300 group-hover:bg-teal-900/80 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Upload Receipt</h2>
                            <p className="text-gray-400 text-sm">Upload a photo or image of an existing receipt.</p>
                        </div>
                    </Link>

                    {/* View History */}
                    <Link href="/history" className="block group">
                        <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 hover:border-blue-500 transition-colors shadow-lg h-full flex flex-col items-center text-center">
                            <div className="h-16 w-16 bg-blue-900/50 rounded-full flex items-center justify-center mb-6 text-blue-400 group-hover:text-blue-300 group-hover:bg-blue-900/80 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-2">Receipt History</h2>
                            <p className="text-gray-400 text-sm">View, manage, and search all your generated and uploaded receipts.</p>
                        </div>
                    </Link>
                </div>
            </div>
        </div>
    );
}
