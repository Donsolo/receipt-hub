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

for (const pagePath of allPages) {
    // Only target UI routes with dynamic segments (skip api)
    if (pagePath.includes(path.join('src', 'app', 'api'))) continue;
    if (!pagePath.includes('[') || !pagePath.includes(']')) continue;

    const dir = path.dirname(pagePath);
    const clientPagePath = path.join(dir, 'ClientPage.tsx');
    const layoutPath = path.join(dir, 'layout.tsx');

    const content = fs.readFileSync(pagePath, 'utf8');
    if (content.includes("'use client'") || content.includes('"use client"')) {
        console.log(`Wrapping ${dir}...`);
        fs.renameSync(pagePath, clientPagePath);
        
        const wrapperContent = `import ClientPage from './ClientPage';

export function generateStaticParams() {
    return [];
}

export default function Page() {
    return <ClientPage />;
}
`;
        fs.writeFileSync(pagePath, wrapperContent);
    }

    if (fs.existsSync(layoutPath)) {
        const layoutContent = fs.readFileSync(layoutPath, 'utf8');
        if (layoutContent.includes('generateStaticParams')) {
            console.log(`Deleting layout.tsx in ${dir}...`);
            fs.unlinkSync(layoutPath);
        }
    }
}

console.log('Done.');
