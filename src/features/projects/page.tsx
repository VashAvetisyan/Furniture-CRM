'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PlusIcon, ListViewIcon, BoardViewIcon, TimelineViewIcon } from '@/components/icons';
import { employeeService } from '@/services/employee.service';
import { positionService } from '@/services/position.service';
import { taskService, type TaskListResponse } from '@/services/task.service';
import { clientService } from '@/services/client.service';
import { useAuthStore } from '@/stores';
import TaskBoard from './components/TaskBoard';
import TaskList from './components/TaskList';
import TaskTimeline from './components/TaskTimeline';
import ProjectsListPanel from './components/ProjectsListPanel';
import AddTaskModal from './components/AddTaskModal';
import type { Task } from './types';

export default function TasksPage() {
  const { role } = useAuthStore();
  const isAdmin    = role === 'director';
  const isEmployee = role === 'employee';

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [filterRole, setFilterRole]                 = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId]     = useState<number | null>(null);
  const [viewMode, setViewMode]                     = useState<'board' | 'list' | 'timeline'>('board');
  const [addTaskOpen, setAddTaskOpen]               = useState(false);
  const [panelOpen, setPanelOpen]                   = useState(false);

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn:  () => employeeService.getAll(),
  });

  const { data: positionsData } = useQuery({
    queryKey: ['positions'],
    queryFn:  () => positionService.getAll(),
  });

  const { data: clientsData = [] } = useQuery({
    queryKey: ['clients'],
    queryFn:  clientService.getAll,
    staleTime: 60_000,
  });

  const { data: tasksResponse, refetch: refetchTasks, isLoading: tasksLoading } = useQuery<TaskListResponse>({
    queryKey: isEmployee ? ['tasks', 'my'] : ['tasks', 'all'],
    queryFn:  isEmployee ? taskService.getMyTasks : taskService.getAll,
  });
  const tasksData = tasksResponse?.results ?? [];

  function resolvePosition(pos: string | number): string {
    if (typeof pos === 'number') {
      return positionsData?.results.find((p) => p.id === pos)?.name ?? String(pos);
    }
    return pos;
  }

  const employees = employeesData?.data ?? [];

  const panelClients = clientsData.map((c) => ({
    id:    c.id,
    name:  `${c.first_name} ${c.last_name}`.trim(),
    phone: c.phone || undefined,
  }));

  const sidebarAssignees = employees.map((emp) => ({
    id:       emp.id,
    name:     emp.name,
    color:    emp.color,
    initials: emp.initials,
    role:     resolvePosition(emp.position),
  }));

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);
  const selectedClient   = panelClients.find((c) => c.id === selectedClientId);

  const roleEmployeeIds = filterRole
    ? new Set(sidebarAssignees.filter((a) => a.role === filterRole).map((a) => String(a.id)).filter(Boolean))
    : null;

  const boardTasks: Task[] = tasksData
    .filter((t) => t.section === 'active')
    .filter((t) => {
      if (selectedClientId) {
        const sel = clientsData.find((c) => c.id === selectedClientId);
        if (!sel) return false;
        const linkId =
          (t as unknown as Record<string, unknown>).clientLinkId ??
          (t as unknown as Record<string, unknown>).client_link_id ??
          null;
        if (linkId != null) return Number(linkId) === selectedClientId;
        const firstName  = sel.first_name.trim().toLowerCase();
        const lastName   = (sel.last_name ?? '').trim().toLowerCase();
        const fullName   = [firstName, lastName].filter(Boolean).join(' ');
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
      section: (t.section ?? 'active') as Task['section'],
      status:  (t.statusId !== undefined ? String(t.statusId) : t.status) as Task['status'],
    }));

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
          onSelectEmployee={(name) => {
            if (!name) { setSelectedEmployeeId(null); setPanelOpen(false); return; }
            const emp = employees.find((e) => e.name === name);
            setSelectedEmployeeId(emp?.id ?? null);
            setSelectedClientId(null);
            setPanelOpen(false);
          }}
          selectedRole={filterRole ?? 'Բոլոր'}
          onSelectRole={(r) => {
            setFilterRole(r === 'Բոլոր' ? null : r);
            setSelectedEmployeeId(null);
          }}
          clients={panelClients}
          selectedClientId={selectedClientId}
          onSelectClient={(id) => {
            setSelectedClientId(id);
            if (id) {
              setSelectedEmployeeId(null);
              setFilterRole(null);
            }
            setPanelOpen(false);
          }}
        />
      </div>}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 px-3 md:px-6 py-3 md:py-4 flex-shrink-0">

          {/* Mobile panel toggle — director only */}
          {!isEmployee && (
            <button
              onClick={() => setPanelOpen(true)}
              className="md:hidden p-2 rounded-xl bg-white border border-crm-border text-gray-500 hover:text-primary transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/>
                <line x1="19" y1="8" x2="23" y2="8"/><line x1="19" y1="12" x2="23" y2="12"/>
              </svg>
            </button>
          )}

          <h1 className="text-xl md:text-2xl font-bold text-dark">Պատվերներ</h1>

          {/* Active filter chips */}
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
          {selectedClient && (
            <span className="flex items-center gap-1 px-2.5 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full border border-primary/20">
              {selectedClient.name}
              <button onClick={() => setSelectedClientId(null)} className="hover:opacity-70">✕</button>
            </span>
          )}
          {tasksLoading && <span className="text-xs text-text-muted">Բեռնվում...</span>}

          <div className="flex-1" />

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1 border border-crm-border">
            <button onClick={() => setViewMode('board')} className={`p-1.5 md:p-2 rounded-lg transition-all ${viewMode === 'board' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              <BoardViewIcon className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} className={`p-1.5 md:p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              <ListViewIcon className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('timeline')} className={`p-1.5 md:p-2 rounded-lg transition-all ${viewMode === 'timeline' ? 'bg-white text-primary shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
              <TimelineViewIcon className="w-4 h-4" />
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => setAddTaskOpen(true)}
              className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
            >
              <PlusIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Ավելացնել Պատվեր</span>
            </button>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {viewMode === 'board'    && <TaskBoard    tasks={boardTasks} />}
          {viewMode === 'list'     && <TaskList     tasks={boardTasks} />}
          {viewMode === 'timeline' && (
            <div className="flex-1 overflow-auto px-3 md:px-6 pt-4 pb-4">
              <TaskTimeline tasks={boardTasks} />
            </div>
          )}
        </div>
      </div>

      {addTaskOpen && (
        <AddTaskModal
          assignees={sidebarAssignees}
          onClose={() => setAddTaskOpen(false)}
          onCreated={() => refetchTasks()}
        />
      )}
    </div>
  );
}
