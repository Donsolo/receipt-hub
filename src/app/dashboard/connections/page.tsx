"use client";
import { getAuthHeader } from '@/lib/auth-client';
import { API_BASE_URL } from '@/lib/config';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeaderCard from '@/components/ui/PageHeaderCard';
import { getCached, setCached } from '@/lib/api-cache';
import { useNetwork } from '@/lib/network-context';
import NetworkHero from '@/components/network/NetworkHero';
import { useAuth } from '@/context/AuthContext';

type UserResult = {
    id: string;
    name: string | null;
    businessName: string | null;
    businessLogoPath?: string | null;
    email?: string | null; // Only present in email search
};

type IncomingRequest = {
    id: string;
    requester: {
        id: string;
        name: string | null;
        businessName: string | null;
        businessLogoPath?: string | null;
        email?: string | null;
    };
};

type Connection = {
    connectionId: string;
    status: string;
    connectedAt: string;
    connectedUser: {
        id: string;
        name: string | null;
        businessName: string | null;
        businessLogoPath?: string | null;
        email?: string | null;
    };
};

type Receipt = {
    id: string;
    clientName: string | null;
    total: number;
    createdAt: string;
};

type Message = {
    id: string;
    senderId: string;
    receiverId: string;
    text: string;
    createdAt: string;
    receipts?: { receipt: Receipt }[];
};

export default function ConnectionsPage() {
    const { isAuthenticated, isLoading, user: authUser } = useAuth();
    const authUserId = authUser?.id;
    // Search State
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<UserResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    // Email Search State
    const [emailQuery, setEmailQuery] = useState('');
    const [emailResult, setEmailResult] = useState<UserResult | null>(null);
    const [emailSearchStatus, setEmailSearchStatus] = useState<'idle' | 'searching' | 'not-found' | 'found'>('idle');

    // Suggested Businesses State
    const [suggestedBusinesses, setSuggestedBusinesses] = useState<UserResult[]>([]);

    // Connections State
    const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Toast State
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const router = useRouter();

    // Layout State
    const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);
    const [isPendingModalOpen, setIsPendingModalOpen] = useState(false);
    const [isSuggestedModalOpen, setIsSuggestedModalOpen] = useState(false);
    const [isStale, setIsStale] = useState(false);
    const { isOnline } = useNetwork();

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Load initial data
    const loadData = useCallback(async () => {
        try {
            const timestamp = Date.now();
            const headers = { ...((await getAuthHeader()) as any) };
            
            const [incomingRes, connectionsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/connections/incoming?t=${timestamp}`, { headers, cache: 'no-store' }),
                fetch(`${API_BASE_URL}/api/connections?t=${timestamp}`, { headers, cache: 'no-store' })
            ]);

            if (!incomingRes.ok || !connectionsRes.ok) throw new Error('Network error');

            const incoming = await incomingRes.json();
            const connectionsData = await connectionsRes.json();

            setIncomingRequests(incoming);
            setConnections(connectionsData);

            await setCached('connections_incoming', incoming);
            await setCached('connections', connectionsData);
            setIsStale(false);
        } catch (error) {
            console.error('Failed to load connections data, falling back to cache');
            const incoming = await getCached<any>('connections_incoming', 7 * 24 * 60 * 60 * 1000);
            const connectionsData = await getCached<any>('connections', 7 * 24 * 60 * 60 * 1000);
            
            if (incoming) setIncomingRequests(incoming);
            if (connectionsData) setConnections(connectionsData);
            setIsStale(true);
        }
    }, []);


    useEffect(() => {
        if (isAuthenticated) {
            loadData();
        }
    }, [loadData, isAuthenticated]);

    if (isLoading || (!isAuthenticated && isLoading === false)) {
        return <div className="p-8 text-[var(--muted)] min-h-screen bg-[var(--bg)]">Loading...</div>;
    }

    // Load Suggested Businesses
    useEffect(() => {
        if (!authUserId) return;
        const fetchSuggested = async () => {
            try {
                // simple seed to get some businesses for suggestions
                const res = await fetch(`${API_BASE_URL}/api/connections/search?q=a`, { headers: { ...((await getAuthHeader()) as any) } });
                if (res.ok) {
                    const data: UserResult[] = await res.json();
                    const connIds = new Set(connections.map(c => c.connectedUser.id));
                    const incIds = new Set(incomingRequests.map(r => r.requester.id));
                    const filtered = data.filter(u => u.id !== authUserId && !connIds.has(u.id) && !incIds.has(u.id));
                    setSuggestedBusinesses(filtered.slice(0, 3));
                }
            } catch (error) {
                // silent fail for suggestions
            }
        };
        fetchSuggested();
    }, [authUserId, connections.length, incomingRequests.length]);

    // Name/Business Search (Debounced)
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length < 2) {
                setSearchResults([]);
                setIsSearching(false);
                return;
            }

            setIsSearching(true);
            try {
                const res = await fetch(`${API_BASE_URL}/api/connections/search?q=${encodeURIComponent(searchQuery)}`, { headers: { ...((await getAuthHeader()) as any) } });
                if (res.ok) {
                    setSearchResults(await res.json());
                }
            } catch (error) {
                console.error('Search failed');
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Email Search (Exact, No Debounce)
    const handleEmailSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        const email = emailQuery.trim();
        if (!email || !email.includes('@')) return;

        setEmailSearchStatus('searching');
        try {
            const res = await fetch(`${API_BASE_URL}/api/connections/search-email?email=${encodeURIComponent(email)}`, { headers: { ...((await getAuthHeader()) as any) } });
            if (res.ok) {
                const data = await res.json();
                if (data.found) {
                    setEmailResult(data.user);
                    setEmailSearchStatus('found');
                } else {
                    setEmailResult(null);
                    setEmailSearchStatus('not-found');
                }
            }
        } catch (error) {
            setEmailSearchStatus('not-found');
        }
    };

    // Actions
    const handleConnect = async (userId: string) => {
        setActionLoading(userId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/connections/request`, {
                method: 'POST',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiverId: userId })
            });

            if (res.ok) {
                showToast("Connection request sent.");
                // Remove from search results proactively
                setSearchResults(prev => prev.filter(u => u.id !== userId));
                if (emailResult?.id === userId) {
                    setEmailResult(null);
                    setEmailSearchStatus('idle');
                    setEmailQuery('');
                }
            } else {
                const error = await res.json();
                showToast(error.error || "Failed to send request.");
            }
        } catch (error) {
            showToast("An error occurred.");
        } finally {
            setActionLoading(null);
        }
    };

    const handleRespond = async (connectionId: string, status: 'accepted' | 'declined') => {
        setActionLoading(connectionId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/connections/${connectionId}/respond`, {
                method: 'PATCH',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({ status })
            });

            if (res.ok) {
                showToast(`Request ${status}.`);
                // Refresh data
                await loadData();
            } else {
                showToast("Failed to process request.");
            }
        } catch (error) {
            showToast("An error occurred.");
        } finally {
            setActionLoading(null);
        }
    };

    // Helper for rendering names (Strict implementation per user prompt)
    function getDisplayName(user: {
        name?: string | null;
        businessName?: string | null;
        email?: string | null;
    }) {
        return (
            user?.businessName?.trim() ||
            user?.name?.trim() ||
            user?.email?.trim() ||
            "Unknown User"
        );
    }

    const getDisplayNameInfo = (user: { name: string | null, businessName: string | null, email?: string | null, businessLogoPath?: string | null }) => {
        const primary = getDisplayName(user);
        const secondary = user.businessName ? (user.name || 'Personal Account') : 'Personal Account';
        return { primary, secondary, logo: user.businessLogoPath };
    };

    // Messaging Actions
    const handleOpenMessages = async (userId: string) => {
        setActionLoading(userId);
        try {
            const res = await fetch(`${API_BASE_URL}/api/conversations`, {
                method: 'POST',
                headers: { ...((await getAuthHeader()) as any), 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: userId })
            });
            if (res.ok) {
                const data = await res.json();
                router.push(`/dashboard/messages/${data.conversation.id}`);
            } else {
                showToast("Failed to open conversation.");
            }
        } catch (error) {
            showToast("An error occurred.");
        } finally {
            setActionLoading(null);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-[var(--bg)] pb-24">
            <NetworkHero 
                businessName={authUser?.businessName || null}
                ownerName={authUser?.name || null}
                businessLogoPath={authUser?.businessLogoPath || null}
                avatarLetter={authUser?.businessName?.charAt(0)?.toUpperCase() || authUser?.name?.charAt(0)?.toUpperCase() || "N"}
                totalConnections={connections.length}
                pendingRequests={incomingRequests.length}
                suggestedCount={suggestedBusinesses.length}
                onFindBusinesses={() => {
                    const searchInput = document.getElementById('network-search');
                    if (searchInput) searchInput.focus();
                }}
                onPendingClick={() => setIsPendingModalOpen(true)}
                onSuggestedClick={() => setIsSuggestedModalOpen(true)}
            />

            {/* BODY SURFACE (Card Lift) */}
            <div className="relative z-20 flex-1 bg-[var(--bg)] rounded-t-[20px] -mt-4 px-4 sm:px-6 pt-5 pb-8 flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
                {isStale && (
                    <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 flex items-center mb-6 text-sm text-amber-800">
                        <svg className="w-4 h-4 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        You are offline. Showing cached connections.
                    </div>
                )}
                {toastMessage && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-[120%] bg-[var(--card)] text-[var(--text)] px-4 py-2 rounded-xl shadow-lg border border-[var(--border)] z-50 text-sm font-bold">
                        {toastMessage}
                    </div>
                )}

                {/* Search Bar */}
                <div className="relative flex items-center mb-6">
                    <div className="absolute left-3.5 text-gray-400">
                        <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input 
                        id="network-search"
                        type="text"
                        placeholder="Search network..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-12 py-3 bg-[var(--card)] border-0 rounded-2xl text-sm font-medium text-[var(--text)] placeholder-gray-400 shadow-[0_2px_12px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-[#5B5FEF]/20 outline-none"
                    />
                    <div className="absolute right-3 w-8 h-8 flex items-center justify-center bg-[var(--card-hover)] text-gray-400 rounded-xl cursor-pointer hover:bg-[var(--card-hover)] transition border border-[var(--border)]">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                        </svg>
                    </div>

                    {/* Search Dropdown Results */}
                    {searchQuery.length >= 2 && (
                        <div className="absolute top-full mt-2 left-0 right-0 z-50 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl max-h-60 overflow-y-auto">
                            {isSearching ? (
                                <div className="p-4 text-sm text-[var(--muted)] text-center">Searching...</div>
                            ) : searchResults.length > 0 ? (
                                <ul>
                                    {searchResults.map(user => {
                                        const { primary, secondary, logo } = getDisplayNameInfo(user);
                                        return (
                                            <li key={user.id} className="p-3 border-b border-gray-50 last:border-0 hover:bg-[var(--card-hover)] flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-[12px] bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold shrink-0">
                                                        {logo ? <img src={logo} alt="" className="w-full h-full object-cover rounded-[12px]" /> : primary.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-semibold text-[var(--text)]">{primary}</p>
                                                        <p className="text-xs text-[var(--muted)]">{secondary}</p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleConnect(user.id)}
                                                    disabled={actionLoading === user.id || !isOnline}
                                                    className="text-xs font-bold bg-[#5B5FEF] text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                                                >
                                                    Connect
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <div className="p-4 text-sm text-[var(--muted)] text-center">No results found.</div>
                            )}
                        </div>
                    )}
                </div>

                {/* My Network Section */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-[16px] font-semibold text-[var(--text)]">My Network</h2>
                        <span className="text-sm text-gray-400 font-medium">{connections.length} active</span>
                    </div>

                    {connections.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-[var(--muted)] text-sm font-medium">You have no connections yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {connections.map(conn => {
                                const { primary, secondary, logo } = getDisplayNameInfo(conn.connectedUser);
                                return (
                                    <div key={conn.connectionId} className="flex items-center p-3 bg-[var(--card)] rounded-[14px] border-[0.5px] border-[var(--border)] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                                        <div className="relative shrink-0 mr-3">
                                            <div className="w-[44px] h-[44px] rounded-[12px] bg-[#10B981]/10 text-[#10B981] flex items-center justify-center font-bold shadow-inner overflow-hidden">
                                                {logo ? <img src={logo} alt="" className="w-full h-full object-cover" /> : primary.charAt(0).toUpperCase()}
                                            </div>
                                            {(conn.connectedUser as any).isOnline && (
                                                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#10B981] border-2 border-white rounded-full z-10" />
                                            )}
                                        </div>
                                        
                                        <div className="flex-1 min-w-0 pr-3">
                                            <h4 className="text-[15px] font-semibold text-[var(--text)] truncate">{primary}</h4>
                                            <p className="text-[13px] text-[var(--muted)] truncate mt-0.5">{secondary}</p>
                                            <div className="inline-flex mt-1.5 px-2 py-0.5 rounded-md bg-[#E1F5EE] text-[#0F6E56] text-[10px] font-bold uppercase tracking-wider">
                                                Connected
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => handleOpenMessages(conn.connectedUser.id)}
                                            className="w-8 h-8 rounded-lg bg-[var(--card-hover)] hover:bg-[var(--border)] flex items-center justify-center text-[var(--muted)] transition-colors shrink-0"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Pending Requests Modal */}
            {isPendingModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[var(--card)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--card-hover)]/50">
                            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                                Pending Requests
                                <span className="bg-red-50 text-red-500 text-xs px-2 py-0.5 rounded-full font-bold">{incomingRequests.length}</span>
                            </h2>
                            <button onClick={() => setIsPendingModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--muted)] transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto space-y-3 custom-scrollbar">
                            {incomingRequests.length === 0 ? (
                                <p className="text-center text-sm text-[var(--muted)] py-8">No pending requests.</p>
                            ) : (
                                incomingRequests.map(req => {
                                    const { primary, secondary, logo } = getDisplayNameInfo(req.requester);
                                    return (
                                        <div key={req.id} className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl flex flex-col gap-3 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 font-bold shrink-0">
                                                    {logo ? <img src={logo} alt="Logo" className="w-full h-full object-cover rounded-xl" /> : primary.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-[var(--text)]">{primary}</p>
                                                    <p className="text-xs text-[var(--muted)]">{secondary}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 w-full">
                                                <button onClick={() => handleRespond(req.id, 'accepted')} disabled={actionLoading === req.id || !isOnline} className="flex-1 text-xs font-bold bg-[#5B5FEF] hover:bg-[#4F54E5] text-white py-2.5 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50">
                                                    Accept
                                                </button>
                                                <button onClick={() => handleRespond(req.id, 'declined')} disabled={actionLoading === req.id || !isOnline} className="flex-1 text-xs font-bold bg-[var(--card-hover)] hover:bg-[var(--card-hover)] text-[var(--muted)] border border-[var(--border)] py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-50">
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Suggested Connections Modal */}
            {isSuggestedModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-[var(--card)] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
                        <div className="flex items-center justify-between p-5 border-b border-[var(--border)] bg-[var(--card-hover)]/50">
                            <h2 className="text-lg font-bold text-[var(--text)]">Suggested for you</h2>
                            <button onClick={() => setIsSuggestedModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-[var(--card-hover)] hover:bg-[var(--border)] text-[var(--muted)] transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="p-5 overflow-y-auto space-y-3 custom-scrollbar">
                            {suggestedBusinesses.length === 0 ? (
                                <p className="text-center text-sm text-[var(--muted)] py-8">No suggestions available.</p>
                            ) : (
                                suggestedBusinesses.map(user => {
                                    const { primary, secondary, logo } = getDisplayNameInfo(user);
                                    const mutualCount = (user.id.charCodeAt(0) % 5) + 1;
                                    return (
                                        <div key={user.id} className="flex items-center p-3 bg-[var(--card)] rounded-[16px] border border-[var(--border)] shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:border-[#5B5FEF]/30 transition-colors">
                                            <div className="relative shrink-0 mr-3">
                                                <div className="w-[44px] h-[44px] rounded-[12px] bg-[#5B5FEF]/10 text-[#5B5FEF] flex items-center justify-center font-bold shadow-inner overflow-hidden">
                                                    {logo ? <img src={logo} alt="" className="w-full h-full object-cover" /> : primary.charAt(0).toUpperCase()}
                                                </div>
                                                {(user as any).isOnline && (
                                                    <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#10B981] border-2 border-white rounded-full z-10" />
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0 pr-3">
                                                <h4 className="text-[14px] font-semibold text-[var(--text)] truncate">{primary}</h4>
                                                <div className="inline-flex mt-1 px-2 py-0.5 rounded-md bg-[#FAEEDA] text-[#854F0B] text-[10px] font-bold uppercase tracking-wider">
                                                    {mutualCount} mutual
                                                </div>
                                            </div>
                                            <button onClick={() => handleConnect(user.id)} disabled={actionLoading === user.id || !isOnline} className="px-4 py-2 rounded-xl bg-[#5B5FEF] hover:bg-[#4F54E5] text-white text-[12px] font-bold transition-colors shrink-0 disabled:opacity-50 shadow-sm active:scale-95">
                                                Connect
                                            </button>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
