import ClientPage from './ClientPage';

export async function generateStaticParams() {
    return [{ token: 'fallback' }];
}

export default function Page({ params }: { params: any }) {
    return <ClientPage />;
}
