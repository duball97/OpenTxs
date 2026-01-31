import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  metadataBase: new URL('https://opentx.vercel.app'),
  title: {
    default: 'OpenTx | Blockchain to CSV Tax Export',
    template: '%s | OpenTx',
  },
  description: 'Normalize and export Polkadot and blockchain transactions for Awaken Tax and accounting software. Private, open-source, and direct-to-chain.',
  keywords: ['blockchain', 'tax', 'csv', 'polkadot', 'dot', 'awaken tax', 'crypto accounting', 'subscan'],
  authors: [{ name: 'duball97', url: 'https://x.com/duball97' }],
  openGraph: {
    title: 'OpenTx | Blockchain Tax Export',
    description: 'Export your blockchain history to perfectly formatted CSVs.',
    url: 'https://opentx.vercel.app',
    siteName: 'OpenTx',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenTx',
    creator: '@duball97',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
