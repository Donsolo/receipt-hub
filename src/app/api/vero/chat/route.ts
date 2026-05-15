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

        Capabilities & Guidance:
        1. Summarize Data: Use your tools to fetch receipts and invoices. You can provide summaries by client, by date, or by category.
        2. Business Strategy: Provide the "best course of action" for business growth based on current revenue and spending trends.
        3. Platform Help: Provide step-by-step directions for using Verihub (e.g., "How do I create an invoice?", "How do I scan a receipt?").
        4. Vero Suite: Guide users on using specialized tools like the Profit Margin Tool, Tax Estimator, and Business Calculator.

        Platform Navigation Help:
        - To scan a receipt: Click the "Scan" button in the history tab or the floating camera button on mobile.
        - To create an invoice: Go to the Invoices tab and click "Create New".
        - To see business metrics: Go to the Vero Suite page.

        If a user asks about a specific client (e.g. "summary of Maria"), use the searchInvoices tool.
        If a user asks about spending categories, use the getReceiptsByCategory tool.
        If a user asks for business advice, use the getBusinessInsights tool to get context first.`;

        const result = await streamText({
            model: google('models/gemini-2.5-flash'),
            system: systemPrompt,
            messages,
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
                searchInvoices: tool({
                    description: 'Search invoices by client name, email, or invoice number. Use this to summarize a specific client\'s invoices.',
                    parameters: z.object({
                        query: z.string().describe('The client name or search term')
                    }),
                    // @ts-ignore
                    execute: async ({ query }: any) => {
                        const invoices = await db.invoice.findMany({
                            where: { 
                                userId: user.userId,
                                OR: [
                                    { clientName: { contains: query, mode: 'insensitive' } },
                                    { clientEmail: { contains: query, mode: 'insensitive' } },
                                    { invoiceNumber: { contains: query, mode: 'insensitive' } },
                                ]
                            },
                            orderBy: { createdAt: 'desc' },
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
                            select: { total: true, categoryId: true }
                        });
                        const totalAmount = receipts.reduce((sum, r) => sum + r.total, 0);
                        return { totalReceipts: receipts.length, totalReceiptAmount: totalAmount };
                    }
                }),
                getReceiptsByCategory: tool({
                    description: 'Get a breakdown of receipts by category.',
                    parameters: z.object({}),
                    // @ts-ignore
                    execute: async (args: any) => {
                        const categories = await db.category.findMany({
                            where: { userId: user.userId },
                            include: {
                                receipts: {
                                    select: { total: true }
                                }
                            }
                        });
                        return categories.map(cat => ({
                            name: cat.name,
                            count: cat.receipts.length,
                            total: cat.receipts.reduce((sum, r) => sum + r.total, 0)
                        }));
                    }
                }),
                getBusinessInsights: tool({
                    description: 'Get business health metrics like growth and spending ratios.',
                    parameters: z.object({}),
                    // @ts-ignore
                    execute: async (args: any) => {
                        const now = new Date();
                        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

                        const [thisMonthInvoices, lastMonthInvoices, thisMonthReceipts, lastMonthReceipts] = await Promise.all([
                            db.invoice.findMany({ where: { userId: user.userId, createdAt: { gte: startOfThisMonth }, status: 'PAID' }, select: { total: true } }),
                            db.invoice.findMany({ where: { userId: user.userId, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth }, status: 'PAID' }, select: { total: true } }),
                            db.receipt.findMany({ where: { userId: user.userId, createdAt: { gte: startOfThisMonth } }, select: { total: true } }),
                            db.receipt.findMany({ where: { userId: user.userId, createdAt: { gte: startOfLastMonth, lt: startOfThisMonth } }, select: { total: true } }),
                        ]);

                        const thisMonthRevenue = thisMonthInvoices.reduce((sum, i) => sum + i.total, 0);
                        const lastMonthRevenue = lastMonthInvoices.reduce((sum, i) => sum + i.total, 0);
                        const thisMonthSpend = thisMonthReceipts.reduce((sum, r) => sum + r.total, 0);
                        const lastMonthSpend = lastMonthReceipts.reduce((sum, r) => sum + r.total, 0);

                        return {
                            revenue: { current: thisMonthRevenue, lastMonth: lastMonthRevenue, growth: lastMonthRevenue ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0 },
                            spending: { current: thisMonthSpend, lastMonth: lastMonthSpend, growth: lastMonthSpend ? ((thisMonthSpend - lastMonthSpend) / lastMonthSpend) * 100 : 0 },
                            profitMargin: thisMonthRevenue ? ((thisMonthRevenue - thisMonthSpend) / thisMonthRevenue) * 100 : 0
                        };
                    }
                })
            },
        });

        // @ts-ignore
        return result.toDataStreamResponse();
    } catch (error: any) {
        console.error('Vero Chat Error:', error);
        return new NextResponse(error.message || 'Internal Server Error', { status: 500 });
    }
}
