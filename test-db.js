const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.receipt.findMany().then(r => console.log(r)).catch(console.error).finally(() => prisma.$disconnect());
