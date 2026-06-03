import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
"use client";

import { useState, useRef } from 'react';
import { clsx } from 'clsx';

interface LensUploaderProps {
    sessionId: string;
    onUploadComplete: (image: any) => void;
}

export default function LensUploader({ sessionId, onUploadComplete }: LensUploaderProps) {
    const [uploading, setUploading] = useState(false);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const MAX_WIDTH = 1280;
            const QUALITY = 0.7;
            const reader = new FileReader();

            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;

                    if (width > MAX_WIDTH) {
                        height = (height * MAX_WIDTH) / width;
                        width = MAX_WIDTH;
                    }

                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob(
                        (blob) => {
                            if (blob) resolve(blob);
                            else reject(new Error('Canvas to Blob failed'));
                        },
                        'image/jpeg',
                        QUALITY
                    );
                };
                img.onerror = (err) => reject(err);
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);

        try {
            // Compress
            let compressedBlob = file as any;
            if (file.type.startsWith('image/')) {
                try {
                    compressedBlob = await compressImage(file);
                } catch (err) {
                    console.warn("Compression failed, using original file", err);
                }
            }

            // S3 Upload Proxy
            const formData = new FormData();
            formData.append('file', compressedBlob, file.name || 'mobile_capture.jpg');

            const uploadRes = await fetch(`${API_BASE_URL}/api/upload/s3`, { headers: { ...((await getAuthHeader()) as any) },
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) throw new Error('Proxy Upload failed');
            const { fileUrl } = await uploadRes.json();

            // Save to Session
            const saveRes = await fetch(`${API_BASE_URL}/api/vero/lens/sessions/${sessionId}/images`, {
                method: 'POST',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    imageUrl: fileUrl, 
                    fileSize: compressedBlob.size,
                    fileName: file.name,
                    mimeType: file.type || 'image/jpeg'
                }),
            });
            if (!saveRes.ok) throw new Error('Failed to save image to session');
            const imageData = await saveRes.json();

            onUploadComplete(imageData);

        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Please try again.');
        } finally {
            setUploading(false);
            if (galleryInputRef.current) galleryInputRef.current.value = '';
            if (cameraInputRef.current) cameraInputRef.current.value = '';
        }
    };

    return (
        <div className="flex flex-col sm:flex-row gap-4 w-full">
            <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                ref={cameraInputRef}
                className="hidden"
                id="camera-upload"
                disabled={uploading}
            />

            <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                ref={galleryInputRef}
                className="hidden"
                id="gallery-upload"
                disabled={uploading}
            />

            <button
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploading}
                className={clsx(
                    "flex-1 inline-flex items-center justify-center gap-3 px-6 h-14 rounded-2xl transition-all duration-300 active:scale-[0.98] group relative overflow-hidden",
                    uploading ? "bg-indigo-600/50 cursor-not-allowed shadow-none" : "bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-[0_8px_20px_rgba(99,102,241,0.2)] hover:shadow-[0_12px_30px_rgba(99,102,241,0.3)] border border-indigo-500/30",
                    "text-white font-bold text-lg tracking-wide"
                )}
            >
                {uploading ? (
                    <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                )}
                {uploading ? "Uploading..." : "Take Photo"}
            </button>

            <button
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploading}
                className={clsx(
                    "flex-1 inline-flex items-center justify-center gap-3 px-6 h-14 rounded-2xl transition-all duration-300 active:scale-[0.98]",
                    uploading ? "bg-[var(--card)] text-[var(--muted)] cursor-not-allowed border-[var(--border)]" : "bg-white/40 dark:bg-white/[0.03] backdrop-blur-md border border-[var(--border)] text-[var(--text)] hover:bg-white/60 dark:hover:bg-white/5 hover:border-indigo-300 dark:hover:border-indigo-700/50 shadow-[0_4px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.05)]",
                    "font-bold text-lg tracking-wide"
                )}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload Gallery
            </button>
        </div>
    );
}
