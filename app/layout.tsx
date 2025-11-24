import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import '@mysten/dapp-kit/dist/index.css';
import dynamic from 'next/dynamic';

const inter = Inter({ subsets: ['latin'] });

// Dynamic import to prevent SSR localStorage issues
const Providers = dynamic(() => import('@/components/Providers').then(mod => ({ default: mod.Providers })), {
  ssr: false,
});

export const metadata: Metadata = {
  title: 'Walrus Stamp - Sui dApp',
  description: 'A Sui x Walrus dApp built with Next.js',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
