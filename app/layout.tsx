import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const sans = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  metadataBase: new URL('https://www.opentxapp.xyz'),
  title: {
    default: 'OpenTx | Polkadot Tax Export',
    template: '%s | OpenTx',
  },
  description: 'Export Polkadot (DOT) transaction history for tax reporting. Generate tax-ready CSVs compatible with Awaken Tax and other crypto tax software. Private, open-source, no wallet connection required.',
  keywords: ['polkadot', 'dot', 'tax', 'csv', 'crypto accounting', 'subscan', 'opentx', 'awaken tax', 'blockchain'],
  authors: [{ name: 'duball97', url: 'https://x.com/duball97' }],
  openGraph: {
    title: 'OpenTx | Polkadot Tax Export',
    description: 'Export Polkadot transaction history to tax-ready CSVs. Fast, private, and compatible with Awaken Tax.',
    url: 'https://www.opentxapp.xyz',
    siteName: 'OpenTx',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'OpenTx | Polkadot Tax Export',
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
