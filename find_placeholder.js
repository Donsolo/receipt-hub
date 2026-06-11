const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$') && typeof prisma[k].findMany === 'function');
    for (const m of models) {
        try {
            // we will just fetch all string fields and check if they contain "PLACEHOLDER"
            // this is a bit heavy, let's just find anything containing "PLACEHOLDER" in the DB.
            const records = await prisma[m].findMany();
            for (const r of records) {
                const str = JSON.stringify(r);
                if (str.includes('PLACEHOLDER')) {
                    console.log(`Found PLACEHOLDER in model ${m}, id: ${r.id || r.name}`);
                }
            }
        } catch (e) {
            // ignore
        }
    }
}
main().finally(() => prisma.$disconnect());
