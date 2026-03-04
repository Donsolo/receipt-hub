require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany({
        where: { OR: [{ email: 'cp0165@yahoo.com' }, { email: 'dariush1000@gmail.com' }] }
    });
    console.log('Users found:', users.map((u: any) => ({ id: u.id, email: u.email })));

    const connections = await prisma.connection.findMany({
        include: { requester: { select: { email: true } }, receiver: { select: { email: true } } }
    });
    console.log('Connections:', connections);
}

main().catch(console.error).finally(() => prisma.$disconnect());
