import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import CampaignDetailClient from './CampaignDetailClient';

export const dynamic = "force-dynamic";

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const authUser = await verifyToken(token || '');

    if (!authUser) redirect('/login');

    const campaign = await db.customerEmailCampaign.findUnique({
        where: { id, ownerId: authUser.userId },
        include: {
            recipients: {
                include: {
                    customerContact: true
                }
            }
        }
    });

    if (!campaign) redirect('/dashboard/campaigns');

    return <CampaignDetailClient campaign={campaign} />;
}
