'use client';

import Link from 'next/link';
import type { DashboardCall } from '@/services/task.service';
import { SkListRow } from '@/components/ui/Skeleton';

export default function TodayCalls({
  calls,
  isLoading,
}: {
  calls?: DashboardCall[];
  isLoading?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-dark">Այսօրվա զանգեր</h2>
        <Link href="/contacts/calls" className="text-xs text-primary font-medium hover:underline">
          Բոլոր զանգերը →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkListRow key={i} />)}</div>
      ) : !calls || calls.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <span className="text-3xl">📭</span>
          <p className="text-sm text-text-muted">Այսօր նախատեսված զանգ չկա</p>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((client) => {
            const name     = `${client.first_name} ${client.last_name}`.trim();
            const initials = `${client.first_name[0] ?? ''}${client.last_name?.[0] ?? ''}`.toUpperCase();
            return (
              <div
                key={client.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-warning/20 bg-warning/5 hover:bg-warning/10 transition-colors"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-warning/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-warning">{initials}</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark truncate">{name}</p>
                  <p className="text-xs text-text-muted">{client.phone}</p>
                </div>

                {/* Call button */}
                <a
                  href={`tel:${client.phone}`}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-warning text-white hover:bg-yellow-500 transition-colors flex-shrink-0"
                  title="Զանգել"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.69A2 2 0 012 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.09a16 16 0 006 6l.36-.36a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
