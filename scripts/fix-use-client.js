const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Use a manual recursive scan instead:
function getAllFiles(dir, exts) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getAllFiles(full, exts));
    else if (exts.some(e => entry.name.endsWith(e))) results.push(full);
  }
  return results;
}

const allFiles = getAllFiles('./src', ['.tsx', '.ts']);
let fixedCount = 0;

for (const filePath of allFiles) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Check if file has the bad pattern: imports before "use client"
  const useClientMatch = content.match(/^(['"]use client['"];?\n)/m);
  if (!useClientMatch) continue;
  
  const useClientIndex = content.indexOf(useClientMatch[0]);
  const firstImportIndex = content.search(/^import /m);
  
  // If "use client" is NOT at the start (index > 0) and there are imports before it
  if (useClientIndex > 0 && firstImportIndex < useClientIndex) {
    // Remove "use client" from its current position
    let fixed = content.replace(/^(['"]use client['"];?\n)/m, '');
    // Add it as the very first line
    fixed = `'use client';\n` + fixed;
    fs.writeFileSync(filePath, fixed, 'utf8');
    fixedCount++;
    console.log('Fixed:', filePath);
  }
}

console.log(`\nTotal files fixed: ${fixedCount}`);
