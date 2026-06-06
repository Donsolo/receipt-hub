"use client";
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeaderCard from '@/components/ui/PageHeaderCard';
import { getCached, setCached } from '@/lib/api-cache';
import { useNetwork } from '@/lib/network-context';
import HeroSection from '@/components/ui/HeroSection';
import { useAuth } from '@/context/AuthContext';

type ConversationListResponse = {
    id: string;
    updatedAt: string;
    participants: {
        userId: string;
        user: {
            id: string;
            name: string;
            businessName: string | null;
            businessLogoPath: string | null;
            email: string;
        }
    }[];
    messages: {
        content: string;
        createdAt: string;
        senderId: string;
        attachments?: any[];
    }[];
};

export default function ConversationsPage() {
    const { isAuthenticated, isLoading: authLoading, user } = useAuth();
    const authUserId = user?.id;
    const [conversations, setConversations] = useState<ConversationListResponse[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isStale, setIsStale] = useState(false);
    const { isOnline } = useNetwork();
    const router = useRouter();

    useEffect(() => {
        if (!authLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [authLoading, isAuthenticated, router]);

    useEffect(() => {
        if (!isAuthenticated) return;
        const loadData = async () => {
            try {
                const headers = { ...((await getAuthHeader()) as any) };
                
                let convoData;
                
                try {
                    const [convoRes] = await Promise.all([
                        fetch(`${API_BASE_URL}/api/conversations`, { headers })
                    ]);
                    
                    if (!convoRes.ok) throw new Error('Network error');
                    
                    convoData = await convoRes.json();
                    
                    await setCached('conversations', convoData);
                    setIsStale(false);
                } catch (e) {
                    console.warn('Falling back to cache');
                    convoData = await getCached<any>('conversations', 7 * 24 * 60 * 60 * 1000);
                    setIsStale(true);
                }

                if (convoData) setConversations(convoData);
                else setConversations([]);
                
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [isAuthenticated]);

    const getDisplayNameInfo = (targetUser: any) => {
        if (!targetUser) return { primary: "Unknown User", secondary: "" };
        if (targetUser.businessName) {
            return {
                primary: targetUser.businessName,
                secondary: targetUser.name || targetUser.email
            };
        }
        return {
            primary: targetUser.name || targetUser.email,
            secondary: targetUser.name ? targetUser.email : ''
        };
    };

    return (
        <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text)]">
            <HeroSection pageKey="messages" />

            <div className="flex-1 w-full flex flex-col items-center px-4 sm:px-6 lg:px-8 py-8">
                <div className="w-full max-w-4xl space-y-6 relative">
                    <PageHeaderCard title="Messages" description="Manage your direct conversations with connections." />
                    {isStale && (
                        <div className="bg-amber-900/40 border border-amber-500/30 rounded-lg p-3 flex items-center mb-4 text-sm text-amber-200/80">
                            <svg className="w-4 h-4 mr-2 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            You are offline. Showing cached messages.
                        </div>
                    )}

                    {authLoading || isLoading ? (
                        <div className="flex justify-center items-center py-20">
                            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : conversations.length === 0 ? (
                        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center shadow-sm">
                            <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                            </div>
                            <h2 className="text-[18px] font-semibold text-[var(--text)] mb-2">No conversations yet</h2>
                            <p className="text-[var(--muted)] text-[15px] mb-6 max-w-sm mx-auto">
                                Head over to your Connections network to start a new direct message.
                            </p>
                            <Link
                                href="/dashboard/connections"
                                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-semibold transition-colors shadow-sm"
                            >
                                View Connections
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg className="h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search messages..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="block w-full pl-9 pr-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--text)] text-sm placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-indigo-500/50 shadow-sm transition-colors"
                                />
                            </div>

                            <div className="bg-[var(--card)] border-y sm:border border-[var(--border)] sm:rounded-2xl shadow-sm overflow-hidden flex flex-col -mx-4 sm:mx-0">
                                {(() => {
                                    const filtered = conversations.filter(convo => {
                                        if (!searchQuery) return true;
                                        const otherParticipant = convo.participants.find(p => p.userId !== authUserId)?.user;
                                        if (!otherParticipant) return false;
                                        const searchStr = `${otherParticipant.name || ''} ${otherParticipant.businessName || ''} ${otherParticipant.email || ''}`.toLowerCase();
                                        return searchStr.includes(searchQuery.toLowerCase());
                                    });

                                    if (filtered.length === 0) {
                                        return (
                                            <div className="p-8 text-center text-[var(--muted)] text-sm">
                                                No conversations found matching "{searchQuery}"
                                            </div>
                                        );
                                    }

                                    return filtered.map((convo, idx) => {
                                const otherParticipant = convo.participants.find(p => p.userId !== authUserId)?.user;
                                const lastMessage = convo.messages?.[0];

                                const lastMessageText = lastMessage
                                    ? lastMessage.content || '[Attachment]'
                                    : 'No messages yet';

                                const lastMessageTime = lastMessage
                                    ? new Date(lastMessage.createdAt).toLocaleDateString(undefined, {
                                        month: 'short', day: 'numeric'
                                    })
                                    : '';

                                const displayInfo = getDisplayNameInfo(otherParticipant);

                                return (
                                    <Link
                                        key={convo.id}
                                        href={`/dashboard/messages/${convo.id}`}
                                        className={`flex items-center gap-4 p-5 hover:bg-[var(--card-hover)] transition-colors group ${idx !== conversations.length - 1 ? 'border-b border-[var(--border)]' : ''}`}
                                    >
                                        <div className="h-12 w-12 shrink-0 bg-indigo-500/10 border border-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 font-bold text-lg">
                                            {otherParticipant?.businessLogoPath ? (
                                                <img src={otherParticipant.businessLogoPath} alt="Logo" className="h-full w-full rounded-full object-cover" />
                                            ) : (
                                                displayInfo.primary.charAt(0).toUpperCase()
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-baseline mb-0.5">
                                                <h3 className="text-[16px] font-semibold text-[var(--text)] truncate">{displayInfo.primary}</h3>
                                                <span className="text-[12px] text-[var(--muted)] whitespace-nowrap ml-2">
                                                    {lastMessageTime}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-[14px] text-[var(--muted)] truncate flex-1">
                                                    {lastMessage?.senderId === authUserId ? 'You: ' : ''}{lastMessageText}
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })})()}
                        </div>
                    </div>
                    )}
                </div>
            </div>
        </div>
    );
}
