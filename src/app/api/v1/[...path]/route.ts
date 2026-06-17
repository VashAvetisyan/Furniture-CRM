import { NextRequest, NextResponse } from 'next/server';

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_PAYLOAD  = Buffer.from(JSON.stringify({ id: '1', name: 'Dev User', email: 'dev@example.com', role: 'director', exp: 9999999999 })).toString('base64url');
const MOCK_HEADER   = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
const MOCK_TOKEN    = `${MOCK_HEADER}.${MOCK_PAYLOAD}.mockSignature`;
const MOCK_REFRESH  = 'mock-refresh-token-dev';

const MOCK_USER = {
  id: 1, username: 'dev', first_name: 'Dev', last_name: 'User',
  email: 'dev@example.com', phone: '', role: 'director',
  position: 'Menedjer', avatar: null, company: null, is_active: true,
};

const mockEmployees = [
  { id: 1, name: 'Ani Petrosyan',    initials: 'AP', color: '#6366f1', position: 1, level: 'Senior', birthday: '1990-05-12', fullAge: 34, gender: 'Female', email: 'ani@example.com',    phone: '+37491000001' },
  { id: 2, name: 'Tigran Hakobyan',  initials: 'TH', color: '#f59e0b', position: 2, level: 'Middle', birthday: '1995-08-20', fullAge: 29, gender: 'Male',   email: 'tigran@example.com', phone: '+37491000002' },
  { id: 3, name: 'Mariam Grigoryan', initials: 'MG', color: '#10b981', position: 1, level: 'Junior', birthday: '1998-03-15', fullAge: 26, gender: 'Female', email: 'mariam@example.com', phone: '+37491000003' },
  { id: 4, name: 'Armen Sargsyan',   initials: 'AS', color: '#ef4444', position: 3, level: 'Senior', birthday: '1988-11-30', fullAge: 35, gender: 'Male',   email: 'armen@example.com',  phone: '+37491000004' },
];

const mockPositions = {
  count: 3, next: null, previous: null,
  results: [
    { id: 1, name: 'Dizayner' },
    { id: 2, name: 'Tsragravoro' },
    { id: 3, name: 'Menedjer' },
  ],
};

const mockSources = [
  { id: 1, name: 'Instagram' },
  { id: 2, name: 'Facebook' },
  { id: 3, name: 'Beranic beran' },
  { id: 4, name: 'Google' },
];

const mockClients = [
  { id: 1, client_type: 'individual', first_name: 'Nare',   last_name: 'Hovhannisyan', company_name: '', phone: '+37494111111', phone_alt: '', email: '', address: 'Yerevan, Mashtotsi 5', notes: '', source: { id: 1, name: 'Instagram' }, next_call_date: null, last_called_at: '2025-05-20T10:00:00Z', created_at: '2025-01-10T08:00:00Z', calls: [] },
  { id: 2, client_type: 'individual', first_name: 'Karen',  last_name: 'Mkrtchyan',    company_name: '', phone: '+37494222222', phone_alt: '', email: '', address: 'Yerevan, Komitasi 12', notes: '', source: { id: 2, name: 'Facebook' }, next_call_date: '2025-06-01', last_called_at: null, created_at: '2025-02-15T09:00:00Z', calls: [] },
  { id: 3, client_type: 'legal',      first_name: 'Liana',  last_name: 'Simonyan',     company_name: 'ABC LLC', phone: '+37494333333', phone_alt: '', email: 'liana@abc.am', address: 'Yerevan, Baghramyan 8', notes: '', source: null, next_call_date: '2025-05-28', last_called_at: '2025-05-22T14:00:00Z', created_at: '2025-03-01T10:00:00Z', calls: [] },
];

const mockTaskStatuses = [
  { id: 'todo',        name: 'To Do',       order: 1 },
  { id: 'in_progress', name: 'In Progress', order: 2 },
  { id: 'in_review',   name: 'In Review',   order: 3 },
  { id: 'done',        name: 'Done',        order: 4 },
];
let nextStatusOrder = 5;

const mockTasks = [
  { id: '1', taskId: 'TASK-001', name: 'Nare Hovhannisyan - Harsanekan zgest', description: '', status: 'in_progress', priority: 'High', section: 'active', assigneeId: '1', assigneeName: 'Ani Petrosyan', assigneeColor: '#6366f1', assigneeInitials: 'AP', deadline: '2025-06-10', estimate: '0', spentTime: '0', client: 'Nare Hovhannisyan', phone: '+37494111111', model: 'Harsanekan', fabricType: 'Saten', price: '250000', advancePayment: '100000', finalPayment: '150000', assigneePayment: '50000' },
  { id: '2', taskId: 'TASK-002', name: 'Karen Mkrtchyan - Kostyum', description: '', status: 'todo', priority: 'Medium', section: 'active', assigneeId: '2', assigneeName: 'Tigran Hakobyan', assigneeColor: '#f59e0b', assigneeInitials: 'TH', deadline: '2025-06-20', estimate: '0', spentTime: '0', client: 'Karen Mkrtchyan', phone: '+37494222222', model: 'Dasakan', fabricType: 'Bambak', price: '80000', advancePayment: '40000', finalPayment: '40000', assigneePayment: '20000' },
  { id: '3', taskId: 'TASK-003', name: 'Liana Simonyan - Vernashapiк', description: '', status: 'done', priority: 'Low', section: 'active', assigneeId: '1', assigneeName: 'Ani Petrosyan', assigneeColor: '#6366f1', assigneeInitials: 'AP', deadline: '2025-05-30', estimate: '0', spentTime: '0', client: 'Liana Simonyan', assigneePayment: '15000' },
];

let nextClientId = 10;
let nextTaskId   = 10;
let callIdSeq    = 100;

const mockPages = [
  { id: 1,  slug: 'dashboard', label: 'Dashboard',       order: 1  },
  { id: 2,  slug: 'tasks',     label: 'Patvererr',       order: 2  },
  { id: 3,  slug: 'calendar',  label: 'Calendar',        order: 3  },
  { id: 4,  slug: 'calls',     label: 'Calls',           order: 4  },
  { id: 5,  slug: 'customers', label: 'Customers',       order: 5  },
  { id: 6,  slug: 'finance',   label: 'Finance',         order: 6  },
  { id: 7,  slug: 'warehouse', label: 'Warehouse',       order: 7  },
  { id: 8,  slug: 'workshops', label: 'Workshops',       order: 8  },
  { id: 9,  slug: 'employees', label: 'Employees',       order: 9  },
  { id: 10, slug: 'salaries',  label: 'Salaries',        order: 10 },
  { id: 11, slug: 'settings',  label: 'Settings',        order: 11 },
];

const mockPositionSettings: { id: number; position: number; page: number; allowed: boolean }[] = [];
let nextPositionSettingId = 1;

// ── Route handler ─────────────────────────────────────────────────────────────

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const { searchParams } = req.nextUrl;

  // ── Access / my pages ─────────────────────────────────────────────────────
  if (path === 'access/my-pages/' || path === 'access/my-pages') {
    return json(mockPages.map(({ id: _id, ...p }) => p));
  }

  // ── Access / all pages (director) ─────────────────────────────────────────
  if (path === 'access/pages/' || path === 'access/pages') {
    return json(mockPages);
  }

  // ── Access / position settings ────────────────────────────────────────────
  if (path === 'access/position-settings/' || path === 'access/position-settings') {
    return json(mockPositionSettings);
  }

  // ── Employees ──────────────────────────────────────────────────────────────
  if (path === 'employees/') {
    return json({ count: mockEmployees.length, next: null, previous: null, results: mockEmployees });
  }
  if (/^employees\/\d+\/$/.test(path)) {
    const id = parseInt(path.split('/')[1]);
    const emp = mockEmployees.find((e) => e.id === id);
    return emp ? json(emp) : json({ detail: 'Not found' }, 404);
  }

  // ── Positions ──────────────────────────────────────────────────────────────
  if (path === 'positions/' || path === 'positions') {
    return json(mockPositions);
  }

  // ── Clients ───────────────────────────────────────────────────────────────
  if (path === 'clients/sources/') {
    return json(mockSources);
  }
  if (path === 'clients/' || path === 'clients') {
    return json({ count: mockClients.length, next: null, previous: null, results: mockClients });
  }
  if (/^clients\/\d+\/$/.test(path)) {
    const id = parseInt(path.split('/')[1]);
    const c = mockClients.find((x) => x.id === id);
    return c ? json(c) : json({ detail: 'Not found' }, 404);
  }

  // ── Task statuses (must come before generic tasks routes) ──────────────────
  if (path === 'tasks/task-statuses/' || path === 'tasks/task-statuses') {
    return json({ count: mockTaskStatuses.length, next: null, previous: null, results: mockTaskStatuses });
  }
  if (/^tasks\/task-statuses\/[^/]+\/$/.test(path)) {
    const id = path.split('/')[2];
    const s = mockTaskStatuses.find((x) => String(x.id) === id);
    return s ? json(s) : json({ detail: 'Not found' }, 404);
  }

  // ── Tasks dashboard ───────────────────────────────────────────────────────
  if (path === 'tasks/dashboard/' || path === 'tasks/dashboard') {
    return json({
      tasks_by_status:        [{ status__name: 'In Progress', status__color: '#4361EE', count: 2 }],
      total_active_tasks:     mockTasks.filter((t) => t.status !== 'done').length,
      overdue_tasks:          0,
      due_today:              0,
      revenue_this_month:     '330000.00',
      expenses_this_month:    '85000.00',
      balance_this_month:     '245000.00',
      low_stock_count:        0,
      unpaid_assignees_count: 2,
      upcoming_calls_today:   0,
    });
  }

  // ── Tasks ─────────────────────────────────────────────────────────────────
  if (path === 'tasks/' || path === 'tasks') {
    const assignee = searchParams.get('assignee');
    const filtered = assignee
      ? mockTasks.filter((t) => t.assigneeId === assignee)
      : mockTasks;
    return json({ count: filtered.length, next: null, previous: null, results: filtered });
  }
  if (path === 'tasks/my-tasks/' || path === 'tasks/my/') {
    return json({ count: 0, next: null, previous: null, results: [] });
  }
  if (/^tasks\/[^/]+\/$/.test(path)) {
    const id = path.split('/')[1];
    const task = mockTasks.find((t) => t.id === id);
    return task ? json(task) : json({ detail: 'Not found' }, 404);
  }

  // ── Task attachments (GET list) ───────────────────────────────────────────
  if (/^tasks\/[^/]+\/attachments\/$/.test(path)) {
    return json([]);
  }

  return json({ detail: 'Not found' }, 404);
}

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');

  // ── Task attachments (POST upload — multipart) ────────────────────────────
  if (/^tasks\/[^/]+\/attachments\/$/.test(path)) {
    return json({
      id: Math.floor(Math.random() * 1000),
      url: '',
      name: 'uploaded.jpg',
      fileType: 'image',
      uploadedAt: new Date().toISOString(),
    }, 201);
  }

  const body = await req.json().catch(() => ({}));

  // ── Auth ──────────────────────────────────────────────────────────────────
  if (path === 'auth/login' || path === 'auth/login/' || path === 'auth/token/' || path === 'auth/token') {
    return json({ access: MOCK_TOKEN, refresh: MOCK_REFRESH, user: MOCK_USER });
  }
  if (path === 'auth/token/refresh/' || path === 'auth/token/refresh') {
    return json({ access: MOCK_TOKEN });
  }

  // ── Create client ─────────────────────────────────────────────────────────
  if (path === 'clients/' || path === 'clients') {
    const newClient = {
      id: nextClientId++,
      client_type: body.client_type ?? 'individual',
      first_name:  body.first_name  ?? '',
      last_name:   body.last_name   ?? '',
      company_name: body.company_name ?? '',
      phone:       body.phone ?? '',
      phone_alt:   body.phone_alt ?? '',
      email:       body.email ?? '',
      address:     body.address ?? '',
      notes:       body.notes ?? '',
      source:      mockSources.find((s) => s.id === body.source) ?? null,
      next_call_date: body.next_call_date ?? null,
      last_called_at: body.last_called_at ?? null,
      created_at: new Date().toISOString(),
      calls: [],
    };
    mockClients.push(newClient as any);
    return json(newClient, 201);
  }

  // ── Add call ──────────────────────────────────────────────────────────────
  if (/^clients\/\d+\/calls\/$/.test(path)) {
    const clientId = parseInt(path.split('/')[1]);
    const client = mockClients.find((c) => c.id === clientId);
    if (!client) return json({ detail: 'Not found' }, 404);
    const newCall = { id: callIdSeq++, note: body.note ?? '', date: body.date ?? new Date().toISOString().slice(0, 10), created_at: new Date().toISOString() };
    (client.calls as typeof newCall[]).push(newCall);
    return json(newCall, 201);
  }

  // ── Create position ───────────────────────────────────────────────────────
  if (path === 'positions/' || path === 'positions') {
    const newPos = { id: mockPositions.results.length + 10, name: body.name ?? 'New Position' };
    mockPositions.results.push(newPos);
    mockPositions.count++;
    return json(newPos, 201);
  }

  // ── Create position setting ───────────────────────────────────────────────
  if (path === 'access/position-settings/' || path === 'access/position-settings') {
    const existing = mockPositionSettings.findIndex(
      (s) => s.position === body.position && s.page === body.page,
    );
    if (existing !== -1) {
      mockPositionSettings[existing].allowed = body.allowed ?? false;
      return json(mockPositionSettings[existing]);
    }
    const newSetting = { id: nextPositionSettingId++, position: body.position, page: body.page, allowed: body.allowed ?? false };
    mockPositionSettings.push(newSetting);
    return json(newSetting, 201);
  }

  // ── Create task status ────────────────────────────────────────────────────
  if (path === 'tasks/task-statuses/' || path === 'tasks/task-statuses') {
    const name = body.name ?? 'New Status';
    const newStatus = {
      id:    name.toLowerCase().replace(/\s+/g, '_') + '_' + nextStatusOrder,
      name,
      order: nextStatusOrder++,
    };
    mockTaskStatuses.push(newStatus);
    return json(newStatus, 201);
  }

  // ── Create task ───────────────────────────────────────────────────────────
  if (path === 'tasks/' || path === 'tasks') {
    const assigneeId = String(body.assigneeId ?? body.assignee_id ?? (body.assignees?.[0]?.user) ?? '1');
    const emp = mockEmployees.find((e) => String(e.id) === assigneeId);
    const newTask = {
      id:               String(nextTaskId++),
      taskId:           `TASK-00${nextTaskId}`,
      name:             body.name             ?? 'New Task',
      description:      body.description      ?? '',
      status:           body.status           ?? 'todo',
      statusId:         body.statusId         ?? null,
      priority:         body.priority         ?? 'Medium',
      section:          body.section          ?? 'active',
      assigneeId,
      assigneeName:     emp?.name             ?? 'Unknown',
      assigneeColor:    emp?.color            ?? '#6366f1',
      assigneeInitials: emp?.initials         ?? '??',
      deadline:         body.deadline         ?? null,
      estimate:         '0',
      spentTime:        '0',
      client:           body.client           ?? undefined,
      phone:            body.phone            ?? undefined,
      model:            body.model            ?? undefined,
      fabricType:       body.fabricType       ?? undefined,
      price:            body.price            ?? undefined,
      advancePayment:   body.advancePayment   ?? undefined,
      finalPayment:     body.finalPayment     ?? undefined,
      assigneePayment:  body.assigneePayment ?? body.assignees?.[0]?.salary_amount ?? undefined,
      notes:            body.notes            ?? undefined,
    };
    mockTasks.push(newTask as any);
    return json(newTask, 201);
  }

  return json({ detail: 'Not found' }, 404);
}

export async function PATCH(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const body = await req.json().catch(() => ({}));

  // ── Update client ─────────────────────────────────────────────────────────
  if (/^clients\/\d+\/$/.test(path)) {
    const id = parseInt(path.split('/')[1]);
    const idx = mockClients.findIndex((c) => c.id === id);
    if (idx === -1) return json({ detail: 'Not found' }, 404);
    Object.assign(mockClients[idx], body);
    if (body.source !== undefined) {
      (mockClients[idx] as any).source = mockSources.find((s) => s.id === body.source) ?? null;
    }
    return json(mockClients[idx]);
  }

  // ── Update position ───────────────────────────────────────────────────────
  if (/^positions\/\d+\/$/.test(path)) {
    const id  = parseInt(path.split('/')[1]);
    const idx = mockPositions.results.findIndex((p) => p.id === id);
    if (idx === -1) return json({ detail: 'Not found' }, 404);
    Object.assign(mockPositions.results[idx], body);
    return json(mockPositions.results[idx]);
  }

  // ── Update position setting ───────────────────────────────────────────────
  if (/^access\/position-settings\/\d+\/$/.test(path)) {
    const id  = parseInt(path.split('/')[2]);
    const idx = mockPositionSettings.findIndex((s) => s.id === id);
    if (idx === -1) return json({ detail: 'Not found' }, 404);
    Object.assign(mockPositionSettings[idx], body);
    return json(mockPositionSettings[idx]);
  }

  // ── Update task status ────────────────────────────────────────────────────
  if (/^tasks\/task-statuses\/[^/]+\/$/.test(path)) {
    const id  = path.split('/')[2];
    const idx = mockTaskStatuses.findIndex((s) => String(s.id) === id);
    if (idx === -1) return json({ detail: 'Not found' }, 404);
    Object.assign(mockTaskStatuses[idx], body);
    return json(mockTaskStatuses[idx]);
  }

  // ── Update task ───────────────────────────────────────────────────────────
  if (/^tasks\/[^/]+\/$/.test(path)) {
    const id  = path.split('/')[1];
    const idx = mockTasks.findIndex((t) => t.id === id);
    if (idx === -1) return json({ detail: 'Not found' }, 404);
    Object.assign(mockTasks[idx], body);
    return json(mockTasks[idx]);
  }

  // ── Update employee ───────────────────────────────────────────────────────
  if (/^employees\/\d+\/$/.test(path)) {
    const id  = parseInt(path.split('/')[1]);
    const idx = mockEmployees.findIndex((e) => e.id === id);
    if (idx === -1) return json({ detail: 'Not found' }, 404);
    Object.assign(mockEmployees[idx], body);
    return json(mockEmployees[idx]);
  }

  return json({ detail: 'Not found' }, 404);
}

export async function DELETE(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');

  if (/^clients\/\d+\/$/.test(path)) {
    const id  = parseInt(path.split('/')[1]);
    const idx = mockClients.findIndex((c) => c.id === id);
    if (idx !== -1) mockClients.splice(idx, 1);
    return new NextResponse(null, { status: 204 });
  }

  if (/^clients\/\d+\/calls\/\d+\/$/.test(path)) {
    const [, clientId,, callId] = path.split('/');
    const client = mockClients.find((c) => c.id === parseInt(clientId));
    if (client) {
      const ci = client.calls.findIndex((c: any) => c.id === parseInt(callId));
      if (ci !== -1) client.calls.splice(ci, 1);
    }
    return new NextResponse(null, { status: 204 });
  }

  // ── Delete position ───────────────────────────────────────────────────────
  if (/^positions\/\d+\/$/.test(path)) {
    const id  = parseInt(path.split('/')[1]);
    const idx = mockPositions.results.findIndex((p) => p.id === id);
    if (idx !== -1) { mockPositions.results.splice(idx, 1); mockPositions.count--; }
    return new NextResponse(null, { status: 204 });
  }

  // ── Delete task status ────────────────────────────────────────────────────
  if (/^tasks\/task-statuses\/[^/]+\/$/.test(path)) {
    const id  = path.split('/')[2];
    const idx = mockTaskStatuses.findIndex((s) => String(s.id) === id);
    if (idx !== -1) mockTaskStatuses.splice(idx, 1);
    return new NextResponse(null, { status: 204 });
  }

  // ── Delete task attachment ────────────────────────────────────────────────
  if (/^tasks\/[^/]+\/attachments\/\d+\/$/.test(path)) {
    return new NextResponse(null, { status: 204 });
  }

  // ── Delete task ───────────────────────────────────────────────────────────
  if (/^tasks\/[^/]+\/$/.test(path)) {
    const id  = path.split('/')[1];
    const idx = mockTasks.findIndex((t) => t.id === id);
    if (idx !== -1) mockTasks.splice(idx, 1);
    return new NextResponse(null, { status: 204 });
  }

  return new NextResponse(null, { status: 204 });
}
