import { request, BASE_URL } from '@/lib/api';
import type { TaskStatus, TaskPriority } from '@/features/projects/types';

export interface PaymentDTO {
  id:      number;
  amount:  string;
  paidAt:  string;
  note:    string;
}

export interface TaskPaymentDTO {
  id:                  number;
  amount:              string;
  paymentType:         'advance' | 'partial' | 'final' | 'other';
  paidAt:              string;
  paymentMethod:       'cash' | 'card';
  note:                string;
  linkedTransactionId: number | null;
}

export interface CreateTaskPaymentRequest {
  amount:        number;
  paymentType:   'advance' | 'partial' | 'final' | 'other';
  paymentMethod: 'cash' | 'card';
  paidAt?:       string;
  note?:         string;
}

export interface CostSummaryDTO {
  task_id:             string;
  price:               string;
  total_received:      string;
  balance_due:         string;
  salary_cost:         string;
  profit:              string;
  materials_out_units: number;
}

export interface TaskCommentDTO {
  id:         number;
  text:       string;
  authorName: string;
  createdAt:  string;
  taskStatus: { id: number; name: string; color: string; } | null;
}

export interface TaskDTO {
  id?:              string;
  taskId:           string;
  name:             string;
  description?:     string;
  status:           TaskStatus;
  statusId?:        number;
  statusName?:      string;
  statusColor?:     string;
  priority:         TaskPriority;
  section:          'active' | 'backlog';
  assigneeId:       string;
  assigneeName:     string;
  assigneeColor:    string;
  assigneeInitials: string;
  reporterName?:    string;
  deadline?:        string;
  estimate:         string;
  spentTime:        string;
  loggedTime?:      string;
  client?:          string;
  clientLinkId?:    number | null;
  clientLinkName?:  string;
  phone?:           string;
  passportSeries?:  string;
  acceptanceDate?:  string;
  deliveryAddress?: string;
  model?:           string;
  dimensions?:      string;
  fabricType?:      string;
  fabricTypeId?:    number | null;
  softness?:        string;
  softnessId?:      number | null;
  price?:                  string;
  advancePayment?:         string;
  advancePaymentPercent?:  number;
  advancePaymentDate?:     string;
  advancePaymentMethod?:   'card' | 'cash';
  finalPayment?:           string;
  finalPaymentDate?:       string;
  finalPaymentMethod?:     'card' | 'cash';
  assigneePayment?: string;
  notes?:           string;
  totalPaid?:       string;
  balanceDue?:      string;
  assignees?: {
    id:                 number;
    userId:             number;
    name:               string;
    color:              string;
    initials:           string;
    salaryAmount:       string;
    isPaid:             boolean;
    paidAt:             string | null;
    totalPaid:          string;
    lastPaymentAmount:  string | null;
    lastPaymentAt:      string | null;
    payments:           PaymentDTO[];
    isStarted:          boolean;
    startedAt:          string | null;
    isDone:             boolean;
    doneAt:             string | null;
  }[];
  comments?: TaskCommentDTO[];
  payments?: TaskPaymentDTO[];
  deliveryConfirmed?: boolean;
  delivery?: {
    id:             number;
    status:         string;
    status_display: string;
    scheduledDate:  string | null;
    deliveredAt:    string | null;
    address:        string;
    driverId:       number | null;
    driverName:     string | null;
    recipientName:  string | null;
  } | null;
}

export interface TaskListResponse {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  TaskDTO[];
}

export interface CreateTaskRequest {
  name:             string;
  description?:     string;
  status?:          TaskStatus | string | number;
  statusId?:        number;
  priority:         string;
  section?:         'active' | 'backlog' | 'archive';
  assigneeId?:      string;
  deadline?:        string;
  estimate?:        string;
  client?:          string;
  clientLinkId?:    number;
  phone?:           string;
  passportSeries?:  string;
  order_number?:    string;
  items?:           unknown[];
  acceptanceDate?:  string;
  deliveryAddress?: string;
  model?:           string;
  dimensions?:      string;
  fabricTypeId?:    number | null;
  softnessId?:      number | null;
  price?:                  string;
  advancePayment?:         string;
  advancePaymentPercent?:  number;
  advancePaymentDate?:     string;
  advancePaymentMethod?:   'card' | 'cash';
  finalPayment?:           string;
  finalPaymentDate?:       string;
  finalPaymentMethod?:     'card' | 'cash';
  assigneePayment?: string;
  assignees?:            { userId: number; salaryAmount?: string | number }[];
  notes?:                string;
  deliveryConfirmed?:    boolean;
}

export interface TaskStatusDTO {
  id:     string | number;
  name:   string;
  color?: string;
  order?: number;
}

export interface TaskStatusListResponse {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  TaskStatusDTO[];
}

export interface NamedItemDTO { id: number; name: string; }
export interface NamedItemListResponse { count: number; next: string | null; previous: string | null; results: NamedItemDTO[]; }

export const fabricTypeService = {
  async getAll(): Promise<NamedItemDTO[]> {
    const res = await request<NamedItemDTO[] | NamedItemListResponse>('/tasks/fabric-types/', { method: 'GET' });
    return Array.isArray(res) ? res : (res.results ?? []);
  },
  create(name: string) { return request<NamedItemDTO>('/tasks/fabric-types/', { method: 'POST', body: { name } }); },
  update(id: number, name: string) { return request<NamedItemDTO>(`/tasks/fabric-types/${id}/`, { method: 'PATCH', body: { name } }); },
  delete(id: number) { return request<void>(`/tasks/fabric-types/${id}/`, { method: 'DELETE' }); },
};

export const softnessService = {
  async getAll(): Promise<NamedItemDTO[]> {
    const res = await request<NamedItemDTO[] | NamedItemListResponse>('/tasks/softness-levels/', { method: 'GET' });
    return Array.isArray(res) ? res : (res.results ?? []);
  },
  create(name: string) { return request<NamedItemDTO>('/tasks/softness-levels/', { method: 'POST', body: { name } }); },
  update(id: number, name: string) { return request<NamedItemDTO>(`/tasks/softness-levels/${id}/`, { method: 'PATCH', body: { name } }); },
  delete(id: number) { return request<void>(`/tasks/softness-levels/${id}/`, { method: 'DELETE' }); },
};

export const taskStatusService = {
  getAll() {
    return request<TaskStatusListResponse>('/tasks/task-statuses/', { method: 'GET' });
  },
  create(data: { name: string; color?: string }) {
    return request<TaskStatusDTO>('/tasks/task-statuses/', { method: 'POST', body: data });
  },
  update(id: string | number, data: { name?: string; color?: string; order?: number }) {
    return request<TaskStatusDTO>(`/tasks/task-statuses/${id}/`, { method: 'PATCH', body: data });
  },
  delete(id: string | number) {
    return request<void>(`/tasks/task-statuses/${id}/`, { method: 'DELETE' });
  },
};

export interface DashboardDeadline {
  taskId:       string;
  name:         string;
  deadline:     string;
  assigneeName: string;
  priority:     string;
  statusName:   string;
}

export interface DashboardCall {
  id:         number;
  first_name: string;
  last_name:  string;
  phone:      string;
}

export interface DashboardDTO {
  total_active_tasks:     number;
  overdue_tasks:          number;
  due_today:              number;
  revenue_this_month:     number;
  expenses_this_month:    number;
  balance_this_month:     number;
  low_stock_count:        number;
  unpaid_assignees_count: number;
  upcoming_calls_today:   number;
  upcoming_deadlines:     DashboardDeadline[];
  today_calls:            DashboardCall[];
}

export interface AttachmentDTO {
  id:         number;
  url:        string;
  name:       string;
  fileType:   'image' | 'video';
  uploadedAt: string;
}

export const attachmentService = {
  getAll(taskId: string | number) {
    return request<AttachmentDTO[]>(`/tasks/${taskId}/attachments/`, { method: 'GET' });
  },

  async upload(taskId: string | number, file: File): Promise<AttachmentDTO> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE_URL}/tasks/${taskId}/attachments/`, {
      method:  'POST',
      headers: {
        'ngrok-skip-browser-warning': 'true',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail ?? 'Ֆայлի բեռնումը ձախողվեց');
    }
    return res.json() as Promise<AttachmentDTO>;
  },

  delete(taskId: string | number, attachmentId: number) {
    return request<void>(`/tasks/${taskId}/attachments/${attachmentId}/`, { method: 'DELETE' });
  },
};

function normalizeTaskList(res: TaskListResponse | TaskDTO[]): TaskListResponse {
  if (Array.isArray(res)) return { count: res.length, next: null, previous: null, results: res };
  return res;
}

export const taskService = {
  getDashboard() {
    return request<DashboardDTO>('/tasks/dashboard/', { method: 'GET' });
  },

  async getAll(): Promise<TaskListResponse> {
    const res = await request<TaskListResponse | TaskDTO[]>('/tasks/', { method: 'GET' });
    return normalizeTaskList(res);
  },

  async getArchived(): Promise<TaskListResponse> {
    const res = await request<TaskListResponse | TaskDTO[]>('/tasks/?section=archive', { method: 'GET' });
    return normalizeTaskList(res);
  },

  async findByTaskId(taskId: string): Promise<TaskListResponse> {
    const res = await request<TaskListResponse | TaskDTO[]>(`/tasks/?search=${encodeURIComponent(taskId)}`, { method: 'GET' });
    return normalizeTaskList(res);
  },

  async getByAssignee(assigneeId: string | number): Promise<TaskListResponse> {
    const res = await request<TaskListResponse | TaskDTO[]>(`/tasks/?assignee=${assigneeId}`, { method: 'GET' });
    return normalizeTaskList(res);
  },

  async getMyTasks(): Promise<TaskListResponse> {
    const res = await request<TaskListResponse | TaskDTO[]>('/tasks/my-tasks/', { method: 'GET' });
    return normalizeTaskList(res);
  },

  getById(id: string) {
    return request<TaskDTO>(`/tasks/${id}/`, { method: 'GET' });
  },

  create(data: CreateTaskRequest) {
    return request<TaskDTO>('/tasks/', { method: 'POST', body: data });
  },

  update(id: string, data: Partial<CreateTaskRequest> & { status?: TaskStatus; loggedTime?: string }) {
    return request<TaskDTO>(`/tasks/${id}/`, { method: 'PATCH', body: data });
  },

  delete(id: string) {
    return request<void>(`/tasks/${id}/`, { method: 'DELETE' });
  },

  markStarted(taskId: string, userId: number, isStarted: boolean) {
    return request<{ isStarted: boolean; startedAt: string | null }>(
      `/tasks/${taskId}/assignees/${userId}/mark-started/`,
      { method: 'POST', body: { isStarted } },
    );
  },

  markDone(taskId: string, userId: number, isDone: boolean) {
    return request<{ isDone: boolean; doneAt: string | null }>(
      `/tasks/${taskId}/assignees/${userId}/mark-done/`,
      { method: 'POST', body: { isDone } },
    );
  },

  getPayments(taskId: string, userId: number) {
    return request<PaymentDTO[]>(
      `/tasks/${taskId}/assignees/${userId}/payments/`,
      { method: 'GET' },
    );
  },

  recordPayment(taskId: string, userId: number, data: { amount: string; note?: string; paidAt?: string }) {
    return request<PaymentDTO>(
      `/tasks/${taskId}/assignees/${userId}/payments/`,
      { method: 'POST', body: data },
    );
  },

  deletePayment(taskId: string, userId: number, paymentId: number) {
    return request<void>(
      `/tasks/${taskId}/assignees/${userId}/payments/${paymentId}/`,
      { method: 'DELETE' },
    );
  },

  listPayments(taskId: string) {
    return request<TaskPaymentDTO[]>(`/tasks/${taskId}/payments/`, { method: 'GET' });
  },

  addPayment(taskId: string, data: CreateTaskPaymentRequest) {
    return request<TaskPaymentDTO>(`/tasks/${taskId}/payments/`, { method: 'POST', body: data });
  },

  removePayment(taskId: string, paymentId: number) {
    return request<void>(`/tasks/${taskId}/payments/${paymentId}/`, { method: 'DELETE' });
  },

  getCostSummary(taskId: string) {
    return request<CostSummaryDTO>(`/tasks/${taskId}/cost-summary/`, { method: 'GET' });
  },

  getComments(taskId: string) {
    return request<TaskCommentDTO[]>(`/tasks/${taskId}/comments/`, { method: 'GET' });
  },

  createComment(taskId: string, data: { text: string; task_status_id?: number }) {
    return request<TaskCommentDTO>(`/tasks/${taskId}/comments/`, { method: 'POST', body: data });
  },

  deleteComment(taskId: string, commentId: number) {
    return request<void>(`/tasks/${taskId}/comments/${commentId}/`, { method: 'DELETE' });
  },

  async downloadInvoice(taskId: string): Promise<void> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const res = await fetch(`${BASE_URL}/tasks/${taskId}/invoice/`, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        'ngrok-skip-browser-warning': 'true',
      },
    });
    if (!res.ok) throw new Error(`Invoice error: ${res.status}`);
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `invoice-${taskId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
