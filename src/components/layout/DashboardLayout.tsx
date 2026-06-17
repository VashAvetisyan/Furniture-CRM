'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Sidebar from './Sidebar';
import Header from './Header';
import { useAuthStore, useUIStore } from '@/stores';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router          = useRouter();
  const pathname        = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated     = useAuthStore((s) => s._hasHydrated);
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.replace('/login');
  }, [hasHydrated, isAuthenticated, router]);

  // Close mobile sidebar on navigation
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  if (!hasHydrated || !isAuthenticated) return null;

  return (
    <div className="flex h-screen bg-light overflow-hidden md:p-3 md:gap-3">

      {/* Mobile backdrop */}
      <div
        onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 bg-black/50 z-20 transition-opacity duration-300 md:hidden ${
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Sidebar wrapper — fixed overlay on mobile, in-flow on desktop */}
      <div className={`
        fixed inset-y-0 left-0 z-30 p-3
        md:relative md:inset-auto md:p-0 md:translate-x-0 md:flex md:flex-shrink-0
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 gap-3 overflow-hidden p-3 md:p-0">
        <Header />
        <div className="flex-1 min-h-0 relative overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </div>

    </div>
  );
}
