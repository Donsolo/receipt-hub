"use client";

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';

export default function UploadButton({
    onUploadComplete,
    endpoint = '/api/receipts'
}: {
    onUploadComplete: () => void;
    endpoint?: string;
}) {
    const [uploading, setUploading] = useState(false);
    const galleryInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

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
            // 1. Compress
            const compressedBlob = await compressImage(file);

            // 2. Get Presigned URL
            const presignRes = await fetch('/api/upload/presign', {
                method: 'POST',
            });
            if (!presignRes.ok) throw new Error('Failed to get upload URL');
            const { uploadUrl, fileUrl } = await presignRes.json();

            // 3. Upload to S3
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: compressedBlob,
                headers: {
                    'Content-Type': 'image/jpeg',
                },
            });
            if (!uploadRes.ok) throw new Error('S3 Upload failed');

            // 4. Save to DB
            const saveRes = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageUrl: fileUrl }),
            });
            if (!saveRes.ok) throw new Error('Failed to save receipt');

            // 5. Cleanup & Refresh
            onUploadComplete();
            router.refresh();

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
        <div className="flex gap-3">
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
                accept="image/*,.pdf"
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
                    "inline-flex items-center justify-center gap-2 px-5 h-11 rounded-lg whitespace-nowrap transition-colors",
                    uploading ? "bg-indigo-600/50 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-500",
                    "text-white shadow-sm"
                )}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Snap Photo
            </button>

            <button
                onClick={() => galleryInputRef.current?.click()}
                disabled={uploading}
                className={clsx(
                    "inline-flex items-center justify-center gap-2 px-5 h-11 rounded-lg whitespace-nowrap transition-colors",
                    uploading ? "bg-[#1F2937] text-gray-500 cursor-not-allowed border-[#2D3748]" : "bg-[#1F2937] border border-[#2D3748] text-gray-200 hover:bg-[#243043]",
                    "shadow-sm"
                )}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload File
            </button>
        </div>
    );
}
