import Link from 'next/link';
import { ArrowLeftIcon, PlusIcon, ArrowUpIcon, ArrowDownIcon, ClockIcon } from '@/components/icons';
import { calendarEvents } from './data';
import type { Priority } from './types';

function PriorityArrow({ priority }: { priority: Priority }) {
  return priority === 'up'
    ? <ArrowUpIcon className="w-4 h-4 text-warning" />
    : <ArrowDownIcon className="w-4 h-4 text-success" />;
}

export default function NearestEventsPage() {
  return (
    <div className="animate-fade-in">
      {/* Back link */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-primary font-medium mb-5 hover:underline"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-dark">Nearest Events</h1>
        <button className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-primary/30">
          <PlusIcon className="w-4 h-4" />
          Add Event
        </button>
      </div>

      {/* 2-column events grid */}
      <div className="grid grid-cols-2 gap-4">
        {calendarEvents.map((event) => (
          <div
            key={`${event.title}-${event.date}`}
            className={`bg-white rounded-2xl shadow-sm border-l-4 ${event.borderColor} px-5 py-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer`}
          >
            <event.Icon className={`w-5 h-5 flex-shrink-0 ${event.iconColor}`} />

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dark leading-tight">{event.title}</p>
              <p className="text-xs text-text-muted mt-1">{event.date}</p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              <PriorityArrow priority={event.priority} />
              <div className="flex items-center gap-1 text-text-muted">
                <ClockIcon className="w-4 h-4" />
                <span className="text-xs font-medium">{event.duration}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
