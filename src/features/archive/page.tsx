'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskService, type TaskListResponse } from '@/services/task.service';
import TaskList from '@/features/projects/components/TaskList';
import TaskDetailModal from '@/features/projects/components/TaskDetailModal';
import { useState } from 'react';
import type { Task } from '@/features/projects/types';

export default function ArchivePage() {
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const { data: tasksResponse, isLoading } = useQuery<TaskListResponse>({
    queryKey: ['tasks', 'archive'],
    queryFn:  taskService.getArchived,
    staleTime: 30_000,
  });

  const tasks: Task[] = useMemo(() =>
    (tasksResponse?.results ?? []).map((t) => ({
      ...t,
      id:      String(t.id),
      taskId:  t.taskId ?? String(t.id),
      section: (t.section ?? 'archive') as Task['section'],
      status:  (t.statusId !== undefined ? String(t.statusId) : t.status) as Task['status'],
    })),
    [tasksResponse],
  );

  return (
    <div className="animate-fade-in flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
          <svg className="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="21 8 21 21 3 21 3 8"/>
            <rect x="1" y="3" width="22" height="5" rx="1"/>
            <line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-dark">Պատվերների Արխիվ</h1>
          <p className="text-xs text-text-muted mt-0.5">
            {isLoading ? '...' : `${tasks.length} պատվեր`}
          </p>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center flex-1 text-text-muted text-sm">
          Bernvum e...
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 gap-3 text-text-muted">
          <svg className="w-12 h-12 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="21 8 21 21 3 21 3 8"/>
            <rect x="1" y="3" width="22" height="5" rx="1"/>
            <line x1="10" y1="12" x2="14" y2="12"/>
          </svg>
          <p className="text-sm">Արխիվով Պատվերներ Չկան</p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <TaskList tasks={tasks} />
        </div>
      )}

      {openTask && (
        <TaskDetailModal
          task={openTask}
          onClose={() => setOpenTask(null)}
        />
      )}
    </div>
  );
}
