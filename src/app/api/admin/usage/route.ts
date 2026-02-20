import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        const user = await verifyToken(token || '');

        if (!user || (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Global Aggregations
        const totalUsers = await db.user.count();

        const activeUsers7d = await db.user.count({
            where: {
                receipts: {
                    some: {
                        createdAt: { gte: sevenDaysAgo }
                    }
                }
            }
        });

        const totalReceipts = await db.receipt.count();

        const storageAggregation = await db.receipt.aggregate({
            _sum: {
                fileSize: true
            }
        });

        const totalStorageBytes = storageAggregation._sum.fileSize || 0;
        const totalStorageMB = Number((totalStorageBytes / 1024 / 1024).toFixed(2));

        const uploads24h = await db.receipt.count({
            where: {
                imageUrl: { not: null },
                createdAt: { gte: twentyFourHoursAgo }
            }
        });

        const uploads7d = await db.receipt.count({
            where: {
                imageUrl: { not: null },
                createdAt: { gte: sevenDaysAgo }
            }
        });

        // Per-user stats
        const allUsers = await db.user.findMany({
            include: {
                receipts: {
                    select: {
                        fileSize: true,
                        createdAt: true
                    }
                }
            }
        });

        const users = allUsers.map(u => {
            const receiptCount = u.receipts.length;
            const storageBytes = u.receipts.reduce((sum, r) => sum + (r.fileSize || 0), 0);
            const storageMB = Number((storageBytes / 1024 / 1024).toFixed(2));
            const lastUploadUrl = u.receipts
                .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
            const lastUploadDate = lastUploadUrl ? lastUploadUrl.createdAt : null;

            return {
                id: u.id,
                name: u.email, // Fallback since User model has no 'name'
                email: u.email,
                plan: "Free", // Fallback since Plan model does not exist
                receiptCount,
                storageMB,
                lastUploadDate
            };
        });

        const responseData = {
            totalUsers,
            activeUsers7d,
            totalReceipts,
            totalStorageMB,
            uploads24h,
            uploads7d,
            users
        };

        return NextResponse.json(responseData);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
