import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting cleanup of existing acceptOnlinePayment flags...');
    
    // Find all invoices where acceptOnlinePayment is true, but the user does not have connectChargesEnabled
    const invoicesToUpdate = await prisma.invoice.findMany({
        where: {
            acceptOnlinePayment: true,
            user: {
                connectChargesEnabled: false
            }
        },
        select: {
            id: true
        }
    });

    if (invoicesToUpdate.length === 0) {
        console.log('No invoices need cleanup.');
        return;
    }

    const ids = invoicesToUpdate.map(i => i.id);

    const result = await prisma.invoice.updateMany({
        where: {
            id: { in: ids }
        },
        data: {
            acceptOnlinePayment: false
        }
    });

    console.log(`Successfully updated ${result.count} invoices.`);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
