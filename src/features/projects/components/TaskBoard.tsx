'use client';

import { useState, useRef, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taskService, taskStatusService } from '@/services/task.service';
import Avatar from '@/components/ui/Avatar';
import { ArrowUpIcon, ArrowDownIcon } from '@/components/icons';
import TaskDetailModal from './TaskDetailModal';
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

function TaskCard({
  task, columns, onOpen, onMove,
}: {
  task:    Task;
  columns: BoardColumn[];
  onOpen:  (t: Task) => void;
  onMove:  (taskId: string, col: BoardColumn) => void;
}) {
  const { text, Icon } = priorityConfig[task.priority];

  const assigneeName     = task.assignees?.[0]?.name     || task.assigneeName     || '—';
  const assigneeColor    = task.assignees?.[0]?.color    || task.assigneeColor;
  const assigneeInitials = task.assignees?.[0]?.initials || task.assigneeInitials;

  const colIdx  = columns.findIndex((c) => c.id === String(task.status));
  const prevCol = colIdx > 0                    ? columns[colIdx - 1] : null;
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

      {/* Assignee */}
      <div className="flex items-center gap-1.5 mb-3">
        <Avatar color={assigneeColor} initials={assigneeInitials} size="sm" />
        <span className="text-xs text-text-muted truncate">{assigneeName}</span>
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
  tasks, columns, onOpen, onMove,
}: {
  tasks:   Task[];
  columns: BoardColumn[];
  onOpen:  (t: Task) => void;
  onMove:  (taskId: string, col: BoardColumn) => void;
}) {
  return (
    <div className="flex flex-col flex-1 rounded-xl p-1">
      <div className="space-y-3">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} columns={columns} onOpen={onOpen} onMove={onMove} />
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

  const { mutate: createStatus, isPending: creatingStatus } = useMutation({
    mutationFn: (name: string) => taskStatusService.create(name),
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
    setTaskList((prev) =>
      prev.map((t) => t.id === taskId ? { ...t, status: col.id as Task['status'] } : t)
    );
    const numericStatus = Number(col.backendId);
    updateStatus({ id: taskId, statusId: isNaN(numericStatus) ? undefined : numericStatus });
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
                className="flex gap-4 h-full"
                style={{ minWidth: orderedColumns.length * 196 }}
              >
                {orderedColumns.map((col, index) => (
                  <Draggable draggableId={`col-${col.id}`} index={index} key={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className="flex-1 min-w-[180px] flex flex-col gap-3"
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
                          tasks={taskList.filter((t) => String(t.status) === col.id)}
                          columns={orderedColumns}
                          onOpen={setOpenTask}
                          onMove={handleMove}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}

                {provided.placeholder}

                {/* Add column */}
                <div className="flex-shrink-0 flex items-start pt-1">
                  {addingCol ? (
                    <div className="flex items-center gap-1">
                      <input
                        ref={inputRef}
                        value={newColLabel}
                        onChange={(e) => setNewColLabel(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleAddColumn();
                          if (e.key === 'Escape') { setAddingCol(false); setNewColLabel(''); }
                        }}
                        disabled={creatingStatus}
                        placeholder="Փուլի անուն..."
                        className="w-36 px-3 py-2 text-sm rounded-full border border-primary outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
                      />
                      <button
                        onClick={handleAddColumn}
                        disabled={creatingStatus}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-primary text-white text-lg font-bold hover:bg-primary-hover transition-colors disabled:opacity-50"
                      >
                        {creatingStatus ? '…' : '✓'}
                      </button>
                      <button
                        onClick={() => { setAddingCol(false); setNewColLabel(''); }}
                        disabled={creatingStatus}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-crm-border text-text-muted hover:border-error hover:text-error transition-colors text-sm"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingCol(true)}
                      title="Ավելացնել փուլ"
                      className="shrink-0 w-9 h-9 flex items-center justify-center rounded-full border-2 border-dashed border-crm-border text-text-muted hover:border-primary hover:text-primary transition-colors text-xl font-light"
                    >
                      +
                    </button>
                  )}
                </div>

              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>

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
