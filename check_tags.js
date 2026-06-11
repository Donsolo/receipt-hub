const fs = require('fs');

const code = fs.readFileSync('src/components/invoices/InvoiceWizard.tsx', 'utf8');

let stack = [];
let lines = code.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Ignore comments
    if (line.trim().startsWith('//') || line.trim().startsWith('{/*')) continue;

    // Simple tag matching for div, button, span, svg, etc
    const openMatches = line.match(/<([a-zA-Z0-9]+)(?![^>]*\/>)[^>]*>/g) || [];
    for (const match of openMatches) {
        if (match.startsWith('</') || match.endsWith('/>')) continue;
        const tag = match.match(/<([a-zA-Z0-9]+)/)[1];
        if (['input', 'img', 'br', 'hr', 'meta', 'link'].includes(tag)) continue;
        stack.push({ tag, line: i + 1 });
    }

    const closeMatches = line.match(/<\/([a-zA-Z0-9]+)>/g) || [];
    for (const match of closeMatches) {
        const tag = match.match(/<\/([a-zA-Z0-9]+)>/)[1];
        if (stack.length > 0 && stack[stack.length - 1].tag === tag) {
            stack.pop();
        } else {
            console.log(`Unmatched closing tag </${tag}> at line ${i + 1}`);
        }
    }
}

console.log("Remaining open tags:", stack);
