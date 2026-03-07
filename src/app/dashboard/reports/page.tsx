import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import ReportsClient from './ReportsClient';
import HeroSection from '@/components/ui/HeroSection';

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const authUser = await verifyToken(token || '');

    if (!authUser) {
        return <div className="p-8 text-center text-[var(--muted)]">Unauthorized</div>;
    }

    const isPro = (authUser.plan === "PRO" && authUser.planStatus !== "inactive") || authUser.role === "ADMIN" || authUser.role === "SUPER_ADMIN";

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col">
            <HeroSection pageKey="reports" />
            <div className="p-4 sm:p-8 flex-1">
                <ReportsClient isPro={isPro} />
            </div>
        </div>
    );
}
