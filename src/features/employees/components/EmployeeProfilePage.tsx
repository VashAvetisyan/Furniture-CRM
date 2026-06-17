'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Level } from '../types';
import { employeeService, type EmployeeDTO } from '@/services/employee.service';
import { positionService } from '@/services/position.service';
import { taskService, type TaskDTO } from '@/services/task.service';
import { useAuthStore } from '@/stores';

// ── Icons ─────────────────────────────────────────────────────────────────────

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M5 12l7 7M5 12l7-7" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  );
}

// ── Level badge ───────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: Level }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border border-gray-200 text-gray-500 bg-white">
      {level}
    </span>
  );
}

// ── Field components ──────────────────────────────────────────────────────────

function InfoField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-text-muted mb-1.5">{label}</p>
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-crm-border bg-white">
        <span className="text-sm text-dark">{value}</span>
        {icon && <span className="text-gray-400 flex-shrink-0">{icon}</span>}
      </div>
    </div>
  );
}

function EditableField({ label, value, onChange, type = 'text' }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-text-muted mb-1.5">{label}</p>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-primary/50 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />
    </div>
  );
}

function EditableSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <p className="text-xs font-medium text-text-muted mb-1.5">{label}</p>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-primary/50 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

// ── Reset password modal ──────────────────────────────────────────────────────

function ResetPasswordModal({ onClose, onSubmit, isPending, error }: {
  onClose:   () => void;
  onSubmit:  (password: string) => void;
  isPending: boolean;
  error:     string | null;
}) {
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [showPass,  setShowPass]  = useState(false);

  const mismatch = confirm.length > 0 && password !== confirm;
  const valid    = password.length >= 8 && !mismatch;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-crm-border p-6 w-80 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-dark">Փոխել գաղտնաբառը</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 text-text-muted transition-colors">✕</button>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-xs font-medium text-text-muted mb-1.5">Նոր գաղտնաբառ</p>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Նվազագույն 8 նիշ"
                className="w-full px-3 py-2.5 pr-10 rounded-xl border border-crm-border bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-dark transition-colors"
              >
                {showPass ? (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-text-muted mb-1.5">Հաստատել գաղտնաբառը</p>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Կրկնեք գաղտնաբառը"
              className={`w-full px-3 py-2.5 rounded-xl border bg-white text-sm text-dark focus:outline-none focus:ring-2 transition-all ${
                mismatch
                  ? 'border-red-400 focus:ring-red-200 focus:border-red-400'
                  : 'border-crm-border focus:ring-primary/20 focus:border-primary'
              }`}
            />
            {mismatch && <p className="text-xs text-red-500 mt-1">Գաղտնաբառերը չեն համընկնում</p>}
          </div>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl border border-crm-border text-sm font-medium text-text-muted hover:bg-gray-50 transition-colors"
          >
            Չեղարկել
          </button>
          <button
            onClick={() => valid && onSubmit(password)}
            disabled={!valid || isPending}
            className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Պահպանում...' : 'Պահպանել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ onConfirm, onCancel, isPending }: {
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-crm-border p-6 w-80 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <PencilIcon />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-dark mb-1">Պահե՞լ փոփոխությունները</p>
          <p className="text-sm text-text-muted">Վստա՞հ ես որ ուզում ես պահել</p>
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
            className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          >
            {isPending ? 'Պահպանում...' : 'Պահպանել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status / Priority labels ──────────────────────────────────────────────────

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  todo:        { label: 'Սկսած չէ',     cls: 'bg-gray-100 text-gray-500'  },
  in_progress: { label: 'Ընթացքում', cls: 'bg-blue-50 text-blue-600'   },
  in_review:   { label: 'Ստուգման մեջ',   cls: 'bg-warning/10 text-warning' },
  done:        { label: 'Ավարտված',      cls: 'bg-success/10 text-success' },
};

const PRIORITY_LABELS: Record<string, { label: string; cls: string }> = {
  High:   { label: 'Բարձր', cls: 'text-error'   },
  Medium: { label: 'Միջին',  cls: 'text-warning'  },
  Low:    { label: 'Ցածր',  cls: 'text-success'  },
};

function TaskCard({ task }: { task: TaskDTO }) {
  const priority = PRIORITY_LABELS[task.priority] ?? { label: task.priority, cls: 'text-gray-500' };

  const statusLabel = task.statusName ?? STATUS_LABELS[task.status]?.label ?? task.status;
  const statusColor = task.statusColor;

  const rawClient  = task.clientLinkName ?? task.client ?? '';
  const clientName = rawClient && isNaN(Number(rawClient)) ? rawClient : null;

  return (
    <div className="bg-white rounded-2xl border border-crm-border p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-text-muted font-mono mb-0.5">{task.taskId ?? task.id}</p>
          <p className="text-sm font-semibold text-dark leading-snug truncate">{task.name}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={`text-xs font-semibold ${priority.cls}`}>{priority.label}</span>
          {statusColor ? (
            <span
              className="px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
              style={{ backgroundColor: statusColor }}
            >
              {statusLabel}
            </span>
          ) : (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_LABELS[task.status]?.cls ?? 'bg-gray-100 text-gray-500'}`}>
              {statusLabel}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-text-muted flex-wrap">
        {clientName && (
          <div className="flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span className="font-medium text-dark">{clientName}</span>
          </div>
        )}
        {task.deadline && (
          <div className="flex items-center gap-1">
            <CalendarIcon />
            <span>{task.deadline}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Salary tab ────────────────────────────────────────────────────────────────

function SalaryTab({ tasks, employeeId }: { tasks: TaskDTO[]; employeeId: string }) {
  const queryClient = useQueryClient();
  const [openId,    setOpenId]    = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payNote,   setPayNote]   = useState('');
  const [payDate,   setPayDate]   = useState('');

  const { mutate: recordPay, isPending: recording } = useMutation({
    mutationFn: ({ taskId, userId, amount, note, paidAt }: { taskId: string; userId: number; amount: string; note: string; paidAt: string }) =>
      taskService.recordPayment(taskId, userId, { amount, note: note || undefined, paidAt: paidAt || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', employeeId] });
      setOpenId(null);
      setPayNote('');
      setPayDate('');
    },
  });

  const { mutate: removePay } = useMutation({
    mutationFn: ({ taskId, userId, paymentId }: { taskId: string; userId: number; paymentId: number }) =>
      taskService.deletePayment(taskId, userId, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', employeeId] });
    },
  });

  function getAssignee(t: TaskDTO) {
    return t.assignees?.find((a) => String(a.userId) === String(employeeId));
  }

  function getSalary(t: TaskDTO): number {
    const raw = getAssignee(t)?.salaryAmount || t.assigneePayment || '0';
    const v = parseFloat(String(raw).replace(/[^\d.]/g, ''));
    return isNaN(v) ? 0 : v;
  }

  function getTotalPaid(t: TaskDTO): number {
    const assignee = getAssignee(t);
    // Sum from payments[] array (most accurate), fall back to backend totalPaid field
    const fromPayments = assignee?.payments?.reduce(
      (sum, p) => sum + (parseFloat(p.amount) || 0), 0
    ) ?? 0;
    if (fromPayments > 0) return fromPayments;
    return parseFloat(String(assignee?.totalPaid ?? '0').replace(/[^\d.]/g, '')) || 0;
  }

  function isPaid(t: TaskDTO): boolean {
    const salary = getSalary(t);
    const paid   = getTotalPaid(t);
    if (salary > 0 && paid >= salary) return true;
    return getAssignee(t)?.isPaid ?? false;
  }

  function openPayForm(t: TaskDTO) {
    const salary    = getSalary(t);
    const paid      = getTotalPaid(t);
    const remaining = Math.max(0, salary - paid);
    setPayAmount(String(remaining > 0 ? remaining : salary));
    setPayNote('');
    setPayDate(new Date().toISOString().slice(0, 16));
    setOpenId(t.id ?? null);
  }

  function submitPay(t: TaskDTO) {
    const assignee = getAssignee(t);
    if (!assignee || !t.id) return;
    recordPay({ taskId: t.id, userId: assignee.userId, amount: payAmount, note: payNote, paidAt: payDate });
  }

  const tasksWithSalary = tasks.filter((t) => getSalary(t) > 0);
  const total        = tasksWithSalary.reduce((s, t) => s + getSalary(t), 0);
  // Sum of what's actually been paid across ALL tasks (including partial)
  const totalPaid    = tasksWithSalary.reduce((s, t) => s + getTotalPaid(t), 0);
  // Sum of remaining balances across all tasks
  const totalUnpaid  = tasksWithSalary.reduce((s, t) => s + Math.max(0, getSalary(t) - getTotalPaid(t)), 0);
  // Task counts for badges
  const paidCount    = tasksWithSalary.filter((t) => isPaid(t)).length;
  const partialCount = tasksWithSalary.filter((t) => !isPaid(t) && getTotalPaid(t) > 0).length;
  const unpaidCount  = tasksWithSalary.filter((t) => getTotalPaid(t) === 0).length;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-crm-border p-4 shadow-sm">
          <p className="text-xs text-text-muted mb-1">Ընդհանուր</p>
          <p className="text-2xl font-bold text-dark">{total.toLocaleString('hy-AM')} ֏</p>
          <p className="text-xs text-text-muted mt-1">{tasksWithSalary.length} պատվերներ</p>
        </div>
        <div className="bg-white rounded-2xl border border-crm-border p-4 shadow-sm">
          <p className="text-xs text-text-muted mb-1">Վճարված</p>
          <p className="text-2xl font-bold text-success">{totalPaid.toLocaleString('hy-AM')} ֏</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <p className="text-xs text-text-muted">{paidCount} ամբողջական</p>
            {partialCount > 0 && (
              <p className="text-xs text-warning font-medium">{partialCount} մասնակի</p>
            )}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-crm-border p-4 shadow-sm">
          <p className="text-xs text-text-muted mb-1">Չվճարված</p>
          <p className="text-2xl font-bold text-warning">{totalUnpaid.toLocaleString('hy-AM')} ֏</p>
          <p className="text-xs text-text-muted mt-1">{unpaidCount} պատվերներ</p>
        </div>
      </div>

      {/* Task list */}

      {tasksWithSalary.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 bg-white rounded-2xl border border-crm-border gap-3 shadow-sm">
          <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
        </div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="md:hidden flex flex-col gap-3">
            {tasksWithSalary.map((t) => {
              const status = STATUS_LABELS[t.status] ?? { label: String(t.status), cls: 'bg-gray-100 text-gray-500' };
              const taskPaid  = isPaid(t);
              const isOpen    = openId === t.id;
              const salary    = getSalary(t);
              const totalPaidForTask = getTotalPaid(t);
              const isPartial = totalPaidForTask > 0 && !taskPaid;
              const assignee  = getAssignee(t);
              const payments  = assignee?.payments ?? [];
              return (
                <div key={t.id} className="bg-white rounded-2xl border border-crm-border shadow-sm overflow-hidden">
                  <div className="p-4 flex flex-col gap-2">
                    {/* Task name + ID */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] text-text-muted font-mono">{t.taskId ?? t.id}</p>
                        <p className="text-sm font-semibold text-dark leading-snug">{t.name}</p>
                        {(() => {
                          const raw = t.clientLinkName ?? t.client ?? '';
                          const name = raw && isNaN(Number(raw)) ? raw : null;
                          return name ? (
                            <p className="text-[11px] text-text-muted mt-0.5 flex items-center gap-1">
                              <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                              </svg>
                              {name}
                            </p>
                          ) : null;
                        })()}
                      </div>
                      {t.statusColor ? (
                        <span className="flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold text-white" style={{ backgroundColor: t.statusColor }}>
                          {t.statusName ?? status.label}
                        </span>
                      ) : (
                        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[11px] font-semibold ${status.cls}`}>{t.statusName ?? status.label}</span>
                      )}
                    </div>
                    {/* Amounts */}
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <div className="text-center">
                        <p className="text-[10px] text-text-muted">Աշխատավարխներ</p>
                        <p className="text-sm font-bold text-dark">{salary.toLocaleString('hy-AM')} ֏</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-text-muted">Վչարված</p>
                        <p className="text-sm font-bold text-success">{totalPaidForTask.toLocaleString('hy-AM')} ֏</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] text-text-muted">Մնացord</p>
                        <p className={`text-sm font-bold ${taskPaid ? 'text-success' : 'text-warning'}`}>
                          {Math.max(0, salary - totalPaidForTask).toLocaleString('hy-AM')} ֏
                        </p>
                      </div>
                    </div>
                    {/* Pay button */}
                    <div className="flex justify-end mt-1">
                      {taskPaid ? (
                        <button onClick={() => openPayForm(t)} className="px-3 py-1 text-xs font-medium rounded-full bg-success/10 text-success">Վչարված ✓</button>
                      ) : (
                        <button
                          onClick={() => (isOpen ? setOpenId(null) : openPayForm(t))}
                          className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${isOpen ? 'bg-primary text-white border-primary' : isPartial ? 'border-warning text-warning' : 'border-crm-border text-text-muted hover:border-primary hover:text-primary'}`}
                        >
                          {isPartial ? 'Մասնակի' : 'Վչարել'}
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Payment history + inline form */}
                  {(payments.length > 0 || isOpen) && (
                    <div className="border-t border-crm-border/40 bg-gray-50/50">
                      {payments.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 px-4 py-1.5 text-xs text-text-muted border-b border-crm-border/20 last:border-b-0">
                          <span className="font-semibold text-success">{parseFloat(p.amount).toLocaleString('hy-AM')} ֏</span>
                          <span className="flex-1 truncate">{p.note || '--'}</span>
                          <span className="flex-shrink-0">{p.paidAt ? new Date(p.paidAt).toLocaleDateString('hy-AM') : '--'}</span>
                          <button onClick={() => assignee && t.id && removePay({ taskId: t.id, userId: assignee.userId, paymentId: p.id })} className="text-text-muted hover:text-error transition-colors p-0.5 rounded flex-shrink-0"><TrashIcon /></button>
                        </div>
                      ))}
                      {isOpen && (
                        <div className="flex flex-col gap-2 p-4 bg-primary/5 border-t border-primary/10">
                          <div className="flex gap-2">
                            <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-crm-border outline-none focus:border-primary bg-white" placeholder="0 ֏" />
                            <input type="text" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Nishum..." className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-crm-border outline-none focus:border-primary bg-white" />
                          </div>
                          <div className="flex gap-2">
                            <input type="datetime-local" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-crm-border outline-none focus:border-primary bg-white" />
                            <button onClick={() => submitPay(t)} disabled={recording || !payAmount || Number(payAmount) <= 0} className="px-3 py-1.5 bg-success text-white text-xs font-semibold rounded-lg disabled:opacity-50">{recording ? '...' : 'Վչարել'}</button>
                            <button onClick={() => setOpenId(null)} className="px-2 py-1.5 border border-crm-border text-text-muted rounded-lg text-xs">✕</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {/* Footer */}
            <div className="bg-white rounded-2xl border border-crm-border p-4 flex items-center justify-between">
              <span className="text-xs font-bold text-text-muted">Ենդհանուր</span>
              <span className="text-sm font-bold text-primary">{total.toLocaleString('hy-AM')} ֏</span>
            </div>
          </div>

          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-2xl border border-crm-border shadow-sm overflow-hidden">
            <div className="grid grid-cols-[1fr_110px_90px_110px_130px] gap-3 px-5 py-3 bg-gray-50 border-b border-crm-border">
              <span className="text-xs font-semibold text-text-muted">Պatvrnerr</span>
              <span className="text-xs font-semibold text-text-muted">Վerdjnazhamket</span>
              <span className="text-xs font-semibold text-text-muted">Կatus</span>
              <span className="text-xs font-semibold text-text-muted text-right">Աշխատավարխներ</span>
              <span className="text-xs font-semibold text-text-muted text-center">Վչարել</span>
            </div>
            {tasksWithSalary.map((t) => {
              const status   = STATUS_LABELS[t.status] ?? { label: String(t.status), cls: 'bg-gray-100 text-gray-500' };
              const taskPaid = isPaid(t);
              const isOpen   = openId === t.id;
              const salary   = getSalary(t);
              const totalPaidForTask = getTotalPaid(t);
              const assignee = getAssignee(t);
              const payments = assignee?.payments ?? [];
              const isPartial = totalPaidForTask > 0 && !taskPaid;
              return (
                <div key={t.id} className="border-b border-crm-border last:border-b-0">
                  <div className="grid grid-cols-[1fr_110px_90px_110px_130px] gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors items-center">
                    <div className="min-w-0">
                      <p className="text-xs text-text-muted font-mono">{t.taskId ?? t.id}</p>
                      <p className="text-sm font-semibold text-dark truncate mt-0.5">{t.name}</p>
                    </div>
                    <p className="text-xs text-text-muted">{t.deadline ?? '--'}</p>
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${status.cls}`}>{status.label}</span>
                    <div className="flex flex-col items-end gap-0.5">
                      <p className={`text-sm font-bold ${taskPaid ? 'text-success' : isPartial ? 'text-warning' : 'text-dark'}`}>{salary.toLocaleString('hy-AM')} ֏</p>
                      {isPartial && <p className="text-[10px] text-warning font-medium">{totalPaidForTask.toLocaleString('hy-AM')} ֏ վչարված</p>}
                      {taskPaid && <span className="text-[10px] text-success font-semibold">Վչարված ✓</span>}
                    </div>
                    <div className="flex justify-center">
                      {taskPaid ? (
                        <button onClick={() => openPayForm(t)} className="px-3 py-1 text-xs font-medium rounded-full bg-success/10 text-success hover:bg-success/20 transition-colors whitespace-nowrap">Վչարված ✓</button>
                      ) : (
                        <button onClick={() => (isOpen ? setOpenId(null) : openPayForm(t))} className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors whitespace-nowrap ${isOpen ? 'bg-primary text-white border-primary' : isPartial ? 'border-warning text-warning hover:bg-warning/10' : 'border-crm-border text-text-muted hover:border-primary hover:text-primary'}`}>
                          {isPartial ? 'Մասնակի' : 'Վչարել'}
                        </button>
                      )}
                    </div>
                  </div>
                  {(payments.length > 0 || isOpen) && (
                    <div className="border-t border-crm-border/40">
                      {payments.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 px-5 py-1.5 text-xs text-text-muted bg-gray-50/50 border-b border-crm-border/20 last:border-b-0">
                          <span className="font-semibold text-success w-28 text-right flex-shrink-0">{parseFloat(p.amount).toLocaleString('hy-AM')} ֏</span>
                          <span className="flex-1 truncate">{p.note || '--'}</span>
                          <span className="flex-shrink-0">{p.paidAt ? new Date(p.paidAt).toLocaleDateString('hy-AM') : '--'}</span>
                          <button onClick={() => assignee && t.id && removePay({ taskId: t.id, userId: assignee.userId, paymentId: p.id })} className="text-text-muted hover:text-error transition-colors p-0.5 rounded flex-shrink-0"><TrashIcon /></button>
                        </div>
                      ))}
                      {isOpen && (
                        <div className="flex items-center gap-2 px-5 py-2 bg-primary/5 border-t border-primary/10">
                          <input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="w-28 px-2 py-1.5 text-sm rounded-lg border border-crm-border outline-none focus:border-primary bg-white" placeholder="0" />
                          <span className="text-xs text-text-muted">֏</span>
                          <input type="text" value={payNote} onChange={(e) => setPayNote(e.target.value)} placeholder="Nishum..." className="flex-1 min-w-0 px-2 py-1.5 text-sm rounded-lg border border-crm-border outline-none focus:border-primary bg-white" />
                          <input type="datetime-local" value={payDate} onChange={(e) => setPayDate(e.target.value)} className="px-2 py-1.5 text-sm rounded-lg border border-crm-border outline-none focus:border-primary bg-white flex-shrink-0" />
                          <button onClick={() => submitPay(t)} disabled={recording || !payAmount || Number(payAmount) <= 0} className="px-3 py-1.5 bg-success text-white text-xs font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 flex-shrink-0">{recording ? '...' : 'Վչարել'}</button>
                          <button onClick={() => setOpenId(null)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-crm-border text-text-muted hover:text-error text-xs flex-shrink-0">✕</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="grid grid-cols-[1fr_110px_90px_110px_130px] gap-3 px-5 py-3 bg-gray-50 border-t border-crm-border">
              <span className="text-xs font-bold text-dark">Ենդհանուր</span>
              <span /><span />
              <span className="text-sm font-bold text-primary text-right">{total.toLocaleString('hy-AM')} ֏</span>
              <span />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Tab = 'tasks' | 'salary';

const TAB_LABELS: Record<Tab, string> = {
  tasks:  'Պատվերներ',
  salary: 'Աշխատավարձներ',
};



export default function EmployeeProfilePage({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const initialTab   = (searchParams.get('tab') as Tab | null);
  const [activeTab, setActiveTab] = useState<Tab>(
    initialTab && (initialTab in TAB_LABELS) ? initialTab : 'tasks',
  );
  const [isEditing, setIsEditing]         = useState(false);
  const [showConfirm, setShowConfirm]     = useState(false);
  const [showResetPwd, setShowResetPwd]   = useState(false);
  const [resetPwdError, setResetPwdError] = useState<string | null>(null);
  const [form, setForm] = useState({
    position: '',
    birthday: '',
    gender:   'Male' as 'Male' | 'Female',
    level:    'Junior' as Level,
    email:    '',
    phone:    '',
  });

  const role        = useAuthStore((s) => s.role);
  const queryClient = useQueryClient();

  const { data: employee, isLoading, isError } = useQuery({
    queryKey: ['employee', id],
    queryFn:  () => employeeService.getById(id),
  });

  const { data: positionsData } = useQuery({
    queryKey: ['positions'],
    queryFn:  () => positionService.getAll(),
  });

  const { data: tasksResponse } = useQuery({
    queryKey: ['tasks', id],
    queryFn:  () => taskService.getByAssignee(id),
  });
  const tasks = tasksResponse?.results ?? [];

  function resolvePosition(pos: string | number): string {
    if (typeof pos === 'string' && isNaN(Number(pos))) return pos;
    const found = positionsData?.results.find((p) => p.id === Number(pos));
    return found?.name ?? String(pos);
  }

  const { mutate: toggleActive, isPending: isToggling } = useMutation({
    mutationFn: (active: boolean) => employeeService.setActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employee', id] }),
  });

  const { mutate: resetPassword, isPending: isResettingPwd } = useMutation({
    mutationFn: (password: string) => employeeService.setPassword(id, password),
    onSuccess: () => {
      setShowResetPwd(false);
      setResetPwdError(null);
    },
    onError: () => setResetPwdError('Չհաջողվեց փոխել գաղտնաբառը'),
  });

  const { mutate: save, isPending, isError: isSaveError } = useMutation({
    mutationFn: () =>
      employeeService.update(id, {
        position: Number(form.position) || (form.position as unknown as number),
        birthday: form.birthday,
        gender:   form.gender,
        level:    form.level,
        email:    form.email,
        phone:    form.phone,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employee', id] });
      setShowConfirm(false);
      setIsEditing(false);
    },
  });

  function startEdit() {
    if (!employee) return;
    setForm({
      position: resolvePosition(employee.position),
      birthday: employee.birthday,
      gender:   employee.gender,
      level:    employee.level,
      email:    employee.email,
      phone:    employee.phone ?? '',
    });
    setIsEditing(true);
  }

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-text-muted text-sm">
      Բեռնվում է...
    </div>
  );

  if (isError || !employee) return (
    <div className="flex items-center justify-center h-64 text-error text-sm">
      Սխալ. Կրկին փորձեք
    </div>
  );

  return (
    <div className="animate-fade-in">
      {showConfirm && (
        <ConfirmModal
          onConfirm={() => save()}
          onCancel={() => setShowConfirm(false)}
          isPending={isPending}
        />
      )}

      {showResetPwd && (
        <ResetPasswordModal
          onClose={() => { setShowResetPwd(false); setResetPwdError(null); }}
          onSubmit={(pwd) => resetPassword(pwd)}
          isPending={isResettingPwd}
          error={resetPwdError}
        />
      )}

      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/employees"
          className="p-2 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-crm-border transition-all text-text-muted hover:text-dark"
        >
          <ArrowLeftIcon />
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-dark">Աշխատողի պրոֆիլ</h1>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:gap-5 items-start">
        {/* Left panel */}
        <div className="w-full md:w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-crm-border p-5 shadow-sm">
            {/* Edit / Save / Cancel — director only */}
            {role === 'director' && (
              <div className="flex justify-end mb-2 gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 text-xs rounded-lg border border-crm-border text-text-muted hover:bg-gray-50 transition-colors"
                    >
                      Չեղարկել
                    </button>
                    <button
                      onClick={() => setShowConfirm(true)}
                      className="px-3 py-1 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
                    >
                      Պահպանել
                    </button>
                  </>
                ) : (
                  <button
                    onClick={startEdit}
                    className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-text-muted hover:text-dark"
                  >
                    <PencilIcon />
                  </button>
                )}
              </div>
            )}

            {/* Avatar */}
            <div className="flex flex-col items-center text-center mb-5">
              <div
                className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-white text-xl font-bold ring-4 ring-blue-50 mb-3 shadow-md"
                style={{ backgroundColor: employee.color }}
              >
                {employee.initials}
              </div>
              <h2 className="text-base font-bold text-dark">{employee.name}</h2>
              <p className="text-xs text-text-muted mt-0.5">{resolvePosition(employee.position)}</p>
              <div className="mt-2">
                <LevelBadge level={employee.level} />
              </div>
            </div>

            <div className="h-px bg-crm-border mb-4" />

            {/* Main info */}
            <div className="space-y-3 mb-4">
              <h3 className="text-sm font-semibold text-dark">Main info</h3>
              {isEditing ? (
                <>
                  <EditableField
                    label="Position"
                    value={form.position}
                    onChange={(v) => setForm((f) => ({ ...f, position: v }))}
                  />
                  <EditableField
                    label="Birthday Date"
                    value={form.birthday}
                    type="date"
                    onChange={(v) => setForm((f) => ({ ...f, birthday: v }))}
                  />
                  <EditableSelect
                    label="Gender"
                    value={form.gender}
                    onChange={(v) => setForm((f) => ({ ...f, gender: v as 'Male' | 'Female' }))}
                    options={[
                      { value: 'Male',   label: 'Male' },
                      { value: 'Female', label: 'Female' },
                    ]}
                  />
                  <EditableSelect
                    label="Level"
                    value={form.level}
                    onChange={(v) => setForm((f) => ({ ...f, level: v as Level }))}
                    options={[
                      { value: 'Junior', label: 'Junior' },
                      { value: 'Middle', label: 'Middle' },
                      { value: 'Senior', label: 'Senior' },
                    ]}
                  />
                </>
              ) : (
                <>
                  <InfoField label="Position"      value={resolvePosition(employee.position)} />
                  <InfoField label="Birthday Date" value={employee.birthday} icon={<CalendarIcon />} />
                  <InfoField label="Full Age"      value={String(employee.fullAge)} />
                  <InfoField label="Gender"        value={employee.gender} />
                </>
              )}
            </div>

            <div className="h-px bg-crm-border mb-4" />

            {/* Contact info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-dark">Contact Info</h3>
              {isEditing ? (
                <>
                  <EditableField
                    label="Email"
                    value={form.email}
                    onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                  />
                  <EditableField
                    label="Mobile Number"
                    value={form.phone}
                    onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                  />
                </>
              ) : (
                <>
                  <InfoField label="Email"         value={employee.email} />
                  <InfoField label="Mobile Number" value={employee.phone ?? '—'} />
                </>
              )}
            </div>

            {isSaveError && (
              <p className="mt-3 text-xs text-red-500 text-center">
                Failed to save. Try again.
              </p>
            )}

            {role === 'director' && !isEditing && (
              <>
                <div className="h-px bg-crm-border my-4" />
                <button
                  onClick={() => { setResetPwdError(null); setShowResetPwd(true); }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-crm-border text-sm font-medium text-text-muted hover:bg-gray-50 hover:text-dark transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                  Փոխել գաղտնաբառը
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0 w-full">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1 bg-white border border-crm-border rounded-full p-1 shadow-sm overflow-x-auto max-w-full">
              {(Object.keys(TAB_LABELS) as Tab[]).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                    activeTab === tab
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-dark'
                  }`}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {/* Active / Inactive toggle — director only */}
            {role === 'director' && (
              <button
                onClick={() => toggleActive(!(employee.isActive ?? true))}
                disabled={isToggling}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition-all disabled:opacity-60 ${
                  (employee.isActive ?? true)
                    ? 'bg-success/10 text-success border-success/30 hover:bg-success/20'
                    : 'bg-error/10 text-error border-error/30 hover:bg-error/20'
                }`}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${(employee.isActive ?? true) ? 'bg-success' : 'bg-error'}`} />
                {isToggling ? '...' : (employee.isActive ?? true) ? 'Ակտիվ' : 'Պասիվ'}
              </button>
            )}
          </div>

          {activeTab === 'tasks' && (
            <div className="flex flex-col gap-3">
              {tasks.length === 0 ? (
                <div className="flex items-center justify-center h-48 bg-white rounded-2xl border border-crm-border text-text-muted text-sm shadow-sm">
                  Պատվերներ սկսած չէ
                </div>
              ) : (
                tasks.map((task) => <TaskCard key={task.taskId ?? task.id} task={task} />)
              )}
            </div>
          )}
          {activeTab === 'salary' && (
            <SalaryTab tasks={tasks} employeeId={id} />
          )}
        </div>
      </div>
    </div>
  );
}
