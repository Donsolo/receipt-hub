"use client";

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import HeroSection from '@/components/ui/HeroSection';

const HERO_PAGES = [
    { key: "landing", label: "Landing Home Page" },
    { key: "dashboard", label: "Dashboard Main" },
    { key: "receipts", label: "Receipts" },
    { key: "reports", label: "Reports" },
    { key: "network", label: "Business Network" },
    { key: "feedback", label: "Submit Feedback" },
    { key: "messages", label: "Messages" },
    { key: "profile", label: "Profile" },
    { key: "about", label: "About" }
];

export default function AdminHeroManager() {
    const router = useRouter();
    const [heroes, setHeroes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPage, setSelectedPage] = useState(HERO_PAGES[0].key);

    // Form state for currently selected page
    const [formState, setFormState] = useState({
        imageUrl: '',
        overlayOpacity: 0.55,
        blurStrength: 6,
        title: '',
        subtitle: ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(-1);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchHeroes();
    }, []);

    // Sync form state when selected page or data changes
    useEffect(() => {
        const config = heroes.find(h => h.pageKey === selectedPage);
        if (config) {
            setFormState({
                imageUrl: config.imageUrl || '',
                overlayOpacity: config.overlayOpacity ?? 0.55,
                blurStrength: config.blurStrength ?? 6,
                title: config.title || '',
                subtitle: config.subtitle || ''
            });
        } else {
            setFormState({
                imageUrl: '',
                overlayOpacity: 0.55,
                blurStrength: 6,
                title: '',
                subtitle: ''
            });
        }
    }, [selectedPage, heroes]);

    const fetchHeroes = async () => {
        try {
            const res = await fetch('/api/admin/heroes');
            if (res.ok) {
                const data = await res.json();
                setHeroes(data);
            } else if (res.status === 401) {
                router.push('/login');
            }
        } catch (error) {
            console.error('Failed to fetch hero configs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const res = await fetch(`/api/admin/heroes/${selectedPage}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formState)
            });

            if (res.ok) {
                const updated = await res.json();
                setHeroes(prev => {
                    const exists = prev.find(p => p.pageKey === selectedPage);
                    if (exists) return prev.map(p => p.pageKey === selectedPage ? updated : p);
                    return [...prev, updated];
                });
                alert('Saved successfully.');
            } else {
                alert('Failed to save configuration.');
            }
        } catch (error) {
            alert('A network error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadProgress(0);

        // Simulating progress bar steps
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => (prev < 90 ? prev + 15 : prev));
        }, 200);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/admin/heroes/upload', {
                method: 'POST',
                body: formData
            });

            clearInterval(progressInterval);

            if (res.ok) {
                const data = await res.json();
                setUploadProgress(100);
                setFormState(prev => ({ ...prev, imageUrl: data.url }));
                setTimeout(() => setUploadProgress(-1), 2000);
            } else {
                alert('Upload failed.');
                setUploadProgress(-1);
            }
        } catch (error) {
            clearInterval(progressInterval);
            alert('A network error occurred during upload.');
            setUploadProgress(-1);
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                    <Link href="/admin" className="p-2 hover:bg-[var(--card-hover)] rounded-md transition-colors text-[var(--muted)] hover:text-[var(--text)]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text)]">Global Hero Manager</h1>
                        <p className="text-sm text-[var(--muted)]">Manage dynamic SaaS header banners for all top-level routes.</p>
                    </div>
                </div>

                {loading ? (
                    <div className="bg-[var(--card)] p-12 text-center rounded-xl border border-[var(--border)] animate-pulse">
                        Loading manager...
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                        {/* LEFT COLUMN: Controls */}
                        <div className="lg:col-span-4 space-y-6">

                            {/* Target Page Selector */}
                            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-sm">
                                <label className="block text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wider">Target Page</label>
                                <select
                                    value={selectedPage}
                                    onChange={(e) => setSelectedPage(e.target.value)}
                                    className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2.5 text-sm text-[var(--text)] focus:outline-none focus:border-cyan-500"
                                >
                                    {HERO_PAGES.map(page => (
                                        <option key={page.key} value={page.key}>{page.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Form Configuration */}
                            <form onSubmit={handleSave} className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-6 shadow-sm space-y-6">

                                <div>
                                    <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-cyan-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        Background Image
                                    </h3>

                                    {/* Upload Drop Zone */}
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-[var(--border)] rounded-lg p-6 text-center cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-colors group relative"
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileUpload}
                                            accept="image/png, image/jpeg, image/webp"
                                            className="hidden"
                                        />

                                        {uploadProgress >= 0 ? (
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs text-[var(--muted)] font-mono">
                                                    <span>{uploadProgress === 100 ? '✔ Uploaded successfully' : 'Uploading...'}</span>
                                                    <span>{uploadProgress}%</span>
                                                </div>
                                                <div className="w-full bg-[var(--bg)] rounded-full h-1.5 border border-[var(--border)] overflow-hidden">
                                                    <div className="bg-cyan-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-1">
                                                <div className="flex justify-center text-cyan-400 mb-2">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 opacity-75 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                </div>
                                                <p className="text-sm font-medium text-[var(--text)]">Click to upload image</p>
                                                <p className="text-[11px] text-[var(--muted)]">PNG, JPG, WEBP • Max 2MB</p>
                                            </div>
                                        )}
                                    </div>

                                    {formState.imageUrl && (
                                        <div className="mt-3 text-xs flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-2 rounded">
                                            <span className="truncate pr-2 font-mono">{formState.imageUrl.split('/').pop()}</span>
                                            <button type="button" onClick={() => setFormState(p => ({ ...p, imageUrl: '' }))} className="hover:text-emerald-300">Remove</button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                                    <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        Typography
                                    </h3>
                                    <div>
                                        <label className="block text-xs font-semibold text-[var(--muted)] mb-1 uppercase tracking-wider">Title</label>
                                        <input
                                            type="text"
                                            value={formState.title}
                                            onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-purple-500"
                                            placeholder="Page Title Block"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-[var(--muted)] mb-1 uppercase tracking-wider">Subtitle</label>
                                        <input
                                            type="text"
                                            value={formState.subtitle}
                                            onChange={(e) => setFormState({ ...formState, subtitle: e.target.value })}
                                            className="w-full bg-[var(--bg)] border border-[var(--border)] rounded-md px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:border-purple-500"
                                            placeholder="Optional descriptive subtext..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-[var(--border)]">
                                    <h3 className="text-sm font-semibold text-[var(--text)] mb-3 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                        Visual Effects
                                    </h3>
                                    <div>
                                        <label className="flex justify-between text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wider">
                                            <span>Overlay Opacity</span>
                                            <span className="text-[var(--text)] font-mono">{Math.round(formState.overlayOpacity * 100)}%</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={formState.overlayOpacity}
                                            onChange={(e) => setFormState({ ...formState, overlayOpacity: parseFloat(e.target.value) })}
                                            className="w-full accent-orange-500"
                                        />
                                    </div>
                                    <div className="pt-2">
                                        <label className="flex justify-between text-xs font-semibold text-[var(--muted)] mb-2 uppercase tracking-wider">
                                            <span>Blur Strength</span>
                                            <span className="text-[var(--text)] font-mono">{formState.blurStrength}px</span>
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="20"
                                            step="1"
                                            value={formState.blurStrength}
                                            onChange={(e) => setFormState({ ...formState, blurStrength: parseFloat(e.target.value) })}
                                            className="w-full accent-orange-500"
                                        />
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="w-full bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-semibold py-2.5 rounded-md transition-colors disabled:opacity-50 mt-4 shadow-sm"
                                >
                                    {isSaving ? 'Saving Configuration...' : 'Save Configuration'}
                                </button>
                            </form>
                        </div>

                        {/* RIGHT COLUMN: Live Preview */}
                        <div className="lg:col-span-8 flex flex-col pt-6 lg:pt-0">
                            <h2 className="text-sm font-semibold text-[var(--muted)] mb-3 uppercase tracking-wider flex items-center justify-between">
                                <span>Live Preview</span>
                                <span className="bg-red-500/10 text-red-500 text-[10px] px-2 py-0.5 rounded border border-red-500/20 font-bold tracking-widest">LIVE</span>
                            </h2>
                            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-xl ring-1 ring-white/5 relative h-[500px]">

                                {/* Client-Side Override Hack for Live Preview */}
                                <div className="absolute inset-x-0 top-0">
                                    <MockHeroSection
                                        {...formState}
                                        pageKey={selectedPage}
                                    />
                                </div>

                                {/* Mock Page Content Fill */}
                                <div className="p-8 pt-[320px]">
                                    <div className="h-6 w-1/3 bg-[var(--border)]/50 rounded-md mb-4 animate-pulse"></div>
                                    <div className="h-4 w-2/3 bg-[var(--border)]/30 rounded-md mb-2 animate-pulse"></div>
                                    <div className="h-4 w-3/4 bg-[var(--border)]/30 rounded-md animate-pulse"></div>
                                </div>
                            </div>
                        </div>

                    </div>
                )}
            </div>
        </div>
    );
}

// Client-side render of the HeroSection logic to enable instantaneous form previews without DB roundtrips
function MockHeroSection({ title, subtitle, imageUrl, overlayOpacity, blurStrength, pageKey }: any) {
    const finalOpacity = overlayOpacity ?? 0.55;
    const finalBlur = blurStrength ?? 6;
    const finalTitle = title || `Default ${pageKey} title`;
    const finalSubtitle = subtitle || '';

    if (!imageUrl) {
        return (
            <div className="relative w-full flex flex-col items-center justify-center p-8 border-b border-[var(--border)] bg-[var(--bg)]/50 border-dashed h-[180px] sm:h-[220px] md:h-[260px]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--border)] mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <p className="text-sm font-medium text-[var(--muted)]">No Hero Configured</p>
                <p className="text-xs text-[var(--muted)]/70">Upload an image to activate.</p>
            </div>
        );
    }

    return (
        <div className="relative w-full overflow-hidden h-[180px] sm:h-[220px] md:h-[260px]">
            {/* Background Image */}
            <div
                className="absolute inset-0 w-full h-full bg-cover bg-center"
                style={{
                    backgroundImage: `url('${imageUrl}')`,
                    filter: `blur(${finalBlur}px)`,
                    transform: `scale(${finalBlur > 0 ? 1.05 : 1})`
                }}
            />
            {/* Overlay Gradient */}
            <div
                className="absolute inset-0 w-full h-full"
                style={{ background: `linear-gradient(to bottom, rgba(0,0,0,${finalOpacity - 0.1}), rgba(0,0,0,${finalOpacity + 0.1}))` }}
            />
            {/* Content Container */}
            <div className={`absolute inset-0 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 flex flex-col justify-end items-start text-left`}>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-white mb-1 md:mb-2 max-w-3xl drop-shadow-sm">
                    {finalTitle}
                </h1>
                {finalSubtitle && (
                    <p className="text-sm sm:text-base text-gray-200 max-w-2xl drop-shadow-sm">
                        {finalSubtitle}
                    </p>
                )}
            </div>
        </div>
    );
}
