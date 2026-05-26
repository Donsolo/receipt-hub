const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'cp0165@yahoo.com' }
  });
  console.log('Curtis User Role:', user?.role, 'Plan:', user?.plan);

  const invoice = await prisma.invoice.findFirst({
    where: { invoiceNumber: 'CNO-8227' }
  });
  console.log('Invoice CNO-8227 acceptOnlinePayment:', invoice?.acceptOnlinePayment);
}

main().catch(console.error).finally(() => prisma.$disconnect());
