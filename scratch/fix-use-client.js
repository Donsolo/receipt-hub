const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? 
            walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./src', function(filePath) {
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) return;
    
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if the file has "use client" or 'use client'
    const useClientRegex = /^[\s]*[\"']use client[\"'];?[\s]*/m;
    
    if (useClientRegex.test(content)) {
        const trimmed = content.trim();
        // If it does not start with "use client" or 'use client'
        if (!trimmed.startsWith('"use client"') && !trimmed.startsWith("'use client'")) {
            console.log('Fixing:', filePath);
            content = content.replace(useClientRegex, '');
            content = '"use client";\n' + content;
            fs.writeFileSync(filePath, content);
        }
    }
});
