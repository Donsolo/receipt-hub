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
        if (!file) return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
        if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });

        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
        if (lines.length < 2) return NextResponse.json({ error: 'CSV must contain headers and at least one row' }, { status: 400 });
        if (lines.length > 5001) return NextResponse.json({ error: 'Max 5,000 rows supported' }, { status: 400 });

        const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim().replace(/[^a-z0-9]/g, ''));
        
        // Detect mapping
        const map = {
            name: headers.findIndex(h => ['name', 'customername', 'clientname', 'displayname', 'fullname'].includes(h)),
            firstName: headers.findIndex(h => ['firstname', 'givenname'].includes(h)),
            lastName: headers.findIndex(h => ['lastname', 'familyname', 'surname'].includes(h)),
            email: headers.findIndex(h => ['email', 'emailaddress', 'customeremail', 'clientemail'].includes(h)),
            phone: headers.findIndex(h => ['phone', 'phonenumber', 'mobile', 'mobilephone', 'cell', 'customerphone'].includes(h)),
            company: headers.findIndex(h => ['company', 'business', 'businessname'].includes(h)),
            addressLine1: headers.findIndex(h => ['address', 'streetaddress', 'addressline1', 'billingaddress', 'serviceaddress'].includes(h)),
            city: headers.findIndex(h => ['city'].includes(h)),
            state: headers.findIndex(h => ['state', 'province', 'region'].includes(h)),
            postalCode: headers.findIndex(h => ['zip', 'postalcode', 'postcode'].includes(h)),
            country: headers.findIndex(h => ['country'].includes(h)),
            notes: headers.findIndex(h => ['notes', 'memo', 'customernotes', 'clientnotes'].includes(h)),
            externalId: headers.findIndex(h => ['customerid', 'clientid', 'squarecustomerid', 'joistclientid'].includes(h))
        };

        // Determine source
        let source = 'CSV';
        if (headers.includes('squarecustomerid')) source = 'SQUARE';
        if (headers.includes('joistclientid')) source = 'JOIST';

        // Preview first 10 rows
        const preview = lines.slice(1, 11).map(line => {
            const cols = parseCSVLine(line);
            const row: any = {};
            if (map.name !== -1) row.name = cols[map.name] || '';
            if (map.firstName !== -1) row.firstName = cols[map.firstName] || '';
            if (map.lastName !== -1) row.lastName = cols[map.lastName] || '';
            if (map.email !== -1) row.email = cols[map.email] || '';
            if (map.phone !== -1) row.phone = cols[map.phone] || '';
            if (map.company !== -1) row.company = cols[map.company] || '';
            if (map.addressLine1 !== -1) row.addressLine1 = cols[map.addressLine1] || '';
            if (map.city !== -1) row.city = cols[map.city] || '';
            if (map.state !== -1) row.state = cols[map.state] || '';
            if (map.postalCode !== -1) row.postalCode = cols[map.postalCode] || '';
            if (map.country !== -1) row.country = cols[map.country] || '';
            if (map.notes !== -1) row.notes = cols[map.notes] || '';
            if (map.externalId !== -1) row.externalId = cols[map.externalId] || '';

            // Derive Full name if only first/last are given
            if (!row.name && (row.firstName || row.lastName)) {
                row.name = `${row.firstName || ''} ${row.lastName || ''}`.trim();
            }

            return row;
        });

        return NextResponse.json({ success: true, mapping: map, source, preview, totalRows: lines.length - 1, headers });
    } catch (error) {
        console.error('Import preview error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
