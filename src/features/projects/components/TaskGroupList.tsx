'use client';

import { useState } from 'react';
import Avatar from '@/components/ui/Avatar';
import { ArrowUpIcon, ArrowDownIcon, ChevronDownIcon, ChevronRightIcon } from '@/components/icons';
import type { Task, TaskPriority, TaskStatus } from '../types';

const priorityConfig: Record<TaskPriority, { label: string; className: string; Icon: typeof ArrowUpIcon }> = {
  High:   { label: 'Բարձր',  className: 'text-error',   Icon: ArrowUpIcon   },
  Medium: { label: 'Միջին',  className: 'text-warning', Icon: ArrowUpIcon   },
  Low:    { label: 'Ցածր',   className: 'text-success', Icon: ArrowDownIcon },
};

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  todo:        { label: 'Կատարելու',  className: 'bg-gray-100 text-gray-500'   },
  in_progress: { label: 'Ընթացքում',  className: 'bg-blue-100 text-blue-600'   },
  in_review:   { label: 'Ստուգման',   className: 'bg-pink-100 text-pink-600'   },
  done:        { label: 'Կատարված',   className: 'bg-green-100 text-green-600' },
};

function TaskRow({ task, onClick }: { task: Task; onClick: () => void }) {
  const { label: pLabel, className: pClass, Icon: PIcon } = priorityConfig[task.priority];
  const { label: sLabel, className: sClass } = statusConfig[task.status];

  return (
    <button
      onClick={onClick}
      className="w-full grid grid-cols-[1fr_72px_96px_48px_96px_96px_36px] items-center gap-3 px-4 py-3.5 border-b border-crm-border hover:bg-gray-50 transition-colors text-left last:border-b-0"
    >
      <div>
        <p className="text-[10px] text-text-muted">Task Name</p>
        <p className="text-sm font-medium text-dark leading-snug">{task.name}</p>
      </div>
      <div>
        <p className="text-[10px] text-text-muted">Estimate</p>
        <p className="text-sm font-medium text-dark">{task.estimate}</p>
      </div>
      <div>
        <p className="text-[10px] text-text-muted">Spent Time</p>
        <p className="text-sm font-medium text-dark">{task.spentTime}</p>
      </div>
      <div>
        <p className="text-[10px] text-text-muted mb-1">Assignee</p>
        <Avatar color={task.assigneeColor} initials={task.assigneeInitials} size="sm" />
      </div>
      <div>
        <p className="text-[10px] text-text-muted">Priority</p>
        <span className={`flex items-center gap-0.5 text-xs font-semibold ${pClass}`}>
          <PIcon className="w-3 h-3" />
          {pLabel}
        </span>
      </div>
      <div>
        <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full ${sClass}`}>
          {sLabel}
        </span>
      </div>
      <div className="flex justify-center">
        <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 ${
          task.status === 'done'
            ? 'border-success bg-success'
            : task.status === 'in_progress'
            ? 'border-primary'
            : 'border-gray-300'
        }`} />
      </div>
    </button>
  );
}

function CollapsibleGroup({
  name,
  tasks,
  onSelectTask,
}: {
  name: string;
  tasks: Task[];
  onSelectTask: (id: string) => void;
}) {
  const [open, setOpen] = useState(true);

  return (
    <div className="mb-2">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-primary text-sm font-semibold px-2 py-2 w-full hover:text-primary-hover transition-colors"
      >
        {open
          ? <ChevronDownIcon className="w-4 h-4" />
          : <ChevronRightIcon className="w-4 h-4" />}
        {name} ({tasks.length} issues)
      </button>

      {open && (
        <div className="bg-white rounded-xl border border-crm-border overflow-hidden">
          {tasks.map((task) => (
            <TaskRow key={task.id} task={task} onClick={() => onSelectTask(task.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

interface TaskGroupListProps {
  tasks: Task[];
  onSelectTask: (id: string) => void;
}

export default function TaskGroupList({ tasks, onSelectTask }: TaskGroupListProps) {
  const activeTasks = tasks.filter((t) => t.section === 'active');
  const backlogTasks = tasks.filter((t) => t.section === 'backlog');

  const groupNames = Array.from(
    new Set(activeTasks.map((t) => t.group ?? 'General'))
  );

  return (
    <div className="min-w-[700px]">
      {/* Active Tasks section */}
      {activeTasks.length > 0 && (
        <>
          <div className="bg-dark text-white rounded-xl px-4 py-2.5 mb-3">
            <span className="text-sm font-semibold">Active Tasks</span>
          </div>

          {groupNames.map((groupName) => {
            const groupTasks = activeTasks.filter((t) => (t.group ?? 'General') === groupName);
            if (groupTasks.length === 0) return null;
            return (
              <CollapsibleGroup
                key={groupName}
                name={groupName}
                tasks={groupTasks}
                onSelectTask={onSelectTask}
              />
            );
          })}
        </>
      )}

      {/* Backlog section */}
      {backlogTasks.length > 0 && (
        <>
          <div className="bg-dark text-white rounded-xl px-4 py-2.5 my-3">
            <span className="text-sm font-semibold">Backlog</span>
          </div>
          <div className="bg-white rounded-xl border border-crm-border overflow-hidden">
            {backlogTasks.map((task) => (
              <TaskRow key={task.id} task={task} onClick={() => onSelectTask(task.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
