import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { getReceipts } from '@/lib/actions';

export async function GET(req: Request) {
    try {
        const authUser = await getCurrentUser();
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await db.user.findUnique({
            where: { id: authUser.id },
            select: { email: true, isEarlyAccess: true, name: true, businessName: true, timezone: true }
        });

        const isPro = (authUser.plan === "PRO" && authUser.planStatus !== "inactive") || authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN";

        // Fetch receipts
        // Since this is an API route, it will not be executed at build time for static export.
        // It runs dynamically at runtime.
        const receiptsRaw = await getReceipts("");
        
        // Strip out non-serializable fields if any from Prisma
        const receipts = receiptsRaw.map(r => ({
            id: r.id,
            createdAt: r.createdAt,
            totalAmount: r.total,
            vendorName: r.clientName
        }));

        let userInvoices: any[] = [];
        let lensStats = { approved: 0, pending: 0 };

        if (isPro) {
            userInvoices = await db.invoice.findMany({
                where: { userId: authUser.id },
                select: { id: true, status: true }
            });

            const lensShares = await db.veroLensShare.findMany({
                where: { session: { userId: authUser.id } },
                select: { status: true }
            });

            lensStats.approved = lensShares.filter(s => s.status === 'APPROVED').length;
            lensStats.pending = lensShares.filter(s => s.status === 'ACTIVE').length;
        }

        return NextResponse.json({
            success: true,
            user,
            isPro,
            receipts,
            userInvoices,
            lensStats
        });

    } catch (e: any) {
        console.error('API Error /api/dashboard:', e);
        return NextResponse.json({ error: e.message || 'Internal Error' }, { status: 500 });
    }
}
