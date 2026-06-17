'use client';

import Avatar from '@/components/ui/Avatar';
import {
  PaperclipIcon,
  LinkIcon,
  PencilSquareIcon,
  ChevronDownIcon,
  CloudArrowUpIcon,
} from '@/components/icons';
import type { Task, TaskStatus } from '../types';

const statusConfig: Record<TaskStatus, { label: string; className: string }> = {
  todo:        { label: 'Կատարելու',  className: 'bg-gray-100 text-gray-500'   },
  in_progress: { label: 'Ընթացքում',  className: 'bg-blue-100 text-blue-600'   },
  in_review:   { label: 'Ստուգման',   className: 'bg-pink-100 text-pink-600'   },
  done:        { label: 'Կատարված',   className: 'bg-green-100 text-green-600' },
};

interface TaskDetailPanelProps {
  task: Task;
}

export default function TaskDetailPanel({ task }: TaskDetailPanelProps) {
  const { label: statusLabel, className: statusClass } = statusConfig[task.status];
  const fileAttachments = task.attachments?.filter((a) => a.type === 'file') ?? [];
  const linkAttachments = task.attachments?.filter((a) => a.type === 'link') ?? [];
  const attachmentCount = (task.attachments ?? []).length;

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-light min-w-0">
      {/* Panel header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-dark">Պատվերի մանրամասներ</h2>
        <button className="p-1.5 rounded-lg hover:bg-white transition-colors text-text-muted">
          <PencilSquareIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Task card */}
      <div className="bg-white rounded-2xl border border-crm-border p-6">
        {/* Task ID + title + status */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <p className="text-xs text-text-muted mb-1">{task.taskId}</p>
            <h3 className="text-xl font-bold text-dark leading-snug">{task.name}</h3>
          </div>
          <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium flex-shrink-0 ${statusClass}`}>
            {statusLabel}
            <ChevronDownIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-text-muted leading-relaxed mb-5">{task.description}</p>
        )}

        {/* Action icons */}
        <div className="flex gap-2 mb-6">
          <button className="w-10 h-10 rounded-xl border border-crm-border flex items-center justify-center hover:bg-gray-50 transition-colors text-text-muted hover:text-primary">
            <PaperclipIcon className="w-4.5 h-4.5" />
          </button>
          <button className="w-10 h-10 rounded-xl border border-crm-border flex items-center justify-center hover:bg-gray-50 transition-colors text-text-muted hover:text-primary">
            <LinkIcon className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Attachments */}
        {attachmentCount > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-dark mb-3">
              Կցված ֆայլեր ({attachmentCount})
            </h4>
            <div className="flex flex-wrap gap-3">
              {fileAttachments.map((att) => (
                <div
                  key={att.id}
                  className="w-36 rounded-xl border border-crm-border overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
                >
                  {/* Thumbnail placeholder */}
                  <div className="h-20 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 relative flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white/70 flex items-center justify-center">
                      <PaperclipIcon className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-dark truncate">{att.name}</p>
                    {att.date && (
                      <p className="text-[10px] text-text-muted mt-0.5">{att.date}</p>
                    )}
                  </div>
                </div>
              ))}

              {linkAttachments.map((att) => (
                <button
                  key={att.id}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-primary/50 text-primary text-sm font-medium hover:bg-primary-light transition-colors self-start"
                >
                  <LinkIcon className="w-4 h-4" />
                  {att.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {task.activity && task.activity.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-dark mb-4">Վերջին ակտիվություն</h4>
            <div className="space-y-5">
              {task.activity.map((item) => (
                <div key={item.id}>
                  {/* User header */}
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar color={item.color} initials={item.initials} size="md" />
                    <div>
                      <p className="text-sm font-semibold text-dark">{item.name}</p>
                      <p className="text-xs text-text-muted">{item.role}</p>
                    </div>
                  </div>

                  {/* Entries */}
                  <div className="space-y-2 pl-1">
                    {item.entries.map((entry, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0 mt-0.5">
                          {entry.icon === 'status' ? (
                            <CloudArrowUpIcon className="w-3.5 h-3.5 text-primary" />
                          ) : (
                            <PaperclipIcon className="w-3.5 h-3.5 text-primary" />
                          )}
                        </div>
                        <p className="text-sm text-dark/70 leading-relaxed">
                          {entry.prefix}{' '}
                          {entry.bold && (
                            <span className="font-semibold text-dark">{entry.bold}</span>
                          )}
                          {entry.middle && ` ${entry.middle} `}
                          {entry.highlight && (
                            <span className="text-primary font-medium">{entry.highlight}</span>
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button className="flex items-center gap-1.5 text-primary text-sm font-medium mx-auto mt-5">
              Տեսնել ավելին
              <ChevronDownIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
