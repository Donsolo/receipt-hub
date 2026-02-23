"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type UserProfile = {
    email: string;
    createdAt: string;
    businessName: string | null;
    businessPhone: string | null;
    businessAddress: string | null;
    businessLogoPath: string | null;
    name?: string | null;
    role: string;
};

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [businessPhone, setBusinessPhone] = useState('');
    const [businessAddress, setBusinessAddress] = useState('');
    const [businessLogoPath, setBusinessLogoPath] = useState<string | null>(null);
    const [role, setRole] = useState<string>('USER');
    const [showBanner, setShowBanner] = useState(true);

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            setToastMessage('File too large. Max 2MB.');
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                setBusinessLogoPath(data.path);
            } else {
                setToastMessage(data.message || "Upload failed");
            }
        } catch (error) {
            setToastMessage("Failed to upload logo.");
        }
    }

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await fetch('/api/auth/me'); // Using existing route to get core info
                if (!res.ok) {
                    router.push('/login');
                    return;
                }

                // Wait, /api/auth/me only returns { userId, email, role }. 
                // We need the full user object to get joined date and business fields.
                // Creating a specific GET request to /api/user/profile makes more sense, 
                // but let's just make /api/user/profile accept GET.
                // Wait, I only created PATCH. Let me update the route to support GET as well.
                // Try to fetch profile directly
                const profileRes = await fetch('/api/user/profile', { cache: 'no-store' });

                if (profileRes.ok) {
                    // Fetch core auth to securely get role
                    const authData = await res.json();
                    setRole(authData.role);

                    const data = await profileRes.json();
                    setProfile(data);
                    setName(data.name || '');
                    setBusinessName(data.businessName || '');
                    setBusinessPhone(data.businessPhone || '');
                    setBusinessAddress(data.businessAddress || '');
                    setBusinessLogoPath(data.businessLogoPath || null);
                } else if (profileRes.status === 404) {
                    // User exists in cookie but not in database (ghost session due to DB swap)
                    await fetch('/api/auth/logout', { method: 'POST', cache: 'no-store' });
                    router.refresh();
                    router.push('/login');
                } else {
                    router.push('/login');
                }
            } catch (error) {
                console.error('Failed to fetch profile', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [router]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setToastMessage(null);

        try {
            const res = await fetch('/api/user/profile', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim() || null,
                    businessName: businessName.trim() || null,
                    businessPhone: businessPhone.trim() || null,
                    businessAddress: businessAddress.trim() || null,
                    businessLogoPath: businessLogoPath,
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setProfile(prev => prev ? {
                    ...prev,
                    name: updated.name,
                    businessName: updated.businessName,
                    businessPhone: updated.businessPhone,
                    businessAddress: updated.businessAddress,
                    businessLogoPath: updated.businessLogoPath,
                    role: updated.role || role // retain role in UI state
                } : null);

                setToastMessage('Profile updated successfully');
                setTimeout(() => setToastMessage(null), 3000);
            } else {
                setToastMessage('Failed to update profile');
            }
        } catch (error) {
            setToastMessage('An error occurred while saving');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-gray-500 min-h-screen bg-[#0B1220]">Loading profile...</div>;
    if (!profile) return <div className="p-8 text-red-500 min-h-screen bg-[#0B1220]">Profile not found.</div>;

    const needsBusinessName = !profile.businessName;

    // Determine if form is dirty
    const isDirty = name !== (profile.name || '') ||
        businessName !== (profile.businessName || '') ||
        businessPhone !== (profile.businessPhone || '') ||
        businessAddress !== (profile.businessAddress || '') ||
        businessLogoPath !== profile.businessLogoPath;

    return (
        <div className="min-h-screen bg-[#0B1220] p-4 sm:p-8 relative">

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-4 right-4 bg-gray-800 text-gray-100 px-4 py-2 rounded shadow-lg border border-gray-700 z-50 animate-fade-in">
                    {toastMessage}
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-6">

                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-3xl font-bold text-gray-100">Profile Settings</h1>
                </div>

                {needsBusinessName && showBanner && (
                    <div className="bg-indigo-900/40 border border-indigo-500/30 rounded-lg p-4 flex justify-between items-start mb-6">
                        <div>
                            <h3 className="text-sm font-medium text-indigo-300">Action Recommended</h3>
                            <p className="mt-1 text-sm text-indigo-200/80">
                                Add your business name below to display it on all generated receipts automatically.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowBanner(false)}
                            className="text-indigo-400 hover:text-indigo-200 ml-4"
                        >
                            &times;
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

                    {/* LEFT COLUMN (40%): Account Information */}
                    <div className="lg:col-span-2">
                        <section className="bg-[#0F172A] border border-white/5 rounded-xl shadow-sm p-6 sm:p-8">
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-100">Account Information</h2>
                                <p className="text-sm text-gray-500 mt-1">System read-only details.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col border-b border-white/5 pb-3">
                                    <span className="text-xs font-medium text-gray-500/80 uppercase tracking-wider mb-1">Email Address</span>
                                    <span className="text-[15px] font-medium text-gray-200">{profile.email}</span>
                                </div>
                                <div className="flex flex-col border-b border-white/5 pb-3">
                                    <span className="text-xs font-medium text-gray-500/80 uppercase tracking-wider mb-1">Current Plan</span>
                                    <div className="flex items-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-[#1E293B] text-gray-300 border border-white/5">
                                            Core (Early Access)
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-col pt-1">
                                    <span className="text-xs font-medium text-gray-500/80 uppercase tracking-wider mb-1">Joined Date</span>
                                    <span className="text-[15px] font-medium text-gray-200">
                                        {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN (60%): Business Identity */}
                    <div className="lg:col-span-3">
                        <section className="bg-[#0B101D] border border-white/5 border-l-4 border-l-indigo-500/30 rounded-xl shadow-xl shadow-black/20 flex flex-col h-full relative overflow-hidden">
                            <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-white/5 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-100 flex items-center gap-3">
                                        Business Identity
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium bg-indigo-500/5 text-indigo-300 border border-transparent align-middle">
                                            Used on receipts
                                        </span>
                                    </h2>
                                </div>
                            </div>

                            <form onSubmit={handleSave} className="flex flex-col flex-1">
                                <div className="px-6 sm:px-8 py-6 space-y-6 flex-1">

                                    {/* 1. Business Logo (Admins Only) */}
                                    {(role === 'ADMIN' || role === 'SUPER_ADMIN') && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-200 mb-2">
                                                Business Logo <span className="inline-flex items-center ml-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">Pro</span>
                                            </label>
                                            <p className="text-xs text-indigo-300/80 mb-3">Upload your corporate logo to seamlessly brand all generated PDFs.</p>
                                            <div className="flex items-center space-x-6">
                                                {businessLogoPath ? (
                                                    <div className="relative group">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={businessLogoPath} alt="Business Logo" className="h-20 w-20 object-contain border border-[#2D3748] rounded-lg bg-[#111827] p-2" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setBusinessLogoPath(null)}
                                                            className="absolute -top-2 -right-2 bg-red-500/20 text-red-500 rounded-full p-1 shadow-sm hover:bg-red-500/40 transition-colors"
                                                            title="Remove Logo"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="h-20 w-20 bg-[#111827] flex items-center justify-center border border-[#2D3748] rounded-lg text-gray-500 text-[10px] font-bold uppercase tracking-wide">No Logo</div>
                                                )}
                                                <div className="flex-1">
                                                    <input
                                                        type="file"
                                                        accept="image/png, image/jpeg, image/webp"
                                                        onChange={handleLogoUpload}
                                                        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-white hover:file:bg-indigo-500 transition-colors cursor-pointer"
                                                    />
                                                    <p className="mt-2 text-xs text-gray-500">PNG, JPG, WEBP up to 2MB.</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* 2. Business Name (Primary) */}
                                    <div>
                                        <label htmlFor="businessName" className="block text-sm font-medium text-gray-200">
                                            Business Name
                                        </label>
                                        <p className="text-xs text-indigo-300/80 mb-2">Displayed in receipt header</p>
                                        <input
                                            type="text"
                                            id="businessName"
                                            name="businessName"
                                            value={businessName}
                                            onChange={(e) => setBusinessName(e.target.value)}
                                            className="block w-full rounded-md border border-white/10 shadow-inner bg-[#1A2234] px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:bg-[#1E293B] transition-colors text-[15px]"
                                            placeholder="e.g. Acme Corp"
                                        />
                                        <p className="mt-2 text-[12px] text-gray-500">
                                            Preview text will reflect this name on PDFs.
                                        </p>
                                    </div>

                                    {/* 2. Business Phone */}
                                    <div>
                                        <label htmlFor="businessPhone" className="block text-sm font-medium text-gray-300">
                                            Business Phone <span className="text-gray-500 font-normal ml-1">(optional)</span>
                                        </label>
                                        <div className="mt-1.5">
                                            <input
                                                type="tel"
                                                id="businessPhone"
                                                name="businessPhone"
                                                value={businessPhone}
                                                onChange={(e) => setBusinessPhone(e.target.value)}
                                                className="block w-full rounded-md border border-white/10 shadow-inner bg-[#1A2234] px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:bg-[#1E293B] transition-colors text-[15px]"
                                                placeholder="(555) 123-4567"
                                            />
                                        </div>
                                    </div>

                                    {/* 3. Business Address */}
                                    <div>
                                        <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-300">
                                            Business Address <span className="text-gray-500 font-normal ml-1">(optional)</span>
                                        </label>
                                        <div className="mt-1.5">
                                            <input
                                                type="text"
                                                id="businessAddress"
                                                name="businessAddress"
                                                value={businessAddress}
                                                onChange={(e) => setBusinessAddress(e.target.value)}
                                                className="block w-full rounded-md border border-white/10 shadow-inner bg-[#1A2234] px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:bg-[#1E293B] transition-colors text-[15px]"
                                                placeholder="123 Main St, City, ST 12345"
                                            />
                                        </div>
                                    </div>

                                    {/* 4. Full Name */}
                                    <div className="pt-2">
                                        <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                                            Personal Name <span className="text-gray-500 font-normal ml-1">(optional)</span>
                                        </label>
                                        <div className="mt-1.5">
                                            <input
                                                type="text"
                                                id="name"
                                                name="name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="block w-full rounded-md border border-white/10 shadow-inner bg-[#1A2234] px-4 py-2.5 text-gray-100 placeholder-gray-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:bg-[#1E293B] transition-colors text-[15px]"
                                                placeholder="e.g. John Doe"
                                            />
                                        </div>
                                    </div>

                                </div>

                                {/* ACTION ROW */}
                                <div className="px-6 sm:px-8 py-5 border-t border-white/5 bg-[#0F1523] flex items-center justify-between">
                                    <div className="text-sm font-medium">
                                        {isDirty ? (
                                            <span className="text-amber-500/90 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                                Unsaved changes
                                            </span>
                                        ) : (
                                            <span className="text-emerald-400/90 flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                All changes saved
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={saving || !isDirty}
                                        className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-[#0F1523] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>

                </div>
            </div>
        </div>
    );
}
