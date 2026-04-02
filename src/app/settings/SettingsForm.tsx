"use client";

import { useState } from "react";
import { updateBusinessProfile } from "@/lib/actions";
import { clsx } from "clsx";

interface BusinessProfile {
    id: string;
    businessName: string;
    businessAddress: string | null;
    businessPhone: string | null;
    businessEmail: string | null;
    logoPath: string | null;
    businessRegistrationNumber?: string | null;
}

export default function SettingsForm({ initialData }: { initialData: BusinessProfile }) {
    const [loading, setLoading] = useState(false);
    const [logo, setLogo] = useState<string | null>(initialData.logoPath);
    const [message, setMessage] = useState("");

    async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        // Simple size check
        if (file.size > 2 * 1024 * 1024) {
            alert("File too large. Max 2MB.");
            return;
        }

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/upload", {
            method: "POST",
            body: formData,
        });
        const data = await res.json();
        if (data.success) {
            setLogo(data.path);
        } else {
            alert(data.message || "Upload failed");
        }
    }

    async function handleSubmit(formData: FormData) {
        setLoading(true);
        setMessage("");

        const data = {
            businessName: formData.get("businessName") as string,
            businessAddress: formData.get("businessAddress") as string,
            businessPhone: formData.get("businessPhone") as string,
            businessEmail: formData.get("businessEmail") as string,
            businessRegistrationNumber: formData.get("businessRegistrationNumber") as string,
            logoPath: logo || undefined, // from state
        };

        try {
            await updateBusinessProfile(data);
            setMessage("Settings saved successfully!");
        } catch (error) {
            setMessage("Error saving settings.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form action={handleSubmit} className="bg-[var(--card)] shadow-sm border border-[var(--border)] rounded-xl p-8 space-y-8 max-w-2xl">
            {/* Logo Section */}
            <div>
                <label className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">Business Logo</label>
                <div className="flex items-center space-x-6">
                    {logo ? (
                        <div className="relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={logo} alt="Business Logo" className="h-24 w-24 object-contain border border-[var(--border)] rounded-lg bg-[var(--card)] p-2" />
                            <button
                                type="button"
                                onClick={() => setLogo(null)}
                                className="absolute -top-2 -right-2 bg-red-100 text-red-600 rounded-full p-1 shadow-sm hover:bg-red-200 transition-colors"
                                title="Remove Logo"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                    ) : (
                        <div className="h-24 w-24 bg-[var(--card)] flex items-center justify-center border border-[var(--border)] rounded-lg text-[var(--muted)] text-xs uppercase tracking-wide">No Logo</div>
                    )}
                    <div className="flex-1">
                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={handleLogoUpload}
                            className="block w-full text-sm text-[var(--muted)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[var(--bg)] file:text-[var(--text)] hover:file:bg-[var(--card)] transition-colors"
                        />
                        <p className="mt-2 text-xs text-[var(--muted)]">PNG, JPG, WEBP up to 2MB.</p>
                    </div>
                </div>
            </div>

            {/* Business Name */}
            <div>
                <label htmlFor="businessName" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                    Business Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="businessName"
                    id="businessName"
                    required
                    defaultValue={initialData.businessName}
                    className="block w-full border-[var(--border)] rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 text-[var(--text)] bg-[var(--card)]"
                />
            </div>

            {/* Business Registration Number */}
            <div>
                <label htmlFor="businessRegistrationNumber" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                    EIN/Registration Number
                </label>
                <input
                    type="text"
                    name="businessRegistrationNumber"
                    id="businessRegistrationNumber"
                    defaultValue={initialData.businessRegistrationNumber || ""}
                    placeholder="ein, contractor no, etc"
                    className="block w-full border-[var(--border)] rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 text-[var(--text)] bg-[var(--card)]"
                />
            </div>

            {/* Address */}
            <div>
                <label htmlFor="businessAddress" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                    Address
                </label>
                <textarea
                    name="businessAddress"
                    id="businessAddress"
                    rows={3}
                    defaultValue={initialData.businessAddress || ""}
                    className="block w-full border-[var(--border)] rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 text-[var(--text)] bg-[var(--card)]"
                />
            </div>

            {/* Phone */}
            <div>
                <label htmlFor="businessPhone" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                    Phone
                </label>
                <input
                    type="text"
                    name="businessPhone"
                    id="businessPhone"
                    defaultValue={initialData.businessPhone || ""}
                    className="block w-full border-[var(--border)] rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 text-[var(--text)] bg-[var(--card)]"
                />
            </div>

            {/* Email */}
            <div>
                <label htmlFor="businessEmail" className="block text-xs font-semibold text-[var(--muted)] uppercase tracking-wider mb-2">
                    Email
                </label>
                <input
                    type="email"
                    name="businessEmail"
                    id="businessEmail"
                    defaultValue={initialData.businessEmail || ""}
                    className="block w-full border-[var(--border)] rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-2 px-3 text-[var(--text)] bg-[var(--card)]"
                />
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between">
                <button
                    type="submit"
                    disabled={loading}
                    className={clsx(
                        "inline-flex justify-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-[var(--text)] bg-[var(--bg)] hover:bg-[var(--card)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors",
                        loading && "opacity-50 cursor-not-allowed"
                    )}
                >
                    {loading ? "Saving..." : "Save Settings"}
                </button>
                {message && <p className="text-sm font-medium text-green-600">{message}</p>}
            </div>
        </form>
    );
}
