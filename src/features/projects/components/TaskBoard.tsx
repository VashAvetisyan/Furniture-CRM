'use client';

import { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService, taskStatusService } from '@/services/task.service';
import Avatar from '@/components/ui/Avatar';
import { ArrowUpIcon, ArrowDownIcon } from '@/components/icons';
import TaskDetailModal from './TaskDetailModal';
import { useAuthStore } from '@/stores';
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

// Compute which column this task belongs to for the current viewer.
// Director: firstCol until anyone starts, secondCol when anyone starts, lastCol only when ALL done.
// Employee: based on their own isStarted/isDone.
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

  // Director / admin view: use actual stored statusId for column placement
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
  const extraCount           = assignees ? assignees.length - 1 : 0;

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
    <div className="flex flex-col flex-1 rounded-xl p-1">
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} columns={columns} onOpen={onOpen} onMove={onMove} isEmployee={isEmployee} myUserId={myUserId} />
        ))}
      </div>
    </div>
  );
}

interface TaskBoardProps {
  tasks: Task[];
  projectName?: string;
}

export default function TaskBoard({ tasks, projectName }: TaskBoardProps) {
  const [taskList, setTaskList]             = useState(tasks);
  const [orderedColumns, setOrderedColumns] = useState<BoardColumn[]>(FALLBACK_COLUMNS);
  const [addingCol, setAddingCol]           = useState(false);
  const [newColLabel, setNewColLabel]       = useState('');
  const [deletingCol, setDeletingCol]       = useState<BoardColumn | null>(null);
  const [openTask, setOpenTask]             = useState<Task | null>(null);
  const queryClient = useQueryClient();
  const inputRef    = useRef<HTMLInputElement>(null);
  const role        = useAuthStore((s) => s.role);
  const user        = useAuthStore((s) => s.user);
  const isEmployee  = role === 'employee';
  const myUserId    = user?.id ? Number(user.id) : null;

  useEffect(() => { setTaskList(tasks); }, [tasks]);
  useEffect(() => { if (addingCol) inputRef.current?.focus(); }, [addingCol]);

  const { data: statusData } = useQuery({
    queryKey: ['task-statuses'],
    queryFn:  taskStatusService.getAll,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (statusData?.results?.length) {
      setOrderedColumns(
        statusData.results.map((s) => ({ id: String(s.id), label: s.name, backendId: s.id }))
      );
    }
  }, [statusData]);

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

  const { mutate: createStatus, isPending: creatingStatus } = useMutation({
    mutationFn: (name: string) => taskStatusService.create({ name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-statuses'] });
      setNewColLabel('');
      setAddingCol(false);
    },
  });

  const { mutate: reorderStatuses } = useMutation({
    mutationFn: (cols: BoardColumn[]) =>
      Promise.all(cols.map((col, idx) => taskStatusService.update(col.backendId, { order: idx + 1 }))),
  });

  const { mutate: removeStatus } = useMutation({
    mutationFn: (backendId: string | number) => taskStatusService.delete(backendId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-statuses'] });
      setDeletingCol(null);
    },
  });

  function handleMove(taskId: string, col: BoardColumn) {
    const task = taskList.find((t) => t.id === taskId);

    if (isEmployee && myUserId && task) {
      // Employee: never PATCH task.status — only call mark-started / mark-done.
      // The column placement is derived from isStarted/isDone, not task.status.
      const currentDisplay = computeDisplayStatus(task, true, myUserId, orderedColumns);
      const oldIdx = orderedColumns.findIndex((c) => c.id === currentDisplay);
      const newIdx = orderedColumns.findIndex((c) => c.id === col.id);
      if (newIdx <= oldIdx) return; // no backward movement triggers

      const assignee = task.assignees?.find((a) => a.userId === myUserId);
      if (!assignee) return;
      if (!assignee.isStarted) {
        autoMarkStarted({ taskId, userId: myUserId });
      } else if (assignee.isStarted && !assignee.isDone && newIdx === orderedColumns.length - 1) {
        autoMarkDone({ taskId, userId: myUserId, task });
      }
    } else {
      // Director: PATCH the actual task status
      setTaskList((prev) =>
        prev.map((t) => t.id === taskId ? { ...t, status: col.id as Task['status'] } : t)
      );
      const numericStatus = Number(col.backendId);
      updateStatus({ id: taskId, statusId: isNaN(numericStatus) ? undefined : numericStatus });
    }
  }

  function onDragEnd(result: DropResult) {
    const { destination, source, type } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    if (type !== 'COLUMN') return;

    const next = Array.from(orderedColumns);
    const [moved] = next.splice(source.index, 1);
    next.splice(destination.index, 0, moved);
    setOrderedColumns(next);
    reorderStatuses(next);
  }

  function handleAddColumn() {
    const label = newColLabel.trim();
    if (!label) { setAddingCol(false); return; }
    createStatus(label);
  }

  return (
    <>
      {deletingCol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <p className="text-base font-semibold text-dark">Ջնջե՞լ փուլը</p>
              <p className="text-sm text-text-muted">
                «<span className="font-medium text-dark">{deletingCol.label}</span>» փուլը կջնջվի։ Դրա մեջ եղած խնդիրները կմնան, բայց այս սյունակից կհեռացվեն։
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeletingCol(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-crm-border text-dark hover:bg-light transition-colors"
              >
                
              </button>
              <button
                onClick={() => removeStatus(deletingCol.backendId)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-error text-white hover:bg-error/90 transition-colors"
              >
                
              </button>
            </div>
          </div>
        </div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex-1 min-h-0 w-full overflow-x-auto overflow-y-auto px-3 md:px-6 pt-4 pb-4">
          <Droppable droppableId="board-columns" direction="horizontal" type="COLUMN">
            {(provided) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex gap-3 md:gap-4 h-full"
              >
                {orderedColumns.map((col, index) => (
                  <Draggable draggableId={`col-${col.id}`} index={index} key={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex-shrink-0 w-[78vw] sm:w-auto sm:flex-1 sm:min-w-[180px] flex flex-col gap-3"
                      >
                        {/* Header acts as drag handle */}
                        <div
                          {...provided.dragHandleProps}
                          className={`group relative text-center py-2.5 bg-white rounded-2xl border shadow-sm text-sm font-semibold text-dark flex-shrink-0 cursor-grab active:cursor-grabbing transition-all ${
                            snapshot.isDragging
                              ? 'border-primary/40 shadow-md'
                              : 'border-gray-100'
                          }`}
                        >
                          {col.label}
                          {orderedColumns.length > 1 && (
                            <button
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={() => setDeletingCol(col)}
                              title="Ջնջել փուլը"
                              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 hover:bg-error/10 hover:text-error text-text-muted transition-all text-xs"
                            >
                              ✕
                            </button>
                          )}
                        </div>

                        <TaskColumn
                          tasks={taskList.filter((t) => computeDisplayStatus(t, isEmployee, myUserId, orderedColumns) === col.id)}
                          columns={orderedColumns}
                          onOpen={setOpenTask}
                          onMove={handleMove}
                          isEmployee={isEmployee}
                          myUserId={myUserId}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}

                {provided.placeholder}


              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>

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
