'use client';

import Link from 'next/link';
import type { DashboardStatusBreakdown } from '@/services/task.service';
import { SkBlock } from '@/components/ui/Skeleton';

export default function TaskStatusBreakdownWidget({
  breakdown,
  isLoading,
}: {
  breakdown?: DashboardStatusBreakdown[];
  isLoading?: boolean;
}) {
  const total = (breakdown ?? []).reduce((s, b) => s + b.count, 0);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2"/>
              <rect x="9" y="3" width="6" height="4" rx="1"/>
              <line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/>
            </svg>
          </div>
          <h2 className="text-base font-bold text-dark">Պատվերների բաշխում</h2>
        </div>
        <Link href="/tasks/active" className="text-xs text-primary font-medium hover:underline">
          Տեսնել →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {Array.from({ length: 3 }).map((_, i) => <SkBlock key={i} className="h-7 w-full rounded-lg" />)}
        </div>
      ) : !breakdown || breakdown.length === 0 || total === 0 ? (
        <p className="text-sm text-text-muted text-center py-4">Ակտիվ պատվեր չկա</p>
      ) : (
        <div className="flex flex-col gap-3">
          {/* Stacked bar */}
          <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-100 gap-px">
            {breakdown.filter((b) => b.count > 0).map((b) => (
              <div
                key={b.status_id}
                title={`${b.status_name}: ${b.count}`}
                style={{ flex: b.count, backgroundColor: b.color }}
                className="h-full"
              />
            ))}
          </div>

          {/* Legend rows */}
          <div className="flex flex-col gap-1.5">
            {breakdown.map((b) => (
              <div key={b.status_id} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs text-text-muted">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.color }} />
                  {b.status_name}
                </span>
                <span className="text-xs font-bold text-dark">{b.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
