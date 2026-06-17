'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronRightIcon, ArrowLeftIcon } from '@/components/icons';
import Avatar from '@/components/ui/Avatar';
import type { Task } from '../types';

const LEFT_W = 220;
const CELL_W = 40;
const TOTAL_DAYS = 30;
const ROW_H = 52;

function AssigneeTooltip({ task }: { task: Task }) {
  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white rounded-2xl shadow-xl border border-crm-border p-3 w-44 pointer-events-none">
      <p className="text-xs font-semibold text-dark mb-2">Assignee</p>
      <div className="flex items-center gap-2">
        <Avatar color={task.assigneeColor} initials={task.assigneeInitials} size="sm" />
        <span className="text-sm text-dark">{task.assigneeName}</span>
      </div>
    </div>
  );
}

function TimelineRow({
  task,
  isHovered,
  onHover,
}: {
  task: Task;
  isHovered: boolean;
  onHover: (id: string | null) => void;
}) {
  const hasBar = task.startDay != null && task.endDay != null;
  const barLeft = hasBar ? (task.startDay! - 1) * CELL_W + 4 : 0;
  const barWidth = hasBar ? (task.endDay! - task.startDay! + 1) * CELL_W - 8 : 0;

  return (
    <div
      className={`flex border-b border-crm-border transition-colors ${isHovered ? 'bg-primary-light' : ''}`}
      style={{ height: ROW_H }}
    >
      {/* Task name — sticky left */}
      <div
        className={`flex-shrink-0 sticky left-0 z-10 flex items-center px-4 border-r border-crm-border transition-colors ${
          isHovered ? 'bg-primary-light' : 'bg-white'
        }`}
        style={{ width: LEFT_W }}
      >
        <span className="text-sm text-dark truncate">{task.name}</span>
      </div>

      {/* Calendar cells */}
      <div className="relative flex flex-shrink-0" style={{ width: TOTAL_DAYS * CELL_W }}>
        {/* Vertical grid lines */}
        {Array.from({ length: TOTAL_DAYS }, (_, i) => (
          <div
            key={i}
            className="flex-shrink-0 border-r border-crm-border h-full"
            style={{ width: CELL_W }}
          />
        ))}

        {/* Bar */}
        {hasBar && (
          <div
            className="absolute top-1/2 -translate-y-1/2"
            style={{ left: barLeft, width: barWidth }}
            onMouseEnter={() => onHover(task.id)}
            onMouseLeave={() => onHover(null)}
          >
            <div
              className={`relative h-7 rounded-lg cursor-pointer transition-colors ${
                isHovered ? 'bg-primary/40' : 'bg-[#C5D5F8] hover:bg-primary/30'
              }`}
            />
            {isHovered && <AssigneeTooltip task={task} />}
          </div>
        )}
      </div>
    </div>
  );
}

interface TaskTimelineProps {
  tasks: Task[];
}

function deriveStartEnd(task: Task): { startDay: number; endDay: number } | null {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  if (task.startDay != null && task.endDay != null) {
    return { startDay: task.startDay, endDay: task.endDay };
  }
  if (task.deadline) {
    const end = new Date(task.deadline);
    const endDay = Math.round((end.getTime() - monthStart.getTime()) / 86400000) + 1;
    if (endDay < 1 || endDay > TOTAL_DAYS) return null;
    const startDay = Math.max(1, endDay - 4);
    return { startDay, endDay };
  }
  return null;
}

export default function TaskTimeline({ tasks }: TaskTimelineProps) {
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);

  const now = new Date();
  const monthLabel = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  const timelineTasks = tasks
    .map((t) => ({ task: t, bar: deriveStartEnd(t) }))
    .filter((x) => x.bar !== null) as { task: Task; bar: { startDay: number; endDay: number } }[];

  const totalIssues = tasks.length;

  return (
    <div className="rounded-xl border border-crm-border bg-white overflow-auto">
      <div style={{ minWidth: LEFT_W + TOTAL_DAYS * CELL_W }}>

        {/* Header */}
        <div className="flex sticky top-0 z-20 bg-white border-b border-crm-border">
          {/* Top-left: All Tasks dropdown */}
          <div
            className="flex-shrink-0 sticky left-0 z-30 bg-white flex flex-col justify-center px-4 py-3 border-r border-crm-border"
            style={{ width: LEFT_W }}
          >
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-dark">All Tasks</span>
              <ChevronDownIcon className="w-3.5 h-3.5 text-text-muted" />
            </div>
            <span className="text-xs text-text-muted mt-0.5">{totalIssues} issues</span>
          </div>

          {/* Calendar header */}
          <div className="flex-shrink-0" style={{ width: TOTAL_DAYS * CELL_W }}>
            {/* Month title */}
            <div className="text-center py-2 text-sm font-semibold text-dark border-b border-crm-border">
              {monthLabel}
            </div>
            {/* Day numbers */}
            <div className="flex">
              {Array.from({ length: TOTAL_DAYS }, (_, i) => (
                <div
                  key={i}
                  className="flex-shrink-0 text-center text-xs text-text-muted py-1.5 border-r border-crm-border last:border-r-0"
                  style={{ width: CELL_W }}
                >
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task rows */}
        {timelineTasks.map(({ task, bar }) => (
          <TimelineRow
            key={task.id}
            task={{ ...task, startDay: bar.startDay, endDay: bar.endDay }}
            isHovered={hoveredTaskId === task.id}
            onHover={setHoveredTaskId}
          />
        ))}

        {/* Bottom nav */}
        <div className="flex justify-end items-center gap-1 px-4 py-2.5 border-t border-crm-border">
          <button className="p-1.5 text-text-muted hover:text-dark hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeftIcon className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-primary hover:bg-primary-light rounded-lg transition-colors">
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
