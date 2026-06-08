const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

let count = 0;
walkDir('src/app/api', function(filePath) {
    if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = content.replace(
            /request\.headers\.get\('cookie'\)\?\.split\('auth_token='\)(?:\[1\])?\?\.split\(';'\)(?:\[0\])?/g,
            "(request.headers.get('cookie')?.split('auth_token=')[1]?.split(';')[0] || (request.headers.get('authorization')?.startsWith('Bearer ') ? request.headers.get('authorization')?.substring(7) : undefined))"
        );
        if (content !== newContent) {
            fs.writeFileSync(filePath, newContent, 'utf8');
            count++;
            console.log('Updated', filePath);
        }
    }
});
console.log(`Updated ${count} files.`);
