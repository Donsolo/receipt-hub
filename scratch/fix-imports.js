const fs = require('fs');
const path = require('path');

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            if (fullPath.includes(path.join('app', 'api')) || 
                fullPath.includes('auth-client.ts') || 
                fullPath.includes('config.ts') || 
                fullPath.includes('middleware.ts')) {
                continue;
            }

            let content = fs.readFileSync(fullPath, 'utf8');
            let needsSave = false;

            if (content.includes('API_BASE_URL') && !content.includes("import { API_BASE_URL }") && !content.includes("import {API_BASE_URL}")) {
                content = `import { API_BASE_URL } from '@/lib/config';\n` + content;
                needsSave = true;
            }
            if (content.includes('getAuthHeader') && !content.includes("import { getAuthHeader }") && !content.includes("import {getAuthHeader}")) {
                content = `import { getAuthHeader } from '@/lib/auth-client';\n` + content;
                needsSave = true;
            }

            if (needsSave) {
                fs.writeFileSync(fullPath, content);
            }
        }
    }
}

const root = path.join(__dirname, '..');
processDir(path.join(root, 'src', 'app'));
processDir(path.join(root, 'src', 'components'));
console.log('Fixed imports!');
