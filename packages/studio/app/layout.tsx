import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '../src/index.css';

export const metadata: Metadata = {
  title: 'Converge Studio',
  icons: { icon: '/favicon.svg', apple: '/apple-touch-icon.png' },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang='en' suppressHydrationWarning>
      <head />
      <body suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
