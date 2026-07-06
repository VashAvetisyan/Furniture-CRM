import type { Metadata } from 'next';
import { Noto_Sans_Armenian } from 'next/font/google';
import { Providers } from './providers';
import ThemeProvider from '@/components/ThemeProvider';
import '@/styles/globals.css';

const font = Noto_Sans_Armenian({
  subsets: ['armenian'],
  weight: ['400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: 'CRM Frontend',
  description: 'Enterprise CRM Management System',
  icons: {
    icon: '/favicon.ico',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
  },
  manifest: '/manifest.json',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="hy" suppressHydrationWarning className={font.variable}>
      <head>
        {/* Anti-flash: apply dark class before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=JSON.parse(localStorage.getItem('crm-ui')||'{}');if(s.state&&s.state.isDarkMode)document.documentElement.classList.add('dark')}catch(e){}})()` }} />
      </head>
      <body className={font.className}>
        <Providers>
          <ThemeProvider />
          {children}
        </Providers>
      </body>
    </html>
  );
}
