'use client';

import { useState, useMemo, useRef, useEffect, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskService } from '@/services/task.service';
import { clientService } from '@/services/client.service';
import type { ClientDTO } from '@/services/client.service';
import TaskDetailModal from '@/features/projects/components/TaskDetailModal';
import CallHistoryModal from '@/features/calls/components/CallHistoryModal';
import type { Task } from '@/features/projects/types';
import type { CalendarEvent } from './types';

const MONTH_MAP: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

function taskToEvent(task: Task): CalendarEvent | null {
  if (!task.deadline) return null;

  let day: number, month: number, year: number;

  // ISO format: "2024-01-15" or "2024-01-15T14:30:00+04:00"
  if (/^\d{4}-\d{2}-\d{2}/.test(task.deadline)) {
    const [y, m, d] = task.deadline.slice(0, 10).split('-').map(Number);
    year = y; month = m - 1; day = d;
  } else {
    // "Feb 23, 2020" format
    const match = task.deadline.match(/^(\w{3})\s+(\d+),\s+(\d{4})$/);
    if (!match) return null;
    month = MONTH_MAP[match[1]];
    day   = parseInt(match[2]);
    year  = parseInt(match[3]);
    if (month === undefined) return null;
  }

  const assigneeName = task.assignees?.[0]?.name || task.assigneeName || undefined;
  const color = task.statusColor ?? task.assigneeColor ?? '#6B7280';
  return {
    id:         `task_ev_${task.id}`,
    title:      task.name,
    day, month, year,
    color,
    subtitle:   assigneeName,
    badge:      task.statusName ?? task.taskId,
    badgeColor: color,
  };
}

function clientCallsToEvents(client: ClientDTO): CalendarEvent[] {
  const name  = `${client.first_name} ${client.last_name}`.trim() || client.phone;
  const today = new Date().toISOString().slice(0, 10);
  return (client.calls ?? [])
    .filter((call) => /^\d{4}-\d{2}-\d{2}/.test(call.date))
    .map((call) => {
      const dateStr = call.date.slice(0, 10);
      const [y, m, d] = dateStr.split('-').map(Number);
      const color =
        call.is_done      ? '#22C55E' :
        dateStr < today   ? '#EF4444' :
        dateStr === today ? '#F59E0B' :
                            '#3B82F6';
      return {
        id:         `call_ev_${client.id}_${call.id}`,
        title:      name,
        day:        d,
        month:      m - 1,
        year:       y,
        color,
        subtitle:   call.note || client.phone || undefined,
        badge:      'Զանգ',
        badgeColor: color,
        clientId:   client.id,
      };
    });
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ['Երկ', 'Երք', 'Չրք', 'Հնգ', 'Ուրբ', 'Շբթ', 'Կիր'];
const MONTHS = [
  'Հունվար', 'Փետրվար', 'Մարտ', 'Ապրիլ', 'Մայիս', 'Հունիս',
  'Հուլիս', 'Օգոստոս', 'Սեպտեմբեր', 'Հոկտեմբեր', 'Նոյեմբեր', 'Դեկտեմբեր',
];

// ── Grid builder ──────────────────────────────────────────────────────────────

type CalCell = { day: number; month: number; year: number; isCurrentMonth: boolean };

function buildGrid(year: number, month: number): CalCell[][] {
  const firstDay    = new Date(year, month, 1).getDay(); // 0 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev  = new Date(year, month, 0).getDate();
  const firstDayMon = (firstDay + 6) % 7; // Mon = 0 … Sun = 6

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear  = month === 0 ? year - 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear  = month === 11 ? year + 1 : year;

  const cells: CalCell[] = [];

  for (let i = firstDayMon - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, month: prevMonth, year: prevYear, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, isCurrentMonth: true });
  }
  let overflow = 1;
  while (cells.length % 7 !== 0) {
    cells.push({ day: overflow++, month: nextMonth, year: nextYear, isCurrentMonth: false });
  }

  const weeks: CalCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function cellToISO(cell: CalCell): string {
  return `${cell.year}-${String(cell.month + 1).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TrendArrow({ direction }: { direction: 'up' | 'down' }) {
  const isDown = direction === 'down';
  return (
    <svg
      className={`w-3.5 h-3.5 flex-shrink-0 ${isDown ? 'text-success' : 'text-warning'}`}
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
    >
      {isDown ? (
        <>
          <line x1="12" y1="5" x2="12" y2="19" />
          <polyline points="5 12 12 19 19 12" />
        </>
      ) : (
        <>
          <line x1="12" y1="19" x2="12" y2="5" />
          <polyline points="5 12 12 5 19 12" />
        </>
      )}
    </svg>
  );
}

function TaskTypeIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
    </svg>
  );
}

function CallTypeIcon({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.92 1.18 2 2 0 012.92 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.84a16 16 0 006.29 6.29l1.2-1.2a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  );
}

function EventCard({ event, onOpen }: { event: CalendarEvent; onOpen?: () => void }) {
  const isTask = event.id.startsWith('task_ev_');
  return (
    <div
      onClick={onOpen}
      className={`flex items-stretch rounded-lg overflow-hidden border border-crm-border bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] ${onOpen ? 'cursor-pointer hover:border-primary/40 hover:shadow-md transition-all' : ''}`}
    >
      <div className="w-[6px] flex-shrink-0" style={{ backgroundColor: event.color }} />
      <div className="flex-1 px-2 py-1.5 min-w-0 flex items-start gap-1">
        {isTask
          ? <TaskTypeIcon className="w-3 h-3 mt-0.5 flex-shrink-0 text-text-muted" />
          : <CallTypeIcon className="w-3 h-3 mt-0.5 flex-shrink-0 text-text-muted" />}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-dark truncate leading-tight">
            {event.title}
          </p>
          {event.duration && (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-[11px] text-text-muted">{event.duration}</span>
              {event.trend && <TrendArrow direction={event.trend} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const MAX_VISIBLE = 2;

function DayModal({
  cell,
  events,
  onOpenTask,
  onOpenCall,
  onClose,
}: {
  cell: CalCell;
  events: CalendarEvent[];
  onOpenTask: (id: string) => void;
  onOpenCall: (id: string) => void;
  onClose: () => void;
}) {
  const MONTH_FULL = [
  'Հունվար', 'Փետրվար', 'Մարտ', 'Ապրիլ', 'Մայիս', 'Հունիս',
  'Հուլիս', 'Օգոստոս', 'Սեպտեմբեր', 'Հոկտեմբեր', 'Նոյեմբեր', 'Դեկտեմբեր',
];

  const tasks = events.filter(e => e.id.startsWith('task_ev_'));
  const calls = events.filter(e => e.id.startsWith('call_ev_'));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[560px] max-w-full flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-crm-border">
          <div>
            <p className="text-xl font-bold text-dark">{cell.day} {MONTH_FULL[cell.month]}</p>
            <p className="text-sm text-text-muted mt-0.5">{events.length} իրադարձություն</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-text-muted transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-4 px-6 py-5 max-h-[70vh] overflow-y-auto">

          {/* Tasks section */}
          {tasks.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Պատվերներ</span>
                <span className="flex-1 h-px bg-crm-border" />
                <span className="text-[11px] font-semibold text-text-muted">{tasks.length}</span>
              </div>
              {tasks.map(event => (
                <div
                  key={event.id}
                  onClick={() => { onOpenTask(event.id); onClose(); }}
                  className="group flex items-center gap-3 p-3.5 rounded-xl border border-crm-border bg-white hover:border-primary/40 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${event.color || '#6B7280'}20` }}>
                    <TaskTypeIcon className="w-4 h-4" style={{ color: event.color || '#6B7280' }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-dark truncate">{event.title}</p>
                    {event.subtitle && (
                      <p className="text-xs text-text-muted mt-0.5 truncate">{event.subtitle}</p>
                    )}
                  </div>

                  {event.badge && (
                    <span className="flex-shrink-0 text-[11px] font-bold text-text-muted bg-gray-100 px-2.5 py-1 rounded-full">
                      {event.badge}
                    </span>
                  )}

                  <svg className="w-4 h-4 text-text-muted flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              ))}
            </div>
          )}

          {/* Calls section */}
          {calls.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wide">Զանգեր</span>
                <span className="flex-1 h-px bg-crm-border" />
                <span className="text-[11px] font-semibold text-text-muted">{calls.length}</span>
              </div>
              {calls.map(event => (
                <div
                  key={event.id}
                  onClick={() => { onOpenCall(event.id); onClose(); }}
                  className="group flex items-center gap-3 p-3.5 rounded-xl border border-crm-border bg-white hover:border-primary/40 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${event.color}20` }}>
                    <svg className="w-4 h-4" style={{ color: event.color }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.92 1.18 2 2 0 012.92 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 7.84a16 16 0 006.29 6.29l1.2-1.2a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-dark truncate">{event.title}</p>
                    {event.subtitle && (
                      <p className="text-xs text-text-muted mt-0.5 truncate">{event.subtitle}</p>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full text-white" style={{ backgroundColor: event.color }}>
                    Զանգ
                  </span>
                  <svg className="w-4 h-4 text-text-muted flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 18l6-6-6-6"/>
                  </svg>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DayCell({
  cell,
  events,
  isLastInRow,
  onOpenTask,
  onOpenCall,
  onOpenDay,
}: {
  cell: CalCell;
  events: CalendarEvent[];
  isLastInRow: boolean;
  onOpenTask: (eventId: string) => void;
  onOpenCall: (eventId: string) => void;
  onOpenDay: () => void;
}) {
  const visible = events.slice(0, MAX_VISIBLE);
  const extra   = events.length - MAX_VISIBLE;
  const hasMore = extra > 0;

  return (
    <div
      className={[
        'p-2 border-b border-crm-border flex flex-col gap-1.5 overflow-hidden',
        isLastInRow ? '' : 'border-r border-crm-border',
        cell.isCurrentMonth ? 'bg-white' : 'bg-gray-50/40',
      ].join(' ')}
    >
      {/* Day number */}
      <div className="flex justify-end flex-shrink-0">
        {events.length > 0 ? (
          <button
            onClick={onOpenDay}
            className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              hasMore
                ? 'bg-primary text-white hover:bg-primary-hover'
                : cell.isCurrentMonth
                  ? 'text-dark hover:bg-gray-100'
                  : 'text-gray-300 hover:bg-gray-100'
            }`}
          >
            {cell.day}
          </button>
        ) : (
          <span className={`text-xs font-medium leading-none ${cell.isCurrentMonth ? 'text-dark' : 'text-gray-300'}`}>
            {cell.day}
          </span>
        )}
      </div>

      {/* Desktop: full event cards */}
      <div className="hidden md:flex flex-col gap-1 overflow-hidden">
        {visible.map(event => (
          <EventCard
            key={event.id}
            event={event}
            onOpen={
              event.id.startsWith('task_ev_') ? () => onOpenTask(event.id) :
              event.id.startsWith('call_ev_') ? () => onOpenCall(event.id) :
              undefined
            }
          />
        ))}
        {hasMore && (
          <button onClick={onOpenDay} className="flex-shrink-0 self-start text-[10px] font-bold text-primary hover:text-primary-hover transition-colors px-0.5 leading-none">
            +{extra}
          </button>
        )}
      </div>

      {/* Mobile: color dots only */}
      {events.length > 0 && (
        <button onClick={onOpenDay} className="md:hidden flex flex-wrap gap-0.5 mt-0.5">
          {events.slice(0, 4).map((ev) => (
            <span key={ev.id} className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ev.color }} />
          ))}
          {events.length > 4 && <span className="text-[8px] text-text-muted leading-none">+{events.length - 4}</span>}
        </button>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const today = new Date();
  const [year,  setYear]  = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  // Grid is pure (year/month only, no data dependency) — compute it up front so the
  // tasks query can scope its fetch to exactly the visible range instead of the
  // company's entire task history.
  const grid = buildGrid(year, month);
  const rangeFrom = cellToISO(grid[0][0]);
  const rangeTo   = cellToISO(grid[grid.length - 1][6]);

  const { data: tasksResponse } = useQuery({
    queryKey: ['tasks', 'calendar', rangeFrom, rangeTo],
    queryFn:  () => taskService.getByDeadlineRange(rangeFrom, rangeTo),
  });
  const tasksData = tasksResponse?.results ?? [];

  // No backend date filter exists yet for client calls, so this still pulls every
  // client — but only once per session thanks to staleTime (not on every month flip).
  const { data: clients = [] } = useQuery({
    queryKey:  ['clients'],
    queryFn:   clientService.getAll,
    staleTime: 5 * 60_000,
  });

  const [openTask,       setOpenTask]       = useState<Task | null>(null);
  const [openCallClient, setOpenCallClient] = useState<ClientDTO | null>(null);
  const [filter,         setFilter]         = useState<'Բոլորը' | 'calls' | 'tasks'>('Բոլորը');
  const [openDay,        setOpenDay]        = useState<{ cell: CalCell; events: CalendarEvent[] } | null>(null);

  const { allEvents, taskMap, clientMap } = useMemo(() => {
    const tMap = new Map<string, Task>();
    const cMap = new Map<number, ClientDTO>();
    const events: CalendarEvent[] = [];

    for (const t of tasksData) {
      const task: Task = {
        ...t,
        id:          String(t.id),
        taskId:      t.taskId ?? String(t.id),
        section:     (t.section ?? 'active') as Task['section'],
        status:      (t.statusId !== undefined ? String(t.statusId) : t.status) as Task['status'],
        statusColor: t.statusColor,
        statusName:  t.statusName,
      };
      const ev = taskToEvent(task);
      if (ev) {
        events.push(ev);
        tMap.set(ev.id, task);
      }
    }

    for (const c of clients) {
      cMap.set(c.id, c);
      events.push(...clientCallsToEvents(c));
    }

    return { allEvents: events, taskMap: tMap, clientMap: cMap };
  }, [tasksData, clients]);

  function handleOpenTask(eventId: string) {
    const task = taskMap.get(eventId);
    if (task) setOpenTask(task);
  }

  function handleOpenCall(eventId: string) {
    const match = eventId.match(/^call_ev_(\d+)_/);
    if (!match) return;
    const client = clientMap.get(Number(match[1]));
    if (client) setOpenCallClient(client);
  }

  function goToPrevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }

  function goToNextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function eventsFor(cell: CalCell): CalendarEvent[] {
    return allEvents.filter(e => {
      if (e.day !== cell.day || e.month !== cell.month || e.year !== cell.year) return false;
      if (filter === 'calls') return e.id.startsWith('call_ev_');
      if (filter === 'tasks') return e.id.startsWith('task_ev_');
      return true;
    });
  }

  return (
    <div className="animate-fade-in absolute inset-0 flex flex-col p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-3 flex-shrink-0">
        <h1 className="text-xl md:text-2xl font-bold text-dark">Օրացույց</h1>

        {/* Filter pills */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {([
            { key: 'Բոլորը',   label: 'Բոլորը',     short: 'Բոլ' },
            { key: 'calls', label: '📞 Զանգեր',  short: '📞'  },
            { key: 'tasks', label: '📋 Պատվերներ', short: '📋' },
          ] as const).map(({ key, label, short }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-2 md:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === key ? 'bg-white text-dark shadow-sm' : 'text-text-muted hover:text-dark'
              }`}
            >
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{short}</span>
            </button>
          ))}
        </div>

      </div>

      {/* Calendar card */}
      <div className="bg-white rounded-2xl shadow-sm border border-crm-border flex-1 overflow-hidden flex flex-col min-h-0">
        {/* Month navigation */}
        <div className="flex items-center justify-center gap-4 py-3 border-b border-crm-border flex-shrink-0">
          <button
            onClick={goToPrevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-text-muted hover:text-dark"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <span className="text-sm font-semibold text-dark w-44 text-center">
            {MONTHS[month]}, {year}
          </span>

          <button
            onClick={goToNextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-text-muted hover:text-dark"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Grid */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Day-of-week headers */}
          <div className="grid grid-cols-7 border-b border-crm-border flex-shrink-0 bg-white min-w-[320px]">
            {DAYS.map((day, i) => (
              <div
                key={day}
                className={[
                  'py-2 md:py-2.5 text-center text-[10px] md:text-xs font-semibold text-text-muted',
                  i < 6 ? 'border-r border-crm-border' : '',
                ].join(' ')}
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{['Ե','Ե','Չ','Հ','Ո','Շ','Կ'][i]}</span>
              </div>
            ))}
          </div>

          {/* Weeks */}
          <div className="flex flex-col flex-1 min-h-0 overflow-y-auto overflow-x-auto">
            <div className="min-w-[320px]">
            {grid.map((week, wi) => (
              <div key={wi} className="grid grid-cols-7 flex-1 min-h-[60px] md:min-h-[110px]">
                {week.map((cell, di) => {
                  const dayEvents = eventsFor(cell);
                  return (
                    <DayCell
                      key={`${wi}-${di}`}
                      cell={cell}
                      events={dayEvents}
                      isLastInRow={di === 6}
                      onOpenTask={handleOpenTask}
                      onOpenCall={handleOpenCall}
                      onOpenDay={() => setOpenDay({ cell, events: dayEvents })}
                    />
                  );
                })}
              </div>
            ))}
            </div>
          </div>
        </div>
      </div>

      {openTask && (
        <TaskDetailModal
          task={openTask}
          onClose={() => setOpenTask(null)}
        />
      )}

      {openDay && (
        <DayModal
          cell={openDay.cell}
          events={openDay.events}
          onOpenTask={(id) => { handleOpenTask(id); setOpenDay(null); }}
          onOpenCall={(id) => { handleOpenCall(id); setOpenDay(null); }}
          onClose={() => setOpenDay(null)}
        />
      )}

      {openCallClient && (
        <CallHistoryModal
          client={openCallClient}
          onClose={() => setOpenCallClient(null)}
        />
      )}
    </div>
  );
}




