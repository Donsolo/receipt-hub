const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'src/app/activate/page.tsx',
    'src/app/billing/page.tsx',
    'src/components/invoices/CustomerPortalViewer.tsx',
    'src/components/invoices/PublicInvoiceViewer.tsx'
];

const root = path.join(__dirname, '..');

for (const relPath of filesToUpdate) {
    const fullPath = path.join(root, relPath);
    if (!fs.existsSync(fullPath)) continue;

    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // Replace window.location.href = data.url;
    // or window.location.href = data.url
    // with capacitor logic
    const regex = /window\.location\.href\s*=\s*data\.url;?/g;
    if (regex.test(content)) {
        content = content.replace(regex, `if (Capacitor.isNativePlatform()) {
                    Browser.open({ url: data.url });
                } else {
                    window.location.href = data.url;
                }`);
        modified = true;
    }

    if (modified) {
        if (!content.includes('import { Browser }')) {
            content = `import { Browser } from '@capacitor/browser';\n` + content;
        }
        if (!content.includes('import { Capacitor }')) {
            content = `import { Capacitor } from '@capacitor/core';\n` + content;
        }
        fs.writeFileSync(fullPath, content);
        console.log('Updated', relPath);
    }
}
