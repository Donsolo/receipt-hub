import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getNextReceiptNumber } from '@/lib/actions';

export async function GET() {
    try {
        const authUser = await getCurrentUser();
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const nextReceiptNumber = await getNextReceiptNumber();
        return NextResponse.json({ success: true, nextReceiptNumber });

    } catch (e: any) {
        console.error('API Error /api/receipts/next-number:', e);
        return NextResponse.json({ error: e.message || 'Internal Error' }, { status: 500 });
    }
}
