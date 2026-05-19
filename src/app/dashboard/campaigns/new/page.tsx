import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import NewCampaignClient from './NewCampaignClient';

export const dynamic = "force-dynamic";

export default async function NewCampaignPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const authUser = await verifyToken(token || '');

    if (!authUser) redirect('/login');

    const owner = await db.user.findUnique({ where: { id: authUser.userId } });
    const isPro = owner?.plan === 'PRO' || owner?.role === 'ADMIN' || owner?.role === 'SUPER_ADMIN';

    if (!isPro) redirect('/dashboard/campaigns');

    const contacts = await db.customerContact.findMany({
        where: { ownerId: authUser.userId },
        include: {
            tags: true,
            invoices: {
                include: {
                    
                    installments: true
                }
            }
        },
        orderBy: { name: 'asc' }
    });

    const tags = await db.customerTag.findMany({
        where: { ownerId: authUser.userId },
        orderBy: { name: 'asc' }
    });

    return <NewCampaignClient contacts={contacts} tags={tags} />;
}
