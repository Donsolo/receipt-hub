import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getLensAnalytics } from '@/lib/vero-lens/analytics/getLensAnalytics';
import { generateLensInsights } from '@/lib/vero-lens/analytics/generateLensInsights';

export async function GET(request: Request) {
    try {
        const authUser = await getCurrentUser();
        if (!authUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const rangeParam = url.searchParams.get('range');
        const daysBack = rangeParam === 'all' ? null : (rangeParam === '7' ? 7 : 30);

        const data = await getLensAnalytics(authUser.id, daysBack);
        const insights = generateLensInsights(data.metrics);

        return NextResponse.json({ success: true, data, insights, daysBack });
    } catch (e: any) {
        console.error('API Error /api/vero/lens/analytics:', e);
        return NextResponse.json({ error: e.message || 'Internal Error' }, { status: 500 });
    }
}
