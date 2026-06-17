import SectionHeader from '@/components/ui/SectionHeader';
import { CalendarIcon, ArrowUpIcon, ArrowDownIcon } from '@/components/icons';
import { projects } from '../data';
import type { ProjectPriority } from '../types';

const priorityConfig: Record<ProjectPriority, { label: string; className: string; Icon: typeof ArrowUpIcon }> = {
  High:   { label: 'Բարձր',  className: 'text-error',   Icon: ArrowUpIcon },
  Medium: { label: 'Միջին',  className: 'text-warning',  Icon: ArrowUpIcon },
  Low:    { label: 'Ցածր',   className: 'text-success',  Icon: ArrowDownIcon },
};

function AssigneeStack({ colors, extra }: { colors: string[]; extra: number }) {
  return (
    <div className="flex items-center -space-x-2">
      {colors.slice(0, 3).map((color, i) => (
        <div
          key={i}
          className="w-6 h-6 rounded-full border-2 border-white flex-shrink-0"
          style={{ backgroundColor: color }}
        />
      ))}
      {extra > 0 && (
        <div className="w-6 h-6 rounded-full border-2 border-white bg-primary-light flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
          +{extra}
        </div>
      )}
    </div>
  );
}

export default function ProjectsSection() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <SectionHeader title="Ծրագրեր" href="/dashboard/projects" />

      <div className="space-y-3">
        {projects.map((project) => {
          const { label, className, Icon } = priorityConfig[project.priority];
          return (
            <div
              key={project.id}
              className="flex items-center gap-4 p-4 border border-crm-border rounded-xl hover:border-primary/20 hover:bg-primary-light/30 transition-all cursor-pointer"
            >
              {/* Project icon */}
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${project.iconBg} flex items-center justify-center text-lg flex-shrink-0`}>
                {project.emoji}
              </div>

              {/* Project info */}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-text-muted">{project.id}</p>
                <p className="text-sm font-semibold text-dark truncate">{project.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <CalendarIcon className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-text-muted">Ստեղծված {project.created}</span>
                  <span className={`flex items-center gap-0.5 text-xs font-medium ${className}`}>
                    <Icon className="w-3 h-3" />
                    {label}
                  </span>
                </div>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-6 text-center flex-shrink-0">
                <div>
                  <p className="text-[11px] text-text-muted">Բոլոր</p>
                  <p className="text-sm font-bold text-dark">{project.allTasks}</p>
                </div>
                <div>
                  <p className="text-[11px] text-text-muted">Ակտիվ</p>
                  <p className="text-sm font-bold text-dark">{project.activeTasks}</p>
                </div>
                <div>
                  <p className="text-[11px] text-text-muted mb-1">Կատարողներ</p>
                  <AssigneeStack colors={project.assignees} extra={project.extra} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
