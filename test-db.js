const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
    const dbUser = await prisma.user.findUnique({
        where: { email: 'cp0165@yahoo.com' }
    });
    console.log('DB USER CP0165:', dbUser);
}

check()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
