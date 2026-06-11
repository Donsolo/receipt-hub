const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const user = await prisma.user.findFirst();
    console.log('User businessLogoPath:', user?.businessLogoPath);
    
    const invoice = await prisma.invoice.findFirst();
    console.log('Invoice id:', invoice?.id);
    console.log('Invoice customerContactId:', invoice?.customerContactId);
}
main().finally(() => prisma.$disconnect());
