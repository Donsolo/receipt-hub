const fs = require('fs');
const path = require('path');

const ts1308Output = `
src/app/admin/global-message/page.tsx
src/app/billing/page.tsx
src/app/dashboard/campaigns/[id]/ClientPage.tsx
src/app/dashboard/connections/page.tsx
src/app/dashboard/contacts/[id]/ClientPage.tsx
src/app/dashboard/invoices/aging/page.tsx
src/app/dashboard/invoices/edit/[id]/ClientPage.tsx
src/app/dashboard/messages/[conversationId]/ChatClient.tsx
src/app/dashboard/messages/page.tsx
src/app/invoice/[token]/bundle/ClientPage.tsx
src/app/invoice/[token]/ClientPage.tsx
src/app/receipt/[id]/ClientPage.tsx
src/app/receipt/[id]/edit/ClientPage.tsx
src/components/billing/BillingCenterClient.tsx
src/components/billing/BillingDashboardWidget.tsx
src/components/BottomNav.tsx
src/components/BroadcastDisplay.tsx
`.trim().split('\n');

const root = path.join(__dirname, '..');

for (const line of ts1308Output) {
    if (!line) continue;
    const fileRelPath = line.trim();
    const fullPath = path.join(root, fileRelPath);
    if (!fs.existsSync(fullPath)) continue;

    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Find all 'fetch(' that contain 'await getAuthHeader' inside but are not preceded by 'await fetch('
    // We can do a simple loop
    let modified = false;
    let idx = 0;
    while (true) {
        idx = content.indexOf('fetch(', idx);
        if (idx === -1) break;
        
        // check if preceded by 'await '
        const beforeStr = content.slice(Math.max(0, idx - 10), idx);
        if (beforeStr.includes('await ') || beforeStr.includes('=> ')) {
            idx++;
            continue;
        }

        // find closing parenthesis
        let openParenCount = 0;
        let endIdx = -1;
        for (let i = idx; i < content.length; i++) {
            if (content[i] === '(') openParenCount++;
            else if (content[i] === ')') {
                openParenCount--;
                if (openParenCount === 0) {
                    endIdx = i;
                    break;
                }
            }
        }

        if (endIdx !== -1) {
            const fetchCall = content.slice(idx, endIdx + 1);
            if (fetchCall.includes('await getAuthHeader')) {
                // replace
                content = content.slice(0, idx) + '(async () => ' + fetchCall + ')()' + content.slice(endIdx + 1);
                modified = true;
                idx = endIdx + 15; // move past the inserted text
            } else {
                idx++;
            }
        } else {
            idx++;
        }
    }

    if (modified) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed', fileRelPath);
    }
}
