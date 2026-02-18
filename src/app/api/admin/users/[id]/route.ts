import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { deleteS3Object } from '@/lib/s3';
import { cookies } from 'next/headers';

export async function GET(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;

    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        const user = await verifyToken(token || '');

        if (!user || user.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const targetUser = await db.user.findUnique({
            where: { id: params.id },
            include: {
                receipts: {
                    orderBy: { createdAt: 'desc' },
                },
            },
        });

        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        return NextResponse.json(targetUser);
    } catch (error) {
        console.error('Fetch User Details Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        const authUser = await verifyToken(token || '');

        if (!authUser || (authUser.role !== 'ADMIN' && authUser.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const targetUserId = params.id;

        // Prevent self-deletion
        if (targetUserId === authUser.userId) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 403 });
        }

        // Get target user to check role
        const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Hierarchy Check
        if (authUser.role === 'ADMIN') {
            // ADMIN cannot delete ADMIN or SUPER_ADMIN
            if (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN') {
                return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
            }
        }

        // SUPER_ADMIN can delete ADMIN and USER, but not other SUPER_ADMINs (requirements said "Cannot delete themselves", usually implies equal rank protection or just self. Requirements: "Cannot modify SUPER_ADMIN" for Admin. Super Admin "Can delete admins", "Can delete users". Doesn't explicitly say "Can delete other Super Admins". Safest is to allow if it's not self, or block. Let's allow for now unless specified.)
        // Requirement 3: "SUPER_ADMIN: ... Cannot delete themselves".

        // 1. Get all receipts to find S3 keys
        const receipts = await db.receipt.findMany({
            where: { userId: targetUserId },
        });

        // 2. Delete images from S3
        for (const receipt of receipts) {
            if (receipt.imageUrl) {
                await deleteS3Object(receipt.imageUrl);
            }
        }

        // 3. Delete User (Cascade deletes receipts from DB)
        await db.user.delete({
            where: { id: targetUserId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(
    request: Request,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        const authUser = await verifyToken(token || '');

        if (!authUser || (authUser.role !== 'ADMIN' && authUser.role !== 'SUPER_ADMIN')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { role } = body;

        // Validate requested role
        if (!['ADMIN', 'USER', 'SUPER_ADMIN'].includes(role)) {
            return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
        }

        // Prevent assigning SUPER_ADMIN if not enough permission
        // "Block any attempt to: Assign SUPER_ADMIN role" (Implies by Admin)
        if (authUser.role === 'ADMIN' && role === 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Insufficient permissions to promote to Super Admin' }, { status: 403 });
        }

        const targetUser = await db.user.findUnique({ where: { id: params.id } });
        if (!targetUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Logic:
        // ADMIN: Cannot modify ADMIN or SUPER_ADMIN
        if (authUser.role === 'ADMIN') {
            if (targetUser.role === 'ADMIN' || targetUser.role === 'SUPER_ADMIN') {
                return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
            }
        }

        const updatedUser = await db.user.update({
            where: { id: params.id },
            data: { role },
        });

        return NextResponse.json(updatedUser);
    } catch (error) {
        console.error('Update User Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
