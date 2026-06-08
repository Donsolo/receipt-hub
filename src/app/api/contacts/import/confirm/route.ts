import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';

function parseCSVLine(line: string): string[] {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"' && line[i + 1] === '"') {
            current += '"';
            i++;
        } else if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

export async function POST(request: Request) {
    try {
        const token = (request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0] || (request.headers.get('authorization')?.startsWith('Bearer ') ? request.headers.get('authorization')?.substring(7) : undefined));
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const user = await verifyToken(token);
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const owner = await db.user.findUnique({ where: { id: user.userId } });
        const isPro = owner?.plan === 'PRO' || owner?.role === 'ADMIN' || owner?.role === 'SUPER_ADMIN';
        if (!isPro) return NextResponse.json({ error: 'Pro feature only.' }, { status: 403 });

        const formData = await request.formData();
        const file = formData.get('file') as File;
        if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 });
        if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });

        const mappingStr = formData.get('mapping') as string;
        const source = formData.get('source') as string || 'CSV';

        if (!mappingStr) return NextResponse.json({ error: 'Missing mapping' }, { status: 400 });

        const map = JSON.parse(mappingStr);
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        
        if (lines.length > 5001) return NextResponse.json({ error: 'Max 5,000 rows supported' }, { status: 400 });
        
        let imported = 0;
        let updated = 0;
        let skipped = 0;
        let failed = 0;

        // Skip headers
        for (let i = 1; i < lines.length; i++) {
            try {
                const cols = parseCSVLine(lines[i]);
                
                const email = map.email !== -1 ? cols[map.email]?.trim() : null;
                const phone = map.phone !== -1 ? cols[map.phone]?.trim() : null;
                const firstName = map.firstName !== -1 ? cols[map.firstName]?.trim() : null;
                const lastName = map.lastName !== -1 ? cols[map.lastName]?.trim() : null;
                let name = map.name !== -1 ? cols[map.name]?.trim() : null;

                if (!name && (firstName || lastName)) {
                    name = `${firstName || ''} ${lastName || ''}`.trim();
                }

                if (!name && !email && !phone) {
                    skipped++;
                    continue; // Nothing to import
                }

                const data = {
                    ownerId: user.userId,
                    name: name || '',
                    firstName,
                    lastName,
                    email,
                    phone,
                    company: map.company !== -1 ? cols[map.company]?.trim() : null,
                    addressLine1: map.addressLine1 !== -1 ? cols[map.addressLine1]?.trim() : null,
                    city: map.city !== -1 ? cols[map.city]?.trim() : null,
                    state: map.state !== -1 ? cols[map.state]?.trim() : null,
                    postalCode: map.postalCode !== -1 ? cols[map.postalCode]?.trim() : null,
                    country: map.country !== -1 ? cols[map.country]?.trim() : null,
                    notes: map.notes !== -1 ? cols[map.notes]?.trim() : null,
                    externalId: map.externalId !== -1 ? cols[map.externalId]?.trim() : null,
                    source
                };

                // Dedupe logic
                let existingContact = null;
                if (email) {
                    existingContact = await db.customerContact.findFirst({
                        where: { ownerId: user.userId, email }
                    });
                }
                if (!existingContact && phone) {
                    existingContact = await db.customerContact.findFirst({
                        where: { ownerId: user.userId, phone }
                    });
                }

                if (existingContact) {
                    // Update
                    await db.customerContact.update({
                        where: { id: existingContact.id },
                        data
                    });
                    updated++;
                } else {
                    // Create
                    await db.customerContact.create({ data });
                    imported++;
                }
            } catch (err) {
                console.error('Row error:', err);
                failed++;
            }
        }

        return NextResponse.json({ success: true, imported, updated, skipped, failed });
    } catch (error) {
        console.error('Import confirm error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
