import ClientPage from './ClientPage';

export async function generateStaticParams() {
    return [{ token: 'fallback' }];
}

import { Suspense } from 'react';

export default function Page({ params }: { params: any }) {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ClientPage />
        </Suspense>
    );
}
