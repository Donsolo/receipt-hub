import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { streamText, tool } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

const google = createGoogleGenerativeAI({
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || ''
});

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        if (!token) return new NextResponse('Unauthorized', { status: 401 });

        const user = await verifyToken(token);
        if (!user) return new NextResponse('Unauthorized', { status: 401 });

        const { messages } = await req.json();

        // Get some basic user context for the AI
        const userProfile = await db.user.findUnique({
            where: { id: user.userId },
            select: { name: true, businessName: true }
        });

        const systemPrompt = `You are Vero, an elite AI business assistant integrated into the Verihub platform.
You are helping ${userProfile?.name || 'the user'} manage their business ${userProfile?.businessName ? `(${userProfile.businessName})` : ''}.
Be concise, helpful, and extremely professional. Format your responses in clean markdown. 
Do not hallucinate data. If you don't know the answer, use your available tools to check the database. 
If a user asks about invoices, receipts, or clients, use the tools.`;

        const result = await streamText({
            model: google('models/gemini-2.5-flash'),
            system: systemPrompt,
            messages,
            // @ts-ignore
            maxSteps: 5,
            tools: {
                getInvoiceSummary: tool({
                    description: 'Get a summary of the user\'s invoices (total count, paid, overdue, etc.) and total revenue.',
                    parameters: z.object({}),
                    // @ts-ignore
                    execute: async (args: any) => {
                        const invoices = await db.invoice.findMany({
                            where: { userId: user.userId },
                            select: { status: true, total: true, dueDate: true }
                        });
                        
                        let totalRevenue = 0;
                        let unpaidBalance = 0;
                        let overdueCount = 0;
                        const now = new Date();

                        invoices.forEach(inv => {
                            if (inv.status === 'PAID') {
                                totalRevenue += inv.total;
                            } else {
                                unpaidBalance += inv.total;
                                if (inv.dueDate && inv.dueDate < now && inv.status !== 'CANCELLED') {
                                    overdueCount++;
                                }
                            }
                        });

                        return {
                            totalInvoices: invoices.length,
                            totalRevenueCollected: totalRevenue,
                            unpaidBalance: unpaidBalance,
                            overdueInvoicesCount: overdueCount
                        };
                    },
                }),
                getRecentInvoices: tool({
                    description: 'Get a list of the most recent invoices.',
                    parameters: z.object({
                        limit: z.number().optional().describe('Number of recent invoices to fetch (default 5)')
                    }),
                    // @ts-ignore
                    execute: async ({ limit = 5 }: any) => {
                        const invoices = await db.invoice.findMany({
                            where: { userId: user.userId },
                            orderBy: { createdAt: 'desc' },
                            take: limit,
                            select: { id: true, invoiceNumber: true, title: true, clientName: true, total: true, status: true, dueDate: true }
                        });
                        return invoices;
                    }
                }),
                getReceiptsSummary: tool({
                    description: 'Get a summary of the user\'s receipts.',
                    parameters: z.object({}),
                    // @ts-ignore
                    execute: async (args: any) => {
                        const receipts = await db.receipt.findMany({
                            where: { userId: user.userId },
                            select: { total: true }
                        });
                        const totalAmount = receipts.reduce((sum, r) => sum + r.total, 0);
                        return { totalReceipts: receipts.length, totalReceiptAmount: totalAmount };
                    }
                }),
            },
        });

        // @ts-ignore
        return result.toAIStreamResponse();
    } catch (error: any) {
        console.error('Vero Chat Error:', error);
        return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
    }
}
