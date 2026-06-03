const fs = require('fs');

let code = fs.readFileSync('src/context/NotificationContext.tsx', 'utf8');

// Add imports if missing
if (!code.includes("import { API_BASE_URL }")) {
    code = code.replace(
        "import { usePushNotifications } from '@/hooks/usePushNotifications';",
        "import { usePushNotifications } from '@/hooks/usePushNotifications';\nimport { API_BASE_URL } from '@/lib/config';\nimport { getAuthHeader } from '@/lib/auth-client';"
    );
}

// Replace fetches
code = code.replace(/fetch\('\/api\/notifications'\)/g, "fetch(`${API_BASE_URL}/api/notifications`, { headers: { ...((await getAuthHeader()) as any) } })");
code = code.replace(/fetch\('\/api\/notifications\/unread-count'\)/g, "fetch(`${API_BASE_URL}/api/notifications/unread-count`, { headers: { ...((await getAuthHeader()) as any) } })");
code = code.replace(/fetch\('\/api\/notifications\/mark-read', \{/g, "fetch(`${API_BASE_URL}/api/notifications/mark-read`, {\n                headers: { 'Content-Type': 'application/json', ...((await getAuthHeader()) as any) },");
code = code.replace(/fetch\('\/api\/notifications\/mark-all-read', \{/g, "fetch(`${API_BASE_URL}/api/notifications/mark-all-read`, {\n                headers: { ...((await getAuthHeader()) as any) },");

// Fix double headers in mark-read
code = code.replace(/headers: \{ 'Content-Type': 'application\/json', \.\.\.\(\(await getAuthHeader\(\)\) as any\) \},\n                headers: \{ 'Content-Type': 'application\/json' \},/g, "headers: { 'Content-Type': 'application/json', ...((await getAuthHeader()) as any) },");

fs.writeFileSync('src/context/NotificationContext.tsx', code);
