import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        ')[0];
        
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const contact = await db.customerContact.findUnique({
            where: { id },
            include: {
                notesArray: true,
                communicationLogs: true,
                invoices: {
                    include: {
                        installments: true,
                        paymentRequestLogs: true,
                        analyticsEvents: true
                    }
                }
            }
        });

        if (!contact || contact.ownerId !== user.id) {
            return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
        }

        const events: any[] = [];

        // 1. Contact Creation
        events.push({
            id: `contact_created_${contact.id}`,
            type: 'CONTACT_CREATED',
            title: 'Contact Created',
            description: `Imported via ${contact.source || 'Manual'}`,
            timestamp: contact.createdAt,
            icon: 'user'
        });

        // 2. Notes
        contact.notesArray.forEach(note => {
            events.push({
                id: `note_${note.id}`,
                type: 'NOTE_ADDED',
                title: 'Note Added',
                description: note.content,
                timestamp: note.createdAt,
                icon: 'document'
            });
        });

        // 3. Communication Logs
        contact.communicationLogs.forEach(log => {
            events.push({
                id: `comm_${log.id}`,
                type: 'COMMUNICATION',
                title: `${log.channel} Sent`,
                description: log.subject || log.contentPreview || 'Message sent',
                timestamp: log.createdAt,
                icon: 'mail'
            });
        });

        // 4. Invoices and related events
        contact.invoices.forEach(inv => {
            events.push({
                id: `inv_created_${inv.id}`,
                type: 'INVOICE_CREATED',
                title: `Invoice ${inv.invoiceNumber || ''} Created`,
                description: `Amount: $${inv.total.toFixed(2)}`,
                timestamp: inv.createdAt,
                icon: 'invoice'
            });

            // Invoice Requests
            inv.paymentRequestLogs.forEach(log => {
                events.push({
                    id: `inv_req_${log.id}`,
                    type: 'INVOICE_REQUEST',
                    title: log.action === 'REMINDER_SENT' ? 'Payment Reminder Sent' : 'Payment Request Sent',
                    description: `Sent via ${log.channel} to ${log.recipientEmail || 'recipient'}`,
                    timestamp: log.createdAt,
                    icon: 'mail'
                });
            });

            // Invoice Payments (Manual)
            const manualPayments = Array.isArray(inv.payments) ? inv.payments as any[] : [];
            manualPayments.forEach((p, idx) => {
                events.push({
                    id: `inv_pay_${inv.id}_${idx}`,
                    type: 'PAYMENT_RECEIVED',
                    title: 'Manual Payment Logged',
                    description: `$${Number(p.amount || 0).toFixed(2)} via ${p.method || 'Manual'}`,
                    timestamp: p.date ? new Date(p.date) : inv.createdAt,
                    icon: 'check'
                });
            });

            // Invoice Payments (Installments/Online)
            inv.installments.forEach(inst => {
                if (inst.status === 'PAID' && inst.paidAt) {
                    events.push({
                        id: `inv_inst_${inst.id}`,
                        type: 'PAYMENT_RECEIVED',
                        title: 'Online Payment Received',
                        description: `$${inst.amount.toFixed(2)} paid for ${inst.label || 'installment'}`,
                        timestamp: inst.paidAt,
                        icon: 'check'
                    });
                }
            });

            // Analytics Events (Viewed, Pay Button Clicked)
            inv.analyticsEvents.forEach(evt => {
                if (evt.eventType === 'PORTAL_VIEW' || evt.eventType === 'PAYMENT_CTA_CLICK') {
                    events.push({
                        id: `inv_evt_${evt.id}`,
                        type: 'ANALYTICS',
                        title: evt.eventType === 'PORTAL_VIEW' ? 'Invoice Viewed' : 'Pay Button Clicked',
                        description: `Customer interacted with the payment portal`,
                        timestamp: evt.createdAt,
                        icon: 'eye'
                    });
                }
            });
        });

        // Sort descending
        events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        return NextResponse.json({ success: true, events }, { status: 200 });
    } catch (error) {
        console.error('Fetch activity error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
