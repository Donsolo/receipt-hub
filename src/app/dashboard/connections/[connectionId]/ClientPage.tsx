// @ts-nocheck
'use client';
import { useParams } from 'next/navigation';
// import { verifyToken } from '@/lib/auth';
// import { db } from '@/lib/db';
import { notFound, redirect } from 'next/navigation';
import HeroSection from '@/components/ui/HeroSection';
import PageHeaderCard from '@/components/ui/PageHeaderCard';
import ConnectionProfileClient from './ConnectionProfileClient';

export default function ConnectionProfilePage() {
    const params = useParams<{ connectionId: string }>();
    const connectionId = params.connectionId;
    const dummy = async () => {
        /*
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;

        if (!token) {
            redirect('/login');
        }

        const payload = await verifyToken(token);
        if (!payload || !payload.userId) {
            redirect('/login');
        }

        const authUserId = payload.userId as string;

        // Fetch connection
        const connection = await db.connection.findUnique({
            where: { id: connectionId },
            include: {
                requester: true,
                receiver: true
            }
        });

        if (!connection) {
            notFound();
        }

        // Ensure auth user is part of the connection
        if (connection.requesterId !== authUserId && connection.receiverId !== authUserId) {
            notFound();
        }
        */
    };

    // Dummy values for now
    const connection = { status: 'pending', updatedAt: new Date() };
    const otherUser = { id: '', businessName: '', name: '', email: '', businessLogoPath: '' };
    const primary = 'Loading...';
    const secondary = '';
    const email = '';
    const logoPath = '';

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text)]">
            <HeroSection pageKey="connections" />

            <div className="flex-1 w-full flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8">
                <div className="w-full max-w-4xl space-y-6 relative">
                    {/* Breadcrumbs / Back */}
                    <div className="flex items-center text-sm font-medium text-[var(--muted)] mb-4">
                        <a href="/dashboard/connections" className="hover:text-indigo-400 transition-colors flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Back to Network
                        </a>
                    </div>

                    <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
                        {/* Status badge */}
                        <div className="absolute top-6 right-6">
                            <span className="text-xs font-semibold tracking-wide uppercase px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                {connection.status === 'accepted' ? 'Connected' : connection.status}
                            </span>
                        </div>

                        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8 text-center sm:text-left pt-8 sm:pt-0">
                            {/* Avatar */}
                            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0 text-3xl sm:text-5xl shadow-inner">
                                {logoPath ? (
                                    <img src={logoPath} alt="Logo" className="w-full h-full rounded-full object-cover" />
                                ) : (
                                    primary.charAt(0).toUpperCase()
                                )}
                            </div>

                            <div className="flex-1 flex flex-col justify-center min-h-[128px]">
                                <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text)]">{primary}</h1>
                                <p className="text-[15px] text-[var(--muted)] mt-1">{secondary}</p>
                                
                                <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:gap-6 text-sm text-[var(--muted)]">
                                    <div className="flex items-center justify-center sm:justify-start gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                        </svg>
                                        {email}
                                    </div>
                                    <div className="flex items-center justify-center sm:justify-start gap-2">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        Connected since {new Date(connection.updatedAt).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-10 pt-8 border-t border-[var(--border)]">
                            <ConnectionProfileClient targetUserId={otherUser.id} connectionId={connection.id} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
