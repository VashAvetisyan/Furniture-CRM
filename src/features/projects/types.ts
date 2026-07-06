export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type TaskSection = 'active' | 'backlog' | 'archive';
export type TaskPriority = 'High' | 'Medium' | 'Low';
export type ViewMode = 'list' | 'board' | 'timeline';

export interface Assignee {
  id: string;
  name: string;
  color: string;
  initials: string;
  role?: string;
}

export interface TaskAttachment {
  id: string;
  type: 'file' | 'link';
  name: string;
  date?: string;
}

export interface ActivityEntry {
  icon: 'status' | 'attach';
  prefix: string;
  bold?: string;
  middle?: string;
  highlight?: string;
}

export interface ActivityItem {
  id: string;
  name: string;
  role: string;
  color: string;
  initials: string;
  entries: ActivityEntry[];
}

export interface TaskComment {
  id:         number;
  text:       string;
  authorName: string;
  createdAt:  string;
  taskStatus: { id: number; name: string; color: string; } | null;
}

export interface TaskDeliveryInfo {
  id:             number;
  status:         string;
  status_display: string;
  scheduledDate:  string | null;
  deliveredAt:    string | null;
  address:        string;
  driverId:       number | null;
  driverName:     string | null;
  recipientName:  string | null;
}

export interface TaskPayment {
  id:                  number;
  amount:              string;
  paymentType:         'advance' | 'partial' | 'final' | 'other';
  paidAt:              string;
  paymentMethod:       'cash' | 'card';
  note:                string;
  linkedTransactionId: number | null;
}

export interface TaskAssignee {
  id:                number;
  userId:            number;
  name:              string;
  color:             string;
  initials:          string;
  salaryAmount:      string;
  isPaid:            boolean;
  paidAt:            string | null;
  totalPaid:         string;
  lastPaymentAmount: string | null;
  lastPaymentAt:     string | null;
  payments:          { id: number; amount: string; paidAt: string }[];
  isStarted:         boolean;
  startedAt:         string | null;
  isDone:            boolean;
  doneAt:            string | null;
}

export interface Task {
  id: string;
  taskId: string;
  name: string;
  description?: string;
  estimate: string;
  spentTime: string;
  loggedTime?: string;
  originalEstimate?: string;
  status: TaskStatus;
  section: TaskSection;
  priority: TaskPriority;
  group?: string;
  assigneeId?: string;
  assigneeColor: string;
  assigneeInitials: string;
  assigneeName: string;
  statusColor?: string;
  statusName?:  string;
  assignees?: TaskAssignee[];
  reporterName?: string;
  reporterColor?: string;
  reporterInitials?: string;
  deadline?: string;
  createdAt?: string;
  editedAt?: string;
  client?: string;
  clientLinkId?: number | null;
  clientLinkName?: string;
  acceptanceDate?: string;
  deliveryAddress?: string;
  phone?: string;
  passportSeries?: string;
  model?: string;
  dimensions?: string;
  fabricType?: string;
  fabricTypeId?: number | null;
  softness?: string;
  softnessId?: number | null;
  notes?: string;
  price?: string;
  totalPaid?:  string;
  balanceDue?: string;
  payments?:   TaskPayment[];
  advancePayment?: string;
  advancePaymentDate?: string;
  advancePaymentMethod?: 'card' | 'cash';
  finalPayment?: string;
  finalPaymentDate?: string;
  finalPaymentMethod?: 'card' | 'cash';
  attachments?: TaskAttachment[];
  activity?: ActivityItem[];
  comments?: TaskComment[];
  deliveryConfirmed?: boolean;
  delivery?: TaskDeliveryInfo | null;
  startDay?: number;
  endDay?: number;
}

export interface Project {
  id: string;
  projectId: string;
  name: string;
  description?: string;
  reporterName?: string;
  reporterColor?: string;
  reporterInitials?: string;
  assignees?: Assignee[];
  priority?: TaskPriority;
  deadline?: string;
  createdAt?: string;
  tasks: Task[];
}
