import CustomerPortalViewer from '@/components/invoices/CustomerPortalViewer';

export default async function CustomerPortalPage({
    params,
    searchParams
}: {
    params: Promise<{ token: string }>,
    searchParams: Promise<{ src?: string, rid?: string }>
}) {
    const { token } = await params;
    const { src, rid } = await searchParams;

    return (
        <CustomerPortalViewer 
            token={token} 
            source={src} 
            requestLogId={rid} 
        />
    );
}
