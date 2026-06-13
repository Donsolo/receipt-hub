import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(request: Request) {
    try {
        const authUser = await getCurrentUser();
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userRecord = await (db as any).user.findUnique({
            where: { id: authUser.id },
            select: { businessName: true, businessLogoPath: true, businessRegistrationNumber: true, email: true, plan: true, planStatus: true, role: true, connectOnboardingStatus: true }
        });

        const isPro = (userRecord?.plan === "PRO" && userRecord?.planStatus !== "inactive") || userRecord?.role === "ADMIN" || userRecord?.role === "SUPER_ADMIN";

        const globalProfile = await db.businessProfile.findFirst();

        return NextResponse.json({
            success: true,
            isPro,
            userRecord,
            globalProfile
        });
    } catch (e: any) {
        console.error('API Error /api/invoices/create/metadata:', e);
        return NextResponse.json({ error: e.message || 'Internal Error' }, { status: 500 });
    }
}
