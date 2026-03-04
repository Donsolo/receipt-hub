import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    console.log('--- DIAGNOSTIC: LOGIN CHECK ---');

    const email = 'dariusreeder@gmail.com';
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        console.log(`User ${email} NOT FOUND in the database.`);
    } else {
        console.log(`User ${email} FOUND.`);
        const match = await bcrypt.compare('password123', user.password);
        console.log(`Password 'password123' match: ${match}`);
    }

    const curtisEmail = 'cp0165@yahoo.com';
    const curtis = await prisma.user.findUnique({ where: { email: curtisEmail } });
    if (!curtis) {
        console.log(`User ${curtisEmail} NOT FOUND in the database.`);
    } else {
        console.log(`User ${curtisEmail} FOUND.`);
        const match = await bcrypt.compare('password123', curtis.password);
        console.log(`Password 'password123' match: ${match}`);
    }
}

main().finally(() => prisma.$disconnect());
