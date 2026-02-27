import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import InstallPrompt from '@/components/InstallPrompt';
import { NotificationProvider } from '@/context/NotificationContext';
import NotificationToasts from '@/components/notifications/NotificationToasts';

import { cookies } from 'next/headers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://verihub.tektriq.com'),
  title: 'Verihub',
  applicationName: 'Verihub',
  description: 'Secure Receipt Intelligence',
  keywords: ['verihub', 'secure receipt intelligence', 'receipt management', 'tektriq'],
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon-48x48.png', sizes: '48x48', type: 'image/png' },
      { url: '/favicon/favicon-64x64.png', sizes: '64x64', type: 'image/png' }
    ],
    shortcut: '/favicon/favicon-32x32.png',
    apple: '/icons/apple-touch-icon.png',
  },
  openGraph: {
    title: 'Verihub — Secure Receipt Intelligence',
    description: 'Secure Receipt Intelligence',
    type: 'website',
    siteName: 'Verihub',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Verihub Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verihub — Secure Receipt Intelligence',
    description: 'Secure Receipt Intelligence',
    images: ['/opengraph-image.png'],
  },
  appleWebApp: {
    capable: true,
    title: 'Verihub',
    statusBarStyle: 'default',
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F172A',
};

import { verifyToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { ThemeProvider } from '@/components/ThemeProvider';

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  let isAuthenticated = false;
  let userRole: string | undefined;

  let initialTheme: "dark" | "light" = "dark";

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      isAuthenticated = true;
      userRole = payload.role as string;

      // Extract theme from DB
      const dbUser = await db.user.findUnique({
        where: { id: payload.userId as string },
        select: { theme: true }
      });
      if (dbUser?.theme === "light") {
        initialTheme = "light";
      }
    }
  }

  return (
    <html lang="en" className="h-[100vh] max-h-[100vh] antialiased overflow-hidden" data-theme={initialTheme}>
      <ThemeProvider initialTheme={initialTheme}>
        <body className={`${inter.className} h-[100vh] max-h-[100vh] w-full max-w-full overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-250 ease-in-out`}>
          {isAuthenticated ? (
            <NotificationProvider>
              <div className="h-[100vh] w-full flex flex-col overflow-hidden">
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
                <NotificationToasts />
                <Navbar isAuthenticated={isAuthenticated} role={userRole} />
                <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full relative">
                  <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 flex-grow w-full">
                    {children}
                  </main>
                  <InstallPrompt />
                  <Footer />
                </div>
              </div>
            </NotificationProvider>
          ) : (
            <div className="h-[100vh] w-full flex flex-col overflow-hidden">
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
              <Navbar isAuthenticated={isAuthenticated} role={userRole} />
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden w-full relative">
                <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 flex-grow w-full">
                  {children}
                </main>
                <InstallPrompt />
                <Footer />
              </div>
            </div>
          )}
        </body>
      </ThemeProvider>
    </html>
  );
}
