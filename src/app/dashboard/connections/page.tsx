"use client";

import { useState, useEffect, useCallback } from 'react';

type UserResult = {
    id: string;
    name: string | null;
    businessName: string | null;
    email?: string; // Only present in email search
};

type IncomingRequest = {
    id: string;
    requester: {
        id: string;
        name: string | null;
        businessName: string | null;
    };
};

type Connection = {
    connectionId: string;
    userId: string;
    name: string | null;
    businessName: string | null;
    connectedAt: string;
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

    // Messaging State
    const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [messageInput, setMessageInput] = useState('');
    const [isMessageLoading, setIsMessageLoading] = useState(false);
    const [authUserId, setAuthUserId] = useState<string | null>(null);

    // Attachment State
    const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
    const [userReceipts, setUserReceipts] = useState<Receipt[]>([]);
    const [selectedReceiptIds, setSelectedReceiptIds] = useState<string[]>([]);
    const [isFetchingReceipts, setIsFetchingReceipts] = useState(false);

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
            const [incomingRes, connectionsRes] = await Promise.all([
                fetch('/api/connections/incoming', { cache: 'no-store' }),
                fetch('/api/connections', { cache: 'no-store' })
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

    // Helper for rendering names
    const getDisplayNameInfo = (user: { name: string | null, businessName: string | null }) => {
        const primary = user.businessName || user.name || 'Unknown User';
        const secondary = user.businessName ? (user.name || 'Personal Account') : 'Personal Account';
        return { primary, secondary };
    };

    // Messaging Actions
    const handleOpenMessages = async (connection: Connection) => {
        setSelectedConnection(connection);
        setIsMessageLoading(true);
        try {
            const res = await fetch(`/api/messages/${connection.userId}`);
            if (res.ok) {
                setMessages(await res.json());
            } else {
                showToast("Failed to load messages.");
            }
        } catch (error) {
            showToast("An error occurred.");
        } finally {
            setIsMessageLoading(false);
        }
    };

    const handleCloseMessages = () => {
        setSelectedConnection(null);
        setMessages([]);
        setMessageInput('');
        setSelectedReceiptIds([]);
    };

    const handleOpenAttachModal = async () => {
        setIsAttachModalOpen(true);
        setIsFetchingReceipts(true);
        try {
            const res = await fetch('/api/receipts');
            if (res.ok) {
                setUserReceipts(await res.json());
            }
        } catch (error) {
            showToast("Failed to fetch receipts.");
        } finally {
            setIsFetchingReceipts(false);
        }
    };

    const toggleReceiptSelection = (receiptId: string) => {
        setSelectedReceiptIds(prev =>
            prev.includes(receiptId) ? prev.filter(id => id !== receiptId) : [...prev, receiptId]
        );
    };

    const handleSendMessage = async (e: React.FormEvent | React.KeyboardEvent) => {
        if ('preventDefault' in e) e.preventDefault();

        const text = messageInput.trim();
        if ((!text && selectedReceiptIds.length === 0) || !selectedConnection) return;

        const payloadText = text;
        const payloadReceipts = [...selectedReceiptIds];

        setMessageInput('');
        setSelectedReceiptIds([]);

        // Optimistic UI logic (mostly for text, attachments won't render fully optimistcally unless complex mocked)
        const optimisticMsg: Message = {
            id: `temp-${Date.now()}`,
            senderId: authUserId || '',
            receiverId: selectedConnection.userId,
            text: payloadText,
            createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, optimisticMsg]);

        try {
            const res = await fetch(`/api/messages/${selectedConnection.userId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: payloadText, receiptIds: payloadReceipts })
            });

            if (res.ok) {
                const actualMsg = await res.json();
                setMessages(prev => prev.map(m => m.id === optimisticMsg.id ? actualMsg : m));
            } else {
                setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
                const errData = await res.json();
                showToast(errData.error || "Failed to send message.");
            }
        } catch (error) {
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id));
            showToast("An error occurred sending the message.");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e);
        }
    };

    // Auto-scroll to newest message
    useEffect(() => {
        const scrollContainer = document.getElementById('message-thread');
        if (scrollContainer) {
            scrollContainer.scrollTop = scrollContainer.scrollHeight;
        }
    }, [messages]);

    return (
        <div className="min-h-screen bg-[#0B1220] p-4 sm:p-8">
            {toastMessage && (
                <div className="fixed top-4 right-4 bg-gray-800 text-gray-100 px-4 py-2 rounded shadow-lg border border-gray-700 z-50 transition-opacity">
                    {toastMessage}
                </div>
            )}

            <div className="max-w-6xl mx-auto space-y-6">

                {/* SECTION 1: Header & Pill Badges */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-100 mb-1">Business Network</h1>
                        <p className="text-gray-400 text-sm">Manage your private business connections.</p>
                    </div>
                    <div className="flex gap-2">
                        <div className="bg-[#1F2937]/40 border border-[#374151]/40 rounded-full px-3 py-1 flex items-center">
                            <span className="text-xs text-gray-400 mr-2">Connections</span>
                            <span className="text-xs font-medium text-gray-200">{connections.length}</span>
                        </div>
                        <div className="bg-[#1F2937]/40 border border-[#374151]/40 rounded-full px-3 py-1 flex items-center">
                            <span className="text-xs text-gray-400 mr-2">Pending</span>
                            <span className="text-xs font-medium text-gray-200">{incomingRequests.length}</span>
                        </div>
                    </div>
                </div>

                {/* MAIN GRID: 60/40 Split */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* LEFT COLUMN (60%): Search Module */}
                    <div className="lg:col-span-3">
                        <section className="bg-[#0F172A] border border-white/5 shadow-sm rounded-lg p-5 sm:p-6 space-y-8">

                            {/* Search by Name/Business */}
                            <div className="relative">
                                <label className="block text-sm font-medium text-gray-300 mb-2">Search by Name or Business</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Enter name..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="block w-full pl-9 pr-3 py-2 bg-[#1E293B]/50 border border-white/10 rounded-md text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 hover:bg-[#1E293B] transition-colors"
                                    />
                                </div>

                                {/* Floating Dropdown */}
                                {searchQuery.length >= 2 && (
                                    <div className="absolute z-10 mt-1 w-full bg-[#1E293B] border border-white/10 rounded-md shadow-lg max-h-60 overflow-y-auto">
                                        {isSearching ? (
                                            <div className="px-4 py-3 text-sm text-gray-400">Searching...</div>
                                        ) : searchResults.length > 0 ? (
                                            <ul className="divide-y divide-white/5">
                                                {searchResults.map(user => {
                                                    const { primary, secondary } = getDisplayNameInfo(user);
                                                    return (
                                                        <li key={user.id} className="p-3 hover:bg-[#334155]/50 transition-colors flex items-center justify-between group">
                                                            <div>
                                                                <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">{primary}</p>
                                                                <p className="text-xs text-gray-500">{secondary}</p>
                                                            </div>
                                                            <button
                                                                onClick={() => handleConnect(user.id)}
                                                                disabled={actionLoading === user.id}
                                                                className="text-[11px] font-medium bg-indigo-600/90 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full disabled:opacity-50 transition-colors"
                                                            >
                                                                Connect
                                                            </button>
                                                        </li>
                                                    );
                                                })}
                                            </ul>
                                        ) : (
                                            <div className="px-4 py-3 text-sm text-gray-400">No available users found.</div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Search by Exact Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Search by Full Email</label>
                                <form onSubmit={handleEmailSearch} className="flex gap-2">
                                    <input
                                        type="email"
                                        required
                                        placeholder="exact@email.com"
                                        value={emailQuery}
                                        onChange={(e) => setEmailQuery(e.target.value)}
                                        className="flex-1 bg-[#1E293B]/50 border border-white/10 rounded-md px-3 py-2 text-gray-100 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 hover:bg-[#1E293B] transition-colors"
                                    />
                                    <button
                                        type="submit"
                                        className="bg-[#334155] hover:bg-[#475569] text-gray-200 px-4 py-2 rounded-md text-sm border border-transparent transition-colors shadow-sm"
                                    >
                                        Search
                                    </button>
                                </form>

                                {/* Inline Email Result */}
                                {emailSearchStatus !== 'idle' && (
                                    <div className="mt-3">
                                        {emailSearchStatus === 'searching' && <p className="text-sm text-gray-400">Searching...</p>}
                                        {emailSearchStatus === 'not-found' && <p className="text-sm text-gray-400 text-red-400/80">No user found.</p>}
                                        {emailSearchStatus === 'found' && emailResult && (
                                            <div className="bg-[#1E293B] border border-white/5 p-3 rounded-md flex items-center justify-between">
                                                <div>
                                                    {emailResult.businessName && <p className="text-sm font-medium text-gray-200">{emailResult.businessName}</p>}
                                                    {emailResult.name && <p className="text-sm font-medium text-gray-200">{emailResult.name}</p>}
                                                    <p className="text-xs text-indigo-400/90 mt-0.5">{emailResult.email}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleConnect(emailResult.id)}
                                                    disabled={actionLoading === emailResult.id}
                                                    className="text-[11px] font-medium bg-indigo-600/90 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-full disabled:opacity-50 transition-colors"
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
                        <section className="bg-[#0F172A] border border-white/5 shadow-sm rounded-lg p-5 flex flex-col">
                            <h2 className="text-[15px] font-medium text-gray-200 mb-3">Incoming Requests</h2>
                            <div className="flex-1 space-y-2">
                                {incomingRequests.length === 0 ? (
                                    <div className="pt-2">
                                        <p className="text-sm font-medium text-gray-300">No pending requests</p>
                                        <p className="text-xs text-gray-500 mt-0.5">When someone connects with you, they’ll appear here.</p>
                                    </div>
                                ) : (
                                    incomingRequests.map(req => {
                                        const { primary, secondary } = getDisplayNameInfo(req.requester);
                                        return (
                                            <div key={req.id} className="bg-[#1E293B]/60 hover:bg-[#1E293B] transition-colors border border-white/5 p-3 rounded-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
                                                <div>
                                                    <p className="text-[13px] font-medium text-gray-200 group-hover:text-white transition-colors">{primary}</p>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">{secondary}</p>
                                                </div>
                                                <div className="flex gap-2 shrink-0">
                                                    <button
                                                        onClick={() => handleRespond(req.id, 'accepted')}
                                                        disabled={actionLoading === req.id}
                                                        className="text-[11px] font-medium bg-indigo-600/90 hover:bg-indigo-500 text-white px-3 py-1 rounded transition-colors"
                                                    >
                                                        Accept
                                                    </button>
                                                    <button
                                                        onClick={() => handleRespond(req.id, 'declined')}
                                                        disabled={actionLoading === req.id}
                                                        className="text-[11px] font-medium bg-transparent border border-white/10 text-gray-400 hover:text-gray-200 hover:bg-white/5 px-3 py-1 rounded transition-colors"
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
                        <section className="bg-[#0F172A] border border-white/5 shadow-sm rounded-lg p-5 flex flex-col">
                            <h2 className="text-[15px] font-medium text-gray-200 mb-3">My Connections</h2>
                            <div className="flex-1 space-y-2">
                                {connections.length === 0 ? (
                                    <div className="pt-2">
                                        <p className="text-sm font-medium text-gray-300">No connections yet</p>
                                        <p className="text-xs text-gray-500 mt-0.5">Search for a business to start building your network.</p>
                                    </div>
                                ) : (
                                    connections.map(conn => {
                                        const { primary, secondary } = getDisplayNameInfo(conn);
                                        return (
                                            <div
                                                key={conn.connectionId}
                                                onClick={() => handleOpenMessages(conn)}
                                                className="bg-[#1E293B]/60 hover:bg-[#1E293B] cursor-pointer transition-colors border border-white/5 p-3 rounded-md flex justify-between items-center group"
                                            >
                                                <div>
                                                    <p className="text-[13px] font-medium text-gray-200 group-hover:text-white transition-colors">{primary}</p>
                                                    <p className="text-[11px] text-gray-500 mt-0.5">{secondary}</p>
                                                </div>
                                                <div className="text-gray-500 group-hover:text-white/80 transition-transform duration-150 group-hover:translate-x-1">
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

            {/* SLIDE-OVER MESSAGING PANEL */}
            {selectedConnection && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity"
                        onClick={handleCloseMessages}
                    />

                    {/* Panel */}
                    <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[60%] bg-[#0B1220] shadow-2xl shadow-black/50 border-l border-white/5 flex flex-col transform transition-transform duration-200 ease-out translate-x-0">

                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0 bg-[#0F172A]">
                            <div className="flex items-center gap-3">
                                {/* Avatar */}
                                <div className="h-10 w-10 shrink-0 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center">
                                    <span className="text-indigo-300 font-semibold text-sm">
                                        {getDisplayNameInfo(selectedConnection).primary.charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                {/* Info */}
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h2 className="text-gray-100 font-semibold text-[15px]">
                                            {getDisplayNameInfo(selectedConnection).primary}
                                        </h2>
                                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] px-1.5 py-0.5 uppercase tracking-wider rounded font-medium">
                                            Connected
                                        </span>
                                    </div>
                                    <p className="text-gray-400 text-xs mt-0.5">
                                        {getDisplayNameInfo(selectedConnection).secondary}
                                    </p>
                                </div>
                            </div>

                            <button
                                onClick={handleCloseMessages}
                                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Body (Messages) */}
                        <div id="message-thread" className="flex-1 overflow-y-auto p-6 space-y-5 bg-[#0B1220]">
                            {isMessageLoading ? (
                                <div className="flex justify-center py-8">
                                    <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 pb-10">
                                    <div className="h-12 w-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm">No messages yet.</p>
                                    <p className="text-xs mt-1">Send a direct message to start the conversation.</p>
                                </div>
                            ) : (
                                messages.map(msg => {
                                    const isSelf = msg.senderId === authUserId;
                                    return (
                                        <div key={msg.id} className={`flex flex-col max-w-[85%] ${isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                            {/* Render Text Body */}
                                            {msg.text && (
                                                <div className={`px-4 py-2.5 rounded-2xl text-[14px] leading-relaxed relative shadow-sm mb-1
                                                    ${isSelf
                                                        ? 'bg-indigo-600 text-white rounded-br-sm'
                                                        : 'bg-[#1E293B] border border-white/5 text-gray-200 rounded-bl-sm'
                                                    }`}
                                                >
                                                    {msg.text.split('\n').map((line, i) => (
                                                        <span key={i}>{line}<br /></span>
                                                    ))}
                                                </div>
                                            )}

                                            {/* Render Attachments */}
                                            {msg.receipts && msg.receipts.length > 0 && (
                                                <div className={`flex flex-col gap-2 mt-1 ${isSelf ? 'items-end' : 'items-start'}`}>
                                                    {msg.receipts.map((assoc: any) => {
                                                        const receipt = assoc.receipt;
                                                        return (
                                                            <div key={receipt.id} className="bg-[#111A2C] border border-white/10 p-3 rounded-lg shadow-sm flex items-center justify-between min-w-[200px] max-w-[280px] gap-4">
                                                                <div className="flex items-center gap-3 overflow-hidden">
                                                                    <div className="h-8 w-8 bg-indigo-500/10 rounded flex items-center justify-center text-indigo-400 shrink-0">
                                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                                        </svg>
                                                                    </div>
                                                                    <div className="truncate">
                                                                        <p className="text-[13px] font-semibold text-gray-200 truncate">{receipt.clientName || 'Unnamed Receipt'}</p>
                                                                        <div className="flex gap-2 items-center mt-0.5">
                                                                            <span className="text-[11px] font-medium text-indigo-300/80">${(receipt.total || 0).toFixed(2)}</span>
                                                                            <span className="text-[10px] text-gray-500">{new Date(receipt.createdAt).toLocaleDateString()}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                <a
                                                                    href={`/api/messages/download/${receipt.id}`}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="shrink-0 p-1.5 bg-white/5 hover:bg-white/10 rounded text-gray-300 transition-colors"
                                                                    title="Download Attachment"
                                                                >
                                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                                                    </svg>
                                                                </a>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}

                                            <span className="text-[10px] text-gray-500 mt-1 px-1">
                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    );
                                })
                            )}
                        </div>

                        {/* Footer (Input) */}
                        <div className="p-4 sm:p-5 bg-[#0F172A] border-t border-white/10 shrink-0">
                            {/* Selected Chips */}
                            {selectedReceiptIds.length > 0 && (
                                <div className="flex flex-wrap gap-2 mb-3">
                                    {selectedReceiptIds.map(id => {
                                        const r = userReceipts.find(u => u.id === id);
                                        return (
                                            <div key={id} className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <span className="truncate max-w-[100px]">{r?.clientName || 'Receipt'}</span>
                                                <button type="button" onClick={() => toggleReceiptSelection(id)} className="hover:text-white ml-0.5">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                    </svg>
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                            <form
                                onSubmit={handleSendMessage}
                                className="flex items-end gap-2 bg-[#1E293B]/50 border border-white/10 rounded-xl p-2 focus-within:ring-1 focus-within:ring-indigo-500/50 focus-within:border-indigo-500/30 transition-shadow"
                            >
                                <button
                                    type="button"
                                    onClick={handleOpenAttachModal}
                                    className="h-[44px] w-[44px] shrink-0 text-gray-400 hover:text-gray-200 hover:bg-white/5 rounded-lg flex items-center justify-center transition-colors"
                                    title="Attach Receipt"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                                    </svg>
                                </button>
                                <textarea
                                    className="flex-1 max-h-32 min-h-[44px] bg-transparent resize-none outline-none text-gray-200 text-sm px-2 py-3 placeholder:text-gray-500"
                                    placeholder="Type a message..."
                                    rows={1}
                                    value={messageInput}
                                    onChange={(e) => {
                                        e.target.style.height = 'auto';
                                        e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
                                        setMessageInput(e.target.value);
                                    }}
                                    onKeyDown={handleKeyDown}
                                />
                                <button
                                    type="submit"
                                    className="h-[44px] w-[44px] shrink-0 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 -ml-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                                    </svg>
                                </button>
                            </form>
                            <div className="mt-2 text-center text-[10px] text-gray-500">
                                Press <span className="text-gray-400 font-medium">Enter</span> to send, <span className="text-gray-400 font-medium">Shift + Enter</span> for new line. End-to-end secured.
                            </div>
                        </div>

                    </div>
                </>
            )}

            {/* ATTACHMENT MODAL */}
            {isAttachModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsAttachModalOpen(false)} />
                    <div className="relative bg-[#0F172A] border border-white/10 rounded-xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh]">
                        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 shrink-0">
                            <h3 className="text-[16px] font-semibold text-gray-100">Attach Receipts</h3>
                            <button onClick={() => setIsAttachModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">
                            {isFetchingReceipts ? (
                                <p className="text-center text-sm text-gray-400">Loading your receipts...</p>
                            ) : userReceipts.length === 0 ? (
                                <p className="text-center text-sm text-gray-400 py-4">You have no stored receipts.</p>
                            ) : (
                                <div className="space-y-3">
                                    {userReceipts.map(receipt => {
                                        const isSelected = selectedReceiptIds.includes(receipt.id);
                                        return (
                                            <button
                                                key={receipt.id}
                                                type="button"
                                                onClick={() => toggleReceiptSelection(receipt.id)}
                                                className={`w-full text-left p-3 rounded border flex items-center justify-between transition-colors
                                                    ${isSelected ? 'bg-indigo-600/10 border-indigo-500/50' : 'bg-[#1E293B]/50 border-white/5 hover:border-white/10'}`}
                                            >
                                                <div>
                                                    <p className={`text-[14px] font-medium ${isSelected ? 'text-indigo-200' : 'text-gray-200'}`}>
                                                        {receipt.clientName || 'Unnamed Receipt'}
                                                    </p>
                                                    <div className="flex gap-2 text-[12px] opacity-70 mt-0.5">
                                                        <span>${(receipt.total || 0).toFixed(2)}</span>
                                                        <span>•</span>
                                                        <span>{new Date(receipt.createdAt).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                                <div className={`h-5 w-5 rounded border flex items-center justify-center shrink-0 transition-colors
                                                    ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-gray-500 text-transparent'}`}
                                                >
                                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                                    </svg>
                                                </div>
                                            </button>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-white/5 flex gap-3 shrink-0 bg-[#0B1220] rounded-b-xl">
                            <button
                                onClick={() => setIsAttachModalOpen(false)}
                                className="flex-1 bg-transparent hover:bg-white/5 border border-white/10 text-gray-300 font-medium py-2 rounded transition-colors text-sm"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
