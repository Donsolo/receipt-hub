"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

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

    // Connections State
    const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Toast State
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Messaging Routing State
    const [authUserId, setAuthUserId] = useState<string | null>(null);

    const router = useRouter();

    // Fetch auth userId on mount for message rendering logic
    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.user) setAuthUserId(data.user.id);
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

    const getDisplayNameInfo = (user: { name: string | null, businessName: string | null, email?: string | null }) => {
        const primary = getDisplayName(user);
        const secondary = user.businessName ? (user.name || 'Personal Account') : 'Personal Account';
        return { primary, secondary };
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
        <div className="min-h-screen bg-[var(--bg)] p-4 sm:p-8">
            {toastMessage && (
                <div className="fixed top-4 right-4 bg-[var(--card)] text-[var(--text)] px-4 py-2 rounded shadow-lg border border-[var(--border)] z-50 transition-opacity">
                    {toastMessage}
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-6">

                {/* SECTION 1: Header & Pill Badges */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Business Network</h1>
                        <p className="text-[var(--muted)] text-sm">Manage your private business connections.</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-[var(--card)]/40 border border-[var(--border)] rounded-full px-3 py-1 flex items-center">
                            <span className="text-xs text-[var(--muted)] mr-2">Connections</span>
                            <span className="text-xs font-medium text-[var(--text)]">{connections.length}</span>
                        </div>
                        <div className="bg-[var(--card)]/40 border border-[var(--border)] rounded-full px-3 py-1 flex items-center">
                            <span className="text-xs text-[var(--muted)] mr-2">Pending</span>
                            <span className="text-xs font-medium text-[var(--text)]">{incomingRequests.length}</span>
                        </div>
                    </div>
                </div>

                {/* MAIN GRID: 60/40 Split */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* LEFT COLUMN (60%): Search Module */}
                    <div className="lg:col-span-3">
                        <section className="bg-[var(--bg)] border border-[var(--border)] shadow-sm rounded-lg p-5 sm:p-6 space-y-8">

                            {/* Search by Name/Business */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-[var(--text)] mb-2">Search by Name or Business</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-4 w-4 text-[var(--muted)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Enter name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="block w-full pl-9 pr-3 py-2 bg-[var(--card-hover)]/50 border border-[var(--border)] rounded-md text-[var(--text)] text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 hover:bg-[var(--card-hover)] transition-colors"
                                    />
                                </div>

                                {/* Floating Dropdown */}
                                {searchQuery.length >= 2 && (
                                    <div className="absolute z-10 mt-1 w-full bg-[var(--card-hover)] border border-[var(--border)] rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        {isSearching ? (
                                            <div className="px-4 py-3 text-sm text-[var(--muted)]">Searching...</div>
                                        ) : searchResults.length > 0 ? (
                                            <ul className="divide-y divide-white/5">
                                                {searchResults.map(user => {
                                                    const { primary, secondary } = getDisplayNameInfo(user);
                                                    return (
                                                        <li key={user.id} className="p-3 hover:bg-[var(--card)] transition-colors flex items-center justify-between group">
                                                            <div>
                                                                <p className="text-sm font-medium text-[var(--text)] group-hover:text-[var(--text)] transition-colors">{primary}</p>
                                                                <p className="text-xs text-[var(--muted)]">{secondary}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleConnect(user.id)}
                                                                disabled={actionLoading === user.id}
                                                                className="text-[11px] font-medium bg-indigo-600/90 hover:bg-indigo-500 text-[var(--text)] px-3 py-1.5 rounded-full disabled:opacity-50 transition-colors"
                                                            >
                                                                Connect
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (
                                            <div className="px-4 py-3 text-sm text-[var(--muted)]">No available users found.</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Search by Exact Email */}
                            <div>
                                <label className="block text-sm font-medium text-[var(--text)] mb-2">Search by Full Email</label>
                                <form onSubmit={handleEmailSearch} className="flex gap-2">
                                    <input
                                        type="email"
                                        required
                                        placeholder="exact@email.com"
                                        value={emailQuery}
                                        onChange={(e) => setEmailQuery(e.target.value)}
                                        className="flex-1 bg-[var(--card-hover)]/50 border border-[var(--border)] rounded-md px-3 py-2 text-[var(--text)] text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 hover:bg-[var(--card-hover)] transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-[var(--card)] hover:bg-[var(--card-hover)] text-[var(--text)] px-4 py-2 rounded-md text-sm border border-transparent transition-colors shadow-sm"
                                    >
                                        Search
                                    </button>
                                </form>

                                {/* Inline Email Result */}
                                {emailSearchStatus !== 'idle' && (
                                    <div className="mt-3">
                                        {emailSearchStatus === 'searching' && <p className="text-sm text-[var(--muted)]">Searching...</p>}
                                        {emailSearchStatus === 'not-found' && <p className="text-sm text-[var(--muted)] text-red-400/80">No user found.</p>}
                                        {emailSearchStatus === 'found' && emailResult && (
                                            <div className="bg-[var(--card-hover)] border border-[var(--border)] p-3 rounded-md flex items-center justify-between">
                                                <div>
                                                    {emailResult.businessName && <p className="text-sm font-medium text-[var(--text)]">{emailResult.businessName}</p>}
                                                    {emailResult.name && <p className="text-sm font-medium text-[var(--text)]">{emailResult.name}</p>}
                                                    <p className="text-xs text-indigo-400/90 mt-0.5">{emailResult.email}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleConnect(emailResult.id)}
                                                    disabled={actionLoading === emailResult.id}
                                                    className="text-[11px] font-medium bg-indigo-600/90 hover:bg-indigo-500 text-[var(--text)] px-3 py-1.5 rounded-full disabled:opacity-50 transition-colors"
                                                >
                                                    Connect
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* RIGHT COLUMN (40%): Activity Modules */}
                    <div className="lg:col-span-2 space-y-6">

                        {/* Incoming Requests */}
                        <section className="bg-[var(--bg)] border border-[var(--border)] shadow-sm rounded-lg p-5 flex flex-col">
                            <h2 className="text-[15px] font-medium text-[var(--text)] mb-3">Incoming Requests</h2>
                            <div className="flex-1 space-y-2">
                                {incomingRequests.length === 0 ? (
                                    <div className="pt-2">
                                        <p className="text-sm font-medium text-[var(--text)]">No pending requests</p>
                                        <p className="text-xs text-[var(--muted)] mt-0.5">When someone connects with you, they’ll appear here.</p>
                                    </div>
                                ) : (
                                    incomingRequests.map(req => {
                                        const { primary, secondary } = getDisplayNameInfo(req.requester);
                                        return (
                                            <div key={req.id} className="bg-[var(--card-hover)]/60 hover:bg-[var(--card-hover)] transition-colors border border-[var(--border)] p-3 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                                                <div>
                                                    <p className="text-[13px] font-medium text-[var(--text)] group-hover:text-[var(--text)] transition-colors">{primary}</p>
                                                    <p className="text-[11px] text-[var(--muted)] mt-0.5">{secondary}</p>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handleRespond(req.id, 'accepted')}
                                                        disabled={actionLoading === req.id}
                                                        className="text-[11px] font-medium bg-indigo-600/90 hover:bg-indigo-500 text-[var(--text)] px-3 py-1 rounded transition-colors"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleRespond(req.id, 'declined')}
                                                        disabled={actionLoading === req.id}
                                                        className="text-[11px] font-medium bg-transparent border border-[var(--border)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--card-hover)] px-3 py-1 rounded transition-colors"
                                                    >
                                                        Decline
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </section>

                        {/* My Connections */}
                        <section className="bg-[var(--bg)] border border-[var(--border)] shadow-sm rounded-lg p-5 flex flex-col">
                            <h2 className="text-[15px] font-medium text-[var(--text)] mb-3">My Connections</h2>
                            <div className="flex-1 space-y-2">
                                {connections.length === 0 ? (
                                    <div className="pt-2">
                                        <p className="text-sm font-medium text-[var(--text)]">No connections yet</p>
                                        <p className="text-xs text-[var(--muted)] mt-0.5">Search for a business to start building your network.</p>
                                    </div>
                                ) : (
                                    connections.map(conn => {
                                        console.log('connection.connectedUser:', conn.connectedUser);
                                        const { primary, secondary } = getDisplayNameInfo(conn.connectedUser);
                                        return (
                                            <div
                                                key={conn.connectionId}
                                                onClick={() => handleOpenMessages(conn)}
                                                className="bg-[var(--card-hover)]/60 hover:bg-[var(--card-hover)] cursor-pointer transition-colors border border-[var(--border)] p-3 rounded-md flex justify-between items-center group"
                                            >
                                                <div>
                                                    <p className="text-[13px] font-medium text-[var(--text)] group-hover:text-[var(--text)] transition-colors">{primary}</p>
                                                    <p className="text-[11px] text-[var(--muted)] mt-0.5">{secondary}</p>
                                                </div>
                                                <div className="text-[var(--muted)] group-hover:text-white/80 transition-transform duration-150 group-hover:translate-x-1">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </section>

                    </div>
                </div>

            </div>
        </div>
    );
}
