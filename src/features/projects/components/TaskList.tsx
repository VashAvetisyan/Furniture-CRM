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
const PAGE_SIZE = 30;

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function Pagination({
  page, total, pageSize, onPrev, onNext,
}: {
  page: number; total: number; pageSize: number; onPrev: () => void; onNext: () => void;
}) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasNext = to < total;
  const hasPrev = page > 1;

  return (
    <div className="flex items-center justify-end gap-3 py-3 flex-shrink-0">
      <span className="text-sm text-text-muted">{from}–{to} / {total}</span>
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        className="p-1.5 rounded-lg border border-crm-border bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-text-muted hover:text-dark"
      >
        <ChevronLeftIcon />
      </button>
      <button
        onClick={onNext}
        disabled={!hasNext}
        className="p-1.5 rounded-lg border border-crm-border bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-text-muted hover:text-dark"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}

interface StatusOption {
  id: string;
  name: string;
  colorClass: string;
}

// ── Header filter dropdown (Կատարող / Կարգավիճակ) ────────────────────────────

function HeaderDropdown({
  label, options, selected, onSelect,
}: {
  label: string;
  options: { id: string; name: string }[];
  selected: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const selectedLabel = selected ? options.find((o) => o.id === selected)?.name : null;

  return (
    <div ref={ref} className="relative normal-case">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide transition-colors max-w-full ${
          selected ? 'text-primary' : 'text-text-muted hover:text-dark'
        }`}
      >
        <span className="truncate">{selectedLabel ?? label}</span>
        <svg className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-44 bg-white rounded-xl border border-crm-border shadow-xl z-50 py-1 max-h-56 overflow-y-auto">
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className={`w-full text-left px-3 py-1.5 text-xs transition-colors ${!selected ? 'text-primary font-semibold bg-primary-light' : 'text-dark hover:bg-gray-50'}`}
          >
            Բոլորը
          </button>
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => { onSelect(o.id); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs truncate transition-colors ${selected === o.id ? 'text-primary font-semibold bg-primary-light' : 'text-dark hover:bg-gray-50'}`}
            >
              {o.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Header sort button (Ժամկետ / Արժեք) ───────────────────────────────────────

function HeaderSortButton({
  label, active, dir, onClick,
}: {
  label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 text-[11px] font-bold uppercase tracking-wide transition-colors ${
        active ? 'text-primary' : 'text-text-muted hover:text-dark'
      }`}
    >
      {label}
      <svg
        className={`w-3 h-3 flex-shrink-0 transition-transform ${active && dir === 'desc' ? 'rotate-180' : ''} ${active ? 'opacity-100' : 'opacity-30'}`}
        viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M12 19V5M5 12l7-7 7 7"/>
      </svg>
    </button>
  );
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

  const clientIcon = (
    <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  );
  const phoneIcon = (
    <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 10.8 19.79 19.79 0 010 2.18a2 2 0 012-.22h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  );
  const warnIcon = (
    <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2a10 10 0 110 20A10 10 0 0112 2zm0 5a1 1 0 00-1 1v5a1 1 0 002 0V8a1 1 0 00-1-1zm0 10a1 1 0 100-2 1 1 0 000 2z"/>
    </svg>
  );

  const assigneeRows = assignees ? (
    assignees.map((a) => {
      const ticks   = a.isDone ? '✓✓✓' : a.isStarted ? '✓✓' : '✓';
      const tickCls = a.isDone ? 'text-green-500' : a.isStarted ? 'text-primary' : 'text-gray-300';
      return (
        <div key={a.id} className="flex items-center gap-1.5 min-w-0">
          <Avatar color={a.color} initials={a.initials} size="sm" />
          <span className="text-xs text-dark truncate flex-1 min-w-0">{a.name}</span>
          <span className={`text-[10px] font-bold tracking-tight flex-shrink-0 ${tickCls}`}>{ticks}</span>
        </div>
      );
    })
  ) : (
    <div className="flex items-center gap-1.5 min-w-0">
      <Avatar color={mainAssigneeColor} initials={mainAssigneeInitials} size="sm" />
      <span className="text-xs text-dark truncate">{mainAssigneeName}</span>
    </div>
  );

  const statusCell = task.section === 'archive' ? (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusMap.get(currentStatusId)?.colorClass ?? 'bg-gray-100 text-gray-600'}`}>
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
  );

  return (
    <>
      {/* ── Mobile card (< md) ─────────────────────────────────────── */}
      <div
        onClick={() => onOpen(task)}
        className="md:hidden px-4 py-3.5 border-b border-crm-border last:border-0 last:rounded-b-2xl hover:bg-primary/[0.03] transition-colors cursor-pointer"
      >
        {/* ID + name */}
        <div className="flex items-start gap-2 mb-2">
          <span className="mt-0.5 flex-shrink-0 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md leading-none">
            {task.taskId}
          </span>
          <p className="text-sm font-semibold text-dark leading-snug">{task.name}</p>
        </div>

        {/* Client + phone */}
        {(task.client || task.phone) && (
          <div className="flex items-center gap-3 mb-2 pl-0.5 flex-wrap">
            {task.client && (
              <span className="text-[11px] text-text-muted flex items-center gap-1 min-w-0">
                {clientIcon}<span className="truncate max-w-[130px]">{task.client}</span>
              </span>
            )}
            {task.phone && (
              <span className="text-[11px] text-text-muted/70 flex items-center gap-1">
                {phoneIcon}{task.phone}
              </span>
            )}
          </div>
        )}

        {/* Assignees */}
        <div className="flex flex-col gap-1 mb-3 pl-0.5">{assigneeRows}</div>

        {/* Bottom bar: deadline · price | status */}
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {task.deadline ? (
              <span className={`text-xs font-medium flex items-center gap-0.5 ${deadline.overdue ? 'text-error' : deadline.today ? 'text-warning' : 'text-text-muted'}`}>
                {deadline.overdue && warnIcon}
                {deadline.label}
              </span>
            ) : null}
            {totalPrice && <span className="text-xs font-bold text-dark">{totalPrice}</span>}
          </div>
          <div className="flex-shrink-0 w-28">{statusCell}</div>
        </div>
      </div>

      {/* ── Desktop row (≥ md) ─────────────────────────────────────── */}
      <div
        onClick={() => onOpen(task)}
        className="hidden md:grid items-center gap-3 px-4 py-3 border-b border-crm-border hover:bg-primary/[0.03] transition-colors cursor-pointer last:border-0 last:rounded-b-2xl group"
        style={{ gridTemplateColumns: COLS }}
      >
        {/* 1. ID + name + client + phone */}
        <div className="min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex-shrink-0 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md leading-none whitespace-nowrap">
              {task.taskId}
            </span>
            <p className="text-sm font-semibold text-dark truncate group-hover:text-primary transition-colors">{task.name}</p>
          </div>
          {(task.client || task.phone) && (
            <div className="flex items-center gap-2 pl-0.5">
              {task.client && (
                <span className="text-[11px] text-text-muted truncate max-w-[160px] flex items-center gap-1">
                  {clientIcon}{task.client}
                </span>
              )}
              {task.phone && (
                <span className="text-[11px] text-text-muted/70 truncate flex items-center gap-1">
                  {phoneIcon}{task.phone}
                </span>
              )}
            </div>
          )}
        </div>

        {/* 2. Assignees */}
        <div className="flex flex-col gap-1 min-w-0">{assigneeRows}</div>

        {/* 3. Deadline */}
        <div className="flex flex-col gap-0.5">
          {task.deadline ? (
            <span className={`text-xs font-medium flex items-center gap-1 ${deadline.overdue ? 'text-error' : deadline.today ? 'text-warning' : 'text-dark'}`}>
              {deadline.overdue && warnIcon}
              {deadline.label}
            </span>
          ) : <span className="text-xs text-text-muted">—</span>}
          {task.acceptanceDate && <span className="text-[10px] text-text-muted">Ստ: {acceptance.label}</span>}
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
          ) : <span className="text-xs text-text-muted">—</span>}
        </div>

        {/* 5. Status */}
        <div onClick={(e) => e.stopPropagation()}>{statusCell}</div>
      </div>
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface TaskListProps {
  tasks: Task[];
  projectName?: string;
}

export default function TaskList({ tasks, projectName }: TaskListProps) {
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [page, setPage] = useState(1);
  const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter]     = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<'deadline' | 'price' | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const queryClient = useQueryClient();

  useEffect(() => { setPage(1); }, [tasks, assigneeFilter, statusFilter, sortKey, sortDir]);

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

  const assigneeOptions = Array.from(new Set(
    tasks.flatMap((t) => t.assignees?.length ? t.assignees.map((a) => a.name) : [t.assigneeName].filter(Boolean) as string[])
  )).sort().map((name) => ({ id: name, name }));

  function toggleSort(key: 'deadline' | 'price') {
    if (sortKey !== key) { setSortKey(key); setSortDir('asc'); }
    else if (sortDir === 'asc') { setSortDir('desc'); }
    else { setSortKey(null); }
  }

  const filteredTasks = tasks
    .filter((t) => !assigneeFilter || (t.assignees?.length
      ? t.assignees.some((a) => a.name === assigneeFilter)
      : t.assigneeName === assigneeFilter))
    .filter((t) => !statusFilter || String(t.status) === statusFilter);

  const sortedTasks = sortKey ? [...filteredTasks].sort((a, b) => {
    const val = (t: Task) => sortKey === 'deadline'
      ? (t.deadline ? new Date(t.deadline).getTime() : null)
      : (t.price ? parseFloat(t.price) : null);
    const av = val(a), bv = val(b);
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    return sortDir === 'asc' ? av - bv : bv - av;
  }) : filteredTasks;

  const paged = sortedTasks.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Invalidate tasks cache after any status change so board view stays in sync
  useMutation({
    mutationFn: ({ id, statusId }: { id: string; statusId: number }) =>
      taskService.update(id, { statusId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  return (
    <>
      <div className="overflow-y-auto md:overflow-x-auto px-3 md:px-6 pt-2 pb-4 flex-1">
        {tasks.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">
            Պատվերներ չկան
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-crm-border shadow-sm">
            {/* Desktop header — hidden on mobile */}
            <div
              className="hidden md:grid items-center gap-3 px-4 py-2.5 bg-gray-50/80 border-b border-crm-border rounded-t-2xl"
              style={{ gridTemplateColumns: COLS }}
            >
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Անուն / Հաճ.</span>
              <HeaderDropdown label="Կատարող" options={assigneeOptions} selected={assigneeFilter} onSelect={setAssigneeFilter} />
              <HeaderSortButton label="Ժամկետ" active={sortKey === 'deadline'} dir={sortDir} onClick={() => toggleSort('deadline')} />
              <HeaderSortButton label="Արժեք" active={sortKey === 'price'} dir={sortDir} onClick={() => toggleSort('price')} />
              <HeaderDropdown label="Կարգ." options={allStatuses} selected={statusFilter} onSelect={setStatusFilter} />
            </div>

            {sortedTasks.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-text-muted text-sm">
                Այս ֆիլտրով պատվերներ չկան
              </div>
            ) : (
              paged.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  statusMap={statusMap}
                  allStatuses={allStatuses}
                  onOpen={setOpenTask}
                />
              ))
            )}
          </div>
        )}

        {sortedTasks.length > 0 && (
          <Pagination
            page={page}
            total={sortedTasks.length}
            pageSize={PAGE_SIZE}
            onPrev={() => setPage((p) => Math.max(1, p - 1))}
            onNext={() => setPage((p) => p + 1)}
          />
        )}
      </div>

      {openTask && (
        <TaskDetailModal
          task={tasks.find((t) => t.id === openTask.id) ?? openTask}
          projectName={projectName}
          onClose={() => setOpenTask(null)}
          allowSendDelivery={true}
        />
      )}
    </>
  );
}
