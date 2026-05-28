"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import PageHeaderCard from '@/components/ui/PageHeaderCard';
import NetworkHero from '@/components/network/NetworkHero';
import ConnectionCard from '@/components/network/ConnectionCard';

type UserResult = {
    id: string;
    name: string | null;
    businessName: string | null;
    email?: string | null; // Only present in email search
};

type IncomingRequest = {
    id: string;
    requester: {
        id: string;
        name: string | null;
        businessName: string | null;
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

    // Messaging Routing State
    const [authUserId, setAuthUserId] = useState<string | null>(null);
    const [authUser, setAuthUser] = useState<any>(null);

    // Layout State
    const [isDiscoverOpen, setIsDiscoverOpen] = useState(false);

    const router = useRouter();

    // Fetch auth userId on mount for message rendering logic
    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.id) {
                    setAuthUserId(data.id);
                    setAuthUser(data);
                }
            })
            .catch(() => { });
    }, []);

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Load initial data
    const loadData = useCallback(async () => {
        try {
            const timestamp = Date.now();
            const [incomingRes, connectionsRes] = await Promise.all([
                fetch(`/api/connections/incoming?t=${timestamp}`, { cache: 'no-store' }),
                fetch(`/api/connections?t=${timestamp}`, { cache: 'no-store' })
            ]);

            if (incomingRes.ok) setIncomingRequests(await incomingRes.json());
            if (connectionsRes.ok) setConnections(await connectionsRes.json());
        } catch (error) {
            console.error('Failed to load connections data');
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Load Suggested Businesses
    useEffect(() => {
        if (!authUserId) return;
        const fetchSuggested = async () => {
            try {
                // simple seed to get some businesses for suggestions
                const res = await fetch(`/api/connections/search?q=a`);
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
                const res = await fetch(`/api/connections/search?q=${encodeURIComponent(searchQuery)}`);
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
            const res = await fetch(`/api/connections/search-email?email=${encodeURIComponent(email)}`);
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
            const res = await fetch('/api/connections/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
            const res = await fetch(`/api/connections/${connectionId}/respond`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
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
    const handleOpenMessages = async (connection: Connection) => {
        setActionLoading(connection.connectionId);
        try {
            const res = await fetch('/api/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUserId: connection.connectedUser.id })
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
        <div className="min-h-screen bg-[var(--bg)] flex flex-col font-sans text-[var(--text)] overflow-x-hidden">
            <NetworkHero 
                businessName={authUser?.businessName}
                ownerName={authUser?.name}
                businessLogoPath={authUser?.businessLogoPath}
                avatarLetter={authUser ? getDisplayName(authUser).charAt(0).toUpperCase() : "V"}
                totalConnections={connections.length}
                pendingRequests={incomingRequests.length}
                onFindBusinesses={() => setIsDiscoverOpen(prev => !prev)}
            />

            <div className="flex-1 w-full flex flex-col px-4 sm:px-6 lg:px-8 pb-16">
                <div className="w-full max-w-5xl mx-auto space-y-8 relative">
                    {toastMessage && (
                        <div className="fixed top-4 right-4 bg-[var(--card)] text-[var(--text)] px-4 py-2 rounded-xl shadow-2xl border border-[var(--border)] z-50 transition-opacity animate-in fade-in slide-in-from-top-4">
                            {toastMessage}
                        </div>
                    )}

                    {/* Discover Businesses Section */}
                    {isDiscoverOpen && (
                        <div className="bg-[var(--card)]/90 backdrop-blur-xl border border-[var(--border)] shadow-xl rounded-3xl p-6 sm:p-8 animate-in slide-in-from-top-4 fade-in duration-300 relative overflow-hidden">
                            {/* Inner subtle glow */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.05),transparent_60%)] -translate-y-1/2 translate-x-1/4 pointer-events-none" />
                            
                            <div className="flex items-center justify-between mb-6 relative z-10">
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--text)]">Discover Businesses</h2>
                                    <p className="text-sm text-[var(--muted)] mt-1">Search the Verihub network to grow your connections.</p>
                                </div>
                                <button onClick={() => setIsDiscoverOpen(false)} className="p-2 rounded-full hover:bg-[var(--card-hover)] text-[var(--muted)] transition-colors">
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex flex-col lg:flex-row gap-6 relative z-10">
                                {/* Search by Name */}
                                <div className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-5 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                                    <label className="block text-[13px] font-semibold text-[var(--text)] mb-3 uppercase tracking-wider">Search Network</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <svg className="h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                        </div>
                                        <input
                                            type="text"
                                            placeholder="Business or owner name..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-3 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--text)] text-sm placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-[var(--card-hover)] transition-all shadow-inner"
                                        />
                                    </div>

                                    {/* Dropdown Results */}
                                    {searchQuery.length >= 2 && (
                                        <div className="absolute z-50 left-5 right-5 mt-2 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl max-h-60 overflow-y-auto overflow-x-hidden backdrop-blur-md">
                                            {isSearching ? (
                                                <div className="px-5 py-4 text-sm text-[var(--muted)] flex items-center gap-3">
                                                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                                                    Searching network...
                                                </div>
                                            ) : searchResults.length > 0 ? (
                                                <ul className="divide-y divide-[var(--border)]">
                                                    {searchResults.map(user => {
                                                        const { primary, secondary, logo } = getDisplayNameInfo(user);
                                                        return (
                                                            <li key={user.id} className="p-3 hover:bg-[var(--card-hover)] transition-colors flex items-center justify-between group">
                                                                <div className="flex items-center gap-3 min-w-0 pr-4">
                                                                    <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                                                                        {logo ? (
                                                                            <img src={logo} alt="Logo" className="w-full h-full object-cover rounded-full" />
                                                                        ) : (
                                                                            primary.charAt(0).toUpperCase()
                                                                        )}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-semibold text-[var(--text)] truncate">{primary}</p>
                                                                        <p className="text-xs text-[var(--muted)] truncate">{secondary}</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => handleConnect(user.id)}
                                                                    disabled={actionLoading === user.id}
                                                                    className="shrink-0 text-[11px] font-semibold bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-all border border-indigo-500/20"
                                                                >
                                                                    Connect
                                                                </button>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            ) : (
                                                <div className="px-5 py-4 text-sm text-[var(--muted)]">No businesses found matching that name.</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Search by Email */}
                                <div className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-2xl p-5 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-1000 delay-100" />
                                    <label className="block text-[13px] font-semibold text-[var(--text)] mb-3 uppercase tracking-wider">Direct Invite</label>
                                    <form onSubmit={handleEmailSearch} className="flex gap-3">
                                        <input
                                            type="email"
                                            required
                                            placeholder="exact@email.com"
                                            value={emailQuery}
                                            onChange={(e) => setEmailQuery(e.target.value)}
                                            className="flex-1 min-w-0 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--text)] text-sm placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-[var(--card-hover)] transition-all shadow-inner"
                                        />
                                        <button
                                            type="submit"
                                            className="bg-[var(--text)] hover:bg-indigo-400 text-[var(--bg)] px-5 py-3 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95 shrink-0"
                                        >
                                            Find
                                        </button>
                                    </form>

                                    {/* Inline Email Result */}
                                    {emailSearchStatus !== 'idle' && (
                                        <div className="mt-4">
                                            {emailSearchStatus === 'searching' && <p className="text-sm text-[var(--muted)]">Searching directory...</p>}
                                            {emailSearchStatus === 'not-found' && <p className="text-sm font-medium text-red-400">No Verihub account found with that email.</p>}
                                            {emailSearchStatus === 'found' && emailResult && (
                                                <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-xl flex items-center justify-between shadow-sm">
                                                    <div className="min-w-0 pr-4">
                                                        <p className="text-sm font-bold text-[var(--text)] truncate">{emailResult.businessName || emailResult.name}</p>
                                                        <p className="text-xs font-medium text-indigo-400 truncate">{emailResult.email}</p>
                                                    </div>
                                                    <button
                                                        onClick={() => handleConnect(emailResult.id)}
                                                        disabled={actionLoading === emailResult.id}
                                                        className="shrink-0 text-[11px] font-semibold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg disabled:opacity-50 transition-all shadow-md"
                                                    >
                                                        Connect
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Pending Requests */}
                    {incomingRequests.length > 0 && (
                        <div className="space-y-4">
                            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                                Pending Requests
                                <span className="bg-red-500/20 text-red-400 text-[10px] px-2 py-0.5 rounded-full font-bold">{incomingRequests.length}</span>
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {incomingRequests.map(req => {
                                    const { primary, secondary, logo } = getDisplayNameInfo(req.requester);
                                    return (
                                        <div key={req.id} className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="flex items-center gap-3 relative z-10">
                                                <div className="w-10 h-10 rounded-full bg-[var(--bg)] border border-[var(--border)] flex items-center justify-center text-[var(--text)] font-bold shrink-0 shadow-inner">
                                                    {logo ? (
                                                        <img src={logo} alt="Logo" className="w-full h-full object-cover rounded-full" />
                                                    ) : (
                                                        primary.charAt(0).toUpperCase()
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="text-[14px] font-bold text-[var(--text)]">{primary}</p>
                                                    <p className="text-[12px] text-[var(--muted)] mt-0.5">{secondary}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 w-full sm:w-auto relative z-10">
                                                <button
                                                    onClick={() => handleRespond(req.id, 'accepted')}
                                                    disabled={actionLoading === req.id}
                                                    className="flex-1 sm:flex-none text-[12px] font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-all shadow-sm active:scale-95"
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => handleRespond(req.id, 'declined')}
                                                    disabled={actionLoading === req.id}
                                                    className="flex-1 sm:flex-none text-[12px] font-bold bg-[var(--bg)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-hover)] px-4 py-2 rounded-lg transition-all active:scale-95"
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* My Connections Grid */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-[var(--text)]">My Network</h2>
                            <span className="text-sm font-medium text-[var(--muted)]">{connections.length} active</span>
                        </div>
                        
                        {connections.length === 0 ? (
                            <div className="bg-[var(--card)]/50 border border-[var(--border)] border-dashed rounded-3xl p-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-[var(--card-hover)] flex items-center justify-center mx-auto mb-4 border border-[var(--border)]">
                                    <svg className="w-8 h-8 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                </div>
                                <h3 className="text-[16px] font-bold text-[var(--text)] mb-2">No connections found</h3>
                                <p className="text-sm text-[var(--muted)] max-w-sm mx-auto mb-6">Build your business network to simplify billing and unlock shared features.</p>
                                <button
                                    onClick={() => setIsDiscoverOpen(true)}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95"
                                >
                                    Find Businesses
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                {connections.map(conn => (
                                    <ConnectionCard 
                                        key={conn.connectionId}
                                        connection={conn}
                                        onMessage={handleOpenMessages}
                                        isActionLoading={actionLoading === conn.connectionId}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Suggested Businesses */}
                    {suggestedBusinesses.length > 0 && (
                        <div className="space-y-4 pt-6 border-t border-[var(--border)]">
                            <h2 className="text-lg font-bold text-[var(--text)] flex items-center gap-2">
                                Suggested for you
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {suggestedBusinesses.map(user => {
                                    const { primary, secondary, logo } = getDisplayNameInfo(user);
                                    return (
                                        <div key={user.id} className="bg-[var(--card)]/50 backdrop-blur-xl border border-[var(--border)] p-4 rounded-[24px] flex flex-col items-center text-center gap-3 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                            <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                            <div className="w-14 h-14 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0 relative z-10">
                                                {logo ? (
                                                    <img src={logo} alt="Logo" className="w-full h-full object-cover rounded-full" />
                                                ) : (
                                                    primary.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                            <div className="relative z-10 w-full px-2">
                                                <p className="text-[14px] font-bold text-[var(--text)] truncate">{primary}</p>
                                                <p className="text-[12px] text-[var(--muted)] mt-0.5 truncate">{secondary}</p>
                                            </div>
                                            <button
                                                onClick={() => handleConnect(user.id)}
                                                disabled={actionLoading === user.id}
                                                className="w-full mt-1 text-[12px] font-bold bg-white/5 hover:bg-white/10 border border-white/5 text-[var(--text)] px-4 py-2 rounded-xl transition-all relative z-10"
                                            >
                                                Connect
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
