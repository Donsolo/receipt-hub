const fs = require('fs');
const path = require('path');

let modifiedCount = 0;

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
            let modified = false;

            const fetchRegex = /fetch\(\s*(['"]\/api\/[^'"]+['"]|`\/api\/[^`]+`)(.*?)\)/gs;
            content = content.replace(fetchRegex, (match, url, rest) => {
                modified = true;
                let newUrl = url;
                if (url.startsWith("'") || url.startsWith('"')) {
                    newUrl = '`${API_BASE_URL}' + url.slice(1, -1) + '`';
                } else if (url.startsWith('`')) {
                    newUrl = '`${API_BASE_URL}' + url.slice(1);
                }
                
                if (rest.trim() === '') {
                    return `fetch(${newUrl}, { headers: { ...((await getAuthHeader()) as any) } })`;
                }

                let newRest = rest;
                if (rest.trim().startsWith(',')) {
                    if (rest.includes('headers: {')) {
                        newRest = rest.replace('headers: {', 'headers: { ...((await getAuthHeader()) as any),');
                    } else if (rest.includes('{')) {
                        newRest = rest.replace('{', '{ headers: { ...((await getAuthHeader()) as any) },');
                    } else {
                        // fallback
                    }
                }

                return `fetch(${newUrl}${newRest})`;
            });

            const axiosRegex = /axios\.(get|post|put|delete|patch)\(\s*(['"]\/api\/[^'"]+['"]|`\/api\/[^`]+`)/g;
            content = content.replace(axiosRegex, (match, method, url) => {
                modified = true;
                let newUrl = url;
                if (url.startsWith("'") || url.startsWith('"')) {
                    newUrl = '`${API_BASE_URL}' + url.slice(1, -1) + '`';
                } else if (url.startsWith('`')) {
                    newUrl = '`${API_BASE_URL}' + url.slice(1);
                }
                return `axios.${method}(${newUrl}`;
            });

            if (modified) {
                if (!content.includes('API_BASE_URL')) {
                    content = `import { API_BASE_URL } from '@/lib/config';\n` + content;
                }
                if (!content.includes('getAuthHeader')) {
                    content = `import { getAuthHeader } from '@/lib/auth-client';\n` + content;
                }
                fs.writeFileSync(fullPath, content);
                modifiedCount++;
            }
        }
    }
}

const root = path.join(__dirname, '..');
processDir(path.join(root, 'src', 'app'));
processDir(path.join(root, 'src', 'components'));
console.log('Modified ' + modifiedCount + ' files.');
