import type { Metadata } from 'next';
import { Providers } from './providers';
import ThemeProvider from '@/components/ThemeProvider';
import '@/styles/globals.css';

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
    <html lang="hy" suppressHydrationWarning>
      <head>
        {/* Anti-flash: apply dark class before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=JSON.parse(localStorage.getItem('crm-ui')||'{}');if(s.state&&s.state.isDarkMode)document.documentElement.classList.add('dark')}catch(e){}})()` }} />
      </head>
      <body>
        <Providers>
          <ThemeProvider />
          {children}
        </Providers>
      </body>
    </html>
  );
}
