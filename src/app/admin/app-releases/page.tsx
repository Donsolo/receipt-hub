"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function AppReleasesAdminPage() {
    const [currentApkUrl, setCurrentApkUrl] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Fetch current settings to see if BETA_APK_URL exists
        const fetchSettings = async () => {
            try {
                const res = await fetch('/api/admin/settings');
                if (res.ok) {
                    const data = await res.json();
                    if (data.BETA_APK_URL) {
                        setCurrentApkUrl(data.BETA_APK_URL);
                    }
                }
            } catch (err) {
                console.error("Failed to load settings:", err);
            }
        };
        fetchSettings();
    }, []);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.apk')) {
            setError("Only .apk files are supported.");
            return;
        }

        // APKs can be large, we won't strictly block up to 100MB here because S3 presign limits are generous, 
        // but let's warn if it's over 100MB just in case.
        if (file.size > 100 * 1024 * 1024) {
            setError("File size exceeds 100MB. Please optimize the APK.");
            return;
        }

        setIsUploading(true);
        setError(null);
        setSuccessMessage(null);
        setUploadProgress(0);

        try {
            // 1. Get Presigned URL
            setUploadProgress(10);
            const presignRes = await fetch('/api/admin/upload-apk/presign', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filename: file.name,
                    fileType: 'application/vnd.android.package-archive',
                }),
            });

            if (!presignRes.ok) {
                const errorData = await presignRes.json();
                throw new Error(errorData.error || "Failed to generate secure upload token");
            }

            const { uploadUrl, fileUrl } = await presignRes.json();
            setUploadProgress(30);

            // 2. Upload directly to S3 utilizing XMLHttpRequest to track progress
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', uploadUrl, true);
                xhr.setRequestHeader('Content-Type', 'application/vnd.android.package-archive');

                xhr.upload.onprogress = (event) => {
                    if (event.lengthComputable) {
                        // Progress from 30% to 90%
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        setUploadProgress(30 + Math.floor(percentComplete * 0.6));
                    }
                };

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        reject(new Error(`S3 Upload failed with status ${xhr.status}`));
                    }
                };

                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.send(file);
            });

            setUploadProgress(95);

            // 3. Save URL to Settings
            const setRes = await fetch('/api/admin/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ BETA_APK_URL: fileUrl }),
            });

            if (!setRes.ok) {
                throw new Error("Failed to save the APK URL to system settings.");
            }

            setUploadProgress(100);
            setCurrentApkUrl(fileUrl);
            setSuccessMessage("APK successfully uploaded and published!");

        } catch (err: any) {
            console.error("Upload error:", err);
            setError(err.message || "An unexpected error occurred during upload.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input
            }
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center gap-4">
                    <Link href="/admin" className="p-2 border border-[var(--border)] rounded-md hover:bg-[var(--card)] transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[var(--muted)]" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text)]">App Releases</h1>
                        <p className="text-sm text-[var(--muted)]">Manage and distribute the Beta Android APK.</p>
                    </div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 shadow-sm">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-6">Upload New Beta APK</h2>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-md">
                            <p className="text-sm text-red-400 font-medium">{error}</p>
                        </div>
                    )}

                    {successMessage && (
                        <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-md">
                            <p className="text-sm text-emerald-400 font-medium">{successMessage}</p>
                        </div>
                    )}

                    <div 
                        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
                            isUploading ? 'border-orange-500/50 bg-orange-500/5' : 'border-[var(--border)] hover:border-orange-500/30 hover:bg-orange-500/5'
                        }`}
                    >
                        {isUploading ? (
                            <div className="max-w-xs mx-auto">
                                <div className="mb-3 flex justify-between text-sm">
                                    <span className="text-[var(--text)] font-medium">Uploading Android Package...</span>
                                    <span className="text-orange-400 font-bold">{uploadProgress}%</span>
                                </div>
                                <div className="w-full bg-[var(--bg)] rounded-full h-2 overflow-hidden border border-[var(--border)]">
                                    <div 
                                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${uploadProgress}%` }}
                                    />
                                </div>
                                <p className="text-xs text-[var(--muted)] mt-4">Streaming directly to S3. Do not close this tab.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <div className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                </div>
                                <h3 className="text-base font-semibold text-[var(--text)] mb-2">Select APK File (.apk)</h3>
                                <p className="text-sm text-[var(--muted)] mb-6 max-w-sm">Release a direct download binary to the public landing page. Replaces the previously active build.</p>
                                
                                <input 
                                    type="file" 
                                    accept=".apk"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden" 
                                    id="apk-upload" 
                                />
                                <label 
                                    htmlFor="apk-upload"
                                    className="cursor-pointer bg-orange-600 hover:bg-orange-500 text-white text-sm font-medium px-6 py-2.5 rounded-md transition-colors"
                                >
                                    Browse Files
                                </label>
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-8 shadow-sm">
                    <h2 className="text-lg font-semibold text-[var(--text)] mb-4">Current Active Build</h2>
                    
                    {currentApkUrl ? (
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500/10 rounded-md">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <div className="text-sm font-medium text-[var(--text)]">Live Beta Package Available</div>
                                    <div className="text-xs text-[var(--muted)] flex items-center gap-1 mt-0.5">
                                        Served via AWS S3 Edge Network
                                    </div>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                <a 
                                    href={currentApkUrl} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex-1 sm:flex-none text-center bg-gray-800 hover:bg-gray-700 text-[var(--text)] text-xs font-medium px-4 py-2 rounded transition-colors"
                                >
                                    Test Download
                                </a>
                                <Link 
                                    href="/download-beta" 
                                    target="_blank"
                                    className="flex-1 sm:flex-none text-center bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-xs font-medium px-4 py-2 rounded border border-blue-500/20 transition-colors"
                                >
                                    View Public Page
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-[var(--bg)] border border-[var(--border)] rounded-xl flex items-center gap-3">
                            <div className="p-2 bg-gray-800 rounded-md">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
                                    <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-sm font-medium text-[var(--text)]">No Beta Package Found</div>
                                <div className="text-xs text-[var(--muted)]">Upload an APK above to activate the public download portal.</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
