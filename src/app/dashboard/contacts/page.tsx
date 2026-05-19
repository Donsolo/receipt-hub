import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import ContactsClient from './ContactsClient';

export const dynamic = "force-dynamic";

export default async function ContactsPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth_token')?.value;
    const authUser = await verifyToken(token || '');

    if (!authUser) {
        redirect('/login');
    }

    const owner = await db.user.findUnique({ where: { id: authUser.userId } });
    const isPro = owner?.plan === 'PRO' || owner?.role === 'ADMIN' || owner?.role === 'SUPER_ADMIN';

    const contacts = await db.customerContact.findMany({
        where: { ownerId: authUser.userId },
        include: {
            tags: { include: { tag: true } },
            invoices: {
                include: {
                    
                    installments: true
                }
            }
        },
        orderBy: { updatedAt: 'desc' }
    });

    const tags = await db.customerTag.findMany({
        where: { ownerId: authUser.userId },
        orderBy: { name: 'asc' }
    });

    return <ContactsClient initialContacts={contacts} tags={tags} isPro={isPro} />;
}
