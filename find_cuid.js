const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const target = 'cmpq5dnhe00014uf2vk0z8itv';
    const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$') && typeof prisma[k].findUnique === 'function');
    for (const m of models) {
        try {
            const found = await prisma[m].findUnique({ where: { id: target } });
            if (found) {
                console.log(`Found in model ${m}:`, found);
            }
        } catch (e) {
            // ignore if no id field
        }
    }
}
main().finally(() => prisma.$disconnect());
