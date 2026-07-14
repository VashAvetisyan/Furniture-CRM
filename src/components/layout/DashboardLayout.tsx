'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import Sidebar, { isPathAllowed, getFirstAllowedPath } from './Sidebar';
import Header from './Header';
import ToastStack from '@/components/ui/ToastStack';
import TopProgressBar from '@/components/ui/TopProgressBar';
import { useAuthStore, useUIStore } from '@/stores';
import { useWebSocket } from '@/hooks/useWebSocket';
import { refreshAccessToken } from '@/lib/api';
import { accessService } from '@/services/access.service';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router          = useRouter();
  const pathname        = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const hasHydrated     = useAuthStore((s) => s._hasHydrated);
  const role            = useAuthStore((s) => s.role);
  const { sidebarOpen, setSidebarOpen } = useUIStore();

  const [navigating, setNavigating] = useState(false);
  const prevPath  = useRef(pathname);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  useWebSocket();

  useEffect(() => {
    if (hasHydrated && !isAuthenticated) router.replace('/login');
  }, [hasHydrated, isAuthenticated, router]);

  // Sidebar only *hides* links an employee's position isn't allowed to see —
  // it never stopped someone from reaching that same page by typing the URL
  // directly. Guard it here too, in the one place every dashboard page routes
  // through. Directors bypass this entirely; employees only get bounced once
  // the permission list has actually loaded (undefined = still loading).
  const { data: myPages } = useQuery({
    queryKey:  ['my-pages'],
    queryFn:   accessService.getMyPages,
    staleTime: 5 * 60 * 1000,
    enabled:   role === 'employee',
  });

  useEffect(() => {
    if (role !== 'employee' || myPages === undefined) return;
    const allowedSlugs = new Set(myPages.map((p) => p.slug));
    if (isPathAllowed(pathname, allowedSlugs)) return;
    // '/dashboard' was previously always exempt from this check — but an
    // employee whose position doesn't have dashboard access would still get
    // bounced right back to it, silently showing them a page they're not
    // supposed to see. Send them to the first page they actually have instead.
    const fallback = getFirstAllowedPath(allowedSlugs);
    if (fallback && fallback !== pathname) router.replace(fallback);
  }, [role, myPages, pathname, router]);

  // Proactively renew the access token as soon as the app boots into an
  // authenticated shell, instead of waiting for the first page's data fetch to
  // 401 and refresh reactively — makes returning to the app after the access
  // token (but not the refresh token) has expired invisible to the user.
  useEffect(() => {
    if (hasHydrated && isAuthenticated) void refreshAccessToken();
  }, [hasHydrated, isAuthenticated]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname, setSidebarOpen]);

  // Show spinner IMMEDIATELY when any internal link is clicked
  useEffect(() => {
    function onLinkClick(e: MouseEvent) {
      const anchor = (e.target as Element).closest('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || !href.startsWith('/') || href === pathname) return;
      setNavigating(true);
      clearTimeout(hideTimer.current);
    }
    document.addEventListener('mousedown', onLinkClick);
    return () => document.removeEventListener('mousedown', onLinkClick);
  }, [pathname]);

  // Hide spinner after navigation completes
  useEffect(() => {
    if (prevPath.current === pathname) return;
    prevPath.current = pathname;
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setNavigating(false), 400);
    return () => clearTimeout(hideTimer.current);
  }, [pathname]);

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

      {/* Sidebar wrapper */}
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

          {/* Navigation loading overlay */}
          <div className={`absolute inset-0 z-50 flex items-center justify-center bg-light/70 backdrop-blur-[2px] transition-opacity duration-200 pointer-events-none ${
            navigating ? 'opacity-100' : 'opacity-0'
          }`}>
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-full border-[3px] border-primary/20 border-t-primary animate-spin" />
            </div>
          </div>

          {children}
        </div>
      </div>

      <ToastStack />
      <TopProgressBar />
    </div>
  );
}
