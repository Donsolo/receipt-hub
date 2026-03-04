"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type UserParticipant = {
    id: string;
    name: string;
    businessName: string | null;
    businessLogoPath: string | null;
    email: string;
};

type Message = {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
    deliveredAt: string | null;
    readAt: string | null;
    attachments: any[];
};

export default function ChatClient({ conversationId }: { conversationId: string }) {
    const router = useRouter();
    const [authUserId, setAuthUserId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [otherParticipant, setOtherParticipant] = useState<UserParticipant | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [messageInput, setMessageInput] = useState('');
    const [isTyping, setIsTyping] = useState(false); // Simulated
    const scrollRef = useRef<HTMLDivElement>(null);

    // Fetch Auth User
    useEffect(() => {
        fetch('/api/auth/me')
            .then(res => res.json())
            .then(data => {
                if (data.id) setAuthUserId(data.id);
            })
            .catch(() => { });
    }, []);

    // Load Conversation Metadata (via the list API)
    useEffect(() => {
        if (!authUserId) return;
        fetch('/api/conversations')
            .then(res => res.json())
            .then((data: any[]) => {
                const convo = data.find(c => c.id === conversationId);
                if (convo) {
                    const otherUser = convo.participants.find((p: any) => p.userId !== authUserId)?.user;
                    if (otherUser) setOtherParticipant(otherUser);
                } else {
                    router.push('/dashboard/messages');
                }
            })
            .catch(() => { });
    }, [conversationId, authUserId, router]);

    // Fetch Messages
    useEffect(() => {
        if (!authUserId) return;
        const fetchMsgs = async () => {
            try {
                const res = await fetch(`/api/conversations/${conversationId}/messages`);
                if (res.ok) {
                    setMessages(await res.json());
                }
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchMsgs();

        // Polling simulation every 5s
        const interval = setInterval(fetchMsgs, 5000);
        return () => clearInterval(interval);
    }, [conversationId, authUserId]);

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = messageInput.trim();
        if (!text) return;

        setMessageInput('');

        // Optimistic
        const tempId = `temp-${Date.now()}`;
        const newMsg: Message = {
            id: tempId,
            content: text,
            senderId: authUserId!,
            createdAt: new Date().toISOString(),
            deliveredAt: null,
            readAt: null,
            attachments: []
        };
        setMessages(prev => [...prev, newMsg]);

        try {
            const res = await fetch(`/api/conversations/${conversationId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text })
            });
            if (res.ok) {
                const actualMsg = await res.json();
                setMessages(prev => prev.map(m => m.id === tempId ? actualMsg : m));
            } else {
                setMessages(prev => prev.filter(m => m.id !== tempId));
            }
        } catch (error) {
            setMessages(prev => prev.filter(m => m.id !== tempId));
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage(e as any);
        }
    };

    // Calculate Grouping and Status Markers
    const groupedMessages: { type: 'DATE' | 'MESSAGE', payload: any }[] = [];
    let lastDateStr = '';
    let lastSenderId = '';
    let lastTimeObj: Date | null = null;

    messages.forEach((msg, idx) => {
        const msgDateObj = new Date(msg.createdAt);
        const dateStr = msgDateObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

        // Date Separators
        if (dateStr !== lastDateStr) {
            // Compare to Today/Yesterday
            const todayStr = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
            const yesterdayObj = new Date();
            yesterdayObj.setDate(yesterdayObj.getDate() - 1);
            const yesterdayStr = yesterdayObj.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });

            let displayDate = dateStr;
            if (dateStr === todayStr) displayDate = 'Today';
            else if (dateStr === yesterdayStr) displayDate = 'Yesterday';

            groupedMessages.push({ type: 'DATE', payload: displayDate });
            lastDateStr = dateStr;
            lastSenderId = ''; // Break grouping across days
        }

        // 5-Minute Window Grouping
        let isGrouped = false;
        if (msg.senderId === lastSenderId && lastTimeObj) {
            const diffMs = msgDateObj.getTime() - lastTimeObj.getTime();
            if (diffMs <= 5 * 60 * 1000) {
                isGrouped = true;
            }
        }

        groupedMessages.push({
            type: 'MESSAGE',
            payload: {
                ...msg,
                isGrouped,
                // Only show avatar if it's the TOP of a group (not grouped!)
                // Wait, Slack shows avatar at the top. So !isGrouped.
                showAvatar: !isGrouped,
                // Status indicator applies only to the LAST message of a group, or we can just slap it on every msg but visually only show on bottom. Let's compute that later.
                isLastInGroup: false
            }
        });

        // Set isLastInGroup on the previous
        if (isGrouped && groupedMessages.length >= 2) {
            // Unset the previous one's last status
            for (let i = groupedMessages.length - 2; i >= 0; i--) {
                const prev = groupedMessages[i];
                if (prev.type === 'MESSAGE' && prev.payload.senderId === msg.senderId) {
                    prev.payload.isLastInGroup = false;
                    break;
                }
            }
        }

        groupedMessages[groupedMessages.length - 1].payload.isLastInGroup = true;

        lastSenderId = msg.senderId;
        lastTimeObj = msgDateObj;
    });

    // Mock Status Indicators
    const getStatusIcon = (msg: Message) => {
        if (!authUserId || msg.senderId !== authUserId) return null;
        if (msg.readAt) return <span className="text-blue-500 font-bold tracking-tighter text-[10px]">✓✓</span>;
        if (msg.deliveredAt) return <span className="text-gray-400 font-bold tracking-tighter text-[10px]">✓✓</span>;
        return <span className="text-gray-400 font-bold text-[10px]">✓</span>;
    };

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] md:h-[calc(100vh-0px)] bg-[#F7F8FA] dark:bg-[var(--bg)] font-sans">
            {/* STICKY HEADER */}
            <header className="sticky top-0 z-20 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-[var(--card)]/80 backdrop-blur-md border-b border-gray-200 dark:border-[var(--border)] shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/messages" className="p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-[var(--muted)] dark:hover:text-[var(--text)] transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-[var(--card-hover)] lg:hidden">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    </Link>

                    {isLoading || !otherParticipant ? (
                        <div className="flex items-center gap-3 animate-pulse">
                            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
                            <div className="space-y-2">
                                <div className="h-4 w-32 bg-gray-200 dark:bg-gray-800 rounded"></div>
                                <div className="h-3 w-20 bg-gray-200 dark:bg-gray-800 rounded"></div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="h-10 w-10 shrink-0 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-full flex items-center justify-center text-indigo-500 overflow-hidden font-bold">
                                    {otherParticipant.businessLogoPath ? (
                                        <img src={otherParticipant.businessLogoPath} alt="Logo" className="h-full w-full object-cover" />
                                    ) : (
                                        (otherParticipant.businessName || otherParticipant.name || "U").charAt(0).toUpperCase()
                                    )}
                                </div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 ring-2 ring-white dark:ring-[var(--card)] rounded-full"></div>
                            </div>
                            <div className="flex flex-col">
                                <h2 className="text-[15px] font-semibold text-gray-900 dark:text-[var(--text)] leading-tight">
                                    {otherParticipant.businessName || otherParticipant.name || "User"}
                                </h2>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <span className="text-[12px] text-gray-500 dark:text-[var(--muted)]">{otherParticipant.name || otherParticipant.email}</span>
                                    <span className="w-1 h-1 bg-gray-300 dark:bg-gray-700 rounded-full"></span>
                                    <span className="text-[11px] text-green-600 dark:text-emerald-400 font-medium tracking-wide items-center flex gap-1">
                                        Connected
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-indigo-600 dark:text-[var(--muted)] dark:hover:text-indigo-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-[var(--card-hover)]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </button>
                    <button className="p-2 text-gray-400 hover:text-indigo-600 dark:text-[var(--muted)] dark:hover:text-indigo-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-[var(--card-hover)]">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                    </button>
                </div>
            </header>

            {/* MESSAGE LIST SCROLL AREA */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-2 relative">

                {isLoading && messages.length === 0 ? (
                    <div className="flex justify-center py-10">
                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : groupedMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20">
                        <div className="w-16 h-16 bg-white dark:bg-[var(--card)] shadow-sm border border-gray-100 dark:border-[var(--border)] rounded-full flex items-center justify-center mb-4">
                            <span className="text-2xl">👋</span>
                        </div>
                        <h3 className="text-gray-900 dark:text-[var(--text)] font-semibold text-lg">Say hello</h3>
                        <p className="text-gray-500 dark:text-[var(--muted)] text-sm max-w-[250px] mt-1">
                            This is the beginning of your direct message history with {otherParticipant?.businessName || otherParticipant?.name}.
                        </p>
                    </div>
                ) : (
                    groupedMessages.map((item, idx) => {
                        if (item.type === 'DATE') {
                            return (
                                <div key={`date-${idx}`} className="flex justify-center my-6">
                                    <span className="text-[12px] font-medium bg-gray-200/50 dark:bg-[var(--card-hover)] text-gray-500 dark:text-[var(--muted)] px-3 py-1 rounded-full shadow-sm">
                                        {item.payload}
                                    </span>
                                </div>
                            );
                        }

                        const msg = item.payload;
                        const isSelf = msg.senderId === authUserId;
                        const isGrouped = msg.isGrouped;
                        const showAvatar = !isSelf && msg.showAvatar;

                        return (
                            <div key={msg.id} className={`flex w-full ${isSelf ? 'justify-end' : 'justify-start'} ${isGrouped ? 'mt-1' : 'mt-4'}`}>

                                {/* Receiver Avatar Engine */}
                                {!isSelf && (
                                    <div className="w-8 shrink-0 flex items-end mr-2">
                                        {showAvatar && (
                                            <div className="h-8 w-8 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center overflow-hidden">
                                                {otherParticipant?.businessLogoPath ? (
                                                    <img src={otherParticipant.businessLogoPath} alt="Avatar" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-indigo-400 font-bold text-xs">{(otherParticipant?.businessName || otherParticipant?.name || "U").charAt(0).toUpperCase()}</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className={`flex flex-col max-w-[70%] ${isSelf ? 'items-end' : 'items-start'}`}>
                                    {/* Bubble Container */}
                                    <div className="group relative">
                                        {msg.content && (
                                            <div className={`px-[14px] py-[10px] text-[15px] leading-relaxed relative ${isSelf ? 'bg-indigo-600 text-white rounded-[18px] rounded-br-[4px] shadow-sm' : 'bg-white dark:bg-[var(--card)] text-gray-800 dark:text-[var(--text)] border border-gray-200 dark:border-[var(--border)] rounded-[18px] rounded-bl-[4px] shadow-sm'}`}>
                                                {msg.content.split('\n').map((line: string, i: number) => (
                                                    <span key={i}>{line}{i !== msg.content.split('\n').length - 1 && <br />}</span>
                                                ))}
                                            </div>
                                        )}

                                        {/* Status / Timestamp */}
                                        {msg.isLastInGroup && (
                                            <div className={`flex items-center gap-1.5 mt-1 text-[11px] font-medium ${isSelf ? 'justify-end pr-1 text-gray-400 dark:text-[var(--muted)]' : 'justify-start pl-1 text-gray-400 dark:text-[var(--muted)]'}`}>
                                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                                                {isSelf && getStatusIcon(msg)}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}

                {/* Simulated Typing Indicator */}
                {isTyping && (
                    <div className="flex w-full justify-start mt-4">
                        <div className="w-8 shrink-0 mr-2"></div>
                        <div className="bg-white dark:bg-[var(--card)] border border-gray-200 dark:border-[var(--border)] px-4 py-3 rounded-2xl rounded-bl-sm shadow-sm flex items-center gap-1.5 w-fit">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        </div>
                    </div>
                )}
            </div>

            {/* RICH DESKTOP INPUT AREA */}
            <div className="p-4 sm:p-5 pb-6 bg-white dark:bg-[var(--card)] border-t border-gray-200 dark:border-[var(--border)] shrink-0 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)] z-20">
                <div className="max-w-4xl mx-auto relative">
                    <form
                        onSubmit={handleSendMessage}
                        className="flex items-end gap-3 bg-[#F7F8FA] dark:bg-[#1E1F21] border border-gray-200 dark:border-[var(--border)] rounded-[20px] p-2 pr-3 focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all shadow-inner"
                    >
                        {/* Attachments Dropup Trigger */}
                        <button
                            type="button"
                            className="h-10 w-10 shrink-0 text-gray-400 hover:text-indigo-600 dark:text-[var(--muted)] dark:hover:text-indigo-400 dark:hover:bg-white/5 hover:bg-white rounded-full flex items-center justify-center transition-all bg-transparent disabled:opacity-50"
                            title="Attach File"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                        </button>

                        <textarea
                            className="flex-1 max-h-32 min-h-[40px] bg-transparent resize-none outline-none text-gray-800 dark:text-[var(--text)] text-[15px] px-2 py-2.5 placeholder:text-gray-400 dark:placeholder-[var(--muted)]"
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

                        {/* Emoji Trigger */}
                        <button
                            type="button"
                            className="h-10 w-10 shrink-0 text-gray-400 hover:text-indigo-600 dark:text-[var(--muted)] dark:hover:text-indigo-400 transition-all bg-transparent"
                            title="Emoji"
                        >
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </button>

                        {/* Send Trigger */}
                        <button
                            type="submit"
                            disabled={!messageInput.trim()}
                            className="h-10 w-10 shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center disabled:opacity-40 disabled:hover:bg-indigo-600 transition-all shadow-sm"
                        >
                            <svg className="w-5 h-5 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                    </form>
                    <div className="absolute -bottom-6 right-0 left-0 hidden sm:block text-center text-[11px] text-gray-400 dark:text-[var(--muted)] font-medium">
                        Return to send, Shift + Return for a new line
                    </div>
                </div>
            </div>
        </div>
    );
}
