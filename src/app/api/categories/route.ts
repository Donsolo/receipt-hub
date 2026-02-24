import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, ensureActivated } from '@/lib/auth';

const defaultCategories = [
    { name: 'Meals & Entertainment', color: '#f59e0b' }, // Amber
    { name: 'Travel & Transit', color: '#3b82f6' },      // Blue
    { name: 'Office Supplies', color: '#10b981' },       // Emerald
    { name: 'Software & Services', color: '#8b5cf6' },   // Violet
    { name: 'Utilities', color: '#06b6d4' },             // Cyan
    { name: 'Other', color: '#6b7280' }                  // Gray
];

export async function GET(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await ensureActivated(user);

        // Auto-seed default categories if they don't exist
        const existingDefaults = await db.category.count({ where: { userId: null } });
        if (existingDefaults === 0) {
            await db.category.createMany({
                data: defaultCategories.map(cat => ({ ...cat, userId: null }))
            });
        }

        // Fetch all system defaults + user's custom categories
        const categories = await db.category.findMany({
            where: {
                OR: [
                    { userId: null },
                    { userId: user.userId }
                ]
            },
            orderBy: {
                name: 'asc'
            }
        });

        return NextResponse.json(categories);
    } catch (error) {
        console.error('Fetch categories error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const token = request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0];
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        await ensureActivated(user);

        const { name, color } = await request.json();

        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
        }

        // Check if category name already exists for this user or as a default
        const existing = await db.category.findFirst({
            where: {
                name: name.trim(),
                OR: [{ userId: null }, { userId: user.userId }]
            }
        });

        if (existing) {
            return NextResponse.json({ error: 'A category with this name already exists' }, { status: 400 });
        }

        const newCategory = await db.category.create({
            data: {
                name: name.trim(),
                color: color || '#6b7280', // Default to gray if no color is provided
                userId: user.userId
            }
        });

        return NextResponse.json(newCategory, { status: 201 });
    } catch (error) {
        console.error('Create category error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
