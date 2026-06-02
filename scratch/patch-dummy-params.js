const fs = require('fs');
const path = require('path');

function findAllPages(dir) {
    let res = [];
    const files = fs.readdirSync(dir, { withFileTypes: true });
    for (const f of files) {
        const fullPath = path.join(dir, f.name);
        if (f.isDirectory()) {
            res = res.concat(findAllPages(fullPath));
        } else if (f.name === 'page.tsx') {
            res.push(fullPath);
        }
    }
    return res;
}

const allPages = findAllPages('./src/app');

for (const p of allPages) {
    if (p.includes('src\\\\app\\\\api') || p.includes('src/app/api')) continue;
    let c = fs.readFileSync(p, 'utf8');
    if (c.includes('export async function generateStaticParams')) {
        // Extract the param name from the path
        // e.g. src\app\admin\users\[id]\page.tsx -> 'id'
        const match = p.match(/\[([a-zA-Z0-9_]+)\]/);
        if (match) {
            const paramName = match[1];
            console.log(`Patching dummy param for ${p} with param: ${paramName}`);
            // Replace `return [];` or `return [{ id: '1' }];` with `return [{ ${paramName}: 'fallback' }];`
            c = c.replace(/return\s+\[.*?\];/, `return [{ ${paramName}: 'fallback' }];`);
            fs.writeFileSync(p, c);
        }
    }
}
console.log('Done patching dummy params.');
