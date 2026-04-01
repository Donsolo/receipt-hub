"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';
import PageHeaderCard from '@/components/ui/PageHeaderCard';
import HeroSection from '@/components/ui/HeroSection';

type UserProfile = {
    email: string;
    createdAt: string;
    businessName: string | null;
    businessPhone: string | null;
    businessAddress: string | null;
    businessLogoPath: string | null;
    name?: string | null;
    role: string;
    timezone: string;
};

export default function ProfilePage() {
    const router = useRouter();
    const { theme, setTheme } = useTheme();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const handleThemeChange = async (newTheme: 'light' | 'dark' | 'system') => {
        if (newTheme === theme) return;
        setTheme(newTheme);
        try {
            await fetch('/api/user/theme', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ theme: newTheme })
            });
        } catch (error) {
            console.error('Failed to save theme setting');
        }
    };

    // Form state
    const [name, setName] = useState('');
    const [businessName, setBusinessName] = useState('');
    const [businessPhone, setBusinessPhone] = useState('');
    const [businessAddress, setBusinessAddress] = useState('');
    const [businessLogoPath, setBusinessLogoPath] = useState<string | null>(null);
    const [role, setRole] = useState<string>('USER');
    const [timezone, setTimezone] = useState('America/New_York');
    const [showBanner, setShowBanner] = useState(true);

    // Notification Preferences
    const [notifyConnectionRequests, setNotifyConnectionRequests] = useState(true);
    const [notifyConnectionAccepted, setNotifyConnectionAccepted] = useState(true);
    const [notifyMessages, setNotifyMessages] = useState(true);
    const [notifySystem, setNotifySystem] = useState(true);

    // Password Security State
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [savingPassword, setSavingPassword] = useState(false);

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
                    setTimezone(data.timezone || 'America/New_York');

                    // Fetch notification preferences directly after profile works
                    try {
                        const notifRes = await fetch('/api/user/notification-preferences');
                        if (notifRes.ok) {
                            const notifData = await notifRes.json();
                            setNotifyConnectionRequests(notifData.notifyConnectionRequests ?? true);
                            setNotifyConnectionAccepted(notifData.notifyConnectionAccepted ?? true);
                            setNotifyMessages(notifData.notifyMessages ?? true);
                            setNotifySystem(notifData.notifySystem ?? true);
                        }
                    } catch (notifErr) {
                        console.error('Failed to fetch notification preferences', notifErr);
                    }

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
                    timezone: timezone,
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
                    timezone: updated.timezone || 'America/New_York',
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

    const handleNotificationToggle = async (key: string, currentValue: boolean) => {
        const newValue = !currentValue;

        // Optimistic update
        if (key === 'notifyConnectionRequests') setNotifyConnectionRequests(newValue);
        if (key === 'notifyConnectionAccepted') setNotifyConnectionAccepted(newValue);
        if (key === 'notifyMessages') setNotifyMessages(newValue);
        if (key === 'notifySystem') setNotifySystem(newValue);

        try {
            await fetch('/api/user/notification-preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [key]: newValue })
            });
        } catch (err) {
            console.error('Failed to update notification preference:', err);
            // Revert on error
            if (key === 'notifyConnectionRequests') setNotifyConnectionRequests(currentValue);
            if (key === 'notifyConnectionAccepted') setNotifyConnectionAccepted(currentValue);
            if (key === 'notifyMessages') setNotifyMessages(currentValue);
            if (key === 'notifySystem') setNotifySystem(currentValue);

            setToastMessage('Failed to update notification setting');
            setTimeout(() => setToastMessage(null), 3000);
        }
    };

    if (loading) return <div className="p-8 text-[var(--muted)] min-h-screen bg-[var(--bg)]">Loading profile...</div>;
    if (!profile) return <div className="p-8 text-red-500 min-h-screen bg-[var(--bg)]">Profile not found.</div>;

    const needsBusinessName = !profile.businessName;

    const isDirty = name !== (profile.name || '') ||
        businessName !== (profile.businessName || '') ||
        businessPhone !== (profile.businessPhone || '') ||
        businessAddress !== (profile.businessAddress || '') ||
        businessLogoPath !== profile.businessLogoPath ||
        timezone !== (profile.timezone || 'America/New_York');

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text)] relative">
            <HeroSection pageKey="profile" />

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-4 right-4 bg-[var(--card)] text-[var(--text)] px-4 py-2 rounded shadow-lg border border-[var(--border)] z-50 animate-fade-in">
                    {toastMessage}
                </div>
            )}

            <div className="flex-1 w-full flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8">
                <div className="w-full max-w-6xl space-y-6 relative">
                    <PageHeaderCard title="Profile Settings" description="Manage your verified business identity and notification preferences." />

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

                        {/* LEFT COLUMN (40%): Settings & Account Info */}
                        <div className="lg:col-span-2 space-y-6">

                            {/* ACCOUNT INFORMATION */}
                            <section className="bg-white dark:bg-[var(--bg)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-sm p-6 sm:p-8">
                                <div className="mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--text)]">Account Information</h2>
                                    <p className="text-sm text-[var(--muted)] mt-1">System read-only details.</p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex flex-col border-b border-gray-200 dark:border-[var(--border)] pb-3">
                                        <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Email Address</span>
                                        <span className="text-[15px] font-medium text-gray-900 dark:text-[var(--text)]">{profile.email}</span>
                                    </div>
                                    <div className="flex flex-col border-b border-gray-200 dark:border-[var(--border)] pb-3">
                                        <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Current Plan</span>
                                        <div className="flex items-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 dark:bg-[var(--card-hover)] text-gray-700 dark:text-[var(--text)] border border-gray-200 dark:border-[var(--border)]">
                                                Core (Early Access)
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col pt-1">
                                        <span className="text-xs font-medium text-[var(--muted)] uppercase tracking-wider mb-1">Joined Date</span>
                                        <span className="text-[15px] font-medium text-gray-900 dark:text-[var(--text)]">
                                            {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* RIGHT COLUMN (60%): Business Identity */}
                        <div className="lg:col-span-3">
                            <section className="bg-[var(--bg)] border border-[var(--border)] border-l-4 border-l-indigo-500/30 rounded-xl shadow-xl shadow-black/20 flex flex-col h-full relative overflow-hidden">
                                <div className="px-6 sm:px-8 pt-6 pb-5 border-b border-[var(--border)] flex items-center justify-between">
                                    <div>
                                        <h2 className="text-xl font-semibold text-[var(--text)] flex items-center gap-3">
                                            Business Identity
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium bg-indigo-500/5 text-indigo-300 border border-transparent align-middle">
                                                Used on receipts
                                            </span>
                                        </h2>
                                    </div>
                                </div>

                                <form onSubmit={handleSave} className="flex flex-col flex-1">
                                    <div className="px-6 sm:px-8 py-6 space-y-6 flex-1">

                                        {/* 1. Business Logo (Pro Feature) */}
                                        {((profile.plan === 'PRO' && profile.planStatus !== 'inactive') || role === 'ADMIN' || role === 'SUPER_ADMIN') && (
                                            <div>
                                                <label className="block text-sm font-medium text-[var(--text)] mb-2">
                                                    Business Logo <span className="inline-flex items-center ml-1.5 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">Pro</span>
                                                </label>
                                                <p className="text-xs text-indigo-300/80 mb-3">Upload your corporate logo to seamlessly brand all generated PDFs.</p>
                                                <div className="flex items-center space-x-6">
                                                    {businessLogoPath ? (
                                                        <div className="relative group">
                                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                                            <img src={businessLogoPath} alt="Business Logo" className="h-20 w-20 object-contain border border-[var(--border)] rounded-lg bg-[var(--card)] p-2" />
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
                                                        <div className="h-20 w-20 bg-[var(--card)] flex items-center justify-center border border-[var(--border)] rounded-lg text-[var(--muted)] text-[10px] font-bold uppercase tracking-wide">No Logo</div>
                                                    )}
                                                    <div className="flex-1">
                                                        <input
                                                            type="file"
                                                            accept="image/png, image/jpeg, image/webp"
                                                            onChange={handleLogoUpload}
                                                            className="block w-full text-sm text-[var(--muted)] file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-600 file:text-[var(--text)] hover:file:bg-indigo-500 transition-colors cursor-pointer"
                                                        />
                                                        <p className="mt-2 text-xs text-[var(--muted)]">PNG, JPG, WEBP up to 2MB.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* 2. Business Name (Primary) */}
                                        <div>
                                            <label htmlFor="businessName" className="block text-sm font-medium text-[var(--text)]">
                                                Business Name
                                            </label>
                                            <p className="text-xs text-indigo-300/80 mb-2">Displayed in receipt header</p>
                                            <input
                                                type="text"
                                                id="businessName"
                                                name="businessName"
                                                value={businessName}
                                                onChange={(e) => setBusinessName(e.target.value)}
                                                className="block w-full rounded-md border border-[var(--border)] shadow-inner bg-[var(--card)] px-4 py-2.5 text-[var(--text)] placeholder-gray-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:bg-[var(--card-hover)] transition-colors text-[15px]"
                                                placeholder="e.g. Acme Corp"
                                            />
                                            <p className="mt-2 text-[12px] text-[var(--muted)]">
                                                Preview text will reflect this name on PDFs.
                                            </p>
                                        </div>

                                        {/* 2. Business Phone */}
                                        <div>
                                            <label htmlFor="businessPhone" className="block text-sm font-medium text-[var(--text)]">
                                                Business Phone <span className="text-[var(--muted)] font-normal ml-1">(optional)</span>
                                            </label>
                                            <div className="mt-1.5">
                                                <input
                                                    type="tel"
                                                    id="businessPhone"
                                                    name="businessPhone"
                                                    value={businessPhone}
                                                    onChange={(e) => setBusinessPhone(e.target.value)}
                                                    className="block w-full rounded-md border border-[var(--border)] shadow-inner bg-[var(--card)] px-4 py-2.5 text-[var(--text)] placeholder-gray-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:bg-[var(--card-hover)] transition-colors text-[15px]"
                                                    placeholder="(555) 123-4567"
                                                />
                                            </div>
                                        </div>

                                        {/* 3. Business Address */}
                                        <div>
                                            <label htmlFor="businessAddress" className="block text-sm font-medium text-[var(--text)]">
                                                Business Address <span className="text-[var(--muted)] font-normal ml-1">(optional)</span>
                                            </label>
                                            <div className="mt-1.5">
                                                <input
                                                    type="text"
                                                    id="businessAddress"
                                                    name="businessAddress"
                                                    value={businessAddress}
                                                    onChange={(e) => setBusinessAddress(e.target.value)}
                                                    className="block w-full rounded-md border border-[var(--border)] shadow-inner bg-[var(--card)] px-4 py-2.5 text-[var(--text)] placeholder-gray-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:bg-[var(--card-hover)] transition-colors text-[15px]"
                                                    placeholder="123 Main St, City, ST 12345"
                                                />
                                            </div>
                                        </div>

                                        {/* 4. Full Name */}
                                        <div className="pt-2">
                                            <label htmlFor="name" className="block text-sm font-medium text-[var(--text)]">
                                                Personal Name <span className="text-[var(--muted)] font-normal ml-1">(optional)</span>
                                            </label>
                                            <div className="mt-1.5">
                                                <input
                                                    type="text"
                                                    id="name"
                                                    name="name"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="block w-full rounded-md border border-[var(--border)] shadow-inner bg-[var(--card)] px-4 py-2.5 text-[var(--text)] placeholder-gray-500 focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 hover:bg-[var(--card-hover)] transition-colors text-[15px]"
                                                    placeholder="e.g. John Doe"
                                                />
                                            </div>
                                        </div>

                                    </div>

                                    {/* ACTION ROW */}
                                    <div className="px-6 sm:px-8 py-5 border-t border-[var(--border)] bg-[var(--bg)] flex items-center justify-between">
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
                                            className="inline-flex items-center px-5 py-2.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-[var(--text)] bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-[var(--bg)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                        >
                                            {saving ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            </section>
                        </div>

                    </div>

                    {/* BOTTOM PREFERENCES GRID */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
                        <div className="space-y-6">
                            {/* APPEARANCE (THEME TOGGLE) */}
                            <section className="bg-white dark:bg-[var(--bg)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-sm p-6 sm:p-8">
                                <div className="mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--text)]">Appearance</h2>
                                    <p className="text-sm text-[var(--muted)] mt-1">Customize the interface theme.</p>
                                </div>

                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-700 dark:text-[var(--text)]">Theme Preference</span>
                                    <div className="flex items-center bg-gray-100 dark:bg-[var(--bg)]/50 border border-gray-200 dark:border-[var(--border)] p-1 rounded-lg">
                                        <button
                                            type="button"
                                            onClick={() => handleThemeChange('system')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${theme === 'system'
                                                ? 'bg-white dark:bg-[var(--card-hover)] text-gray-900 dark:text-[var(--text)] shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                                : 'text-[var(--muted)] hover:text-gray-900 dark:hover:text-[var(--text)]'
                                                }`}
                                        >
                                            System
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleThemeChange('light')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${theme === 'light'
                                                ? 'bg-white dark:bg-[var(--card-hover)] text-gray-900 dark:text-[var(--text)] shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                                : 'text-[var(--muted)] hover:text-gray-900 dark:hover:text-[var(--text)]'
                                                }`}
                                        >
                                            Light
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleThemeChange('dark')}
                                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${theme === 'dark'
                                                ? 'bg-white dark:bg-[var(--card-hover)] text-gray-900 dark:text-[var(--text)] shadow-sm ring-1 ring-black/5 dark:ring-white/10'
                                                : 'text-[var(--muted)] hover:text-gray-900 dark:hover:text-[var(--text)]'
                                                }`}
                                        >
                                            Dark
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* TIMEZONE PREFERENCE */}
                            <section className="bg-white dark:bg-[var(--bg)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-sm p-6 sm:p-8">
                                <div className="mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--text)]">Timezone</h2>
                                    <p className="text-sm text-[var(--muted)] mt-1">Set your local timezone for greetings and metrics.</p>
                                </div>

                                <div>
                                    <select
                                        value={timezone}
                                        onChange={(e) => setTimezone(e.target.value)}
                                        className="block w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--text)] focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                                    >
                                        <option value="America/New_York">Eastern Time (EST/EDT) - Detroit/NY</option>
                                        <option value="America/Chicago">Central Time (CST/CDT) - Chicago</option>
                                        <option value="America/Denver">Mountain Time (MST/MDT) - Denver</option>
                                        <option value="America/Los_Angeles">Pacific Time (PST/PDT) - LA</option>
                                        <option value="America/Anchorage">Alaska Time (AKST/AKDT) - Anchorage</option>
                                        <option value="Pacific/Honolulu">Hawaii-Aleutian Time (HST) - Honolulu</option>
                                        <option value="UTC">Coordinated Universal Time (UTC)</option>
                                    </select>
                                </div>
                            </section>
                        </div>

                        <div>
                            {/* NOTIFICATIONS */}
                            <section className="bg-white dark:bg-[var(--bg)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-sm p-6 sm:p-8 h-full">
                                <div className="mb-6">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--text)]">Notifications</h2>
                                    <p className="text-sm text-[var(--muted)] mt-1">Manage what alerts you receive.</p>
                                </div>

                                <div className="space-y-5">
                                    <div className="flex items-center justify-between">
                                        <div className="pr-4">
                                            <p className="text-sm font-medium text-gray-900 dark:text-[var(--text)]">Connection Requests</p>
                                            <p className="text-xs text-[var(--muted)] mt-0.5">When someone wants to connect</p>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={notifyConnectionRequests}
                                            onClick={() => handleNotificationToggle('notifyConnectionRequests', notifyConnectionRequests)}
                                            className={`${notifyConnectionRequests ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-[var(--bg)]`}
                                        >
                                            <span className={`${notifyConnectionRequests ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[var(--border)]">
                                        <div className="pr-4">
                                            <p className="text-sm font-medium text-gray-900 dark:text-[var(--text)]">Connections Accepted</p>
                                            <p className="text-xs text-[var(--muted)] mt-0.5">When a request is approved</p>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={notifyConnectionAccepted}
                                            onClick={() => handleNotificationToggle('notifyConnectionAccepted', notifyConnectionAccepted)}
                                            className={`${notifyConnectionAccepted ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-[var(--bg)]`}
                                        >
                                            <span className={`${notifyConnectionAccepted ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[var(--border)]">
                                        <div className="pr-4">
                                            <p className="text-sm font-medium text-gray-900 dark:text-[var(--text)]">Direct Messages</p>
                                            <p className="text-xs text-[var(--muted)] mt-0.5">When you receive a new message</p>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={notifyMessages}
                                            onClick={() => handleNotificationToggle('notifyMessages', notifyMessages)}
                                            className={`${notifyMessages ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-[var(--bg)]`}
                                        >
                                            <span className={`${notifyMessages ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                                        </button>
                                    </div>

                                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-[var(--border)]">
                                        <div className="pr-4">
                                            <p className="text-sm font-medium text-gray-900 dark:text-[var(--text)]">System Alerts</p>
                                            <p className="text-xs text-[var(--muted)] mt-0.5">Status updates & critical alerts</p>
                                        </div>
                                        <button
                                            type="button"
                                            role="switch"
                                            aria-checked={notifySystem}
                                            onClick={() => handleNotificationToggle('notifySystem', notifySystem)}
                                            className={`${notifySystem ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:ring-offset-2 focus:ring-offset-[var(--bg)]`}
                                        >
                                            <span className={`${notifySystem ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
                                        </button>
                                    </div>

                                </div>
                            </section>
                        </div>
                    </div>

                    {/* SECURITY (PASSWORD RESET) */}
                    <div className="mt-8">
                        <section className="bg-white dark:bg-[var(--bg)] border border-gray-200 dark:border-[var(--border)] rounded-xl shadow-sm p-6 sm:p-8">
                            <div className="mb-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-[var(--text)]">Security</h2>
                                <p className="text-sm text-[var(--muted)] mt-1">Update your password to keep your account secure.</p>
                            </div>

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (newPassword !== confirmPassword) {
                                    setToastMessage("New passwords do not match.");
                                    return;
                                }
                                if (newPassword.length < 8) {
                                    setToastMessage("New password must be at least 8 characters.");
                                    return;
                                }
                                setSavingPassword(true);
                                try {
                                    const res = await fetch('/api/auth/password', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ currentPassword, newPassword })
                                    });
                                    const data = await res.json();
                                    if (res.ok) {
                                        setToastMessage('Password updated successfully.');
                                        setCurrentPassword('');
                                        setNewPassword('');
                                        setConfirmPassword('');
                                    } else {
                                        setToastMessage(data.error || 'Failed to update password.');
                                    }
                                } catch (err) {
                                    setToastMessage('An error occurred.');
                                } finally {
                                    setSavingPassword(false);
                                }
                            }} className="max-w-xl space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Current Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={currentPassword}
                                        onChange={(e) => setCurrentPassword(e.target.value)}
                                        className="block w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--text)] focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text)] mb-1.5">New Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="block w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--text)] focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                                        minLength={8}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text)] mb-1.5">Confirm New Password</label>
                                    <input
                                        type="password"
                                        required
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="block w-full rounded-md border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-[var(--text)] focus:border-indigo-500/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                                        minLength={8}
                                    />
                                </div>

                                <div className="pt-2">
                                    <button
                                        type="submit"
                                        disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
                                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                                    >
                                        {savingPassword ? 'Updating...' : 'Update Password'}
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
