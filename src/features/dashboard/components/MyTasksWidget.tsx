'use client';

import Link from 'next/link';
import type { DashboardMyTask } from '@/services/task.service';
import { SkListRow } from '@/components/ui/Skeleton';

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('hy-AM', { day: '2-digit', month: 'short', year: 'numeric' });
}

const PRIORITY_CLS: Record<string, string> = {
  high:   'text-error',
  medium: 'text-warning',
  low:    'text-success',
};

export default function MyTasksWidget({
  tasks,
  isLoading,
}: {
  tasks?: DashboardMyTask[];
  isLoading?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-dark">Ինձ նշանակված</h2>
        <Link href="/tasks/active" className="text-xs text-primary font-medium hover:underline">
          Բոլորը →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <SkListRow key={i} />)}</div>
      ) : !tasks || tasks.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <span className="text-3xl">✅</span>
          <p className="text-sm text-text-muted">Ընթացիկ պատվեր չկա</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {tasks.map((t) => (
            <div key={t.taskId} className="flex items-center justify-between gap-3 py-1.5 border-b border-crm-border last:border-0">
              <div className="min-w-0">
                <p className="text-xs font-mono text-text-muted">{t.taskId}</p>
                <p className="text-sm font-medium text-dark truncate">{t.name}</p>
              </div>
              <div className="flex-shrink-0 text-right">
                <p className={`text-xs font-semibold ${PRIORITY_CLS[t.priority?.toLowerCase()] ?? 'text-text-muted'}`}>{t.statusName}</p>
                {t.deadline && <p className="text-[11px] text-text-muted mt-0.5">{fmtDate(t.deadline)}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
