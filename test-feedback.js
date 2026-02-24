const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const feedbacks = await prisma.feedback.findMany({
        include: {
            user: true,
        }
    });
    console.log(JSON.stringify(feedbacks, null, 2));
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
