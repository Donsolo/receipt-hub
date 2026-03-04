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
