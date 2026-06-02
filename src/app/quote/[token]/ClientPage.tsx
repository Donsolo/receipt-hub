'use client';
import { useParams } from 'next/navigation';
import QuoteClient from './QuoteClient';

export default function QuotePage() {
    const params = useParams<{ token: string }>();

    if (!params.token) return <div>Loading...</div>;

    return <QuoteClient token={params.token} />;
}
