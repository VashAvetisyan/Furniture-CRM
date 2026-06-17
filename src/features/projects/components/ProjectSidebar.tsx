'use client';

import Avatar from '@/components/ui/Avatar';
import { CalendarIcon, PaperclipIcon, LinkIcon, PencilSquareIcon, ArrowUpIcon, ArrowDownIcon } from '@/components/icons';
import type { Project, TaskPriority } from '../types';

const priorityConfig: Record<TaskPriority, { label: string; className: string; Icon: typeof ArrowUpIcon }> = {
  High:   { label: 'High',   className: 'text-error',   Icon: ArrowUpIcon   },
  Medium: { label: 'Medium', className: 'text-warning', Icon: ArrowUpIcon   },
  Low:    { label: 'Low',    className: 'text-success', Icon: ArrowDownIcon },
};

interface ProjectSidebarProps {
  project: Project;
}

export default function ProjectSidebar({ project }: ProjectSidebarProps) {
  const priority = project.priority ?? 'Medium';
  const { label, className: prioClass, Icon: PrioIcon } = priorityConfig[priority];

  return (
    <aside className="w-60 flex-shrink-0 bg-white border-r border-crm-border flex flex-col h-full overflow-y-auto">
      <div className="p-5 flex-1">
        {/* Project Number */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[11px] text-text-muted mb-1">Project Number</p>
            <p className="text-sm font-bold text-dark">{project.projectId}</p>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-text-muted mt-0.5">
            <PencilSquareIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-dark mb-1.5">Description</p>
          <p className="text-xs text-text-muted leading-relaxed">{project.description}</p>
        </div>

        {/* Reporter */}
        <div className="mb-4">
          <p className="text-[11px] text-text-muted mb-2">Reporter</p>
          <div className="flex items-center gap-2">
            {project.reporterColor && project.reporterInitials ? (
              <Avatar color={project.reporterColor} initials={project.reporterInitials} size="sm" />
            ) : null}
            <p className="text-sm font-medium text-dark">{project.reporterName}</p>
          </div>
        </div>

        {/* Assignees */}
        {project.assignees && project.assignees.length > 0 && (
          <div className="mb-4">
            <p className="text-[11px] text-text-muted mb-2">Assignees</p>
            <div className="flex items-center">
              {project.assignees.slice(0, 3).map((a, i) => (
                <div key={a.id} className={i > 0 ? '-ml-2' : ''} style={{ zIndex: 3 - i }}>
                  <Avatar color={a.color} initials={a.initials} size="sm" />
                </div>
              ))}
              {project.assignees.length > 3 && (
                <div
                  className="-ml-2 w-7 h-7 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-bold text-gray-600"
                  style={{ zIndex: 0 }}
                >
                  +{project.assignees.length - 3}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Priority */}
        <div className="mb-4">
          <p className="text-[11px] text-text-muted mb-2">Priority</p>
          <span className={`flex items-center gap-1 text-sm font-semibold ${prioClass}`}>
            <PrioIcon className="w-3.5 h-3.5" />
            {label}
          </span>
        </div>

        {/* Deadline */}
        <div className="mb-4">
          <p className="text-[11px] text-text-muted mb-1">Dead Line</p>
          <p className="text-sm font-bold text-dark">{project.deadline}</p>
        </div>

        {/* Created */}
        <div className="flex items-center gap-1.5 mb-6">
          <CalendarIcon className="w-4 h-4 text-text-muted flex-shrink-0" />
          <p className="text-xs text-text-muted">Created {project.createdAt}</p>
        </div>

        {/* Attachment / Link icons */}
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 rounded-xl border border-crm-border flex items-center justify-center hover:bg-gray-50 transition-colors text-text-muted hover:text-primary">
            <PaperclipIcon className="w-4 h-4" />
          </button>
          <button className="w-9 h-9 rounded-xl border border-crm-border flex items-center justify-center hover:bg-gray-50 transition-colors text-text-muted hover:text-primary">
            <LinkIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
