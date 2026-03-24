import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db as prisma } from '@/lib/db';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ success: false, error: 'Invalid token' }, { status: 401 });

        const invoice = await prisma.invoice.findUnique({
            where: { id }
        });

        if (!invoice) return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        if (invoice.userId !== user.userId) return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });

        if (invoice.isConverted) {
            return NextResponse.json({ success: false, error: 'Cannot mark converted invoice as paid' }, { status: 400 });
        }

        const updatedInvoice = await prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'PAID' },
            include: { items: true }
        });

        return NextResponse.json({ success: true, invoice: updatedInvoice }, { status: 200 });

    } catch (error: any) {
        console.error('Mark Paid Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
