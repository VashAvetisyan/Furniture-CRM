export interface CalendarEvent {
  id: string;
  title: string;
  day: number;
  month: number; // 0-indexed (0 = Jan, 8 = Sep)
  year: number;
  duration?: string;
  color: string;
  trend?: 'up' | 'down';
  // enriched fields for modal detail view
  subtitle?: string;   // assignee name (task) or phone (call)
  badge?: string;      // status label (task) or "Zangl" (call)
  badgeColor?: string; // accent color for badge
  clientId?: number;   // for call events — used to open CallHistoryModal
}
