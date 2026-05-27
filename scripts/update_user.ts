import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'dariusreeder@gmail.com';
    const password = 'Mylacrosse2025';
    const hashedPassword = await bcrypt.hash(password, 10);

    const existingUser = await prisma.user.findUnique({
        where: { email }
    });

    if (existingUser) {
        console.log(`User ${email} exists. Updating password...`);
        await prisma.user.update({
            where: { email },
            data: { password: hashedPassword }
        });
        console.log('Password updated successfully.');
    } else {
        console.log(`User ${email} does not exist. Creating user...`);
        await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name: 'Darius Reeder',
                role: 'USER',
                plan: 'CORE',
                isActivated: true
            }
        });
        console.log('User created successfully.');
    }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
