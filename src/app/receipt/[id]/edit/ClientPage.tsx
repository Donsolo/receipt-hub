'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import ReceiptForm from "@/app/create/ReceiptForm";

export default function EditReceiptPage() {
    const params = useParams<{ id: string }>();
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        if (!params.id) return;
        // TODO Phase 4: replace with fetch(`${API_BASE_URL}/api/...`)
        fetch(`/api/PLACEHOLDER/${params.id}`)
            .then(r => r.json())
            .then(setData)
            .catch(err => console.error(err));
    }, [params.id]);

    if (!data) return <div className="p-8 text-[var(--muted)]">Loading...</div>;

    // // TODO: server logic moved to /api route in Phase 4
    return (
        <div className="max-w-3xl mx-auto">
            <div className="md:flex md:items-center md:justify-between mb-6">
                <div className="flex-1 min-w-0">
                    <h2 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:truncate">
                        Edit Receipt
                    </h2>
                </div>
            </div>

            <ReceiptForm initialData={data.initialData} user={data.user} />
        </div>
    );
}
