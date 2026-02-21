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
};

export default function ProfilePage() {
    const router = useRouter();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Form state
    const [businessName, setBusinessName] = useState('');
    const [businessPhone, setBusinessPhone] = useState('');
    const [businessAddress, setBusinessAddress] = useState('');
    const [showBanner, setShowBanner] = useState(true);

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
                const profileRes = await fetch('/api/user/profile');
                if (profileRes.ok) {
                    const data = await profileRes.json();
                    setProfile(data);
                    setBusinessName(data.businessName || '');
                    setBusinessPhone(data.businessPhone || '');
                    setBusinessAddress(data.businessAddress || '');
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
                    businessName: businessName.trim() || null,
                    businessPhone: businessPhone.trim() || null,
                    businessAddress: businessAddress.trim() || null,
                })
            });

            if (res.ok) {
                const updated = await res.json();
                setProfile(prev => prev ? {
                    ...prev,
                    businessName: updated.businessName,
                    businessPhone: updated.businessPhone,
                    businessAddress: updated.businessAddress
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

    return (
        <div className="min-h-screen bg-[#0B1220] p-4 sm:p-8 relative">

            {/* Toast Notification */}
            {toastMessage && (
                <div className="fixed top-4 right-4 bg-gray-800 text-gray-100 px-4 py-2 rounded shadow-lg border border-gray-700 z-50 animate-fade-in">
                    {toastMessage}
                </div>
            )}

            <div className="max-w-3xl mx-auto space-y-8">

                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-100">Profile Settings</h1>
                </div>

                {needsBusinessName && showBanner && (
                    <div className="bg-indigo-900/30 border border-indigo-800/50 rounded-lg p-4 flex justify-between items-start">
                        <div>
                            <h3 className="text-sm font-medium text-indigo-300">Action Recommended</h3>
                            <p className="mt-1 text-sm text-indigo-200/70">
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

                {/* Account Info (Read Only) */}
                <section className="bg-[#111827] border border-[#2D3748] rounded-lg shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-[#2D3748] bg-[#1F2937]/50">
                        <h2 className="text-lg font-medium text-gray-100">Account Information</h2>
                        <p className="text-sm text-gray-400 mt-1">Read-only system account details.</p>
                    </div>
                    <div className="px-6 py-5">
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Name</dt>
                                <dd className="mt-1 text-sm text-gray-200">{profile.email.split('@')[0]}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Email address</dt>
                                <dd className="mt-1 text-sm text-gray-200">{profile.email}</dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Current Plan</dt>
                                <dd className="mt-1">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-800 text-gray-300 border border-gray-700">
                                        Free
                                    </span>
                                </dd>
                            </div>
                            <div className="sm:col-span-1">
                                <dt className="text-sm font-medium text-gray-500">Joined Date</dt>
                                <dd className="mt-1 text-sm text-gray-200">
                                    {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </dd>
                            </div>
                        </dl>
                    </div>
                </section>

                {/* Business Information (Editable) */}
                <section className="bg-[#111827] border border-[#2D3748] rounded-lg shadow-sm overflow-hidden">
                    <div className="px-6 py-5 border-b border-[#2D3748] bg-[#1F2937]/50">
                        <h2 className="text-lg font-medium text-gray-100">Business Identity</h2>
                        <p className="text-sm text-gray-400 mt-1">These details will appear on the receipts you generate for your clients.</p>
                    </div>
                    <form onSubmit={handleSave} className="px-6 py-5 space-y-6">

                        <div>
                            <label htmlFor="businessName" className="block text-sm font-medium text-gray-300">
                                Business Name <span className="text-gray-500 font-normal">(appears in receipt header)</span>
                            </label>
                            <div className="mt-1">
                                <input
                                    type="text"
                                    id="businessName"
                                    name="businessName"
                                    value={businessName}
                                    onChange={(e) => setBusinessName(e.target.value)}
                                    className="block w-full rounded-md border border-[#374151] bg-[#1F2937] px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                            <div>
                                <label htmlFor="businessPhone" className="block text-sm font-medium text-gray-300">
                                    Business Phone <span className="text-gray-500 font-normal">(optional)</span>
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="tel"
                                        id="businessPhone"
                                        name="businessPhone"
                                        value={businessPhone}
                                        onChange={(e) => setBusinessPhone(e.target.value)}
                                        className="block w-full rounded-md border border-[#374151] bg-[#1F2937] px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-300">
                                    Business Address <span className="text-gray-500 font-normal">(optional)</span>
                                </label>
                                <div className="mt-1">
                                    <input
                                        type="text"
                                        id="businessAddress"
                                        name="businessAddress"
                                        value={businessAddress}
                                        onChange={(e) => setBusinessAddress(e.target.value)}
                                        className="block w-full rounded-md border border-[#374151] bg-[#1F2937] px-3 py-2 text-gray-100 placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                                        placeholder="123 Main St, City, ST 12345"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <button
                                type="submit"
                                disabled={saving}
                                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-[#0B1220] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </section>
            </div>
        </div>
    );
}
