'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  DashboardIcon, ProjectsIcon, CalendarIcon,
  EmployeesIcon, LogoutIcon, CallsIcon, FinanceIcon,
  WarehouseIcon, WorkshopIcon, ContactsIcon, CustomersIcon,
  SalariesIcon, SettingsIcon, ArchiveIcon, InvoiceIcon,
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
  { type: 'link',  label: 'Պատվերներ',    href: '/tasks',      Icon: ProjectsIcon   },
  { type: 'link',  label: 'Օրացույց',     href: '/calendar',   Icon: CalendarIcon   },
  {
    type: 'group',
    key:  'contacts',
    label: 'Կոնտակտներ',
    Icon: ContactsIcon,
    children: [
      { label: 'Զանգեր',        href: '/calls',     Icon: CallsIcon      },
      { label: 'Հաճախորդներ',   href: '/customers', Icon: CustomersIcon  },
    ],
  },
  { type: 'link',  label: 'Մուտք / Ելք',  href: '/finance',    Icon: FinanceIcon    },
  { type: 'link',  label: 'Պահեստ',       href: '/warehouse',  Icon: WarehouseIcon  },
  { type: 'link',  label: 'Արտադրամաս',   href: '/workshops',  Icon: WorkshopIcon   },
  { type: 'link',  label: 'Աշխատողներ',   href: '/employees',  Icon: EmployeesIcon  },
  { type: 'link',  label: 'Աշխատավարձ',   href: '/salaries',   Icon: SalariesIcon   },
  { type: 'link',  label: 'Արխիվ',           href: '/archive',   Icon: ArchiveIcon    },
  {
    type: 'group',
    key:  'debt',
    label: 'Պարտքեր',
    Icon: InvoiceIcon,
    children: [
      { label: 'Հաճախորդներ', href: '/debt',           Icon: CustomersIcon },
      { label: 'Մատակարարներ',   href: '/debt/suppliers', Icon: WarehouseIcon },
    ],
  },
  { type: 'link',  label: 'Կատալոգ',      href: '/catalog',   Icon: WarehouseIcon  },
  { type: 'link',  label: 'Կարգավորումներ', href: '/settings',  Icon: SettingsIcon   },
];

// ── Sub-item ──────────────────────────────────────────────────────────────────

function SubItem({ label, href, Icon, active }: {
  label: string; href: string; Icon: IconFC; active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`relative flex items-center gap-2.5 pl-8 pr-3 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'text-primary bg-primary-light'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-[15px] h-[15px] flex-shrink-0" />
      <span>{label}</span>
      {active && (
        <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-primary rounded-l-full" />
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
        className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
          anyChildActive
            ? 'text-primary bg-primary-light'
            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
        }`}
      >
        <entry.Icon className="w-[18px] h-[18px] flex-shrink-0" />
        <span className="flex-1 text-left">{entry.label}</span>
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
        {anyChildActive && !isOpen && (
          <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-primary rounded-l-full" />
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
      className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'text-primary bg-primary-light'
          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
      }`}
    >
      <Icon className="w-[18px] h-[18px] flex-shrink-0" />
      <span>{label}</span>
      {active && (
        <span className="absolute -right-3 top-1/2 -translate-y-1/2 w-[3px] h-7 bg-primary rounded-l-full" />
      )}
    </Link>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

// Match a nav entry against allowed backend slugs.
// For groups: check the group key itself (e.g. "contacts") OR any child href slug.
function pageAllowed(entry: NavEntry, allowedSlugs: Set<string>): boolean {
  if (entry.type === 'link') {
    return allowedSlugs.has(entry.href.replace(/^\//, ''));
  }
  return allowedSlugs.has(entry.key) ||
    entry.children.some((c) => allowedSlugs.has(c.href.replace(/^\//, '')));
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

  return (
    <aside className="w-52 h-full bg-white rounded-2xl shadow-sm flex flex-col flex-shrink-0 overflow-hidden">
      {/* Logo + mobile close */}
      <div className="px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-md">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
          </svg>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="md:hidden p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
