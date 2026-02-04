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
        <form action={handleSubmit} className="bg-gray-50 shadow-sm border border-gray-200 rounded-xl p-8 space-y-8 max-w-2xl">
            {/* Logo Section */}
            <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Business Logo</label>
                <div className="flex items-center space-x-6">
                    {logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={logo} alt="Business Logo" className="h-24 w-24 object-contain border border-gray-200 rounded-lg bg-white p-2" />
                    ) : (
                        <div className="h-24 w-24 bg-white flex items-center justify-center border border-gray-200 rounded-lg text-gray-300 text-xs uppercase tracking-wide">No Logo</div>
                    )}
                    <div className="flex-1">
                        <input
                            type="file"
                            accept="image/png, image/jpeg, image/webp"
                            onChange={handleLogoUpload}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-gray-900 file:text-white hover:file:bg-gray-800 transition-colors"
                        />
                        <p className="mt-2 text-xs text-gray-400">PNG, JPG, WEBP up to 2MB.</p>
                    </div>
                </div>
            </div>

            {/* Business Name */}
            <div>
                <label htmlFor="businessName" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Business Name <span className="text-red-500">*</span>
                </label>
                <input
                    type="text"
                    name="businessName"
                    id="businessName"
                    required
                    defaultValue={initialData.businessName}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm py-2 px-3 text-gray-900 bg-white"
                />
            </div>

            {/* Address */}
            <div>
                <label htmlFor="businessAddress" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Address
                </label>
                <textarea
                    name="businessAddress"
                    id="businessAddress"
                    rows={3}
                    defaultValue={initialData.businessAddress || ""}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm py-2 px-3 text-gray-900 bg-white"
                />
            </div>

            {/* Phone */}
            <div>
                <label htmlFor="businessPhone" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Phone
                </label>
                <input
                    type="text"
                    name="businessPhone"
                    id="businessPhone"
                    defaultValue={initialData.businessPhone || ""}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm py-2 px-3 text-gray-900 bg-white"
                />
            </div>

            {/* Email */}
            <div>
                <label htmlFor="businessEmail" className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Email
                </label>
                <input
                    type="email"
                    name="businessEmail"
                    id="businessEmail"
                    defaultValue={initialData.businessEmail || ""}
                    className="block w-full border-gray-300 rounded-md shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm py-2 px-3 text-gray-900 bg-white"
                />
            </div>

            {/* Submit */}
            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
                <button
                    type="submit"
                    disabled={loading}
                    className={clsx(
                        "inline-flex justify-center py-2.5 px-6 border border-transparent shadow-sm text-sm font-semibold rounded-lg text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 transition-colors",
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
