'use client';

import Link from 'next/link';
import type { DashboardDTO } from '@/services/task.service';
import { SkStatCard } from '@/components/ui/Skeleton';

function fmt(val?: string | number): number {
  if (typeof val === 'number') return val;
  const n = parseFloat((val ?? '').replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : n;
}

export default function KpiCards({
  dashboard,
  isLoading,
}: {
  dashboard?: DashboardDTO;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => <SkStatCard key={i} />)}
      </div>
    );
  }

  const placeholder = '0';

  const cards = [
    {
      label: 'Ակտիվ պատվերներ',
      value: String(dashboard?.total_active_tasks ?? placeholder),
      href: '/tasks',
      bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/20',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
          <rect x="9" y="3" width="6" height="4" rx="1"/>
          <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
        </svg>
      ),
    },
    {
      label: 'Ժամկետանց',
      value: String(dashboard?.overdue_tasks ?? placeholder),
      href: '/tasks',
      bg: 'bg-error/10', text: 'text-error', border: 'border-error/20',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ),
    },
    {
      label: 'Այսօրվա զանգեր',
      value: String(dashboard?.upcoming_calls_today ?? placeholder),
      href: '/calls',
      bg: 'bg-warning/10', text: 'text-warning', border: 'border-warning/20',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.69A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l.36-.36a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
        </svg>
      ),
    },
    {
      label: 'Ամսի եկամուտ',
      value: dashboard ? `${fmt(dashboard.revenue_this_month).toLocaleString()} ֏` : placeholder,
      href: '/finance',
      bg: 'bg-success/10', text: 'text-success', border: 'border-success/20',
      icon: (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/>
          <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4">
      {cards.map((card) => (
        <Link
          key={card.label}
          href={card.href}
          className={`bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm border ${card.border} flex items-center gap-2 sm:gap-3 md:gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer`}
        >
          <div className={`w-9 h-9 sm:w-11 sm:h-11 md:w-12 md:h-12 rounded-lg sm:rounded-xl ${card.bg} ${card.text} flex items-center justify-center flex-shrink-0`}>
            <span className="[&>svg]:w-4 [&>svg]:h-4 sm:[&>svg]:w-5 sm:[&>svg]:h-5 md:[&>svg]:w-6 md:[&>svg]:h-6">
              {card.icon}
            </span>
          </div>
          <div className="min-w-0">
            <p className={`text-lg sm:text-xl md:text-2xl font-bold ${card.text} leading-tight`}>{card.value}</p>
            <p className="text-[10px] sm:text-xs text-text-muted mt-0.5 leading-snug">{card.label}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
