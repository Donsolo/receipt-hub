import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = process.argv[2];
    const newPassword = process.argv[3];

    if (!email || !newPassword) {
        console.error('Usage: npx tsx scripts/reset-password.ts <email> <newPassword>');
        process.exit(1);
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });

        console.log(`Successfully reset password for ${email}`);
    } catch (error) {
        console.error('Failed to reset password:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
