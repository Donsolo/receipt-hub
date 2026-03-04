import { redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { cookies } from 'next/headers';
import ChatClient from './ChatClient';

export default async function ConversationThreadPage({
    params
}: {
    params: Promise<{ conversationId: string }>
}) {
    const { conversationId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
        redirect('/login');
    }

    // Decoding token manually or relying on DB. For simplicity let's find the user by session if possible, but Next.js standard is to use a dedicated verify module.
    // I will just fetch the conversation and if it doesn't match the participants, the client will block it, but ideally we block here.
    // Wait, the user has `id` in the jwt. We can use the api/auth/me equivalent or just let the Client fetch it.
    // Let's pass the conversationId to the Client component and let it handle auth & fetching to stay consistent with `ReportsClient`.

    // Wait, the prompt says "Ensure notifications deep link directly into conversation thread".
    // "Business Identity - Conversation header must display: Business Logo, Full Name, Business Name, Connection Status badge"
    // I will fetch the conversation metadata here for SEO/instant load of the header, or just let ChatClient do it. Let's let ChatClient do it to avoid code duplication with JWT parsing.

    return (
        <div className="h-full flex flex-col bg-[#F7F8FA] dark:bg-[var(--bg)]">
            <ChatClient conversationId={conversationId} />
        </div>
    );
}
