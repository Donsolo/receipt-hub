import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const contexts = await db.veroLensCustomContext.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(contexts);
    } catch (error) {
        console.error('[CUSTOM_CONTEXTS_GET]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse('Unauthorized', { status: 401 });
        }

        const body = await request.json();
        let { name, description, category } = body;

        if (!name || typeof name !== 'string') {
            return new NextResponse('Name is required', { status: 400 });
        }

        // Sanitize and trim
        name = name.trim().slice(0, 60);
        description = description ? String(description).trim().slice(0, 300) : null;
        category = category ? String(category).trim().slice(0, 60) : null;

        if (name.length === 0) {
            return new NextResponse('Name is required', { status: 400 });
        }

        // Check for duplicates
        const existing = await db.veroLensCustomContext.findUnique({
            where: {
                userId_name: {
                    userId: user.id,
                    name: name
                }
            }
        });

        if (existing) {
            return new NextResponse('A custom context with this name already exists.', { status: 409 });
        }

        const customContext = await db.veroLensCustomContext.create({
            data: {
                userId: user.id,
                name,
                description,
                category
            }
        });

        return NextResponse.json(customContext);
    } catch (error) {
        console.error('[CUSTOM_CONTEXTS_POST]', error);
        return new NextResponse('Internal Error', { status: 500 });
    }
}
