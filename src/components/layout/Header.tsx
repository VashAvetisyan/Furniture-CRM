'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronDownIcon } from '@/components/icons';
import { useAuthStore, useUIStore } from '@/stores';
import { mediaUrl } from '@/lib/api';
import NotificationBell from './NotificationBell';

function HamburgerIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6"  x2="21" y2="6"  />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const { toggleSidebar, isDarkMode, toggleDarkMode } = useUIStore();

  const initials = user?.name
    ? user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  const avatarSrc = mediaUrl(user?.avatar);

  return (
    <header className="h-14 md:h-16 bg-white rounded-2xl shadow-sm flex items-center px-3 md:px-6 gap-2 md:gap-4 flex-shrink-0">

      {/* Hamburger — mobile only */}
      <button
        onClick={toggleSidebar}
        className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors flex-shrink-0"
      >
        <HamburgerIcon />
      </button>


      <div className="flex-1" />

      {/* Dark mode toggle */}
      <button
        onClick={toggleDarkMode}
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors flex-shrink-0"
        title={isDarkMode ? 'Բաց ռեժիմ' : 'Մուգ ռեժիմ'}
      >
        {isDarkMode ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5"/>
            <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
            <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
          </svg>
        )}
      </button>

      {/* Notification bell */}
      <NotificationBell />

      {/* User profile */}
      <Link href="/profile" className="flex items-center gap-2 pl-1 pr-2 py-1.5 hover:bg-gray-50 rounded-xl transition-colors flex-shrink-0">
        <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-white text-xs font-bold bg-gradient-to-br from-orange-400 to-pink-500">
          {avatarSrc ? (
            <Image src={avatarSrc} alt={user?.name ?? ''} width={32} height={32} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
        </div>
        <span className="hidden sm:block text-sm font-semibold text-gray-700 max-w-[120px] truncate">{user?.name ?? '...'}</span>
        <ChevronDownIcon className="hidden sm:block w-4 h-4 text-gray-400" />
      </Link>

    </header>
  );
}
