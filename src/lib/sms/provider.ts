export interface SmsOptions {
    to: string;
    message: string;
    metadata?: any;
}

export interface SmsResult {
    ok: boolean;
    disabled?: boolean;
    reason?: string;
    messageId?: string;
}

/**
 * Placeholder for Twilio configuration (Phase 8)
 * 
 * SMS_PROVIDER=disabled
 * TWILIO_ACCOUNT_SID=
 * TWILIO_AUTH_TOKEN=
 * TWILIO_FROM_NUMBER=
 */
class NoopSmsProvider {
    async sendSms({ to, message, metadata }: SmsOptions): Promise<SmsResult> {
        if (process.env.NODE_ENV === 'development') {
            console.log('\n[SMS STUB] Intended to send SMS:');
            console.log(`To: ${to}`);
            console.log(`Message: ${message}`);
            if (metadata) console.log(`Metadata:`, metadata);
            console.log('--------------------------\n');
        }

        return {
            ok: false,
            disabled: true,
            reason: 'SMS provider not configured (Phase 7 Stub)'
        };
    }

    async sendCampaignSms({ to, message, metadata }: SmsOptions): Promise<SmsResult> {
        console.log(`[SMS STUB] BLOCKED: Attempted to send bulk campaign SMS to ${to}. Live SMS campaigns are disabled.`);
        return {
            ok: false,
            disabled: true,
            reason: 'Bulk SMS campaigns are disabled by policy.'
        };
    }
}

export const smsProvider = new NoopSmsProvider();
