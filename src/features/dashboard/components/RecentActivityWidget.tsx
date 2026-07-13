'use client';

import type { DashboardActivity } from '@/services/task.service';
import { SkListRow } from '@/components/ui/Skeleton';

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)    return `${diff}վ`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}ր`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ժ`;
  return `${Math.floor(diff / 86400)}օ`;
}

function eventIcon(type: string) {
  switch (type) {
    case 'task_assigned': return '📋';
    case 'task_status':   return '🔄';
    case 'task_deadline': return '⏰';
    case 'task_comment':  return '💬';
    case 'call_reminder': return '📞';
    default:              return '🔔';
  }
}

export default function RecentActivityWidget({
  activity,
  isLoading,
}: {
  activity?: DashboardActivity[];
  isLoading?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <h2 className="text-base font-bold text-dark">Վերջին ակտիվություն</h2>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <SkListRow key={i} />)}</div>
      ) : !activity || activity.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <span className="text-3xl">🔔</span>
          <p className="text-sm text-text-muted">Ակտիվություն դեռ չկա</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activity.map((a) => (
            <div key={a.id} className="flex items-start gap-2.5">
              <span className="text-base flex-shrink-0 mt-0.5">{eventIcon(a.event_type)}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-dark truncate">{a.title}</p>
                {a.message && <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{a.message}</p>}
              </div>
              <span className="text-[11px] text-text-muted flex-shrink-0">{timeAgo(a.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
