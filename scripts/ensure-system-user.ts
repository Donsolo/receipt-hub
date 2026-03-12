import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Ensuring System Support user exists...');

    const supportEmail = 'support@verihub.app';
    const supportPassword = await bcrypt.hash('system-secure-password-' + Math.random(), 10);

    const supportUser = await prisma.user.upsert({
        where: { email: supportEmail },
        update: { 
            role: 'SYSTEM',
            name: 'Verihub Support'
        },
        create: {
            email: supportEmail,
            name: 'Verihub Support',
            password: supportPassword,
            businessName: 'Verihub HQ',
            role: 'SYSTEM',
            plan: 'PRO',
            isActivated: true,
            isEarlyAccess: true
        }
    });

    console.log(`System User ready: ${supportUser.id}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
