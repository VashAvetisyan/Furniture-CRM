'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService, taskStatusService, type TaskDTO } from '@/services/task.service';
import Avatar from '@/components/ui/Avatar';
import { ArrowUpIcon, ArrowDownIcon } from '@/components/icons';
import TaskDetailModal from './TaskDetailModal';
import { useAuthStore } from '@/stores';
import { SkBoardColumn } from '@/components/ui/Skeleton';
import type { Task, TaskPriority } from '../types';

interface BoardColumn {
  id:        string;
  label:     string;
  backendId: string | number;
}

const FALLBACK_COLUMNS: BoardColumn[] = [
  { id: 'todo',        label: 'todo',  backendId: 'todo'        },
  { id: 'in_progress', label: 'in_progress',  backendId: 'in_progress' },
  { id: 'in_review',   label: 'in_review',  backendId: 'in_review'   },
  { id: 'done',        label: 'done',  backendId: 'done'        },
];

const priorityConfig: Record<TaskPriority, { bg: string; text: string; Icon: typeof ArrowUpIcon }> = {
  High:   { bg: 'bg-error/10',   text: 'text-error',   Icon: ArrowUpIcon   },
  Medium: { bg: 'bg-warning/10', text: 'text-warning', Icon: ArrowUpIcon   },
  Low:    { bg: 'bg-success/10', text: 'text-success', Icon: ArrowDownIcon },
};

function mapDtoToTask(t: TaskDTO): Task {
  return {
    ...t,
    id:      String(t.id),
    taskId:  t.taskId ?? String(t.id),
    section: (t.section ?? 'active') as Task['section'],
    status:  (t.statusId !== undefined ? String(t.statusId) : t.status) as Task['status'],
  } as Task;
}

// Compute which column this task belongs to for the current viewer.
// Director: actual stored statusId (matches the backend `?status=` filter exactly).
// Employee: based on their own isStarted/isDone (virtual — can't be filtered server-side).
function computeDisplayStatus(
  task: Task,
  isEmployee: boolean,
  myUserId: number | null,
  columns: BoardColumn[],
): string {
  const assignees = task.assignees;
  if (!assignees || assignees.length === 0 || columns.length < 2) {
    return String(task.status);
  }
  const firstColId  = columns[0].id;
  const secondColId = columns[1].id;
  const lastColId   = columns[columns.length - 1].id;

  if (isEmployee && myUserId) {
    const mine = assignees.find((a) => a.userId === myUserId);
    if (!mine) return String(task.status);
    if (mine.isDone)    return lastColId;
    if (mine.isStarted) return secondColId;
    return firstColId;
  }

  return String(task.status);
}

function TaskCard({
  task, columns, onOpen, onMove, isEmployee, myUserId,
}: {
  task:       Task;
  columns:    BoardColumn[];
  onOpen:     (t: Task) => void;
  onMove:     (taskId: string, col: BoardColumn) => void;
  isEmployee: boolean;
  myUserId:   number | null;
}) {
  const { text, Icon } = priorityConfig[task.priority];

  const assignees            = task.assignees?.length ? task.assignees : null;
  const mainAssigneeName     = assignees?.[0]?.name     || task.assigneeName     || '—';
  const mainAssigneeColor    = assignees?.[0]?.color    || task.assigneeColor;
  const mainAssigneeInitials = assignees?.[0]?.initials || task.assigneeInitials;

  const displayStatus = computeDisplayStatus(task, isEmployee, myUserId, columns);
  const colIdx  = columns.findIndex((c) => c.id === displayStatus);
  const prevCol = colIdx > 0                   ? columns[colIdx - 1] : null;
  const nextCol = colIdx < columns.length - 1  ? columns[colIdx + 1] : null;

  return (
    <div
      onClick={() => onOpen(task)}
      className="bg-white rounded-2xl p-4 border border-crm-border hover:shadow-md transition-all cursor-pointer select-none"
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] text-text-muted font-medium">{task.taskId}</p>
        <Icon className={`w-3.5 h-3.5 ${text}`} />
      </div>

      {/* Client name */}
      <p className="text-sm font-semibold text-dark leading-snug mb-3">{task.name}</p>

      {/* Assignees */}
      <div className="flex flex-col gap-1 mb-3">
        {assignees ? (
          assignees.map((a) => {
            const ticks   = a.isDone ? '✓✓✓' : a.isStarted ? '✓✓' : '✓';
            const tickCls = a.isDone ? 'text-green-500' : a.isStarted ? 'text-primary' : 'text-gray-300';
            return (
              <div key={a.id} className="flex items-center gap-1.5">
                <Avatar color={a.color} initials={a.initials} size="sm" />
                <span className="text-xs text-text-muted truncate flex-1">{a.name}</span>
                <span className={`text-[10px] font-bold tracking-tight flex-shrink-0 ${tickCls}`}>{ticks}</span>
              </div>
            );
          })
        ) : (
          <div className="flex items-center gap-1.5">
            <Avatar color={mainAssigneeColor} initials={mainAssigneeInitials} size="sm" />
            <span className="text-xs text-text-muted truncate">{mainAssigneeName}</span>
          </div>
        )}
      </div>

      {/* Stage navigation */}
      <div
        className="flex items-center justify-between border-t border-crm-border/60 pt-2 mt-1 gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          disabled={!prevCol}
          onClick={() => prevCol && onMove(task.id, prevCol)}
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg text-text-muted hover:bg-primary/8 hover:text-primary disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          <span className="truncate max-w-[60px]">{prevCol?.label}</span>
        </button>
        <button
          disabled={!nextCol}
          onClick={() => nextCol && onMove(task.id, nextCol)}
          className="flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg text-text-muted hover:bg-primary/8 hover:text-primary disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
        >
          <span className="truncate max-w-[60px]">{nextCol?.label}</span>
          <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── Employee column — client-side slice of the (small) eagerly-fetched "my tasks" set ──

function TaskColumn({
  tasks, columns, onOpen, onMove, isEmployee, myUserId,
}: {
  tasks:      Task[];
  columns:    BoardColumn[];
  onOpen:     (t: Task) => void;
  onMove:     (taskId: string, col: BoardColumn) => void;
  isEmployee: boolean;
  myUserId:   number | null;
}) {
  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-xl p-1">
      <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} columns={columns} onOpen={onOpen} onMove={onMove} isEmployee={isEmployee} myUserId={myUserId} />
        ))}
      </div>
    </div>
  );
}

// ── Director column — fetches only its own status + page from the backend ──────

function CardListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-crm-border space-y-2">
          <div className="h-4 w-4/5 bg-gray-200 animate-pulse rounded-lg" />
          <div className="h-3 w-3/5 bg-gray-200 animate-pulse rounded-lg" />
          <div className="flex gap-2 mt-2">
            <div className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-5 w-16 bg-gray-200 animate-pulse rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export interface LazyBoardFilters {
  assigneeId?:    string | number;
  clientId?:      number;
  search?:        string;
  deadlineFrom?:  string;
  deadlineTo?:    string;
  overdueOnly?:   boolean;
  // Not directly backend-filterable on `/tasks/` yet — applied client-side to
  // whatever page comes back, so counts/pagination may be approximate when used.
  roleEmployeeIds?: Set<string> | null;
  acceptanceFrom?:  string;
  acceptanceTo?:    string;
}

function passesClientOnlyFilters(task: Task, filters: LazyBoardFilters): boolean {
  // Once a task has been sent to delivery it's no longer part of the active
  // production pipeline — same rule the List/Timeline views already apply.
  if (task.deliveryConfirmed) return false;
  if (filters.roleEmployeeIds) {
    if (filters.roleEmployeeIds.size === 0) return false;
    const matches = filters.roleEmployeeIds.has(String(task.assigneeId)) ||
      (task.assignees?.some((a) => filters.roleEmployeeIds!.has(String(a.userId))) ?? false);
    if (!matches) return false;
  }
  if (filters.acceptanceFrom || filters.acceptanceTo) {
    if (!task.acceptanceDate) return false;
    const d = new Date(task.acceptanceDate);
    if (filters.acceptanceFrom && d < new Date(filters.acceptanceFrom)) return false;
    if (filters.acceptanceTo && d > new Date(`${filters.acceptanceTo}T23:59:59`)) return false;
  }
  return true;
}

function LazyTaskColumn({
  col, page, pageSize, filters, columns, onOpen, onMove, onLoaded,
}: {
  col:      BoardColumn;
  page:     number;
  pageSize: number;
  filters:  LazyBoardFilters;
  columns:  BoardColumn[];
  onOpen:   (t: Task) => void;
  onMove:   (taskId: string, col: BoardColumn) => void;
  onLoaded: (colId: string, count: number, tasks: Task[]) => void;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['tasks', 'board', col.backendId, page, pageSize, filters],
    queryFn: () => taskService.getBoardPage({
      statusId:   col.backendId,
      page,
      pageSize,
      assignee:   filters.assigneeId,
      clientLink: filters.clientId,
      search:     filters.search,
      dateFrom:   filters.deadlineFrom,
      dateTo:     filters.deadlineTo,
      overdue:    filters.overdueOnly,
    }),
    placeholderData: (prev) => prev,
  });

  const tasks = (data?.results ?? []).map(mapDtoToTask).filter((t) => passesClientOnlyFilters(t, filters));

  useEffect(() => {
    if (data) onLoaded(col.id, data.count, tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  if (isLoading && !data) {
    return <CardListSkeleton />;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 rounded-xl p-1">
      <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} columns={columns} onOpen={onOpen} onMove={onMove} isEmployee={false} myUserId={null} />
        ))}
      </div>
    </div>
  );
}

interface TaskBoardProps {
  tasks: Task[];
  projectName?: string;
  isLoading?: boolean;
  filters?: LazyBoardFilters;
}

export default function TaskBoard({ tasks, projectName, isLoading, filters = {} }: TaskBoardProps) {
  const [openTask, setOpenTask]             = useState<Task | null>(null);
  const [pendingLastMove, setPendingLastMove] = useState<{ taskId: string; col: BoardColumn } | null>(null);
  const [page, setPage]         = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loadedTasks, setLoadedTasks]   = useState<Record<string, Task>>({});
  const [columnCounts, setColumnCounts] = useState<Record<string, number>>({});
  const queryClient = useQueryClient();

  // Board rows don't carry heavier nested data like `delivery` — fetch the
  // full detail once a task is opened (same as the Delivery page) so the
  // modal doesn't silently omit sections the list payload left out.
  const { data: fullOpenTaskDto } = useQuery({
    queryKey: ['task-detail', openTask?.id],
    queryFn:  () => taskService.getById(openTask!.id),
    enabled:  openTask != null,
  });
  const fullOpenTask: Task | null = fullOpenTaskDto
    ? {
        ...(fullOpenTaskDto as unknown as Task),
        id:      String((fullOpenTaskDto as unknown as { id?: unknown }).id ?? fullOpenTaskDto.taskId),
        taskId:  fullOpenTaskDto.taskId,
        // The single-task detail endpoint doesn't reliably echo back `section`
        // (e.g. omits 'archive') — trust the card that was actually clicked
        // (openTask.section) over it, since that came straight from the
        // board's own known-correct data.
        section: (openTask?.section ?? fullOpenTaskDto.section ?? 'active') as Task['section'],
        status:  (fullOpenTaskDto.statusId !== undefined ? String(fullOpenTaskDto.statusId) : fullOpenTaskDto.status) as Task['status'],
      }
    : null;
  const role        = useAuthStore((s) => s.role);
  const user        = useAuthStore((s) => s.user);
  const isEmployee  = role === 'employee';
  const myUserId    = user?.id ? Number(user.id) : null;

  useEffect(() => { setPage(1); }, [pageSize, filters]);

  // Employee mode: the full ("my tasks") list is eagerly fetched by the parent —
  // keep a lookup map of it for handleMove / the detail modal.
  useEffect(() => {
    if (!isEmployee) return;
    const map: Record<string, Task> = {};
    tasks.forEach((t) => { map[t.id] = t; });
    setLoadedTasks(map);
  }, [tasks, isEmployee]);

  function reportColumnLoaded(colId: string, count: number, colTasks: Task[]) {
    setColumnCounts((prev) => (prev[colId] === count ? prev : { ...prev, [colId]: count }));
    setLoadedTasks((prev) => {
      const next = { ...prev };
      colTasks.forEach((t) => { next[t.id] = t; });
      return next;
    });
  }

  const { data: statusData, isLoading: statusesLoading } = useQuery({
    queryKey: ['task-statuses'],
    queryFn:  taskStatusService.getAll,
    staleTime: 5 * 60 * 1000,
  });

  // Derived directly from the query result (no state+effect lag) so director mode
  // never fires a lazy fetch against the FALLBACK_COLUMNS placeholder ids.
  const orderedColumns: BoardColumn[] = statusData?.results?.length
    ? statusData.results.map((s) => ({ id: String(s.id), label: s.name, backendId: s.id }))
    : FALLBACK_COLUMNS;

  // Director mode fetches per real status id — wait for the real list instead of
  // firing throwaway requests against the FALLBACK_COLUMNS placeholder ids.
  const columnsReady = isEmployee || !statusesLoading;

  const { mutate: updateStatus } = useMutation({
    mutationFn: ({ id, statusId }: { id: string; statusId?: number }) =>
      taskService.update(id, { statusId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  const { mutate: autoMarkStarted } = useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: number }) => {
      await taskService.markStarted(taskId, userId, true);
      const secondColId = orderedColumns[1]?.backendId;
      if (secondColId != null) {
        await taskService.update(taskId, { statusId: Number(secondColId) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
    },
  });

  const { mutate: autoMarkDone } = useMutation({
    mutationFn: async ({ taskId, userId, task }: { taskId: string; userId: number; task: Task }) => {
      await taskService.markDone(taskId, userId, true);
      const otherAssignees = task.assignees?.filter((a) => a.userId !== userId) ?? [];
      const allOthersDone  = otherAssignees.every((a) => a.isDone);
      const targetColId    = allOthersDone
        ? orderedColumns[orderedColumns.length - 1]?.backendId
        : orderedColumns[1]?.backendId;
      if (targetColId != null) {
        await taskService.update(taskId, { statusId: Number(targetColId) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
    },
  });

  const { mutate: autoUnmarkDone } = useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: number }) => {
      await taskService.markDone(taskId, userId, false);
      const secondColId = orderedColumns[1]?.backendId;
      if (secondColId != null) {
        await taskService.update(taskId, { statusId: Number(secondColId) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
    },
  });

  const { mutate: autoUnmarkStarted } = useMutation({
    mutationFn: async ({ taskId, userId }: { taskId: string; userId: number }) => {
      await taskService.markStarted(taskId, userId, false);
      const firstColId = orderedColumns[0]?.backendId;
      if (firstColId != null) {
        await taskService.update(taskId, { statusId: Number(firstColId) });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
    },
  });

  // Director drags a task off the first column: every assignee must be marked
  // started too, otherwise their own board would still show it as not-started.
  const { mutate: markAllStarted } = useMutation({
    mutationFn: async (task: Task) => {
      const targets = (task.assignees ?? []).filter((a) => !a.isStarted);
      await Promise.all(targets.map((a) => taskService.markStarted(task.id, a.userId, true)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
    },
  });

  // Director drags a task to the last column: every assignee must be marked
  // started + done, even if some hadn't finished (or started) their part yet.
  const { mutate: markAllDone, isPending: markingAllDone } = useMutation({
    mutationFn: async (task: Task) => {
      const assignees = task.assignees ?? [];
      await Promise.all(assignees.map(async (a) => {
        if (!a.isStarted) await taskService.markStarted(task.id, a.userId, true);
        if (!a.isDone)    await taskService.markDone(task.id, a.userId, true);
      }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
    },
  });

  function handleMove(taskId: string, col: BoardColumn) {
    const task = loadedTasks[taskId];

    if (isEmployee && myUserId && task) {
      // Employee: never directly PATCH an arbitrary task.status — only call
      // mark-started / mark-done, which derive the resulting status themselves.
      const currentDisplay = computeDisplayStatus(task, true, myUserId, orderedColumns);
      const oldIdx = orderedColumns.findIndex((c) => c.id === currentDisplay);
      const newIdx = orderedColumns.findIndex((c) => c.id === col.id);
      if (newIdx === oldIdx) return;

      const assignee = task.assignees?.find((a) => a.userId === myUserId);
      if (!assignee) return;

      if (newIdx > oldIdx) {
        if (!assignee.isStarted) {
          autoMarkStarted({ taskId, userId: myUserId });
        } else if (!assignee.isDone && newIdx === orderedColumns.length - 1) {
          autoMarkDone({ taskId, userId: myUserId, task });
        }
      } else {
        if (assignee.isDone) {
          autoUnmarkDone({ taskId, userId: myUserId });
        } else if (assignee.isStarted) {
          autoUnmarkStarted({ taskId, userId: myUserId });
        }
      }
    } else if (task) {
      // Director: PATCH the actual task status. Keep each assignee's own
      // isStarted/isDone in sync so their personal board matches this move.
      const newIdx  = orderedColumns.findIndex((c) => c.id === col.id);
      const isLast  = newIdx === orderedColumns.length - 1;
      const isFirst = newIdx === 0;

      if (isLast) {
        // Marking everyone done is a big, hard-to-undo action — confirm first.
        setPendingLastMove({ taskId, col });
        return;
      }

      const numericStatus = Number(col.backendId);
      updateStatus({ id: taskId, statusId: isNaN(numericStatus) ? undefined : numericStatus });

      if (!isFirst && task.assignees?.some((a) => !a.isStarted)) {
        markAllStarted(task);
      }
    }
  }

  function confirmMoveToLast() {
    if (!pendingLastMove) return;
    const { taskId, col } = pendingLastMove;
    const task = loadedTasks[taskId];

    const numericStatus = Number(col.backendId);
    updateStatus({ id: taskId, statusId: isNaN(numericStatus) ? undefined : numericStatus });

    if (task) markAllDone(task);
    setPendingLastMove(null);
  }

  if ((isLoading && isEmployee) || !columnsReady) {
    return (
      <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-hidden px-3 md:px-6 pt-4 pb-4">
        <div className="flex gap-3 md:gap-4 h-full">
          {orderedColumns.map((col) => (
            <SkBoardColumn key={col.id} />
          ))}
        </div>
      </div>
    );
  }

  // Employee: client-side grouping + slicing of the small, already-fetched "my tasks" set.
  const columnTaskLists: Record<string, Task[]> = {};
  if (isEmployee) {
    orderedColumns.forEach((col) => {
      columnTaskLists[col.id] = tasks.filter((t) => computeDisplayStatus(t, isEmployee, myUserId, orderedColumns) === col.id);
    });
  }

  const maxColumnCount = isEmployee
    ? Math.max(0, ...orderedColumns.map((col) => columnTaskLists[col.id].length))
    : Math.max(0, ...orderedColumns.map((col) => columnCounts[col.id] ?? 0));
  const totalPages = Math.max(1, Math.ceil(maxColumnCount / pageSize));

  return (
    <>
      {pendingLastMove && (() => {
        const task = loadedTasks[pendingLastMove.taskId];
        const unfinished = task?.assignees?.filter((a) => !a.isDone).length ?? 0;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl p-6 w-96 flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <p className="text-base font-semibold text-dark">Տեղափոխե՞լ «{pendingLastMove.col.label}» փուլ</p>
                <p className="text-sm text-text-muted">
                  {unfinished > 0
                    ? `${unfinished} աշխատող դեռ չի ավարտել իր մասը։ Հաստատելով՝ բոլոր աշխատողները ավտոմատ կնշվեն որպես ավարտած։`
                    : 'Բոլոր աշխատողներն արդեն ավարտել են։'}
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setPendingLastMove(null)}
                  className="px-4 py-2 text-sm font-medium rounded-lg border border-crm-border text-dark hover:bg-light transition-colors"
                >
                  Չեղարկել
                </button>
                <button
                  onClick={confirmMoveToLast}
                  disabled={markingAllDone}
                  className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary-hover disabled:opacity-60 transition-colors"
                >
                  {markingAllDone ? 'Հաստատվում է...' : 'Հաստատել'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-hidden px-3 md:px-6 pt-4 pb-4">
        <div className="flex gap-3 md:gap-4 h-full">
          {orderedColumns.map((col) => {
            const count = isEmployee ? columnTaskLists[col.id].length : columnCounts[col.id];
            return (
              <div
                key={col.id}
                className="flex-shrink-0 w-[78vw] sm:w-auto sm:flex-1 sm:min-w-[180px] flex flex-col gap-3 h-full min-h-0"
              >
                <div className="text-center py-2.5 bg-white rounded-2xl border border-gray-100 shadow-sm text-sm font-semibold text-dark flex-shrink-0">
                  {col.label}
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold align-middle">
                    {count ?? '…'}
                  </span>
                </div>

                {isEmployee ? (
                  <TaskColumn
                    tasks={columnTaskLists[col.id].slice((page - 1) * pageSize, page * pageSize)}
                    columns={orderedColumns}
                    onOpen={setOpenTask}
                    onMove={handleMove}
                    isEmployee={isEmployee}
                    myUserId={myUserId}
                  />
                ) : (
                  <LazyTaskColumn
                    col={col}
                    page={page}
                    pageSize={pageSize}
                    filters={filters}
                    columns={orderedColumns}
                    onOpen={setOpenTask}
                    onMove={handleMove}
                    onLoaded={reportColumnLoaded}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Shared pagination — one control for every column at once */}
      <div className="flex items-center justify-center gap-4 px-3 md:px-6 pb-4 flex-shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted">Ցույց տալ՝</span>
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-2 py-1 text-xs rounded-lg border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
          >
            {[5, 10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
          <span className="text-xs text-text-muted">/ սյուն</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-crm-border bg-white text-text-muted hover:text-primary hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ‹
          </button>
          <span className="text-xs text-text-muted font-medium">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-crm-border bg-white text-text-muted hover:text-primary hover:border-primary/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {openTask && (
        <TaskDetailModal
          task={fullOpenTask ?? loadedTasks[openTask.id] ?? openTask}
          projectName={projectName}
          onClose={() => setOpenTask(null)}
          allowSendDelivery={true}
        />
      )}
    </>
  );
}
