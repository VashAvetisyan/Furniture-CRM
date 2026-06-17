import type { IconProps } from '@/components/icons';
import type { FC } from 'react';

export type Level = 'Senior' | 'Middle' | 'Junior';
export type Priority = 'up' | 'down';
export type ProjectPriority = 'High' | 'Medium' | 'Low';

export interface Employee {
  name: string;
  role: string;
  level: Level;
  color: string;
  initials: string;
}

export interface Project {
  id: string;
  name: string;
  created: string;
  priority: ProjectPriority;
  allTasks: number;
  activeTasks: number;
  assignees: string[];
  extra: number;
  iconBg: string;
  emoji: string;
}

export interface DashboardEvent {
  title: string;
  date: string;
  duration: string;
  borderColor: string;
  priority: Priority;
}

export interface CalendarEvent {
  title: string;
  date: string;
  duration: string;
  borderColor: string;
  iconColor: string;
  priority: Priority;
  Icon: FC<IconProps>;
}

export interface ActivityAction {
  icon: string;
  text: string;
}

export interface ActivityItem {
  name: string;
  role: string;
  color: string;
  initials: string;
  actions: ActivityAction[];
}
