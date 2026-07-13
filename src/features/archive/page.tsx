'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { taskService, type TaskListResponse } from '@/services/task.service';
import { employeeService } from '@/services/employee.service';
import { positionService } from '@/services/position.service';
import { useAuthStore } from '@/stores';
import TaskList from '@/features/projects/components/TaskList';
import TaskDetailModal from '@/features/projects/components/TaskDetailModal';
import ProjectsListPanel from '@/features/projects/components/ProjectsListPanel';
import type { Task } from '@/features/projects/types';

function isOverdue(deadline?: string): boolean {
  if (!deadline) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(deadline) < today;
}

function inDateRange(iso: string | undefined, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!iso) return false;
  const d = new Date(iso);
  d.setHours(0, 0, 0, 0);
  if (from) {
    const f = new Date(from);
    f.setHours(0, 0, 0, 0);
    if (d < f) return false;
  }
  if (to) {
    const t = new Date(to);
    t.setHours(23, 59, 59, 999);
    if (d > t) return false;
  }
  return true;
}

export default function ArchivePage() {
  const { role, user } = useAuthStore();
  const isEmployee = role === 'employee';
  const isAdmin    = role === 'director';

  const [openTask, setOpenTask] = useState<Task | null>(null);

  const [taskSearch, setTaskSearch]                 = useState('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [filterRole, setFilterRole]                 = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId]     = useState<number | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [overdueOnly, setOverdueOnly]               = useState(false);
  const [acceptanceFrom, setAcceptanceFrom]         = useState('');
  const [acceptanceTo, setAcceptanceTo]             = useState('');
  const [deadlineFrom, setDeadlineFrom]             = useState('');
  const [deadlineTo, setDeadlineTo]                 = useState('');
  const [panelOpen, setPanelOpen]                   = useState(false);

  const { data: tasksResponse, isLoading } = useQuery<TaskListResponse>({
    queryKey: isEmployee ? ['tasks', 'my'] : ['tasks', 'archive'],
    queryFn:  isEmployee ? taskService.getMyTasks : taskService.getArchived,
    staleTime: 30_000,
  });
  // getMyTasks returns every section for the employee — narrow to archive here,
  // same as how the Active page narrows the same query down to section 'active'.
  const tasksData = (tasksResponse?.results ?? []).filter((t) => !isEmployee || (t.section as string) === 'archive');

  const { data: employeesData } = useQuery({
    queryKey:  ['employees'],
    queryFn:   () => employeeService.getAll(),
    staleTime: 2 * 60_000,
    enabled:   !isEmployee,
  });

  const { data: positionsData } = useQuery({
    queryKey:  ['positions'],
    queryFn:   () => positionService.getAll(),
    staleTime: 5 * 60_000,
    enabled:   !isEmployee,
  });

  function resolvePosition(pos: string | number): string {
    if (typeof pos === 'number') {
      return positionsData?.results.find((p) => p.id === pos)?.name ?? String(pos);
    }
    return pos;
  }

  // Directors aren't assignable executors — exclude their own employee record
  // from the filter picker, same as the Active tasks page.
  const employees = (employeesData?.data ?? [])
    .filter((emp) => !(isAdmin && (emp.id === user?.id || emp.name === user?.name)));

  const sidebarAssignees = useMemo(() => employees.map((emp) => ({
    id:       emp.id,
    name:     emp.name,
    color:    emp.color,
    initials: emp.initials,
    role:     resolvePosition(emp.position),
  })), [employees, positionsData]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId),
    [employees, selectedEmployeeId],
  );
  const roleEmployeeIds = useMemo(() => filterRole
    ? new Set(sidebarAssignees.filter((a) => a.role === filterRole).map((a) => String(a.id)).filter(Boolean))
    : null,
  [filterRole, sidebarAssignees]);

  const handleSelectEmployee = useCallback((name: string | null) => {
    if (!name) { setSelectedEmployeeId(null); setPanelOpen(false); return; }
    const emp = employees.find((e) => e.name === name);
    setSelectedEmployeeId(emp?.id ?? null);
    setSelectedClientId(null);
    setSelectedClientName(null);
    setPanelOpen(false);
  }, [employees]);

  const handleSelectRole = useCallback((r: string) => {
    setFilterRole(r === 'Բոլոր' ? null : r);
    setSelectedEmployeeId(null);
  }, []);

  const handleSelectClient = useCallback((id: number | null, name?: string) => {
    setSelectedClientId(id);
    setSelectedClientName(id ? (name ?? null) : null);
    if (id) { setSelectedEmployeeId(null); setFilterRole(null); }
    setPanelOpen(false);
  }, []);

  const selectedClientMeta = useMemo(() => {
    if (!selectedClientId || !selectedClientName) return null;
    const parts = selectedClientName.trim().split(/\s+/);
    return {
      id:        selectedClientId,
      firstName: (parts[0] ?? '').toLowerCase(),
      lastName:  parts.slice(1).join(' ').toLowerCase(),
      fullName:  selectedClientName.trim().toLowerCase(),
    };
  }, [selectedClientId, selectedClientName]);

  const tasks: Task[] = useMemo(() => tasksData
    .filter((t) => !overdueOnly || isOverdue(t.deadline))
    .filter((t) => inDateRange(t.acceptanceDate, acceptanceFrom, acceptanceTo))
    .filter((t) => inDateRange(t.deadline, deadlineFrom, deadlineTo))
    .filter((t) => {
      if (!taskSearch.trim()) return true;
      const q = taskSearch.trim().toLowerCase();
      return [t.name, t.taskId, t.client, t.clientLinkName, t.phone]
        .some((v) => (v ?? '').toString().toLowerCase().includes(q));
    })
    .filter((t) => {
      if (selectedClientMeta) {
        const { firstName, lastName, fullName } = selectedClientMeta;
        const linkId =
          (t as unknown as Record<string, unknown>).clientLinkId ??
          (t as unknown as Record<string, unknown>).client_link_id ??
          null;
        if (linkId != null) return Number(linkId) === selectedClientId;
        const textFields = [
          t.clientLinkName ?? '',
          t.client         ?? '',
          t.name           ?? '',
        ].map((s) => s.toLowerCase());
        return textFields.some((txt) =>
          (firstName && txt.includes(firstName)) ||
          (lastName  && txt.includes(lastName))  ||
          (fullName  && txt.includes(fullName))
        );
      }
      if (selectedEmployeeId) {
        if (String(t.assigneeId) === String(selectedEmployeeId)) return true;
        return t.assignees?.some((a) => String(a.userId) === String(selectedEmployeeId)) ?? false;
      }
      if (roleEmployeeIds) {
        if (roleEmployeeIds.size === 0) return false;
        if (roleEmployeeIds.has(String(t.assigneeId))) return true;
        return t.assignees?.some((a) => roleEmployeeIds.has(String(a.userId))) ?? false;
      }
      return true;
    })
    .map((t) => ({
      ...t,
      id:      String(t.id),
      taskId:  t.taskId ?? String(t.id),
      section: (t.section ?? 'archive') as Task['section'],
      status:  (t.statusId !== undefined ? String(t.statusId) : t.status) as Task['status'],
    })),
  [tasksData, selectedClientMeta, selectedClientId, selectedEmployeeId, roleEmployeeIds, overdueOnly, acceptanceFrom, acceptanceTo, deadlineFrom, deadlineTo, taskSearch]);

  return (
    <div className="animate-fade-in absolute inset-0 flex overflow-hidden bg-light md:p-4 md:gap-4">

      {/* Mobile backdrop */}
      {!isEmployee && panelOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setPanelOpen(false)}
        />
      )}

      {/* Left panel — director only */}
      {!isEmployee && <div className={`
        fixed inset-y-0 left-0 z-30 p-4
        md:relative md:inset-auto md:p-0 md:flex md:flex-shrink-0 md:translate-x-0
        transition-transform duration-300 ease-in-out
        ${panelOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <ProjectsListPanel
          assignees={sidebarAssignees}
          selectedEmployeeName={selectedEmployee?.name ?? null}
          onSelectEmployee={handleSelectEmployee}
          selectedRole={filterRole ?? 'Բոլոր'}
          onSelectRole={handleSelectRole}
          selectedClientId={selectedClientId}
          selectedClientName={selectedClientName}
          onSelectClient={handleSelectClient}
          overdueOnly={overdueOnly}
          onToggleOverdue={() => setOverdueOnly((v) => !v)}
          acceptanceFrom={acceptanceFrom}
          acceptanceTo={acceptanceTo}
          onChangeAcceptanceFrom={setAcceptanceFrom}
          onChangeAcceptanceTo={setAcceptanceTo}
          deadlineFrom={deadlineFrom}
          deadlineTo={deadlineTo}
          onChangeDeadlineFrom={setDeadlineFrom}
          onChangeDeadlineTo={setDeadlineTo}
        />
      </div>}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 px-3 md:px-6 py-3 md:py-4 space-y-2">
          <div className="flex items-center gap-3">
            {/* Mobile panel toggle — director only */}
            {!isEmployee && (
              <button
                onClick={() => setPanelOpen(true)}
                className="md:hidden p-2 rounded-xl bg-white border border-crm-border text-gray-500 hover:text-primary transition-colors flex-shrink-0"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
                  <line x1="19" y1="8" x2="23" y2="8"/><line x1="19" y1="12" x2="23" y2="12"/>
                </svg>
              </button>
            )}
            <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="21 8 21 21 3 21 3 8"/>
                <rect x="1" y="3" width="22" height="5" rx="1"/>
                <line x1="10" y1="12" x2="14" y2="12"/>
              </svg>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-dark truncate">Պատվերների Արխիվ</h1>
              <p className="text-xs text-text-muted mt-0.5">
                {isLoading ? '...' : `${tasks.length} պատվեր`}
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={taskSearch}
              onChange={(e) => setTaskSearch(e.target.value)}
              placeholder="Որոնել պատվերի անունով, ID-ով, հաճախորդով..."
              className="w-full pl-10 pr-9 py-2.5 text-sm rounded-xl border border-crm-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {taskSearch && (
              <button
                onClick={() => setTaskSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-dark text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Active filter chips */}
          {(filterRole || selectedEmployee || selectedClientId || overdueOnly ||
            acceptanceFrom || acceptanceTo || deadlineFrom || deadlineTo) && (
            <div className="flex flex-wrap items-center gap-1.5">
              {overdueOnly && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-error/10 text-error text-xs font-semibold rounded-full border border-error/20">
                  Ժամկետանց
                  <button onClick={() => setOverdueOnly(false)} className="hover:opacity-70">✕</button>
                </span>
              )}
              {(acceptanceFrom || acceptanceTo) && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">
                  Ընդունում. {acceptanceFrom || '…'} – {acceptanceTo || '…'}
                  <button onClick={() => { setAcceptanceFrom(''); setAcceptanceTo(''); }} className="hover:opacity-70">✕</button>
                </span>
              )}
              {(deadlineFrom || deadlineTo) && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">
                  Ժամկետ. {deadlineFrom || '…'} – {deadlineTo || '…'}
                  <button onClick={() => { setDeadlineFrom(''); setDeadlineTo(''); }} className="hover:opacity-70">✕</button>
                </span>
              )}
              {filterRole && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">
                  {filterRole}
                  <button onClick={() => setFilterRole(null)} className="hover:opacity-70">✕</button>
                </span>
              )}
              {selectedEmployee && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">
                  {selectedEmployee.name}
                  <button onClick={() => setSelectedEmployeeId(null)} className="hover:opacity-70">✕</button>
                </span>
              )}
              {selectedClientId && (
                <span className="flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">
                  {selectedClientName ?? ''}
                  <button onClick={() => { setSelectedClientId(null); setSelectedClientName(null); }} className="hover:opacity-70">✕</button>
                </span>
              )}
            </div>
          )}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center flex-1 text-text-muted text-sm">
            Բեռնվում է...
          </div>
        ) : tasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 text-text-muted">
            <svg className="w-12 h-12 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="21 8 21 21 3 21 3 8"/>
              <rect x="1" y="3" width="22" height="5" rx="1"/>
              <line x1="10" y1="12" x2="14" y2="12"/>
            </svg>
            <p className="text-sm">
              {taskSearch || selectedEmployee || selectedClientId || filterRole || overdueOnly || acceptanceFrom || acceptanceTo || deadlineFrom || deadlineTo
                ? 'Այս ֆիլտրերով պատվեր չի գտնվել'
                : 'Արխիվով Պատվերներ Չկան'}
            </p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden flex flex-col">
            <TaskList tasks={tasks} />
          </div>
        )}
      </div>

      {openTask && (
        <TaskDetailModal
          task={openTask}
          onClose={() => setOpenTask(null)}
        />
      )}
    </div>
  );
}
