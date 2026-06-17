import SectionHeader from '@/components/ui/SectionHeader';
import { ArrowUpIcon, ArrowDownIcon, ClockIcon } from '@/components/icons';
import { dashboardEvents } from '../data';
import type { Priority } from '../types';

function PriorityArrow({ priority }: { priority: Priority }) {
  return priority === 'up'
    ? <ArrowUpIcon className="w-3.5 h-3.5 text-warning" />
    : <ArrowDownIcon className="w-3.5 h-3.5 text-success" />;
}

export default function NearestEventsWidget() {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <SectionHeader title="Մոտ Իրադարձություններ" href="/events" />

      <div className="space-y-4">
        {dashboardEvents.map((event) => (
          <div
            key={`${event.title}-${event.date}`}
            className={`flex items-center gap-3 pl-3 border-l-4 ${event.borderColor}`}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dark leading-tight">{event.title}</p>
              <p className="text-xs text-text-muted mt-0.5">{event.date}</p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <PriorityArrow priority={event.priority} />
              <div className="flex items-center gap-1 text-text-muted">
                <ClockIcon className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{event.duration}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
