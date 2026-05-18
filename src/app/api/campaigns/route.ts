import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request) {
    try {
        const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const campaigns = await db.customerEmailCampaign.findMany({
            where: { ownerId: user.userId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ success: true, campaigns }, { status: 200 });
    } catch (error) {
        console.error('Fetch campaigns error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const token = req.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const owner = await db.user.findUnique({ where: { id: user.userId } });
        const isPro = owner?.plan === 'PRO' || owner?.role === 'ADMIN' || owner?.role === 'SUPER_ADMIN';
        if (!isPro) return NextResponse.json({ error: 'Pro feature only.' }, { status: 403 });

        const { name, subject, previewText, contentText, contentHtml, contactIds } = await req.json();

        if (!name || !subject || !contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
            return NextResponse.json({ error: 'Missing required fields or recipients' }, { status: 400 });
        }

        if (contactIds.length > 500) {
            return NextResponse.json({ error: 'Maximum 500 recipients allowed per campaign' }, { status: 400 });
        }

        // Verify contacts belong to user
        const contacts = await db.customerContact.findMany({
            where: {
                id: { in: contactIds },
                ownerId: user.userId,
                email: { not: null }
            }
        });

        if (contacts.length === 0) {
            return NextResponse.json({ error: 'No valid contacts with emails found' }, { status: 400 });
        }

        const campaign = await db.customerEmailCampaign.create({
            data: {
                ownerId: user.userId,
                name: name.trim(),
                subject: subject.trim(),
                previewText: previewText?.trim(),
                contentText: contentText?.trim(),
                contentHtml: contentHtml?.trim(),
                status: 'DRAFT',
                recipientCount: contacts.length,
                recipients: {
                    create: contacts.map(c => ({
                        customerContactId: c.id,
                        email: c.email!
                    }))
                }
            }
        });

        return NextResponse.json({ success: true, campaign }, { status: 201 });
    } catch (error) {
        console.error('Create campaign error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
