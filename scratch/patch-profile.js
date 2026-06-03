const fs = require('fs');

let code = fs.readFileSync('src/app/dashboard/profile/page.tsx', 'utf8');

code = code.replace(
    "import { usePlatform } from '@/lib/platform';",
    "import { usePlatform } from '@/lib/platform';\nimport { useNetwork } from '@/lib/network-context';\nimport { getCached, setCached } from '@/lib/api-cache';"
);

code = code.replace(
    "const { isNativeAndroid } = usePlatform();",
    "const { isNativeAndroid } = usePlatform();\n    const { isOnline } = useNetwork();\n    const [isStale, setIsStale] = useState(false);"
);

const fetchProfileCode = `const fetchProfile = async () => {
            try {
                let authData, profileData, notifData;
                
                try {
                    const res = await fetch(\`\${API_BASE_URL}/api/auth/me\`, { headers: { ...((await getAuthHeader()) as any) } });
                    if (!res.ok) throw new Error('Network error');
                    authData = await res.json();
                    await setCached('auth_me', authData);
                    
                    const profileRes = await fetch(\`\${API_BASE_URL}/api/user/profile\`, { headers: { ...((await getAuthHeader()) as any) }, cache: 'no-store' });
                    if (!profileRes.ok) throw new Error('Network error');
                    profileData = await profileRes.json();
                    await setCached('user_profile', profileData);

                    const notifRes = await fetch(\`\${API_BASE_URL}/api/user/notification-preferences\`, { headers: { ...((await getAuthHeader()) as any) } });
                    if (notifRes.ok) {
                        notifData = await notifRes.json();
                        await setCached('user_notif', notifData);
                    }
                    setIsStale(false);
                } catch (e) {
                    console.warn('Network fetch failed, falling back to cache');
                    authData = await getCached('auth_me', 7 * 24 * 60 * 60 * 1000);
                    profileData = await getCached('user_profile', 7 * 24 * 60 * 60 * 1000);
                    notifData = await getCached('user_notif', 7 * 24 * 60 * 60 * 1000);
                    setIsStale(true);
                    
                    if (!authData || !profileData) {
                        router.push('/login');
                        return;
                    }
                }

                setRole(authData.role);
                setProfile(profileData);
                setName(profileData.name || '');
                setBusinessName(profileData.businessName || '');
                setBusinessPhone(profileData.businessPhone || '');
                setBusinessAddress(profileData.businessAddress || '');
                setBusinessLogoPath(profileData.businessLogoPath || null);
                setBusinessRegistrationNumber(profileData.businessRegistrationNumber || '');
                setTimezone(profileData.timezone || 'America/New_York');

                if (notifData) {
                    setNotifyConnectionRequests(notifData.notifyConnectionRequests ?? true);
                    setNotifyConnectionAccepted(notifData.notifyConnectionAccepted ?? true);
                    setNotifyMessages(notifData.notifyMessages ?? true);
                    setNotifySystem(notifData.notifySystem ?? true);
                }

            } catch (error) {
                console.error('Failed to fetch profile', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();`;

code = code.replace(/const fetchProfile = async \(\) => \{[\s\S]*?fetchProfile\(\);/m, fetchProfileCode);

code = code.replace(
    /<button\s+type="submit"\s+disabled=\{saving \|\| !isDirty\}/g,
    `<button
                                            type="submit"
                                            disabled={saving || !isDirty || !isOnline}
                                            title={!isOnline ? "Unavailable offline" : ""}
`
);

fs.writeFileSync('src/app/dashboard/profile/page.tsx', code);
