export function generateLensInsights(metrics: any) {
    const insights: string[] = [];

    if (metrics.totalQuotesCreated < 3) {
        insights.push("Create a few more quotes to start seeing meaningful trends and insights.");
        return insights;
    }

    if (metrics.approvalRate >= 0.6) {
        insights.push(`Your quotes have an excellent approval rate (${Math.round(metrics.approvalRate * 100)}%). You are pricing competitively!`);
    } else if (metrics.approvalRate > 0 && metrics.approvalRate < 0.2) {
        insights.push(`Your approval rate is ${Math.round(metrics.approvalRate * 100)}%. Consider adding more detail to line items or adjusting pricing strategies.`);
    }

    if (metrics.averageApprovalTimeHours > 0) {
        const timeStr = metrics.averageApprovalTimeHours < 24 
            ? `${Math.round(metrics.averageApprovalTimeHours)} hours` 
            : `${Math.round(metrics.averageApprovalTimeHours / 24)} days`;
        insights.push(`On average, your customers approve quotes within ${timeStr} of sharing.`);
    }

    if (metrics.mostSuccessfulTradeMode && metrics.mostSuccessfulTradeMode !== 'N/A') {
        const formattedMode = metrics.mostSuccessfulTradeMode.replace('_', ' ').replace(/\b\w/g, (l:string) => l.toUpperCase());
        insights.push(`Your most successful trade category for approvals is ${formattedMode}.`);
    }

    if (metrics.totalRevisionsRequested > 0) {
        insights.push(`You've received ${metrics.totalRevisionsRequested} revision request(s). Highly detailed descriptions and annotations help reduce revisions.`);
    }

    if (metrics.averageRevisionsBeforeApproval > 1.5) {
        insights.push(`On average, it takes ${metrics.averageRevisionsBeforeApproval.toFixed(1)} versions to get an approval. Pre-empting customer questions can speed up the sales cycle.`);
    }

    if (metrics.convertedToInvoiceCount > 0) {
        insights.push(`You've successfully converted ${metrics.convertedToInvoiceCount} quote(s) directly into invoices, saving significant admin time.`);
    }

    if (metrics.totalRemindersSent > 0) {
        insights.push(`You've sent ${metrics.totalRemindersSent} reminder(s). Following up is key to closing pending deals!`);
    }

    if (insights.length === 0) {
        insights.push("No specific insights yet. Keep sending and approving quotes to generate data!");
    }

    return insights;
}
