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
        
        Verihub Core Knowledge:
        - Receipts represent EXPENSES (money the user has spent). They are categorized and summed up as 'Total Spend'.
        - Invoices represent REVENUE (money the user is charging clients). They are tracked by Status (Paid, Pending, Overdue).
        - Profit is calculated as (Revenue from Paid Invoices) minus (Total Spend from Receipts).
        - Use getReceiptsSummary for questions about "how much I spent" or "my expenses".
        - Use getInvoiceSummary for questions about "how much I made", "my revenue", or "unpaid clients".

        4. Vero Suite Knowledge: You must actively recommend and explain the tools available in the Vero Suite when applicable. The Vero Suite includes:
           - Profit Margin Tool: Helps calculate net profit margins based on revenue and costs.
           - Tax Estimator: Estimates upcoming tax liabilities based on income and expenses.
           - Business Calculator: A suite of financial calculators for ROI, break-even analysis, and standard arithmetic.
           - Invoice Estimator: Helps calculate quotes and estimates before sending official invoices.
           Always remind users they can access these tools by navigating to the "Vero Suite" from the dashboard or app menu.

        Platform Navigation Help:
        - To scan a receipt: Click the "Scan" button in the history tab or the floating camera button on mobile.
        - To create an invoice: Go to the Invoices tab and click "Create New".
        - To access Vero Suite tools (Profit Margin, Tax Estimator, etc.): Navigate to the "Vero Suite" via the Dashboard menu.

        If a user asks about a specific client (e.g. "summary of Maria"), use the searchInvoices tool.
        If a user asks about spending categories, use the getReceiptsByCategory tool.
        If a user asks for business advice, use the getBusinessInsights tool to get context first.
        
        CRITICAL RULE 1: When asked about the user's data (receipts, invoices, amounts), ALWAYS use the appropriate tool. Do not guess. You can execute multiple tools in a row if needed.
        CRITICAL RULE 2: NEVER leave a response blank after calling a tool. Once you receive the tool results, you MUST generate a text response summarizing the data naturally for the user.`;

        const result = await streamText({
            // @ts-ignore - Bypass type mismatch between ai and @ai-sdk/google versions
            model: google('gemini-1.5-flash'),
            system: systemPrompt,
            messages,
            maxSteps: 5,
            tools: {
                getInvoiceSummary: tool({
                    description: 'Get a comprehensive summary of the user\'s invoices, including totals, revenue, unpaid balances, top clients, and overdue details.',
                    parameters: z.object({}),
                    execute: async () => {
                        const invoices = await db.invoice.findMany({
                            where: { userId: user.userId },
                            select: { id: true, invoiceNumber: true, clientName: true, status: true, total: true, dueDate: true, createdAt: true }
                        });
                        
                        let totalRevenue = 0;
                        let unpaidBalance = 0;
                        let overdueCount = 0;
                        const now = new Date();
                        
                        const byClient: Record<string, { count: number, revenue: number, unpaid: number }> = {};

                        invoices.forEach(inv => {
                            const clientName = inv.clientName || 'Unknown Client';
                            if (!byClient[clientName]) byClient[clientName] = { count: 0, revenue: 0, unpaid: 0 };
                            byClient[clientName].count++;
                            
                            if (inv.status === 'PAID') {
                                totalRevenue += inv.total;
                                byClient[clientName].revenue += inv.total;
                            } else if (inv.status !== 'CANCELLED') {
                                unpaidBalance += inv.total;
                                byClient[clientName].unpaid += inv.total;
                                if (inv.dueDate && inv.dueDate < now) {
                                    overdueCount++;
                                }
                            }
                        });

                        const sortedClientsByRevenue = Object.entries(byClient)
                            .sort((a, b) => b[1].revenue - a[1].revenue)
                            .slice(0, 5)
                            .map(([name, data]) => ({ name, ...data }));
                            
                        const sortedClientsByUnpaid = Object.entries(byClient)
                            .sort((a, b) => b[1].unpaid - a[1].unpaid)
                            .filter(c => c[1].unpaid > 0)
                            .slice(0, 5)
                            .map(([name, data]) => ({ name, ...data }));
                            
                        const topOverdue = invoices
                            .filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED' && i.dueDate && i.dueDate < now)
                            .sort((a, b) => (a.dueDate?.getTime() || 0) - (b.dueDate?.getTime() || 0))
                            .slice(0, 5)
                            .map(i => ({ client: i.clientName, amount: i.total, due: i.dueDate }));

                        return {
                            totalInvoices: invoices.length,
                            totalRevenueCollected: totalRevenue,
                            unpaidBalance: unpaidBalance,
                            overdueInvoicesCount: overdueCount,
                            topClientsByRevenue: sortedClientsByRevenue,
                            topClientsWithUnpaidBalances: sortedClientsByUnpaid,
                            urgentOverdueInvoices: topOverdue
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
                    description: 'Get a comprehensive summary and breakdown of the user\'s receipts, including totals, categories, top vendors, and recent activity.',
                    parameters: z.object({}),
                    execute: async () => {
                        const receipts = await db.receipt.findMany({
                            where: { userId: user.userId },
                            include: { category: true },
                            orderBy: { date: 'desc' }
                        });
                        
                        const totalAmount = receipts.reduce((sum, r) => sum + r.total, 0);
                        
                        const byCategory: Record<string, { count: number, total: number }> = {};
                        const byVendor: Record<string, { count: number, total: number }> = {};
                        
                        receipts.forEach(r => {
                            const catName = r.category?.name || 'Uncategorized';
                            if (!byCategory[catName]) byCategory[catName] = { count: 0, total: 0 };
                            byCategory[catName].count++;
                            byCategory[catName].total += r.total;
                            
                            const vendorName = r.clientName || 'Unknown Vendor';
                            if (!byVendor[vendorName]) byVendor[vendorName] = { count: 0, total: 0 };
                            byVendor[vendorName].count++;
                            byVendor[vendorName].total += r.total;
                        });

                        const recent = receipts.slice(0, 5).map(r => ({
                            vendor: r.clientName || 'Unknown',
                            date: r.date,
                            total: r.total,
                            category: r.category?.name || 'Uncategorized'
                        }));

                        const sortedCategories = Object.entries(byCategory)
                            .sort((a, b) => b[1].total - a[1].total)
                            .map(([name, data]) => ({ name, ...data }));
                            
                        const sortedVendors = Object.entries(byVendor)
                            .sort((a, b) => b[1].total - a[1].total)
                            .slice(0, 5)
                            .map(([name, data]) => ({ name, ...data }));

                        return { 
                            totalReceipts: receipts.length, 
                            totalReceiptAmount: totalAmount,
                            topCategories: sortedCategories,
                            topVendors: sortedVendors,
                            recentReceipts: recent
                        };
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
