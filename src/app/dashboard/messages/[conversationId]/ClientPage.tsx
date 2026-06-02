'use client';
import { useParams } from 'next/navigation';
import ChatClient from './ChatClient';

export default function ConversationThreadPage() {
    const params = useParams<{ conversationId: string }>();

    if (!params.conversationId) return <div>Loading...</div>;

    // TODO: server logic moved to /api route in Phase 4
    return (
        <div className="h-full flex flex-col bg-[#F7F8FA] dark:bg-[var(--bg)]">
            <ChatClient conversationId={params.conversationId} />
        </div>
    );
}
