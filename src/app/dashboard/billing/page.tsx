import BillingCenterClient from '@/components/billing/BillingCenterClient';

export const metadata = {
    title: 'Billing Center | Verihub',
    description: 'Manage your incoming and outgoing invoices.',
};

export default function BillingCenterPage() {
    return (
        <BillingCenterClient />
    );
}
