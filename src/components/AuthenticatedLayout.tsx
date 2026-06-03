'use client';
import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNav from './BottomNav';
import GlobalVeroBubble from './vero/GlobalVeroBubble';
import { NotificationProvider } from '@/context/NotificationContext';
import NotificationToasts from '@/components/notifications/NotificationToasts';
import BroadcastDisplay from '@/components/BroadcastDisplay';
import PullToRefreshWrapper from '@/components/PullToRefreshWrapper';
import InstallPrompt from '@/components/InstallPrompt';

export default function AuthenticatedLayout({ children, role, isPro, userName, businessName, businessLogoPath, activeInvoicesCount }: any) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const hasCookie = document.cookie.includes('auth_token');
    import('@capacitor/core').then(({ Capacitor }) => {
      if (Capacitor.isNativePlatform()) {
        import('@capacitor/preferences').then(({ Preferences }) => {
          Preferences.get({ key: 'auth_token' }).then(({ value }) => {
            setIsAuthenticated(!!value || hasCookie);
            setChecked(true);
          });
        });
      } else {
        setIsAuthenticated(hasCookie);
        setChecked(true);
      }
    });
  }, []);

  if (!checked) return <div className="min-h-screen" />;

  const content = (
    <div className="flex flex-col min-h-screen relative" style={{ width: '100dvw', maxWidth: '100dvw' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Tektriq LLC',
            url: 'https://tektriq.com',
            logo: 'https://verihub.tektriq.com/tektriq-logo.png',
            contactPoint: {
              '@type': 'ContactPoint',
              telephone: '',
              contactType: 'customer support',
              email: 'support@tektriq.com',
            },
          }),
        }}
      />
      {isAuthenticated && <NotificationToasts />}
      <Navbar isAuthenticated={isAuthenticated} role={role} isPro={isPro} userName={userName} businessName={businessName} businessLogoPath={businessLogoPath} activeInvoicesCount={activeInvoicesCount} />
      <div className="flex-1 flex flex-col w-full relative">
        <BroadcastDisplay />
        <main className="flex-grow w-full flex flex-col relative">
          <PullToRefreshWrapper>
            {children}
          </PullToRefreshWrapper>
        </main>
        <InstallPrompt />
        <Footer />
      </div>
      {isAuthenticated && <BottomNav isPro={isPro} />}
      {isAuthenticated && <GlobalVeroBubble isPro={isPro} />}
    </div>
  );

  if (isAuthenticated) {
    return <NotificationProvider>{content}</NotificationProvider>;
  }

  return content;
}
