"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DuplicateButton({ receiptId }: { receiptId: string }) {
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleDuplicate = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/receipts/${receiptId}/duplicate`, {
                method: "POST",
            });
            if (res.ok) {
                const newReceipt = await res.json();
                router.push(`/receipt/${newReceipt.id}/edit`);
            } else {
                const data = await res.json();
                alert(`Error: ${data.error || "Failed to duplicate receipt."}`);
            }
        } catch (error) {
            console.error(error);
            alert("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleDuplicate}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 border border-gray-200 shadow-sm text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
            {loading ? "Duplicating..." : "Duplicate & Edit"}
        </button>
    );
}
