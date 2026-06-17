'use client';

import Avatar from '@/components/ui/Avatar';
import { CalendarIcon, ClockIcon, ArrowUpIcon, ArrowDownIcon, PencilSquareIcon } from '@/components/icons';
import type { Task, TaskPriority } from '../types';

const priorityConfig: Record<TaskPriority, { label: string; className: string; Icon: typeof ArrowUpIcon }> = {
  High:   { label: 'High',   className: 'text-error',   Icon: ArrowUpIcon   },
  Medium: { label: 'Medium', className: 'text-warning', Icon: ArrowUpIcon   },
  Low:    { label: 'Low',    className: 'text-success', Icon: ArrowDownIcon },
};

function parseHoursFromString(s: string): number {
  let hours = 0;
  const w = s.match(/(\d+)w/);
  const d = s.match(/(\d+)d/);
  const h = s.match(/(\d+)h/);
  const m = s.match(/(\d+)m/);
  if (w) hours += parseInt(w[1]) * 5 * 8;
  if (d) hours += parseInt(d[1]) * 8;
  if (h) hours += parseInt(h[1]);
  if (m) hours += parseInt(m[1]) / 60;
  return hours;
}

function CircularProgress({ logged, estimate }: { logged: string; estimate: string }) {
  const loggedH = parseHoursFromString(logged);
  const estimateH = parseHoursFromString(estimate);
  const pct = estimateH > 0 ? Math.min(loggedH / estimateH, 1) : 0;
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <svg viewBox="0 0 44 44" className="w-11 h-11 flex-shrink-0">
      <circle cx="22" cy="22" r={r} fill="none" stroke="#E8EDF5" strokeWidth="3.5" />
      <circle
        cx="22" cy="22" r={r}
        fill="none"
        stroke="#4361EE"
        strokeWidth="3.5"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
    </svg>
  );
}

interface TaskInfoSidebarProps {
  task: Task;
  onLogTime: () => void;
}

export default function TaskInfoSidebar({ task, onLogTime }: TaskInfoSidebarProps) {
  const priority = task.priority;
  const { label: pLabel, className: pClass, Icon: PIcon } = priorityConfig[priority];
  const logged = task.loggedTime ?? '0h';
  const estimate = task.originalEstimate ?? task.estimate;

  return (
    <aside className="w-72 flex-shrink-0 bg-white border-l border-crm-border overflow-y-auto">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-base font-bold text-dark">Task Info</h2>
          <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-text-muted">
            <PencilSquareIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Reporter */}
        {task.reporterName && (
          <div className="mb-5">
            <p className="text-[11px] text-text-muted mb-2">Reporter</p>
            <div className="flex items-center gap-2">
              {task.reporterColor && task.reporterInitials && (
                <Avatar color={task.reporterColor} initials={task.reporterInitials} size="sm" />
              )}
              <p className="text-sm font-medium text-dark">{task.reporterName}</p>
            </div>
          </div>
        )}

        {/* Assigned */}
        <div className="mb-5">
          <p className="text-[11px] text-text-muted mb-2">Assigned</p>
          <div className="flex items-center gap-2">
            <Avatar color={task.assigneeColor} initials={task.assigneeInitials} size="sm" />
            <p className="text-sm font-medium text-dark">{task.assigneeName}</p>
          </div>
        </div>

        {/* Priority */}
        <div className="mb-6">
          <p className="text-[11px] text-text-muted mb-2">Priority</p>
          <span className={`flex items-center gap-1 text-sm font-semibold ${pClass}`}>
            <PIcon className="w-3.5 h-3.5" />
            {pLabel}
          </span>
        </div>

        {/* Time tracking */}
        <div className="mb-6">
          <h3 className="text-sm font-bold text-dark mb-3">Time tracking</h3>
          <div className="flex items-center gap-3 mb-3">
            <CircularProgress logged={logged} estimate={estimate} />
            <div>
              <p className="text-sm font-semibold text-dark">{logged} logged</p>
              <p className="text-xs text-text-muted">Original Estimate {estimate}</p>
            </div>
          </div>
          <button
            onClick={onLogTime}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <ClockIcon className="w-4 h-4" />
            Log time
          </button>
        </div>

        {/* Deadline */}
        {task.deadline && (
          <div className="mb-4">
            <p className="text-[11px] text-text-muted mb-1">Dead Line</p>
            <p className="text-sm font-bold text-dark">{task.deadline}</p>
          </div>
        )}

        {/* Created */}
        {task.createdAt && (
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="w-4 h-4 text-text-muted flex-shrink-0" />
            <p className="text-xs text-text-muted">Created {task.createdAt}</p>
          </div>
        )}
      </div>
    </aside>
  );
}
