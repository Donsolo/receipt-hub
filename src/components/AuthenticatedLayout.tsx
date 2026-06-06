'use client';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNav from './BottomNav';
import GlobalVeroBubble from './vero/GlobalVeroBubble';
import { NotificationProvider } from '@/context/NotificationContext';
import NotificationToasts from '@/components/notifications/NotificationToasts';
import BroadcastDisplay from '@/components/BroadcastDisplay';
import PullToRefreshWrapper from '@/components/PullToRefreshWrapper';
import InstallPrompt from '@/components/InstallPrompt';
import { useAuth } from '@/context/AuthContext';

export default function AuthenticatedLayout({ children, initialIsAuthenticated = false }: any) {
  const { isAuthenticated, user } = useAuth();
  const isPro = (user?.plan === "PRO" && user?.planStatus !== "inactive") || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

  // Use the server's knowledge of auth state to ensure stable hydration,
  // preventing a full tree remount when useAuth() finishes loading.
  const isTrulyAuthenticated = isAuthenticated || initialIsAuthenticated;

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
      {isTrulyAuthenticated && <NotificationToasts />}
      <Navbar />
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
      {isTrulyAuthenticated && <BottomNav />}
      {isTrulyAuthenticated && <GlobalVeroBubble isPro={isPro} />}
    </div>
  );

  if (isTrulyAuthenticated) {
    return <NotificationProvider>{content}</NotificationProvider>;
  }

  return content;
}
