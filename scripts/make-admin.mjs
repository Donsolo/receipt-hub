import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'dariusreeder@gmail.com';
  console.log(`Looking for user: ${email}...`);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      console.error(`Error: User with email ${email} not found.`);
      process.exit(1);
    }

    console.log(`Found user: ${user.id} (Current Role: ${user.role})`);

    const updatedUser = await prisma.user.update({
      where: { email },
      data: { role: 'ADMIN' },
    });

    console.log(`Success! User ${updatedUser.email} is now an ${updatedUser.role}.`);
  } catch (e) {
    console.error('Error updating user:', e);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
