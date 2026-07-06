'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskService } from '@/services/task.service';
import TaskDetailModal from '@/features/projects/components/TaskDetailModal';
import type { Task } from '@/features/projects/types';
import type { TaskDTO } from '@/services/task.service';

function fmt(val?: string | null): string {
  const n = parseFloat(val ?? '0') || 0;
  return n.toLocaleString('hy-AM', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d?: string | null): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function toTask(t: TaskDTO): Task {
  return {
    ...t,
    id:          String(t.id),
    taskId:      t.taskId ?? String(t.id),
    section:     (t.section ?? 'active') as Task['section'],
    status:      (t.statusId !== undefined ? String(t.statusId) : t.status) as Task['status'],
    statusColor: t.statusColor,
    statusName:  t.statusName,
  } as Task;
}

export default function PendingPaymentsPage() {
  const [openTask,  setOpenTask]  = useState<Task | null>(null);
  const [search,    setSearch]    = useState('');
  const [sortBy,    setSortBy]    = useState<'balance' | 'deadline'>('balance');

  const { data: res, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn:  () => taskService.getAll(),
  });

  const rows = useMemo(() => {
    const all = res?.results ?? [];
    return all
      .filter((t) => {
        if ((t.section as string) === 'archive') return false;
        const balance = parseFloat(t.balanceDue ?? '0') || 0;
        return balance > 0;
      })
      .map(toTask)
      .filter((t) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (
          t.taskId.toLowerCase().includes(q) ||
          (t.client ?? '').toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        if (sortBy === 'balance') {
          return (parseFloat((b as unknown as { balanceDue?: string }).balanceDue ?? '0') || 0)
               - (parseFloat((a as unknown as { balanceDue?: string }).balanceDue ?? '0') || 0);
        }
        const da = (a as unknown as { deadline?: string }).deadline ?? '';
        const db = (b as unknown as { deadline?: string }).deadline ?? '';
        return da.localeCompare(db);
      });
  }, [res, search, sortBy]);

  const totalBalance = useMemo(
    () => rows.reduce((s, t) => s + (parseFloat((t as unknown as { balanceDue?: string }).balanceDue ?? '0') || 0), 0),
    [rows],
  );

  return (
    <div className="animate-fade-in p-4 sm:p-6 space-y-5">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-dark">Սպասվող վճարումներ</h1>
        </div>

        {/* Summary cards */}
        <div className="flex gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-crm-border px-5 py-3 text-center min-w-[130px]">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Ընդհանուր</p>
            <p className="text-xl font-bold text-error">֏ {fmt(String(totalBalance))}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-crm-border px-5 py-3 text-center min-w-[100px]">
            <p className="text-[11px] font-semibold text-text-muted uppercase tracking-wider mb-1">Պատվերներ</p>
            <p className="text-xl font-bold text-dark">{rows.length}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Պատվեր, Հաճախորդ..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
          />
        </div>
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {([
            { key: 'balance',  label: 'Մնացք ↓' },
            { key: 'deadline', label: 'Ժամկետ ↑' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                sortBy === key ? 'bg-white text-dark shadow-sm' : 'text-text-muted hover:text-dark'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-crm-border overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-text-muted text-sm gap-3">
            <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Բեռնvum է...
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-text-muted gap-2">
            <svg className="w-12 h-12 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="9"/>
              <path d="M12 6v6l4 2"/>
            </svg>
            <p className="text-sm">Սпасвог վчарumнeр չkан</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-crm-border bg-gray-50">
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Պատվեր</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Հաճախորդ</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Փուլ</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Գումար</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Վճարված</th>
                  <th className="text-right px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider text-error">Սպասվող</th>
                  <th className="text-left px-4 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">Վերջնաժամկետ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((task) => {
                  const dto = task as unknown as TaskDTO;
                  const balance = parseFloat(dto.balanceDue ?? '0') || 0;
                  const paid    = parseFloat(dto.totalPaid    ?? '0') || 0;
                  const price   = parseFloat(dto.price        ?? '0') || 0;
                  const paidPct = price > 0 ? Math.round((paid / price) * 100) : 0;

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setOpenTask(task)}
                      className="border-b border-crm-border last:border-0 hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      {/* Task ID */}
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-primary bg-primary/8 px-2 py-0.5 rounded-lg">
                          {task.taskId}
                        </span>
                      </td>

                      {/* Client */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-dark truncate max-w-[160px]">{task.client || '—'}</p>
                        {task.phone && <p className="text-xs text-text-muted">{task.phone}</p>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {task.statusName ? (
                          <span
                            className="text-xs font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: (task.statusColor ?? '#6B7280') + '20',
                              color:            task.statusColor ?? '#6B7280',
                            }}
                          >
                            {task.statusName}
                          </span>
                        ) : <span className="text-text-muted">—</span>}
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3 text-right font-medium text-dark">
                        {price > 0 ? `֏ ${fmt(String(price))}` : '—'}
                      </td>

                      {/* Paid */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span className="font-medium text-success">֏ {fmt(String(paid))}</span>
                          {price > 0 && (
                            <div className="w-16 h-1 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-success rounded-full"
                                style={{ width: `${paidPct}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Balance due */}
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-error">֏ {fmt(String(balance))}</span>
                      </td>

                      {/* Deadline */}
                      <td className="px-4 py-3">
                        {dto.deadline ? (
                          <span className={`text-xs font-medium ${
                            new Date(dto.deadline) < new Date() ? 'text-error' : 'text-text-muted'
                          }`}>
                            {fmtDate(dto.deadline)}
                          </span>
                        ) : <span className="text-text-muted">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Footer total */}
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-crm-border">
                  <td colSpan={5} className="px-4 py-3 text-xs font-semibold text-text-muted">
                    Ընդհանուր {rows.length} պատվեր
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-base text-error">֏ {fmt(String(totalBalance))}</span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {openTask && (
        <TaskDetailModal
          task={openTask}
          onClose={() => setOpenTask(null)}
          allowSendDelivery={true}
        />
      )}
    </div>
  );
}
