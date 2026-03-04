import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import ReportsClient from './ReportsClient';

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const authUser = await verifyToken(token || '');

    if (!authUser) {
        return <div className="p-8 text-center text-[var(--muted)]">Unauthorized</div>;
    }

    const isPro = (authUser.plan === "PRO" && authUser.planStatus !== "inactive") || authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN";

    return <ReportsClient isPro={isPro} />;
}
