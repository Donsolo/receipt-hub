const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/messages/page.tsx', 'utf8');

code = code.replace(
    "import PageHeaderCard from '@/components/ui/PageHeaderCard';",
    "import PageHeaderCard from '@/components/ui/PageHeaderCard';\nimport { getCached, setCached } from '@/lib/api-cache';\nimport { useNetwork } from '@/lib/network-context';"
);

code = code.replace(
    "const [searchQuery, setSearchQuery] = useState('');",
    "const [searchQuery, setSearchQuery] = useState('');\n    const [isStale, setIsStale] = useState(false);\n    const { isOnline } = useNetwork();"
);

const fetchEffect = `    useEffect(() => {
        const loadData = async () => {
            try {
                const headers = { ...((await getAuthHeader()) as any) };
                
                let authData, convoData;
                
                try {
                    const [authRes, convoRes] = await Promise.all([
                        fetch(\`\${API_BASE_URL}/api/auth/me\`, { headers }),
                        fetch(\`\${API_BASE_URL}/api/conversations\`, { headers })
                    ]);
                    
                    if (!authRes.ok || !convoRes.ok) throw new Error('Network error');
                    
                    authData = await authRes.json();
                    convoData = await convoRes.json();
                    
                    await setCached('auth_me', authData);
                    await setCached('conversations', convoData);
                    setIsStale(false);
                } catch (e) {
                    console.warn('Falling back to cache');
                    authData = await getCached('auth_me', 7 * 24 * 60 * 60 * 1000);
                    convoData = await getCached('conversations', 7 * 24 * 60 * 60 * 1000);
                    setIsStale(true);
                }

                if (authData?.id) setAuthUserId(authData.id);
                if (convoData) setConversations(convoData);
                else setConversations([]);
                
            } catch (err) {
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, []);`;

code = code.replace(/useEffect\(\(\) => \{[\s\S]*?\}, \[\]\);/m, fetchEffect);

code = code.replace(
    '<PageHeaderCard title="Messages" description="Manage your direct conversations with connections." />',
    `<PageHeaderCard title="Messages" description="Manage your direct conversations with connections." />
                    {isStale && (
                        <div className="bg-amber-900/40 border border-amber-500/30 rounded-lg p-3 flex items-center mb-4 text-sm text-amber-200/80">
                            <svg className="w-4 h-4 mr-2 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            You are offline. Showing cached messages.
                        </div>
                    )}`
);

fs.writeFileSync('src/app/dashboard/messages/page.tsx', code);
