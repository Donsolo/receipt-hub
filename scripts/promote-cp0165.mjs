import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'Cp0165@yahoo.com';
    console.log(`Checking for user: ${email}...`);

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.log(`User ${email} does not exist yet. They will be auto-promoted upon registration.`);
            return;
        }

        if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
            console.log(`User ${email} is already ${user.role}.`);
            return;
        }

        const updatedUser = await prisma.user.update({
            where: { email },
            data: { role: 'ADMIN' },
        });

        console.log(`Success! Existing user ${updatedUser.email} promoted to ${updatedUser.role}.`);
    } catch (e) {
        console.error('Error updating user:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
