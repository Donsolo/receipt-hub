import QuoteClient from './QuoteClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Review Quote',
    robots: {
        index: false,
        follow: false,
    }
};

export default async function QuotePage(props: { params: Promise<{ token: string }> }) {
    const params = await props.params;
    return <QuoteClient token={params.token} />;
}
