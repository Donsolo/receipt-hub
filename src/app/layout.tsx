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
  metadataBase: new URL('https://verihub.app'),
  title: 'Verihub — Secure, Audit-Ready Receipt Intelligence',
  applicationName: 'Verihub',
  description: 'Verihub is a secure, audit-ready receipt intelligence platform built for modern operators. Generate, verify, and manage business receipts on infrastructure designed for compliance, scale, and long-term growth.',
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
    type: 'website',
    url: 'https://verihub.app',
    title: 'Verihub — Secure, Audit-Ready Receipt Intelligence',
    description: 'Secure, audit-ready receipt intelligence built for modern businesses. Generate, verify, and manage receipts with precision infrastructure designed for compliance and scale.',
    siteName: 'Verihub',
    images: [
      {
        url: 'https://verihub.app/og/verihub-og.png',
        width: 1200,
        height: 630,
        alt: 'Verihub — Secure, Audit-Ready Receipt Intelligence',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Verihub — Secure, Audit-Ready Receipt Intelligence',
    description: 'Secure receipt intelligence built for serious operators.',
    images: ['https://verihub.app/og/verihub-og.png'],
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
  themeColor: '#0B1220',
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

  let initialTheme: "dark" | "light" | "system" = "dark";

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
      } else if (dbUser?.theme === "system") {
        initialTheme = "system";
      }
    }
  }

  return (
    <html lang="en" suppressHydrationWarning data-theme={initialTheme === "system" ? "dark" : initialTheme}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var initialTheme = '${initialTheme}';
                  if (initialTheme === 'system') {
                    var isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <ThemeProvider initialTheme={initialTheme}>
        <body className={`${inter.className} antialiased min-h-screen flex flex-col bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-250 ease-in-out`}>
          {isAuthenticated ? (
            <NotificationProvider>
              <div className="flex flex-col min-h-screen w-full relative">
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
                <div className="flex-1 flex flex-col w-full relative">
                  <main className="flex-grow w-full flex flex-col relative">
                    {children}
                  </main>
                  <InstallPrompt />
                  <Footer />
                </div>
              </div>
            </NotificationProvider>
          ) : (
            <div className="flex flex-col min-h-screen w-full relative">
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
              <div className="flex-1 flex flex-col w-full relative">
                <main className="flex-grow w-full flex flex-col relative">
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
