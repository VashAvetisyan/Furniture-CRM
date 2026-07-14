'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { brandService } from '@/services/brand.service';
import { mediaUrl } from '@/lib/api';
import {
  DashboardIcon, ProjectsIcon, CalendarIcon,
  EmployeesIcon, LogoutIcon, CallsIcon, FinanceIcon,
  WarehouseIcon, WorkshopIcon, ContactsIcon, CustomersIcon,
  SalariesIcon, SettingsIcon, ArchiveIcon, InvoiceIcon, DeliveryIcon,
  PendingPaymentsIcon,
} from '@/components/icons';
import { useAuthStore, useUIStore } from '@/stores';
import { authService } from '@/services/auth.service';
import { accessService } from '@/services/access.service';

// ── Types ─────────────────────────────────────────────────────────────────────

type IconFC = React.FC<{ className?: string }>;

interface LinkItem {
  type: 'link';
  label: string;
  href: string;
  Icon: IconFC;
}

interface GroupItem {
  type: 'group';
  key: string;
  label: string;
  Icon: IconFC;
  children: Array<{ label: string; href: string; Icon: IconFC }>;
}

type NavEntry = LinkItem | GroupItem;

// ── Nav config ────────────────────────────────────────────────────────────────

const NAV: NavEntry[] = [
  { type: 'link',  label: 'Գլխավոր',      href: '/dashboard',  Icon: DashboardIcon  },
  {
    type: 'group',
    key:  'tasks',
    label: 'Պատվերներ',
    Icon: ProjectsIcon,
    children: [
      { label: 'Ակտիվ',  href: '/tasks/active', Icon: ProjectsIcon },
      { label: 'Արխիվ',  href: '/tasks/archive', Icon: ArchiveIcon  },
    ],
  },
  { type: 'link',  label: 'Օրացույց',     href: '/calendar',   Icon: CalendarIcon   },
  {
    type: 'group',
    key:  'contacts',
    label: 'Կոնտակտներ',
    Icon: ContactsIcon,
    children: [
      { label: 'Զանգեր',        href: '/contacts/calls',     Icon: CallsIcon      },
      { label: 'Հաճախորդներ',   href: '/contacts/customers', Icon: CustomersIcon  },
    ],
  },
  { type: 'link',  label: 'Մուտք / Ելք',  href: '/finance',    Icon: FinanceIcon    },
  {
    type: 'group',
    key:  'production',
    label: 'Արտադրություն',
    Icon: WorkshopIcon,
    children: [
      { label: 'Պահեստ',        href: '/production/warehouse', Icon: WarehouseIcon },
      { label: 'Արտադրամաս',    href: '/production/workshops',  Icon: WorkshopIcon  },
    ],
  },
  {
    type: 'group',
    key:  'staff',
    label: 'Կադրեր',
    Icon: EmployeesIcon,
    children: [
      { label: 'Աշխատողներ',  href: '/staff/employees', Icon: EmployeesIcon },
      { label: 'Աշխատավարձ',  href: '/staff/salaries',  Icon: SalariesIcon  },
      { label: 'Բանաձևներ',   href: '/staff/payroll',   Icon: FinanceIcon   },
    ],
  },
  {
    type: 'group',
    key:  'debt',
    label: 'Պարտքեր',
    Icon: InvoiceIcon,
    children: [
      { label: 'Հաճախորդներ', href: '/debt/customers',  Icon: CustomersIcon },
      { label: 'Մատակարարներ',   href: '/debt/suppliers', Icon: WarehouseIcon },
      { label: 'Աշխատողներ',  href: '/debt/employees',  Icon: EmployeesIcon },
      { label: 'Այլ',         href: '/debt/other',      Icon: FinanceIcon   },
    ],
  },
  { type: 'link',  label: 'Կատալոգ',      href: '/catalog',   Icon: WarehouseIcon  },
  { type: 'link',  label: 'Առաքում',          href: '/delivery',         Icon: DeliveryIcon        },
  { type: 'link',  label: 'Սպասվող Վճ․', href: '/pending-payments', Icon: PendingPaymentsIcon },
  { type: 'link',  label: 'Կարգավորումներ', href: '/settings',  Icon: SettingsIcon   },
];

// ── Sub-item ──────────────────────────────────────────────────────────────────

function SubItem({ label, href, Icon, active }: {
  label: string; href: string; Icon: IconFC; active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative w-full flex items-center gap-2.5 pl-8 pr-5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
        active
          ? 'text-primary bg-primary-light shadow-sm'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-[15px] h-[15px] flex-shrink-0" />
      <span className="truncate min-w-0">{label}</span>
      {active && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
      )}
    </Link>
  );
}

// ── Group item ────────────────────────────────────────────────────────────────

function GroupNavItem({ entry, isOpen, anyChildActive, onToggle, isChildActive }: {
  entry: GroupItem;
  isOpen: boolean;
  anyChildActive: boolean;
  onToggle: () => void;
  isChildActive: (href: string) => boolean;
}) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
          anyChildActive
            ? 'text-primary bg-primary-light shadow-sm'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
        }`}
      >
        <entry.Icon className="w-[18px] h-[18px] flex-shrink-0" />
        <span className="flex-1 text-left truncate min-w-0">{entry.label}</span>
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        {anyChildActive && !isOpen && (
          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
        )}
      </button>

      {isOpen && (
        <div className="mt-0.5 space-y-0.5">
          {entry.children.map((child) => (
            <SubItem
              key={child.href}
              label={child.label}
              href={child.href}
              Icon={child.Icon}
              active={isChildActive(child.href)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Simple link item ──────────────────────────────────────────────────────────

function LinkNavItem({ label, href, Icon, active }: {
  label: string; href: string; Icon: IconFC; active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative w-full flex items-center gap-3 px-3 py-2.5 pr-5 rounded-xl text-sm font-medium transition-all duration-200 ${
        active
          ? 'text-primary bg-primary-light shadow-sm'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
      <span className="truncate min-w-0">{label}</span>
      {active && (
        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />
      )}
    </Link>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

// Backend slugs are flat kebab-case IDs mirroring the URL path with '/' replaced by '-'
// (e.g. href '/tasks/active' -> slug 'tasks-active').
function hrefToSlug(href: string): string {
  return href.replace(/^\//, '').replace(/\//g, '-');
}

// Match a nav entry against allowed backend slugs.
// For groups: check the group key itself (e.g. "debt") OR any child slug.
function pageAllowed(entry: NavEntry, allowedSlugs: Set<string>): boolean {
  if (entry.type === 'link') {
    return allowedSlugs.has(hrefToSlug(entry.href));
  }
  return allowedSlugs.has(entry.key) ||
    entry.children.some((c) => allowedSlugs.has(hrefToSlug(c.href)));
}

// Route guard used by DashboardLayout — hiding a nav link only stops an
// employee from *clicking* their way into a restricted page; typing the URL
// directly still rendered it, since nothing checked access at the page level.
// Only pages actually represented in NAV are gated; unknown/dynamic routes
// (e.g. a detail page not listed here) are left alone rather than guessed at.
export function isPathAllowed(pathname: string, allowedSlugs: Set<string>): boolean {
  for (const entry of NAV) {
    if (entry.type === 'link') {
      if (pathname === entry.href || pathname.startsWith(entry.href + '/')) {
        return pageAllowed(entry, allowedSlugs);
      }
    } else {
      for (const child of entry.children) {
        if (pathname === child.href || pathname.startsWith(child.href + '/')) {
          return pageAllowed(entry, allowedSlugs);
        }
      }
    }
  }
  return true;
}

// Where to send someone bounced off a page they can't see — '/dashboard' only
// works as a fallback if they actually have it; otherwise land on whichever
// page they do have, in NAV order. Returns null if they have none at all.
export function getFirstAllowedPath(allowedSlugs: Set<string>): string | null {
  for (const entry of NAV) {
    if (entry.type === 'link') {
      if (pageAllowed(entry, allowedSlugs)) return entry.href;
    } else if (pageAllowed(entry, allowedSlugs)) {
      const child = entry.children.find((c) => allowedSlugs.has(hrefToSlug(c.href)));
      if (child) return child.href;
    }
  }
  return null;
}

export default function Sidebar() {
  const pathname        = usePathname();
  const router          = useRouter();
  const { logout } = useAuthStore();
  const queryClient     = useQueryClient();

  const { data: myPages } = useQuery({
    queryKey: ['my-pages'],
    queryFn:  accessService.getMyPages,
    staleTime: 5 * 60 * 1000,
  });

  // loading (undefined) → show all (no flicker) | loaded → filter by allowed slugs
  const allowedSlugs: Set<string> | null = myPages === undefined
    ? null
    : new Set(myPages.map((p) => p.slug));

  const visibleNav = allowedSlugs === null
    ? NAV
    : NAV.filter((entry) => pageAllowed(entry, allowedSlugs));

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initial: Record<string, boolean> = {};
    visibleNav.forEach((entry) => {
      if (entry.type === 'group') {
        const hasActive = entry.children.some((c) => pathname.startsWith(c.href));
        if (hasActive) initial[entry.key] = true;
      }
    });
    setOpenGroups(initial);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleGroup(key: string) {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function isLinkActive(href: string) {
    return href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href);
  }

  function handleLogout() {
    authService.logout();
    logout();
    queryClient.clear();
    router.replace('/login');
  }

  const { setSidebarOpen } = useUIStore();

  const { data: brand, isLoading: brandLoading } = useQuery({
    queryKey:  ['brand'],
    queryFn:   brandService.get,
    staleTime: 10 * 60_000,
  });

  const logoSrc = mediaUrl(brand?.logo ?? null);

  return (
    <aside className="app-sidebar w-52 h-full bg-white rounded-2xl shadow-sm flex flex-col flex-shrink-0 overflow-hidden">
      {/* Logo + brand name + mobile close */}
      <div className="px-4 pt-5 pb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Logo — skeleton while loading */}
          <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-sm shadow-primary/20 ring-1 ring-primary/10">
            {brandLoading ? (
              <div className="w-full h-full bg-gray-200 animate-pulse rounded-xl" />
            ) : logoSrc ? (
              <Image
                src={logoSrc}
                alt={brand?.name ?? 'Logo'}
                width={36}
                height={36}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <span className="text-white font-bold text-sm">
                  {brand?.name?.charAt(0).toUpperCase() ?? 'C'}
                </span>
              </div>
            )}
          </div>
          {/* Brand name — skeleton while loading */}
          {brandLoading ? (
            <div className="h-4 w-20 bg-gray-200 animate-pulse rounded-lg" />
          ) : brand?.name ? (
            <span className="font-bold text-dark text-sm leading-tight truncate tracking-tight">
              {brand.name}
            </span>
          ) : null}
        </div>

        {/* Mobile close */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden flex-shrink-0 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {visibleNav.map((entry) => {
          if (entry.type === 'link') {
            return (
              <LinkNavItem
                key={entry.href}
                label={entry.label}
                href={entry.href}
                Icon={entry.Icon}
                active={isLinkActive(entry.href)}
              />
            );
          }

          const anyChildActive = entry.children.some((c) => pathname === c.href || pathname.startsWith(c.href + '/'));
          return (
            <GroupNavItem
              key={entry.key}
              entry={entry}
              isOpen={!!openGroups[entry.key]}
              anyChildActive={anyChildActive}
              onToggle={() => toggleGroup(entry.key)}
              isChildActive={(href) => {
                if (pathname === href) return true;
                if (pathname.startsWith(href + '/')) {
                  return !entry.children.some(c => c.href !== href && (pathname === c.href || pathname.startsWith(c.href + '/')));
                }
                return false;
              }}
            />
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4 border-t border-gray-100">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
        >
          <LogoutIcon className="w-4 h-4" />
          Ելք
        </button>
      </div>
    </aside>
  );
}
