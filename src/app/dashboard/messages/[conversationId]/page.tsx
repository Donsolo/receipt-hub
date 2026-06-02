import ClientPage from './ClientPage';

export async function generateStaticParams() {
    return [{ conversationId: 'fallback' }];
}

export default function Page({ params }: { params: any }) {
    return <ClientPage />;
}
