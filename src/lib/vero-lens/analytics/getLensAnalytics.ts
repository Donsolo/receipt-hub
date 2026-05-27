import { db } from '@/lib/db';

export async function getLensAnalytics(userId: string, daysBack: number | null = 30) {
    const dateFilter = daysBack ? { gte: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000) } : undefined;

    // 1. Fetch Sessions
    const sessions = await db.veroLensSession.findMany({
        where: {
            userId,
            ...(dateFilter ? { createdAt: dateFilter } : {})
        },
        include: {
            shares: true,
            versions: true,
            events: {
                orderBy: { createdAt: 'asc' }
            }
        }
    });

    const totalQuotesCreated = sessions.length;
    let quotesSharedCount = 0;
    let quotesApprovedCount = 0;
    let quotesRejectedCount = 0;
    let convertedToInvoiceCount = 0;
    let totalViews = 0;
    let totalRemindersSent = 0;
    let totalRevisionsRequested = 0;
    let totalVersionsCreated = 0;
    let approvalTimeSumMs = 0;
    let viewsBeforeApprovalSum = 0;
    let versionsBeforeApprovalSum = 0;

    let tradeModeCounts: Record<string, number> = {};
    let tradeModeApprovals: Record<string, number> = {};

    let viewedSessionsCount = 0;

    sessions.forEach(session => {
        // Trade Mode Stats
        const tm = session.tradeMode || 'general';
        tradeModeCounts[tm] = (tradeModeCounts[tm] || 0) + 1;

        if (session.convertedInvoiceId) {
            convertedToInvoiceCount++;
        }

        let isShared = false;
        let isViewed = false;

        session.shares.forEach((share: any) => {
            isShared = true;
            totalViews += share.totalViews || 0;
            totalRemindersSent += share.reminderCount || 0;
            
            if (share.totalViews && share.totalViews > 0) {
                isViewed = true;
            }

            if (share.approvedAt) {
                quotesApprovedCount++;
                tradeModeApprovals[tm] = (tradeModeApprovals[tm] || 0) + 1;
                
                // Calculate approval time (from share creation to approval)
                approvalTimeSumMs += new Date(share.approvedAt).getTime() - new Date(share.createdAt).getTime();
                
                if (share.totalViews) {
                    viewsBeforeApprovalSum += share.totalViews;
                }
            } else if (share.rejectedAt) {
                quotesRejectedCount++;
            }
        });

        if (isShared) quotesSharedCount++;
        if (isViewed) viewedSessionsCount++;

        const revisionEvents = session.events.filter((e: any) => e.type === 'QUOTE_REVISION_REQUESTED');
        totalRevisionsRequested += revisionEvents.length;
        
        const versionsCount = session.versions?.length || 0;
        totalVersionsCreated += versionsCount;
        
        if (isShared && session.shares.some((s:any) => s.approvedAt)) {
            versionsBeforeApprovalSum += versionsCount;
        }
    });

    // Global Activity Timeline (Recent 50 events)
    const recentEvents = await db.veroLensEvent.findMany({
        where: {
            session: {
                userId,
                ...(dateFilter ? { createdAt: dateFilter } : {})
            }
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: {
            session: {
                select: {
                    tradeMode: true,
                    title: true
                }
            }
        }
    });

    const approvalRate = quotesSharedCount > 0 ? quotesApprovedCount / quotesSharedCount : 0;
    const rejectionRate = quotesSharedCount > 0 ? quotesRejectedCount / quotesSharedCount : 0;
    const revisionRequestRate = quotesSharedCount > 0 ? totalRevisionsRequested / quotesSharedCount : 0;
    
    const averageViewsBeforeApproval = quotesApprovedCount > 0 ? viewsBeforeApprovalSum / quotesApprovedCount : 0;
    const averageApprovalTimeMs = quotesApprovedCount > 0 ? approvalTimeSumMs / quotesApprovedCount : 0;
    const averageApprovalTimeHours = averageApprovalTimeMs / (1000 * 60 * 60);
    const averageQuoteViews = quotesSharedCount > 0 ? totalViews / quotesSharedCount : 0;
    const averageRevisionsBeforeApproval = quotesApprovedCount > 0 ? versionsBeforeApprovalSum / quotesApprovedCount : 0;

    const mostUsedTradeMode = Object.entries(tradeModeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    const mostSuccessfulTradeMode = Object.entries(tradeModeApprovals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

    return {
        metrics: {
            totalQuotesCreated,
            quotesSharedCount,
            quotesApprovedCount,
            quotesRejectedCount,
            convertedToInvoiceCount,
            totalViews,
            totalRemindersSent,
            totalRevisionsRequested,
            approvalRate,
            rejectionRate,
            revisionRequestRate,
            averageApprovalTimeHours,
            averageViewsBeforeApproval,
            averageQuoteViews,
            averageRevisionsBeforeApproval,
            totalVersionsCreated,
            mostUsedTradeMode,
            mostSuccessfulTradeMode
        },
        funnel: {
            drafted: totalQuotesCreated,
            shared: quotesSharedCount,
            viewed: viewedSessionsCount,
            approved: quotesApprovedCount
        },
        timeline: recentEvents
    };
}
