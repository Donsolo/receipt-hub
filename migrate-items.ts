import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function run() {
    try {
        console.log("Backfilling normalizedName...");
        // @ts-ignore
        const allItems = await db.savedReceiptItem.findMany();

        let count = 0;
        for (const item of allItems) {
            const norm = item.name.toLowerCase().trim();
            // @ts-ignore
            await db.savedReceiptItem.update({
                where: { id: item.id },
                data: { normalizedName: norm }
            });
            count++;
        }
        console.log(`Updated ${count} items.`);
    } catch (error) {
        console.error("Migration error:", error);
    } finally {
        await db.$disconnect();
    }
}

run();
