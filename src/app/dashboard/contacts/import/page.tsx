"use client";
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function ImportContactsPage() {
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
    // Preview state
    const [preview, setPreview] = useState<any[]>([]);
    const [mapping, setMapping] = useState<any>(null);
    const [source, setSource] = useState<string>('');
    const [totalRows, setTotalRows] = useState(0);
    const [headers, setHeaders] = useState<string[]>([]);
    
    // Result state
    const [result, setResult] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError('');
            setPreview([]);
            setResult(null);
        }
    };

    const handlePreview = async () => {
        if (!file) return setError('Please select a CSV file first.');
        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch(`${API_BASE_URL}/api/contacts/import/preview`, { headers: { ...((await getAuthHeader()) as any) },
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setPreview(data.preview);
            setMapping(data.mapping);
            setSource(data.source);
            setTotalRows(data.totalRows);
            setHeaders(data.headers);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        if (!file || !mapping) return;
        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('mapping', JSON.stringify(mapping));
        formData.append('source', source);

        try {
            const res = await fetch(`${API_BASE_URL}/api/contacts/import/confirm`, { headers: { ...((await getAuthHeader()) as any) },
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (result) {
        return (
            <div className="max-w-3xl mx-auto p-8 font-sans text-center">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Import Complete</h1>
                <p className="text-gray-500 dark:text-[var(--muted)] mb-8">Your contacts have been successfully processed.</p>
                
                <div className="bg-white dark:bg-[#0b1220] rounded-2xl p-6 ring-1 ring-black/5 dark:ring-white/10 flex justify-around mb-8">
                    <div>
                        <div className="text-2xl font-black text-emerald-600">{result.imported}</div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">New</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-indigo-600">{result.updated}</div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Updated</div>
                    </div>
                    <div>
                        <div className="text-2xl font-black text-gray-400">{result.skipped}</div>
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Skipped</div>
                    </div>
                    {result.failed > 0 && (
                        <div>
                            <div className="text-2xl font-black text-red-500">{result.failed}</div>
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-1">Failed</div>
                        </div>
                    )}
                </div>

                <Link href="/dashboard/contacts" className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-500 transition-colors inline-block">
                    View Contacts
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-8 font-sans">
            <div className="mb-8">
                <Link href="/dashboard/contacts" className="text-sm font-bold text-indigo-600 hover:underline flex items-center gap-1 mb-4">
                    &larr; Back to Contacts
                </Link>
                <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Import Contacts</h1>
                <p className="text-gray-500 dark:text-[var(--muted)] mt-2">Upload a CSV file from Square, Joist, or a generic spreadsheet to import your clients.</p>
            </div>

            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 font-bold rounded-xl border border-red-200 dark:border-red-500/20">
                    {error}
                </div>
            )}

            {!preview.length && (
                <div className="bg-white dark:bg-[#0b1220] rounded-2xl p-8 ring-1 ring-black/5 dark:ring-white/10 text-center">
                    <svg className="w-16 h-16 text-indigo-500 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    
                    <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="px-6 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-900 dark:text-white font-bold rounded-xl transition-colors mb-4"
                    >
                        {file ? file.name : 'Select CSV File'}
                    </button>
                    
                    {file && (
                        <div className="mt-4">
                            <button 
                                onClick={handlePreview}
                                disabled={loading}
                                className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 disabled:opacity-50 transition-all"
                            >
                                {loading ? 'Scanning File...' : 'Scan & Preview Mapping'}
                            </button>
                        </div>
                    )}
                </div>
            )}

            {preview.length > 0 && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-[#0b1220] rounded-2xl p-6 ring-1 ring-black/5 dark:ring-white/10">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">Detected Format: <span className="text-indigo-600 dark:text-indigo-400">{source}</span></h3>
                            <span className="text-sm font-medium text-gray-500">{totalRows} rows found</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-[var(--muted)] mb-6">
                            We detected the following fields. Contacts with the same email or phone number will be updated instead of duplicated. Please review the first few rows below:
                        </p>

                        <div className="overflow-x-auto rounded-xl ring-1 ring-black/5 dark:ring-white/10">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 dark:bg-white/5">
                                    <tr>
                                        <th className="p-3 font-bold">Name</th>
                                        <th className="p-3 font-bold">Email</th>
                                        <th className="p-3 font-bold">Phone</th>
                                        <th className="p-3 font-bold">Company</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                                    {preview.map((row, i) => (
                                        <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.01]">
                                            <td className="p-3">{row.name || '-'}</td>
                                            <td className="p-3 text-gray-500">{row.email || '-'}</td>
                                            <td className="p-3 text-gray-500">{row.phone || '-'}</td>
                                            <td className="p-3 text-gray-500">{row.company || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button 
                            onClick={() => { setPreview([]); setFile(null); }}
                            className="px-6 py-3 font-bold text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirm}
                            disabled={loading}
                            className="px-8 py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-500 disabled:opacity-50 transition-all flex items-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    Importing...
                                </>
                            ) : (
                                'Confirm Import'
                            )}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
