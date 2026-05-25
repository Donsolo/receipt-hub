import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const resolvedParams = await params;
        const { token } = resolvedParams;
        if (!token) {
            return NextResponse.json({ success: false, error: 'Token is required' }, { status: 400 });
        }

        const body = await req.json();
        const { signature } = body;

        if (!signature) {
            return NextResponse.json({ success: false, error: 'Signature is required' }, { status: 400 });
        }

        // Find the invoice by token
        const invoice = await db.invoice.findUnique({
            where: { publicToken: token },
            select: { id: true, status: true }
        });

        if (!invoice) {
            return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        }

        // Update the invoice with the new signature
        await db.invoice.update({
            where: { id: invoice.id },
            data: {
                authorizedSignature: signature
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Error saving signature:', error);
        return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
