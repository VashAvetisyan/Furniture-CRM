'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { SkEmployeeCard, SkEmployeeRow } from '@/components/ui/Skeleton';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { EmployeeListItem, Level } from './types';
import AddEmployeeModal from './components/AddEmployeeModal';
import { useAuthStore } from '@/stores';
import { employeeService } from '@/services/employee.service';
import { positionService } from '@/services/position.service';

const PAGE_SIZE = 8;

// ── Icons ─────────────────────────────────────────────────────────────────────

function FilterIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function DotsIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

function ChevronLeftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

// ── Delete confirm modal ──────────────────────────────────────────────────────

function DeleteConfirmModal({
  name,
  onConfirm,
  onCancel,
  isPending,
}: {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-crm-border p-6 w-80 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
          <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
            <path d="M10 11v6M14 11v6" />
            <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-dark mb-1">Ջնջե՞լ աշխատողին</p>
          <p className="text-sm text-text-muted">
            Վստա՞հ ես որ ուզում ես ջնջել <span className="font-semibold text-dark">{name}</span>-ին
          </p>
        </div>
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-crm-border text-sm font-medium text-text-muted hover:bg-gray-50 transition-colors"
          >
            Չեղարկել
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {isPending ? 'Ջնջվում է...' : 'Ջնջել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Level badge ───────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: Level }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border border-gray-200 text-gray-500 bg-white">
      {level}
    </span>
  );
}

// ── Employee avatar ───────────────────────────────────────────────────────────

function EmployeeAvatar({
  employee,
  size = 'md',
}: {
  employee: EmployeeListItem;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass = size === 'sm' ? 'w-9 h-9 text-xs' : size === 'lg' ? 'w-16 h-16 text-base' : 'w-11 h-11 text-sm';
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 ring-2 ring-white shadow-sm`}
      style={{ backgroundColor: employee.color }}
    >
      {employee.initials}
    </div>
  );
}

// ── List view row ─────────────────────────────────────────────────────────────

function EmployeeListRow({
  employee,
  positionName,
  isAdmin,
  onDeleteClick,
}: {
  employee: EmployeeListItem;
  positionName: string;
  isAdmin: boolean;
  onDeleteClick: (emp: EmployeeListItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div
      onClick={() => router.push(`/staff/employees/${employee.id}`)}
      className="bg-white rounded-2xl border border-crm-border hover:shadow-md transition-shadow cursor-pointer"
    >

        {/* Mobile card (< md) */}
        <div className="md:hidden px-4 py-3.5 flex items-center gap-3">
          <EmployeeAvatar employee={employee} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-dark truncate">{employee.name}</p>
            <p className="text-xs text-text-muted truncate">{employee.email}</p>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <span className="text-xs text-text-muted">{positionName}</span>
              <LevelBadge level={employee.level} />
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${employee.isActive === false ? 'bg-error' : 'bg-success'}`} />
            </div>
          </div>
          <div className="relative flex-shrink-0" ref={ref} onClick={(e) => e.stopPropagation()}>
            <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-text-muted hover:text-dark" onClick={() => setOpen((o) => !o)}>
              <DotsIcon />
            </button>
            {open && (
              <div className="absolute right-0 top-8 z-20 bg-white border border-crm-border rounded-xl shadow-lg py-1 w-max">
                <Link href={`/staff/employees/${employee.id}`} className="flex items-center gap-2 px-3 py-2 text-sm text-dark hover:bg-gray-50 transition-colors whitespace-nowrap">
                  <svg className="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Տեսնել Պրոֆիլն
                </Link>
                {isAdmin && (
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap" onClick={() => { setOpen(false); onDeleteClick(employee); }}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                      Ջնջել
                    </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Desktop row (md+) */}
        <div className="hidden md:flex items-center gap-4 px-5 py-4">
          <div className="flex items-center gap-3 w-56 flex-shrink-0">
            <EmployeeAvatar employee={employee} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-dark truncate">{employee.name}</p>
              <p className="text-xs text-text-muted truncate">{employee.email}</p>
            </div>
          </div>
          <div className="w-20 flex-shrink-0">
            <p className="text-[10px] text-text-muted mb-0.5">Սեռ</p>
            <p className="text-sm font-medium text-dark">{employee.gender}</p>
          </div>
          <div className="w-32 flex-shrink-0">
            <p className="text-[10px] text-text-muted mb-0.5">Ծննդյան</p>
            <p className="text-sm font-medium text-dark">{employee.birthday}</p>
          </div>
          <div className="w-16 flex-shrink-0">
            <p className="text-[10px] text-text-muted mb-0.5">Տարիք</p>
            <p className="text-sm font-medium text-dark">{employee.fullAge}</p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-text-muted mb-0.5">Պաշտոն</p>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-dark truncate">{positionName}</span>
              <LevelBadge level={employee.level} />
            </div>
          </div>
          <div className="w-8 flex-shrink-0 flex items-center justify-center">
            <span className={`w-3 h-3 rounded-full ${employee.isActive === false ? 'bg-error' : 'bg-success'}`} />
          </div>
          <div className="relative flex-shrink-0" ref={ref} onClick={(e) => e.stopPropagation()}>
            <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-text-muted hover:text-dark" onClick={() => setOpen((o) => !o)}>
              <DotsIcon />
            </button>
            {open && (
              <div className="absolute right-0 top-8 z-20 bg-white border border-crm-border rounded-xl shadow-lg py-1 w-max">
                <Link href={`/staff/employees/${employee.id}`} className="flex items-center gap-2 px-3 py-2 text-sm text-dark hover:bg-gray-50 transition-colors whitespace-nowrap">
                  <svg className="w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Տեսնել Պրոֆիլն
                </Link>
                {isAdmin && (
                    <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors whitespace-nowrap" onClick={() => { setOpen(false); onDeleteClick(employee); }}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>
                      Ջնջել
                    </button>
                )}
              </div>
            )}
          </div>
        </div>

    </div>
  );
}

// ── Activity view card ────────────────────────────────────────────────────────

function EmployeeActivityCard({ employee }: { employee: EmployeeListItem }) {
  const vacationBg = employee.onVacation ? 'bg-amber-50 border-amber-100' : 'bg-white border-crm-border';

  return (
    <Link href={`/staff/employees/${employee.id}`}>
      <div className={`${vacationBg} rounded-2xl border p-5 flex flex-col items-center text-center hover:shadow-md transition-shadow cursor-pointer`}>
        {/* Avatar with optional vacation indicator */}
        <div className="relative mb-3">
          {employee.onVacation && (
            <div className="absolute -top-2 -left-3 text-sm select-none">💤</div>
          )}
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-white ring-4 ring-white shadow-md text-base"
            style={{ backgroundColor: employee.color }}
          >
            {employee.initials}
          </div>
          {employee.onVacation && (
            <div className="absolute -top-2 -right-3 text-sm select-none">💤</div>
          )}
        </div>

        {/* Name + role */}
        <p className="text-sm font-bold text-dark">{employee.name}</p>
        <p className="text-xs text-text-muted mt-0.5 mb-2">{employee.position}</p>
        <LevelBadge level={employee.level} />

        {/* Task stats */}
        <div className="flex items-start justify-center gap-5 mt-4 w-full">
          <div>
            <p className="text-xl font-bold text-dark">{employee.tasks.total}</p>
            <p className="text-[10px] text-text-muted leading-tight">Ընդամենը<br />խնդիրներ</p>
          </div>
          <div>
            <p className="text-xl font-bold text-dark">{employee.tasks.inProgress}</p>
            <p className="text-[10px] text-text-muted leading-tight">Ընթացիկ<br />խնդիրներ</p>
          </div>
          <div>
            <p className="text-xl font-bold text-dark">{employee.tasks.done}</p>
            <p className="text-[10px] text-text-muted leading-tight">Ավարտված<br />խնդիրներ</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Tab toggle ────────────────────────────────────────────────────────────────

type ViewMode = 'list' | 'activity';

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <div className="flex items-center bg-gray-100 rounded-full p-1">
      {(['list', 'activity'] as ViewMode[]).map(v => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
            mode === v
              ? 'bg-primary text-white shadow-sm'
              : 'text-text-muted hover:text-dark'
          }`}
        >
          {v === 'list' ? 'Ցուցակ' : 'Բլոկներ'}
        </button>
      ))}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({
  page,
  total,
  pageSize,
  onPrev,
  onNext,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasNext = to < total;
  const hasPrev = page > 1;

  return (
    <div className="flex items-center justify-end gap-3 mt-4">
      <span className="text-sm text-text-muted">
        {from}–{to} / {total}
      </span>
      <button
        onClick={onPrev}
        disabled={!hasPrev}
        className="p-1.5 rounded-lg border border-crm-border bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-text-muted hover:text-dark"
      >
        <ChevronLeftIcon />
      </button>
      <button
        onClick={onNext}
        disabled={!hasNext}
        className="p-1.5 rounded-lg border border-crm-border bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-text-muted hover:text-dark"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const [view, setView]           = useState<ViewMode>('list');
  const [page, setPage]           = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeListItem | null>(null);

  const isAdmin     = useAuthStore((s) => s.role === 'director');
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['employees'],
    queryFn:  () => employeeService.getAll(),
  });

  const { data: positionsData } = useQuery({
    queryKey: ['positions'],
    queryFn:  () => positionService.getAll(),
  });

  function resolvePosition(pos: string | number): string {
    if (typeof pos === 'string' && isNaN(Number(pos))) return pos;
    const found = positionsData?.results.find((p) => p.id === Number(pos));
    return found?.name ?? String(pos);
  }

  const { mutate: deleteEmployee, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => employeeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeleteTarget(null);
      setPage(1);
    },
  });

  const allEmployees = useMemo(
    () => (data?.data ?? []).slice().sort((a, b) => Number(b.id) - Number(a.id)),
    [data],
  );
  const total     = allEmployees.length;
  const employees = useMemo(
    () => allEmployees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [allEmployees, page],
  );

  return (
    <div className="animate-fade-in">
      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.name}
          onConfirm={() => deleteEmployee(deleteTarget.id)}
          onCancel={() => setDeleteTarget(null)}
          isPending={isDeleting}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center gap-2 mb-5 md:mb-6">
        <h1 className="text-xl md:text-2xl font-bold text-dark flex-1">
          Աշխատողներ {total > 0 && `(${total})`}
        </h1>

        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 md:px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <PlusIcon />
            <span className="hidden sm:inline">Ավելացնել Աշխատող</span>
          </button>
        )}

        <div className="w-full sm:w-auto flex items-center gap-2">
          <ViewToggle mode={view} onChange={v => { setView(v); setPage(1); }} />
          <button className="p-2 rounded-xl border border-crm-border bg-white hover:bg-gray-50 transition-colors text-text-muted hover:text-dark shadow-sm">
            <FilterIcon />
          </button>
        </div>
      </div>

      {/* Content */}
      {isError ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-crm-border text-error text-sm">
          Սխալ — չհաջողվեց բեռնել աշխատակիցներին
        </div>
      ) : isLoading ? (
        view === 'list' ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 6 }).map((_, i) => <SkEmployeeRow key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => <SkEmployeeCard key={i} />)}
          </div>
        )
      ) : view === 'list' ? (
        <div className="flex flex-col gap-3">
          {employees.map(emp => (
            <EmployeeListRow
              key={emp.id}
              employee={emp}
              positionName={resolvePosition(emp.position)}
              isAdmin={isAdmin}
              onDeleteClick={setDeleteTarget}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {employees.map(emp => (
            <EmployeeActivityCard key={emp.id} employee={emp} />
          ))}
        </div>
      )}

      {/* Pagination */}
      <Pagination
        page={page}
        total={total}
        pageSize={PAGE_SIZE}
        onPrev={() => setPage(p => Math.max(1, p - 1))}
        onNext={() => setPage(p => p + 1)}
      />

      {showModal && (
        <AddEmployeeModal
          onClose={() => setShowModal(false)}
          onAdd={() => { queryClient.invalidateQueries({ queryKey: ['employees'] }); setPage(1); }}
        />
      )}
    </div>
  );
}
