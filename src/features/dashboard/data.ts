import { PresentationIcon, GiftIcon, UsersIcon, TvIcon } from '@/components/icons';
import type { Employee, Project, DashboardEvent, CalendarEvent, ActivityItem } from './types';

export const employees: Employee[] = [
  { name: 'Shawn Stone',    role: 'UI/UX Designer', level: 'Middle', color: '#FF6B9D', initials: 'SS' },
  { name: 'Randy Delgado',  role: 'UI/UX Designer', level: 'Junior', color: '#4ECDC4', initials: 'RD' },
  { name: 'Emily Tyler',    role: 'Copywriter',      level: 'Middle', color: '#45B7D1', initials: 'ET' },
  { name: 'Louis Castro',   role: 'Copywriter',      level: 'Senior', color: '#96CEB4', initials: 'LC' },
  { name: 'Blake Silva',    role: 'IOS Developer',   level: 'Senior', color: '#F7DC6F', initials: 'BS' },
  { name: 'Joel Phillips',  role: 'UI/UX Designer',  level: 'Middle', color: '#C39BD3', initials: 'JP' },
  { name: 'Wayne Marsh',    role: 'Copywriter',      level: 'Junior', color: '#82E0AA', initials: 'WM' },
  { name: 'Oscar Holloway', role: 'UI/UX Designer',  level: 'Middle', color: '#F0A500', initials: 'OH' },
];

export const projects: Project[] = [
  {
    id: 'PN0001265',
    name: 'Medical App (iOS native)',
    created: 'Sep 12, 2020',
    priority: 'Medium',
    allTasks: 34,
    activeTasks: 13,
    assignees: ['#FF6B9D', '#45B7D1', '#96CEB4', '#C39BD3'],
    extra: 2,
    iconBg: 'from-purple-400 to-indigo-500',
    emoji: '🏥',
  },
  {
    id: 'PN0001221',
    name: 'Food Delivery Service',
    created: 'Sep 10, 2020',
    priority: 'Medium',
    allTasks: 50,
    activeTasks: 24,
    assignees: ['#FF6B9D', '#F7DC6F', '#82E0AA'],
    extra: 0,
    iconBg: 'from-green-400 to-teal-500',
    emoji: '🍕',
  },
  {
    id: 'PN0001290',
    name: 'Internal Project',
    created: 'May 28, 2020',
    priority: 'Low',
    allTasks: 23,
    activeTasks: 20,
    assignees: ['#4ECDC4', '#C39BD3', '#F0A500'],
    extra: 5,
    iconBg: 'from-blue-500 to-primary',
    emoji: '💼',
  },
];

export const dashboardEvents: DashboardEvent[] = [
  {
    title: 'Presentation of the new department',
    date: 'Today | 5:00 PM',
    duration: '4h',
    borderColor: 'border-l-[#4361EE]',
    priority: 'up',
  },
  {
    title: "Anna's Birthday",
    date: 'Today | 6:00 PM',
    duration: '4h',
    borderColor: 'border-l-pink-400',
    priority: 'down',
  },
  {
    title: "Ray's Birthday",
    date: 'Tomorrow | 2:00 PM',
    duration: '4h',
    borderColor: 'border-l-purple-400',
    priority: 'down',
  },
];

export const calendarEvents: CalendarEvent[] = [
  {
    title: 'Presentation of the new department',
    date: 'Today | 6:00 PM',
    duration: '4h',
    borderColor: 'border-l-[#4361EE]',
    iconColor: 'text-[#4361EE]',
    priority: 'up',
    Icon: PresentationIcon,
  },
  {
    title: "Anna's Birthday",
    date: 'Today | 5:00 PM',
    duration: '2h',
    borderColor: 'border-l-pink-400',
    iconColor: 'text-pink-400',
    priority: 'down',
    Icon: GiftIcon,
  },
  {
    title: 'Meeting with CEO',
    date: 'Sep 14 | 5:00 PM',
    duration: '1h',
    borderColor: 'border-l-[#4361EE]',
    iconColor: 'text-[#4361EE]',
    priority: 'up',
    Icon: PresentationIcon,
  },
  {
    title: "Lucas's Birthday",
    date: 'Sep 29 | 5:30 PM',
    duration: '2h',
    borderColor: 'border-l-pink-400',
    iconColor: 'text-pink-400',
    priority: 'down',
    Icon: GiftIcon,
  },
  {
    title: 'Meeting with Development Team',
    date: 'Tomorrow | 5:00 PM',
    duration: '4h',
    borderColor: 'border-l-amber-400',
    iconColor: 'text-amber-500',
    priority: 'up',
    Icon: UsersIcon,
  },
  {
    title: "Ray's Birthday",
    date: 'Tomorrow | 2:00 PM',
    duration: '1h 30m',
    borderColor: 'border-l-purple-400',
    iconColor: 'text-purple-400',
    priority: 'down',
    Icon: GiftIcon,
  },
  {
    title: 'Movie night (Tenet)',
    date: 'Sep 15 | 5:00 PM',
    duration: '3h',
    borderColor: 'border-l-purple-400',
    iconColor: 'text-purple-400',
    priority: 'down',
    Icon: TvIcon,
  },
  {
    title: 'Meeting with CTO',
    date: 'Sep 30 | 12:00',
    duration: '1h',
    borderColor: 'border-l-[#4361EE]',
    iconColor: 'text-[#4361EE]',
    priority: 'up',
    Icon: PresentationIcon,
  },
];

export const activities: ActivityItem[] = [
  {
    name: 'Oscar Holloway',
    role: 'UI/UX Designer',
    color: '#F0A500',
    initials: 'OH',
    actions: [
      { icon: '📋', text: 'Updated the status of Mind Map task to In Progress' },
      { icon: '📎', text: 'Attached files to the task' },
    ],
  },
  {
    name: 'Emily Tyler',
    role: 'Copywriter',
    color: '#45B7D1',
    initials: 'ET',
    actions: [
      { icon: '📋', text: 'Updated the status of Mind Map task to In Progress' },
    ],
  },
];
