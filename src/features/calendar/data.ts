import type { CalendarEvent } from './types';

export const CALENDAR_EVENTS: CalendarEvent[] = [
  // Sep 8 (Tuesday) — 2 events
  { id: '1', title: "Anna's Birthday",                    day: 8,  month: 8, year: 2020, duration: '3h', color: '#F472B6', trend: 'down' },
  { id: '2', title: 'Presentation of the new department', day: 8,  month: 8, year: 2020, duration: '2h', color: '#4361EE', trend: 'up'   },

  // Sep 17 (Thursday) — 8 events: 3 visible + "+5" badge
  { id: '3',  title: 'Presentation of the new department', day: 17, month: 8, year: 2020, duration: '2h',    color: '#4361EE', trend: 'up'   },
  { id: '4',  title: "Marc's Birthday",                    day: 17, month: 8, year: 2020, duration: '3h',    color: '#F472B6', trend: 'down' },
  { id: '5',  title: 'Movie night (Tenet)',                day: 17, month: 8, year: 2020, duration: '2h',    color: '#A855F7', trend: 'down' },
  { id: '6',  title: 'Sprint Planning',                    day: 17, month: 8, year: 2020, duration: '1h',    color: '#4361EE', trend: 'up'   },
  { id: '7',  title: 'Design Review',                      day: 17, month: 8, year: 2020, duration: '2h',    color: '#22C55E', trend: 'down' },
  { id: '8',  title: 'Client Call',                        day: 17, month: 8, year: 2020, duration: '45m',   color: '#F97316', trend: 'up'   },
  { id: '9',  title: 'Lunch break',                        day: 17, month: 8, year: 2020, duration: '1h',    color: '#8B5CF6', trend: 'down' },
  { id: '10', title: 'Code Review',                        day: 17, month: 8, year: 2020, duration: '1h 30m',color: '#4361EE', trend: 'up'   },

  // Sep 28 (Monday) — 1 event
  { id: '11', title: "Ray's Birthday", day: 28, month: 8, year: 2020, duration: '3h', color: '#F472B6', trend: 'down' },
];
