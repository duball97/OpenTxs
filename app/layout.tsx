import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  metadataBase: new URL('https://opentxapp.xyz'),
  title: {
    default: 'OpenTx | Export your Polkadot Transactions',
    template: '%s | OpenTx',
  },
  description: 'Export your Polkadot transaction history to CSV. Fast, private, and compatible with tax software.',
  keywords: ['polkadot', 'dot', 'transactions', 'csv', 'crypto accounting', 'subscan', 'opentx', 'blockchain'],
  authors: [{ name: 'duball97', url: 'https://x.com/duball97' }],
  openGraph: {
    title: 'OpenTx | Export your Polkadot Transactions',
    description: 'Export your Polkadot transaction history to CSV. Fast, private, and compatible with tax software.',
    url: 'https://opentxapp.xyz',
    siteName: 'OpenTx',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://opentxapp.xyz/social2.png',
        width: 1200,
        height: 630,
        alt: 'OpenTx Social Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenTx | Export your Polkadot Transactions',
    creator: '@duball97',
    images: ['https://opentxapp.xyz/social2.png'],
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
