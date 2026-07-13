'use client';

import Link from 'next/link';
import type { DashboardDeliveryStats } from '@/services/task.service';
import { SkBlock } from '@/components/ui/Skeleton';

const ROWS: { key: keyof DashboardDeliveryStats; label: string; bg: string; text: string }[] = [
  { key: 'pending',    label: 'Սպասում',     bg: 'bg-gray-100',  text: 'text-gray-600'  },
  { key: 'scheduled',  label: 'Նշանակված',  bg: 'bg-blue-100',  text: 'text-blue-700'  },
  { key: 'in_transit', label: 'Ճանապարհին', bg: 'bg-amber-100', text: 'text-amber-700' },
  { key: 'delivered',  label: 'Հաստատված',  bg: 'bg-green-100', text: 'text-green-700' },
  { key: 'failed',     label: 'Ձախողված',   bg: 'bg-red-100',   text: 'text-red-700'   },
];

export default function DeliveryTodayWidget({
  stats,
  isLoading,
}: {
  stats?: DashboardDeliveryStats;
  isLoading?: boolean;
}) {
  const total = stats ? Object.values(stats).reduce((s, v) => s + v, 0) : 0;

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13" rx="1"/><path d="M16 8h4l3 3v5h-7V8z"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
          </div>
          <h2 className="text-base font-bold text-dark">Առաքում այսօր</h2>
        </div>
        <Link href="/delivery" className="text-xs text-primary font-medium hover:underline">
          Բոլորը →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => <SkBlock key={i} className="h-7 w-full rounded-lg" />)}
        </div>
      ) : !stats || total === 0 ? (
        <p className="text-sm text-text-muted text-center py-4">Այսօրվա համար առաքում չկա</p>
      ) : (
        <div className="flex flex-col gap-2">
          {ROWS.filter((r) => stats[r.key] > 0).map((r) => (
            <div key={r.key} className="flex items-center justify-between">
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${r.bg} ${r.text}`}>
                {r.label}
              </span>
              <span className="text-sm font-bold text-dark">{stats[r.key]}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
