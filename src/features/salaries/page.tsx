'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { taskService } from '@/services/task.service';
import { employeeService } from '@/services/employee.service';
import Avatar from '@/components/ui/Avatar';
import type { TaskAssignee } from '@/features/projects/types';

// ── helpers ───────────────────────────────────────────────────────────────────

function getSalary(a: TaskAssignee): number {
  return parseFloat(String(a.salaryAmount)) || 0;
}

function getTotalPaid(a: TaskAssignee): number {
  const fromPayments = (a.payments ?? []).reduce(
    (s, p) => s + (parseFloat((p as { amount: string }).amount) || 0), 0,
  );
  if (fromPayments > 0) return fromPayments;
  return parseFloat(String(a.totalPaid ?? '0').replace(/[^\d.]/g, '')) || 0;
}

function fmt(n: number) {
  return n.toLocaleString('hy-AM');
}

// ── types ─────────────────────────────────────────────────────────────────────

interface EmployeeSalary {
  id:        number;
  name:      string;
  color:     string;
  initials:  string;
  total:     number;
  paid:      number;
  unpaid:    number;
  taskCount: number;
}

// ── component ─────────────────────────────────────────────────────────────────

export default function SalariesPage() {
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  const { data: taskData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn:  taskService.getAll,
    staleTime: 60_000,
  });

  const { data: employeesData, isLoading: empsLoading } = useQuery({
    queryKey: ['employees'],
    queryFn:  () => employeeService.getAll(),
    staleTime: 5 * 60_000,
  });

  const tasks     = taskData?.results ?? [];
  const employees = employeesData?.data ?? [];

  const employeeSalaries = useMemo<EmployeeSalary[]>(() => {
    const map = new Map<number, EmployeeSalary>();

    employees.forEach((emp) => {
      map.set(Number(emp.id), {
        id:        Number(emp.id),
        name:      emp.name,
        color:     emp.color     ?? '#94a3b8',
        initials:  emp.initials  ?? emp.name.slice(0, 2).toUpperCase(),
        total:     0,
        paid:      0,
        unpaid:    0,
        taskCount: 0,
      });
    });

    tasks.forEach((task) => {
      if (!task.assignees?.length) return;
      task.assignees.forEach((a) => {
        const salary = getSalary(a);
        if (salary === 0) return;
        const paid   = getTotalPaid(a);
        const unpaid = Math.max(0, salary - paid);

        if (map.has(a.userId)) {
          const e    = map.get(a.userId)!;
          e.total    += salary;
          e.paid     += paid;
          e.unpaid   += unpaid;
          e.taskCount += 1;
        } else {
          map.set(a.userId, {
            id:        a.userId,
            name:      a.name,
            color:     a.color,
            initials:  a.initials,
            total:     salary,
            paid,
            unpaid,
            taskCount: 1,
          });
        }
      });
    });

    return Array.from(map.values())
      .filter((e) => e.total > 0)
      .sort((a, b) => b.unpaid - a.unpaid);
  }, [tasks, employees]);

  const filtered = useMemo(() => {
    if (filter === 'unpaid') return employeeSalaries.filter((e) => e.unpaid > 0);
    if (filter === 'paid')   return employeeSalaries.filter((e) => e.unpaid === 0);
    return employeeSalaries;
  }, [employeeSalaries, filter]);

  const grandTotal  = employeeSalaries.reduce((s, e) => s + e.total,  0);
  const grandPaid   = employeeSalaries.reduce((s, e) => s + e.paid,   0);
  const grandUnpaid = employeeSalaries.reduce((s, e) => s + e.unpaid, 0);
  const paidPct     = grandTotal > 0 ? Math.round((grandPaid / grandTotal) * 100) : 0;

  const isLoading = tasksLoading || empsLoading;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
        Բեռնվում է...
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 md:gap-6 p-3 md:p-6 overflow-y-auto overflow-x-hidden">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg md:text-xl font-bold text-dark">Աշխատավարձներ</h1>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([['all', 'Բոլորը'], ['unpaid', 'Պարտք'], ['paid', 'Վճարված']] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                filter === k
                  ? 'bg-white text-dark shadow-sm'
                  : 'text-text-muted hover:text-dark'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 md:gap-4">
        {/* Total */}
        <div className="bg-white rounded-2xl p-3 md:p-5 border border-crm-border shadow-sm">
          <p className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 md:mb-3">
            Ընդհանուր գումար
          </p>
          <p className="text-base md:text-2xl font-bold text-dark">{fmt(grandTotal)} ֏</p>
          <p className="text-[10px] md:text-xs text-text-muted mt-0.5 md:mt-1">{employeeSalaries.length} աշխ.</p>
        </div>

        {/* Paid */}
        <div className="bg-white rounded-2xl p-3 md:p-5 border border-crm-border shadow-sm">
          <p className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 md:mb-3">
            Վճարված
          </p>
          <p className="text-base md:text-2xl font-bold text-success">{fmt(grandPaid)} ֏</p>
          <div className="flex items-center gap-1 md:gap-2 mt-1 md:mt-2">
            <div className="flex-1 h-1 md:h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-success rounded-full"
                style={{ width: `${paidPct}%` }}
              />
            </div>
            <span className="text-[10px] md:text-xs text-text-muted">{paidPct}%</span>
          </div>
        </div>

        {/* Unpaid */}
        <div className="bg-white rounded-2xl p-3 md:p-5 border border-crm-border shadow-sm">
          <p className="text-[9px] md:text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1 md:mb-3">
            Պարտք
          </p>
          <p className={`text-base md:text-2xl font-bold ${grandUnpaid > 0 ? 'text-error' : 'text-text-muted'}`}>
            {fmt(grandUnpaid)} ֏
          </p>
          <p className="text-xs text-text-muted mt-1">
            {grandTotal > 0 ? Math.round((grandUnpaid / grandTotal) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-crm-border p-10 text-center text-text-muted text-sm">
             չկա
          </div>
        ) : filtered.map((emp) => {
          const pct = emp.total > 0 ? (emp.paid / emp.total) * 100 : 0;
          const isFullyPaid = emp.unpaid === 0;
          return (
            <Link key={emp.id} href={`/employees/${emp.id}?tab=salary`}>
              <div className="bg-white rounded-2xl border border-crm-border p-4 flex flex-col gap-3 hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar color={emp.color} initials={emp.initials} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-dark truncate">{emp.name}</p>
                    <p className="text-xs text-text-muted">{emp.taskCount} հատ.</p>
                  </div>
                  {isFullyPaid ? (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[11px] font-semibold">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                      Վճարված
                    </span>
                  ) : (
                    <span className="flex-shrink-0 text-sm font-bold text-error">{fmt(emp.unpaid)} ֏</span>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 rounded-xl p-2">
                    <p className="text-[10px] text-text-muted mb-0.5">Ընդհանուր</p>
                    <p className="text-xs font-bold text-dark">{fmt(emp.total)} ֏</p>
                  </div>
                  <div className="bg-success/5 rounded-xl p-2">
                    <p className="text-[10px] text-text-muted mb-0.5">Վճարված</p>
                    <p className="text-xs font-bold text-success">{fmt(emp.paid)} ֏</p>
                  </div>
                  <div className="bg-error/5 rounded-xl p-2">
                    <p className="text-[10px] text-text-muted mb-0.5">Պարտք</p>
                    <p className={`text-xs font-bold ${emp.unpaid > 0 ? 'text-error' : 'text-text-muted'}`}>{fmt(emp.unpaid)} ֏</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1 md:h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${isFullyPaid ? 'bg-success' : 'bg-primary'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                  <span className="text-[11px] text-text-muted w-8 text-right">{Math.round(pct)}%</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-2xl border border-crm-border shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-crm-border bg-gray-50/80">
              <th className="text-left px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Աշխատող</th>
              <th className="text-center px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Ընդհանուր գումար</th>
              <th className="text-center px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Վճարված</th>
              <th className="text-center px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest">Պարտք</th>
              <th className="text-center px-5 py-3 text-[10px] font-bold text-text-muted uppercase tracking-widest w-44">Կատարված</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-14 text-text-muted text-sm"> չկա</td></tr>
            ) : filtered.map((emp) => {
              const pct = emp.total > 0 ? (emp.paid / emp.total) * 100 : 0;
              const isFullyPaid = emp.unpaid === 0;
              return (
                <tr key={emp.id} className="border-b border-crm-border/40 last:border-b-0 hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <Link href={`/employees/${emp.id}?tab=salary`} className="flex items-center gap-3 group w-fit">
                      <Avatar color={emp.color} initials={emp.initials} size="sm" />
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-sm font-semibold text-dark group-hover:text-primary transition-colors leading-none">{emp.name}</span>
                        <span className="text-[11px] text-text-muted leading-none">{emp.taskCount} հատ.</span>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-center text-sm font-semibold text-dark">{fmt(emp.total)} ֏</td>
                  <td className="px-5 py-4 text-center"><span className="text-sm font-semibold text-success">{fmt(emp.paid)} ֏</span></td>
                  <td className="px-5 py-4 text-center">
                    {isFullyPaid ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/10 text-success text-[11px] font-semibold">
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Վճարված
                      </span>
                    ) : (
                      <span className="text-sm font-semibold text-error">{fmt(emp.unpaid)} ֏</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${isFullyPaid ? 'bg-success' : 'bg-primary'}`} style={{ width: `${Math.min(100, pct)}%` }} />
                      </div>
                      <span className="text-[11px] font-medium text-text-muted w-9 text-right flex-shrink-0">{Math.round(pct)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {filtered.length > 0 && (
            <tfoot>
              <tr className="border-t border-crm-border bg-gray-50/80">
                <td className="px-5 py-3 text-xs font-bold text-text-muted uppercase tracking-widest">Ընդամենը</td>
                <td className="px-5 py-3 text-center text-sm font-bold text-dark">{fmt(filtered.reduce((s, e) => s + e.total, 0))} ֏</td>
                <td className="px-5 py-3 text-center text-sm font-bold text-success">{fmt(filtered.reduce((s, e) => s + e.paid, 0))} ֏</td>
                <td className="px-5 py-3 text-center text-sm font-bold text-error">
                  {filtered.reduce((s, e) => s + e.unpaid, 0) > 0 ? `${fmt(filtered.reduce((s, e) => s + e.unpaid, 0))} ֏` : '--'}
                </td>
                <td className="px-5 py-3" />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
