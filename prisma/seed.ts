import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('Restoring essential users and connections...');

    // 1. Create Darius
    const dariusPassword = await bcrypt.hash('password123', 10);
    const darius = await prisma.user.upsert({
        where: { email: 'dariusreeder@gmail.com' },
        update: { role: 'SUPER_ADMIN' },
        create: {
            email: 'dariusreeder@gmail.com',
            name: 'Darius Reeder',
            password: dariusPassword,
            businessName: 'Tektriq LLC',
            role: 'SUPER_ADMIN',
            plan: 'PRO',
            isActivated: true,
            isEarlyAccess: true
        }
    });
    console.log(`Created/Ensured User: ${darius.email} (SUPER_ADMIN)`);

    // 2. Create Curtis Perry
    const curtisPassword = await bcrypt.hash('password123', 10);
    const curtis = await prisma.user.upsert({
        where: { email: 'cp0165@yahoo.com' },
        update: { role: 'ADMIN' },
        create: {
            email: 'cp0165@yahoo.com',
            name: 'Curtis Perry',
            password: curtisPassword,
            businessName: 'W.M. Perry',
            role: 'ADMIN',
            plan: 'CORE',
            isActivated: true,
            isEarlyAccess: true
        }
    });
    console.log(`Created/Ensured User: ${curtis.email} (ADMIN)`);

    // 3. Establish Connection
    // Check if connection already exists
    const existingConn = await prisma.connection.findFirst({
        where: {
            OR: [
                { requesterId: darius.id, receiverId: curtis.id },
                { requesterId: curtis.id, receiverId: darius.id }
            ]
        }
    });

    if (!existingConn) {
        await prisma.connection.create({
            data: {
                requesterId: curtis.id,
                receiverId: darius.id,
                status: 'accepted'
            }
        });
        console.log(`Created Connection: ${curtis.name} <-> ${darius.name}`);
    } else {
        console.log(`Connection already exists: ${curtis.name} <-> ${darius.name}`);
    }

    // 4. Create Apology Announcement
    const existingAnn = await (prisma as any).announcement.findFirst({ where: { type: 'APOLOGY' } });
    if (!existingAnn) {
        await (prisma as any).announcement.create({
            data: {
                title: 'A Quick Note to Our Founders',
                type: 'APOLOGY',
                isActive: true,
                content: `<p>Thank you for being one of Verihub’s early founders.</p><p>Recently we deployed several major upgrades to the platform, including new features and a full database security upgrade. As part of this process, some early test accounts needed to be recreated.</p><p>We sincerely apologize for any inconvenience this caused.</p><p>Testing and refining a brand new platform sometimes requires adjustments like this, and we truly appreciate your patience while we build something powerful and reliable.</p><p>The good news is these upgrades allow us to implement stronger security, improved performance, and many new features that are now rolling out across Verihub.</p><p>Your early support helps shape the future of this platform, and we’re excited to keep building with you.</p><p class="font-medium pt-2">Thank you for being here.<br /><span class="text-[var(--muted)] font-normal">– The Verihub Team</span></p>`
            }
        });
        console.log('Created Apology Announcement');
    }

    console.log('Seed restoration complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
