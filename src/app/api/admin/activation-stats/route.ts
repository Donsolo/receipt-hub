import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized Admin Access' }, { status: 403 });
        }

        const [
            totalUsers,
            activatedUsers,
            earlyAccessUsers,
            inactiveUsers
        ] = await Promise.all([
            db.user.count(),
            db.user.count({
                where: {
                    isActivated: true,
                    activationSource: 'stripe'
                }
            }),
            db.user.count({
                where: {
                    isEarlyAccess: true
                }
            }),
            db.user.count({
                where: {
                    isActivated: false
                }
            })
        ]);

        const estimatedRevenue = activatedUsers * 4.99;

        return NextResponse.json({
            totalUsers,
            activatedUsers,
            earlyAccessUsers,
            inactiveUsers,
            estimatedRevenue
        });

    } catch (error) {
        console.error('Failed to fetch activation stats:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
