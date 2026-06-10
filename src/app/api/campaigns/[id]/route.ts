import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { id } = await params;

        const campaign = await db.customerEmailCampaign.findUnique({
            where: { id },
            include: {
                recipients: true
            }
        });

        if (!campaign) {
            return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
        }

        if (campaign.ownerId !== user.id) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        return NextResponse.json(campaign, { status: 200 });
    } catch (error) {
        console.error('Fetch campaign error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
