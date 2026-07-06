'use client';

import Link from 'next/link';
import type { DashboardDeadline } from '@/services/task.service';
import { SkListRow } from '@/components/ui/Skeleton';

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysLeft(deadline: string): number {
  const diff = new Date(deadline).getTime() - new Date(getToday()).getTime();
  return Math.ceil(diff / 86400000);
}

const PRIORITY_LABELS: Record<string, string> = {
  High: 'Բարձր', Medium: 'Միջին', Low: 'Ցածր',
};

export default function UpcomingDeadlines({
  deadlines,
  isLoading,
}: {
  deadlines?: DashboardDeadline[];
  isLoading?: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-dark">Մոտ ժամկետները</h2>
        <Link href="/tasks" className="text-xs text-primary font-medium hover:underline">
          Տեսնել բոլորը →
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-1">{Array.from({ length: 4 }).map((_, i) => <SkListRow key={i} />)}</div>
      ) : !deadlines || deadlines.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8">
          <span className="text-3xl">✅</span>
          <p className="text-sm text-text-muted">Հաջորդ 7 օրում ժամկետ չկա</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deadlines.map((task) => {
            const days   = daysLeft(task.deadline);
            const urgent = days <= 1;
            const soon   = days <= 3;
            return (
              <div
                key={task.taskId}
                className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl border border-crm-border hover:border-primary/20 hover:bg-primary-light/20 transition-all"
              >
                {/* Day counter */}
                <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${
                  urgent ? 'bg-error/10 text-error' : soon ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'
                }`}>
                  <span className="text-sm sm:text-base font-bold leading-none">{days}</span>
                  <span className="text-[9px] font-semibold leading-none mt-0.5">օր</span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-semibold text-dark truncate">{task.name}</p>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 flex-wrap">
                    {task.assigneeName && (
                      <>
                        <span className="text-[11px] sm:text-xs text-text-muted truncate max-w-[80px] sm:max-w-none">{task.assigneeName}</span>
                        <span className="text-text-muted hidden sm:inline">·</span>
                      </>
                    )}
                    <span className={`text-[11px] sm:text-xs font-medium ${urgent ? 'text-error' : 'text-text-muted'}`}>
                      {task.deadline}
                    </span>
                  </div>
                </div>

                {/* Right badges */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="hidden sm:inline text-[11px] font-mono text-text-muted bg-gray-50 px-2 py-0.5 rounded">
                    {task.taskId}
                  </span>
                  {task.priority && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      task.priority === 'High'
                        ? 'bg-error/10 text-error'
                        : task.priority === 'Medium'
                        ? 'bg-warning/10 text-warning'
                        : 'bg-success/10 text-success'
                    }`}>
                      {PRIORITY_LABELS[task.priority] ?? task.priority}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
