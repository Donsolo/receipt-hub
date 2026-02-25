"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FinalizeButton({ receiptId }: { receiptId: string }) {
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const router = useRouter();

    const handleFinalize = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/receipts/${receiptId}/finalize`, {
                method: "POST",
            });
            if (res.ok) {
                // Success toast could go here
                alert("Receipt finalized successfully.");
                setShowModal(false);
                router.refresh();
            } else {
                const data = await res.json();
                alert(`Error: ${data.error || "Failed to finalize receipt."}`);
            }
        } catch (error) {
            console.error(error);
            alert("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-[var(--text)] bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
                Finalize
            </button>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--bg)] bg-opacity-75 p-4 sm:p-8">
                    <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-sm overflow-hidden p-6 relative">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Finalize Receipt?</h3>
                        <p className="text-sm text-[var(--muted)] mb-6">
                            Finalizing will lock this receipt. You will not be able to edit it. Continue?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowModal(false)}
                                disabled={loading}
                                className="px-4 py-2 text-sm font-medium text-[var(--muted)] hover:text-gray-900 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleFinalize}
                                disabled={loading}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-[var(--text)] text-sm font-medium rounded-lg disabled:opacity-50 transition-colors shadow-sm"
                            >
                                {loading ? "Finalizing..." : "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
