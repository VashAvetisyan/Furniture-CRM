'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Avatar from '@/components/ui/Avatar';
import TaskDetailModal from './TaskDetailModal';
import { taskService, taskStatusService, type TaskStatusDTO } from '@/services/task.service';
import type { Task } from '../types';

const STATUS_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-pink-100 text-pink-700',
  'bg-amber-100 text-amber-700',
  'bg-green-100 text-green-700',
  'bg-purple-100 text-purple-700',
  'bg-cyan-100 text-cyan-700',
  'bg-gray-100 text-gray-600',
];

function formatDate(dateStr?: string): { label: string; overdue: boolean; today: boolean } {
  if (!dateStr) return { label: '—', overdue: false, today: false };
  const d = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const isToday = d.getTime() === now.getTime();
  const overdue = d < now;
  const label = new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
  return { label, overdue, today: isToday };
}

function formatPrice(val?: string): string {
  if (!val || val === '0' || val === '0.00') return '';
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  return num.toLocaleString('ru-RU') + '֏';
}

const COLS = '2.4fr 160px 110px 140px 130px';

interface StatusOption {
  id: string;
  name: string;
  colorClass: string;
}

// ── Inline status dropdown ────────────────────────────────────────────────────

function StatusCell({
  taskId,
  currentStatusId,
  statusMap,
  allStatuses,
  onChanged,
}: {
  taskId: string;
  currentStatusId: string;
  statusMap: Map<string, { name: string; colorClass: string }>;
  allStatuses: StatusOption[];
  onChanged: (newStatusId: string) => void;
}) {
  const [open, setOpen]   = useState(false);
  const [busy, setBusy]   = useState(false);
  const ref               = useRef<HTMLDivElement>(null);

  const st = statusMap.get(currentStatusId) ?? { name: currentStatusId, colorClass: 'bg-gray-100 text-gray-600' };

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  async function handleSelect(s: StatusOption) {
    if (s.id === currentStatusId) { setOpen(false); return; }
    setOpen(false);
    setBusy(true);
    try {
      await taskService.update(taskId, { statusId: Number(s.id) });
      onChanged(s.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full transition-all w-full justify-between ${st.colorClass} ${
          busy ? 'opacity-60' : 'hover:opacity-80 cursor-pointer'
        }`}
      >
        <span className="truncate">{busy ? '...' : st.name}</span>
        <svg
          className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-crm-border shadow-xl z-50 py-1 overflow-hidden">
          {allStatuses.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSelect(s)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors hover:bg-gray-50 ${
                s.id === currentStatusId ? 'bg-gray-50' : ''
              }`}
            >
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.colorClass}`}>
                {s.name}
              </span>
              {s.id === currentStatusId && (
                <svg className="w-3.5 h-3.5 text-primary ml-auto flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({
  task,
  statusMap,
  allStatuses,
  onOpen,
}: {
  task: Task;
  statusMap: Map<string, { name: string; colorClass: string }>;
  allStatuses: StatusOption[];
  onOpen: (t: Task) => void;
}) {
  const [currentStatusId, setCurrentStatusId] = useState(String(task.status));

  const assignees            = task.assignees?.length ? task.assignees : null;
  const mainAssigneeName     = assignees?.[0]?.name     ?? task.assigneeName     ?? '—';
  const mainAssigneeColor    = assignees?.[0]?.color    ?? task.assigneeColor;
  const mainAssigneeInitials = assignees?.[0]?.initials ?? task.assigneeInitials;
  const extraCount           = assignees ? assignees.length - 1 : 0;

  const deadline   = formatDate(task.deadline);
  const acceptance = formatDate(task.acceptanceDate);

  const totalPrice = formatPrice(task.price);
  const advance    = formatPrice(task.advancePayment);
  const final      = formatPrice(task.finalPayment);

  return (
    <div
      onClick={() => onOpen(task)}
      className="grid items-center gap-3 px-4 py-3 border-b border-crm-border hover:bg-primary/[0.03] transition-colors cursor-pointer last:border-0 last:rounded-b-2xl group"
      style={{ gridTemplateColumns: COLS }}
    >
      {/* 1. ID + name + client + phone */}
      <div className="min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex-shrink-0 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md leading-none whitespace-nowrap">
            {task.taskId}
          </span>
          <p className="text-sm font-semibold text-dark truncate group-hover:text-primary transition-colors">
            {task.name}
          </p>
        </div>
        {(task.client || task.phone) && (
          <div className="flex items-center gap-2 pl-0.5">
            {task.client && (
              <span className="text-[11px] text-text-muted truncate max-w-[160px] flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                </svg>
                {task.client}
              </span>
            )}
            {task.phone && (
              <span className="text-[11px] text-text-muted/70 truncate flex items-center gap-1">
                <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 0 0 .22 2.18a2 2 0 012-.22h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                </svg>
                {task.phone}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 2. Assignees */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div className="flex -space-x-1.5 flex-shrink-0">
          <Avatar color={mainAssigneeColor} initials={mainAssigneeInitials} size="sm" />
          {extraCount > 0 && (
            <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
              <span className="text-[9px] font-bold text-text-muted">+{extraCount}</span>
            </div>
          )}
        </div>
        <span className="text-xs text-dark truncate">{mainAssigneeName}</span>
      </div>

      {/* 3. Deadline */}
      <div className="flex flex-col gap-0.5">
        {task.deadline ? (
          <span className={`text-xs font-medium flex items-center gap-1 ${
            deadline.overdue ? 'text-error' : deadline.today ? 'text-warning' : 'text-dark'
          }`}>
            {deadline.overdue && (
              <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 5a1 1 0 00-1 1v5a1 1 0 002 0V8a1 1 0 00-1-1zm0 10a1 1 0 100-2 1 1 0 000 2z"/>
              </svg>
            )}
            {deadline.label}
          </span>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )}
        {task.acceptanceDate && (
          <span className="text-[10px] text-text-muted">
            Ստ: {acceptance.label}
          </span>
        )}
      </div>

      {/* 4. Price */}
      <div className="flex flex-col gap-0.5 min-w-0">
        {totalPrice ? (
          <>
            <span className="text-sm font-bold text-dark">{totalPrice}</span>
            <div className="flex items-center gap-1 flex-wrap">
              {advance && <span className="text-[10px] text-success bg-success/10 px-1.5 rounded font-medium">↑{advance}</span>}
              {final   && <span className="text-[10px] text-primary bg-primary/10 px-1.5 rounded font-medium">↓{final}</span>}
            </div>
          </>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )}
      </div>

      {/* 5. Status */}
      {task.section === 'archive' ? (
        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
          statusMap.get(currentStatusId)?.colorClass ?? 'bg-gray-100 text-gray-600'
        }`}>
          {statusMap.get(currentStatusId)?.name ?? currentStatusId}
        </span>
      ) : (
        <StatusCell
          taskId={task.id}
          currentStatusId={currentStatusId}
          statusMap={statusMap}
          allStatuses={allStatuses}
          onChanged={setCurrentStatusId}
        />
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface TaskListProps {
  tasks: Task[];
  projectName?: string;
}

export default function TaskList({ tasks, projectName }: TaskListProps) {
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const queryClient = useQueryClient();

  const { data: statusData } = useQuery({
    queryKey: ['task-statuses'],
    queryFn:  taskStatusService.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const statusMap = new Map<string, { name: string; colorClass: string }>();
  const allStatuses: StatusOption[] = [];
  (statusData?.results ?? []).forEach((s: TaskStatusDTO, i: number) => {
    const colorClass = STATUS_COLORS[i % STATUS_COLORS.length];
    statusMap.set(String(s.id), { name: s.name, colorClass });
    allStatuses.push({ id: String(s.id), name: s.name, colorClass });
  });

  // Invalidate tasks cache after any status change so board view stays in sync
  useMutation({
    mutationFn: ({ id, statusId }: { id: string; statusId: number }) =>
      taskService.update(id, { statusId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  return (
    <>
      <div className="overflow-x-auto px-3 md:px-6 pt-2 pb-4 flex-1">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">
            Պատverernеr չkаn
          </div>
        ) : (
          <div className="min-w-[700px] bg-white rounded-2xl border border-crm-border shadow-sm">
            <div
              className="grid gap-3 px-4 py-2.5 bg-gray-50/80 border-b border-crm-border rounded-t-2xl"
              style={{ gridTemplateColumns: COLS }}
            >
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Անուն / Հաճ.</span>
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Կատարող</span>
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Ժամկետ</span>
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Արժեք</span>
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Կարգ.</span>
            </div>

            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                statusMap={statusMap}
                allStatuses={allStatuses}
                onOpen={setOpenTask}
              />
            ))}
          </div>
        )}
      </div>

      {openTask && (
        <TaskDetailModal
          task={openTask}
          projectName={projectName}
          onClose={() => setOpenTask(null)}
        />
      )}
    </>
  );
}
