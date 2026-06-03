const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/connections/page.tsx', 'utf8');

code = code.replace(
    "import PageHeaderCard from '@/components/ui/PageHeaderCard';",
    "import PageHeaderCard from '@/components/ui/PageHeaderCard';\nimport { getCached, setCached } from '@/lib/api-cache';\nimport { useNetwork } from '@/lib/network-context';"
);

code = code.replace(
    "const [isSuggestedModalOpen, setIsSuggestedModalOpen] = useState(false);",
    "const [isSuggestedModalOpen, setIsSuggestedModalOpen] = useState(false);\n    const [isStale, setIsStale] = useState(false);\n    const { isOnline } = useNetwork();"
);

const fetchCode = `    // Fetch auth userId on mount for message rendering logic
    useEffect(() => {
        const fetchAuth = async () => {
            try {
                const res = await fetch(\`\${API_BASE_URL}/api/auth/me\`, { headers: { ...((await getAuthHeader()) as any) } });
                if (res.ok) {
                    const data = await res.json();
                    setAuthUserId(data.id);
                    setAuthUser(data);
                    await setCached('auth_me', data);
                } else {
                    throw new Error('Network error');
                }
            } catch (e) {
                const data = await getCached('auth_me', 7 * 24 * 60 * 60 * 1000);
                if (data) {
                    setAuthUserId(data.id);
                    setAuthUser(data);
                }
            }
        };
        fetchAuth();
    }, []);

    const showToast = (message: string) => {
        setToastMessage(message);
        setTimeout(() => setToastMessage(null), 3000);
    };

    // Load initial data
    const loadData = useCallback(async () => {
        try {
            const timestamp = Date.now();
            const headers = { ...((await getAuthHeader()) as any) };
            
            const [incomingRes, connectionsRes] = await Promise.all([
                fetch(\`\${API_BASE_URL}/api/connections/incoming?t=\${timestamp}\`, { headers, cache: 'no-store' }),
                fetch(\`\${API_BASE_URL}/api/connections?t=\${timestamp}\`, { headers, cache: 'no-store' })
            ]);

            if (!incomingRes.ok || !connectionsRes.ok) throw new Error('Network error');

            const incoming = await incomingRes.json();
            const connectionsData = await connectionsRes.json();

            setIncomingRequests(incoming);
            setConnections(connectionsData);

            await setCached('connections_incoming', incoming);
            await setCached('connections', connectionsData);
            setIsStale(false);
        } catch (error) {
            console.error('Failed to load connections data, falling back to cache');
            const incoming = await getCached('connections_incoming', 7 * 24 * 60 * 60 * 1000);
            const connectionsData = await getCached('connections', 7 * 24 * 60 * 60 * 1000);
            
            if (incoming) setIncomingRequests(incoming);
            if (connectionsData) setConnections(connectionsData);
            setIsStale(true);
        }
    }, []);`;

code = code.replace(/\/\/ Fetch auth userId on mount for message rendering logic[\s\S]*?\}, \[\]\);/m, fetchCode);

// Add offline indicator after NetworkHero
code = code.replace(
    '<div className="relative z-20 flex-1 bg-[#F4F5F9] rounded-t-[20px] -mt-4 px-4 sm:px-6 pt-5 pb-8 flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">',
    `<div className="relative z-20 flex-1 bg-[#F4F5F9] rounded-t-[20px] -mt-4 px-4 sm:px-6 pt-5 pb-8 flex flex-col shadow-[0_-4px_24px_rgba(0,0,0,0.1)]">
                {isStale && (
                    <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 flex items-center mb-6 text-sm text-amber-800">
                        <svg className="w-4 h-4 mr-2 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        You are offline. Showing cached connections.
                    </div>
                )}`
);

// Disable buttons when offline
code = code.replace(/disabled=\{actionLoading === user\.id\}/g, "disabled={actionLoading === user.id || !isOnline}");
code = code.replace(/disabled=\{actionLoading === req\.id\}/g, "disabled={actionLoading === req.id || !isOnline}");

fs.writeFileSync('src/app/dashboard/connections/page.tsx', code);
