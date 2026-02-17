import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import InstallPrompt from '@/components/InstallPrompt';

import { cookies } from 'next/headers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  metadataBase: new URL('https://receipthub.tektriq.com'),
  title: 'Receipt Hub – Simple Receipt Generator',
  description: 'Create, save, and print professional receipts with a simple web-based receipt generator. No accounts required.',
  keywords: ['receipt generator', 'create receipts', 'printable receipts', 'simple receipt app'],
  manifest: '/manifest.json',
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'Receipt Hub – Simple Receipt Generator',
    description: 'Create, save, and print professional receipts with a simple web-based receipt generator.',
    type: 'website',
    siteName: 'Receipt Hub',
    images: [
      {
        url: '/opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'Receipt Hub Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Receipt Hub – Simple Receipt Generator',
    description: 'Create, save, and print professional receipts with a simple web-based receipt generator.',
    images: ['/opengraph-image.png'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

import { verifyToken } from '@/lib/auth';

// ... (existing imports)

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;
  let isAuthenticated = false;
  let userRole: string | undefined;

  if (token) {
    const payload = await verifyToken(token);
    if (payload) {
      isAuthenticated = true;
      userRole = payload.role as string;
    }
  }

  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full`}>
        <div className="min-h-screen bg-[#0B1220] text-gray-100 flex flex-col">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'Organization',
                name: 'Tektriq LLC',
                url: 'https://tektriq.com',
                logo: 'https://receipthub.tektriq.com/tektriq-logo.png',
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
          <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8 flex-grow w-full">
            {children}
          </main>
          <InstallPrompt />
          <Footer />
        </div>
      </body>
    </html>
  );
}
