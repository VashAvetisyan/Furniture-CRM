'use client';

import Link from 'next/link';
import Avatar from '@/components/ui/Avatar';
import { SkBlock } from '@/components/ui/Skeleton';
import type { DashboardWorkload } from '@/services/task.service';

export default function WorkloadWidget({
  workload,
  isLoading,
}: {
  workload?: DashboardWorkload[];
  isLoading?: boolean;
}) {
  const employees = [...(workload ?? [])].sort((a, b) => b.total - a.total);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <h2 className="text-base font-bold text-dark">Կատարողներ</h2>
        </div>
        <Link href="/staff/employees" className="text-xs text-primary font-medium hover:underline">
          Բոլորը →
        </Link>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-primary"/><span className="text-[11px] text-text-muted">Ընթացիկ</span></div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-success"/><span className="text-[11px] text-text-muted">Ավարտված</span></div>
        <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-full bg-gray-200"/><span className="text-[11px] text-text-muted">Մնացած</span></div>
      </div>

      {isLoading ? (
        <div className="space-y-3.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <SkBlock className="w-7 h-7 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <SkBlock className="h-3 w-24" />
                <SkBlock className="h-2 w-full rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : employees.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-4">Կատարող չկա</p>
      ) : (
        <div className="space-y-3.5">
          {employees.map((emp) => {
            const active  = emp.active;
            const done    = emp.done;
            const pending = Math.max(0, emp.total - active - done);
            const total   = emp.total;
            return (
              <div key={emp.employee_id} className="flex items-center gap-2.5">
                <Avatar color={emp.color} initials={emp.initials} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-xs font-semibold text-dark truncate">{emp.name}</p>
                    <span className="text-xs font-bold text-dark ml-1 flex-shrink-0">
                      {total}
                    </span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100 gap-px">
                    {active > 0 && (
                      <div
                        title={`Ընթացիկ: ${active}`}
                        style={{ flex: active }}
                        className="h-full bg-primary rounded-full"
                      />
                    )}
                    {done > 0 && (
                      <div
                        title={`Ավարտված: ${done}`}
                        style={{ flex: done }}
                        className="h-full bg-success rounded-full"
                      />
                    )}
                    {pending > 0 && (
                      <div
                        title={`Մնացած: ${pending}`}
                        style={{ flex: pending }}
                        className="h-full bg-gray-300 rounded-full"
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
