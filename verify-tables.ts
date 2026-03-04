import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.count();
        const convos = await prisma.conversation.count();
        const parts = await prisma.conversationParticipant.count();
        const msgs = await prisma.message.count();

        console.log('--- TABLE VERIFICATION SUCCESS ---');
        console.log('Prisma recognizes the following core models:');
        console.log(`- User table OK (Rows: ${users})`);
        console.log(`- Conversation table OK (Rows: ${convos})`);
        console.log(`- ConversationParticipant table OK (Rows: ${parts})`);
        console.log(`- Message table OK (Rows: ${msgs})`);
        console.log('All required models are successfully mounted in the database schema.');
    } catch (error) {
        console.error('Model Verification Failed:', error);
    }
}

main().finally(() => prisma.$disconnect());
