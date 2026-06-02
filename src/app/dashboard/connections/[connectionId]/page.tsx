import ClientPage from './ClientPage';

export async function generateStaticParams() {
    return [{ connectionId: 'fallback' }];
}

export default function Page({ params }: { params: any }) {
    return <ClientPage />;
}
