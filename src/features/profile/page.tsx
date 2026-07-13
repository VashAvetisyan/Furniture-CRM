'use client';

import { useState, useMemo } from 'react';
import { SkTable } from '@/components/ui/Skeleton';
import { useQuery, useMutation } from '@tanstack/react-query';
import { PencilSquareIcon } from '@/components/icons';
import { useAuthStore } from '@/stores';
import { mediaUrl } from '@/lib/api';
import { authService } from '@/services/auth.service';
import { taskService, type TaskDTO } from '@/services/task.service';

type Tab = 'tasks' | 'salary';

// ── Left-panel helpers ────────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-text-muted mb-1.5">{label}</p>
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-crm-border bg-white">
        <span className="text-sm text-dark">{value || '—'}</span>
      </div>
    </div>
  );
}

function EditableField({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-text-muted mb-1.5">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl border border-primary/50 bg-white text-sm text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
      />
    </div>
  );
}

// ── Confirm modal ─────────────────────────────────────────────────────────────

function ConfirmModal({ onConfirm, onCancel, isPending }: {
  onConfirm: () => void; onCancel: () => void; isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl border border-crm-border p-6 w-full max-w-xs flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
          <PencilSquareIcon className="w-6 h-6 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold text-dark mb-1">Պահե՞լ փոփոխությունները</p>
          <p className="text-sm text-text-muted">Վստա՞հ եք, որ ուզում եք պահել փոփոխությունները</p>
        </div>
        <div className="flex gap-3 w-full">
          <button onClick={onCancel}
            className="flex-1 py-2 rounded-xl border border-crm-border text-sm font-medium text-text-muted hover:bg-gray-50 transition-colors">
            Չեղարկել
          </button>
          <button onClick={onConfirm} disabled={isPending}
            className="flex-1 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60">
            {isPending ? 'Պահպանում...' : 'Պահպանել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Task status / priority badges ─────────────────────────────────────────────

function StatusBadge({ name, color }: { name?: string; color?: string }) {
  const bg  = color ? color + '22' : '#e5e7eb';
  const txt = color ?? '#6b7280';
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{ background: bg, color: txt }}>
      {name || 'Անհայտ'}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: string }) {
  const cfg: Record<string, { bg: string; text: string; label: string }> = {
    High:   { bg: 'bg-red-50',   text: 'text-red-500',   label: 'Բարձր' },
    Medium: { bg: 'bg-amber-50', text: 'text-amber-500', label: 'Միջին' },
    Low:    { bg: 'bg-green-50', text: 'text-green-500', label: 'Ցածր'  },
  };
  const c = cfg[priority] ?? { bg: 'bg-gray-100', text: 'text-gray-500', label: priority };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${c.bg} ${c.text}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {c.label}
    </span>
  );
}

// ── Tasks tab ─────────────────────────────────────────────────────────────────

function TasksTab({ tasks, loading }: { tasks: TaskDTO[]; loading: boolean }) {
  if (loading) return (
    <div className="bg-white rounded-2xl border border-crm-border overflow-hidden p-4"><SkTable rows={5} cols={4} /></div>
  );
  if (tasks.length === 0) return (
    <div className="flex flex-col items-center justify-center h-56 gap-3 bg-white rounded-2xl border border-dashed border-crm-border shadow-sm">
      <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
        <svg className="w-6 h-6 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>
        </svg>
      </div>
      <div className="text-center px-4">
        <p className="text-sm font-semibold text-dark">Պատվերներ Չկա</p>
        <p className="text-xs text-text-muted mt-0.5">Ձեր Պատվերներն Այստեղ կլինեն</p>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-2">
      {tasks.map((t) => (
        <div key={t.taskId ?? t.id}
          className="bg-white rounded-2xl border border-crm-border shadow-sm px-4 py-3 hover:shadow-md transition-shadow">
          {/* Main row */}
          <div className="flex items-center gap-3">
            <div className="w-1 h-10 rounded-full flex-shrink-0" style={{ background: t.statusColor ?? '#e5e7eb' }} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-dark truncate">{t.name}</p>
              {t.client && <p className="text-xs text-text-muted truncate mt-0.5">{t.client}</p>}
            </div>
            {/* Badges — visible on all sizes */}
            <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-2 flex-shrink-0">
              <StatusBadge name={t.statusName} color={t.statusColor} />
              <PriorityBadge priority={t.priority} />
            </div>
            {/* Deadline — desktop only */}
            <div className="text-right flex-shrink-0 hidden md:block">
              <p className="text-[10px] text-text-muted">Ժամկետ</p>
              <p className="text-xs font-semibold text-dark mt-0.5">
                {t.deadline ? new Date(t.deadline).toLocaleDateString('hy-AM') : '—'}
              </p>
            </div>
          </div>
          {/* Deadline row — mobile only */}
          {t.deadline && (
            <div className="md:hidden flex items-center gap-1 mt-2 ml-4">
              <p className="text-[10px] text-text-muted">Ժամկետ:</p>
              <p className="text-xs font-semibold text-dark">
                {new Date(t.deadline).toLocaleDateString('hy-AM')}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Salary tab ────────────────────────────────────────────────────────────────

function SalaryTab({ tasks, userId, loading }: { tasks: TaskDTO[]; userId: string; loading: boolean }) {
  const rows = useMemo(() => {
    const uid = Number(userId);
    return tasks.flatMap((t) => {
      const me = t.assignees?.find((a) => a.userId === uid);
      if (!me) return [];
      return [{ taskId: t.taskId ?? t.id ?? '', taskName: t.name, salaryAmount: me.salaryAmount, isPaid: me.isPaid, paidAt: me.paidAt, totalPaid: me.totalPaid }];
    });
  }, [tasks, userId]);

  const totalSalary = rows.reduce((s, r) => s + Number(r.salaryAmount || 0), 0);
  const totalPaid   = rows.reduce((s, r) => s + Number(r.totalPaid   || 0), 0);
  const remaining   = totalSalary - totalPaid;

  if (loading) return <div className="bg-white rounded-2xl border border-crm-border overflow-hidden p-4"><SkTable rows={5} cols={4} /></div>;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        {[
          { label: 'Ընդհամանուր', value: totalSalary, colorBg: 'bg-primary/8', colorText: 'text-primary',  icon: '💰' },
          { label: 'Վարձվել',     value: totalPaid,   colorBg: 'bg-green-50',  colorText: 'text-success',  icon: '✅' },
          { label: 'Մնացել',      value: remaining,   colorBg: 'bg-amber-50',  colorText: 'text-warning',  icon: '⏳' },
        ].map((c) => (
          <div key={c.label} className={`${c.colorBg} rounded-2xl border border-crm-border p-3 sm:p-4 shadow-sm`}>
            <p className="text-base sm:text-xl mb-1">{c.icon}</p>
            <p className={`text-base sm:text-2xl font-bold leading-tight ${c.colorText}`}>
              {c.value.toLocaleString('hy-AM')} ֏
            </p>
            <p className="text-[10px] sm:text-xs text-text-muted mt-0.5 truncate">{c.label}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-40 gap-3 bg-white rounded-2xl border border-dashed border-crm-border shadow-sm">
          <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
          </svg>
          <p className="text-sm text-text-muted">Աշխատավարձի տեղեկություն Չկա</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((r) => (
            <div key={r.taskId} className="bg-white rounded-2xl border border-crm-border shadow-sm px-4 py-3 flex items-center gap-3 hover:shadow-md transition-shadow">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${r.isPaid ? 'bg-success/10' : 'bg-warning/10'}`}>
                {r.isPaid
                  ? <svg className="w-4 h-4 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  : <svg className="w-4 h-4 text-warning" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-dark truncate">{r.taskName}</p>
                {r.paidAt && <p className="text-xs text-text-muted mt-0.5">{new Date(r.paidAt).toLocaleDateString('hy-AM')}</p>}
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-dark">{Number(r.salaryAmount || 0).toLocaleString('hy-AM')} ֏</p>
                <p className="text-xs text-success font-semibold mt-0.5">+{Number(r.totalPaid || 0).toLocaleString('hy-AM')} ֏</p>
              </div>
              <span className={`hidden sm:inline-flex px-2.5 py-1 rounded-full text-[11px] font-semibold flex-shrink-0 ${r.isPaid ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                {r.isPaid ? 'Վարձվել' : 'Սպասում'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}

export default function ProfilePage() {
  const [activeTab,   setActiveTab]   = useState<Tab>('tasks');
  const [isEditing,   setIsEditing]   = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { user, role, setUser } = useAuthStore();

  const [form, setForm] = useState({
    firstName: user?.name?.split(' ')[0] ?? '',
    lastName:  user?.name?.split(' ').slice(1).join(' ') ?? '',
    position:  user?.position ?? '',
    phone:     user?.phone ?? '',
    email:     user?.email ?? '',
  });

  const initials  = (user?.name || '?').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = role === 'director' ? 'Ղեկավար' : 'Աշխատող';
  const avatarUrl = mediaUrl(user?.avatar);

  const { data: tasksResponse, isLoading } = useQuery({
    queryKey: ['tasks', 'my'],
    queryFn:  taskService.getMyTasks,
  });
  const tasks = tasksResponse?.results ?? [];

  const { mutate: save, isPending, isError } = useMutation({
    mutationFn: () => authService.updateProfile(user!.id, {
      first_name: form.firstName, last_name: form.lastName,
      position: form.position, phone: form.phone, email: form.email,
    }),
    onSuccess: (updated) => {
      const displayName = `${updated.first_name} ${updated.last_name}`.trim() || updated.username;
      setUser({ ...user!, name: displayName, position: updated.position_name ?? String(updated.position ?? ''), phone: updated.phone, email: updated.email }, role!);
      setShowConfirm(false);
      setIsEditing(false);
    },
  });

  function startEdit() {
    setForm({
      firstName: user?.name?.split(' ')[0] ?? '',
      lastName:  user?.name?.split(' ').slice(1).join(' ') ?? '',
      position:  user?.position ?? '',
      phone:     user?.phone ?? '',
      email:     user?.email ?? '',
    });
    setIsEditing(true);
  }

  const TAB_LABELS: Record<Tab, string> = {
    tasks:  'Իմ Ապրանքներ',
    salary: 'Աշխատավարձ',
  };

  return (
    <div className="animate-fade-in">
      {showConfirm && (
        <ConfirmModal
          onConfirm={() => save()}
          onCancel={() => setShowConfirm(false)}
          isPending={isPending}
        />
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl sm:text-2xl font-bold text-dark">Իմ Պրոֆիլ</h1>
        <button className="p-2 rounded-xl hover:bg-white hover:shadow-sm border border-transparent hover:border-crm-border transition-all text-text-muted hover:text-dark">
          <GearIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Two-column on lg+, stacked on mobile */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">

        {/* ── Left panel ── */}
        <div className="w-full lg:w-72 lg:flex-shrink-0">
          <div className="bg-white rounded-2xl border border-crm-border p-5 shadow-sm">

            {/* Edit / Save / Cancel */}
            <div className="flex justify-end mb-2 gap-2">
              {isEditing ? (
                <>
                  <button onClick={() => setIsEditing(false)}
                    className="px-3 py-1 text-xs rounded-lg border border-crm-border text-text-muted hover:bg-gray-50 transition-colors">
                    Չեղարկել
                  </button>
                  <button onClick={() => setShowConfirm(true)}
                    className="px-3 py-1 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors">
                    Պահպանել
                  </button>
                </>
              ) : (
                <button onClick={startEdit}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-text-muted hover:text-dark">
                  <PencilSquareIcon className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Avatar — centred on mobile, centred on desktop */}
            <div className="flex flex-col items-center text-center mb-5">
              {avatarUrl ? (
                <img src={avatarUrl} alt={user!.name}
                  className="w-20 h-20 rounded-full object-cover ring-4 ring-blue-50 mb-3 shadow-md" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center text-white text-2xl font-bold ring-4 ring-blue-50 mb-3 shadow-md">
                  {initials}
                </div>
              )}
              <h2 className="text-base font-bold text-dark">{user?.name || '—'}</h2>
              <p className="text-xs text-text-muted mt-0.5">{user?.position || roleLabel}</p>
            </div>

            <div className="h-px bg-crm-border mb-4" />

            {/* Main info */}
            <div className="space-y-3 mb-4">
              <h3 className="text-sm font-semibold text-dark">Արաջին Տեղեկուտյուն</h3>
              {isEditing ? (
                <>
                  <EditableField label="Անուն"    value={form.firstName} onChange={(v) => setForm((f) => ({ ...f, firstName: v }))} />
                  <EditableField label="Ազգանուն" value={form.lastName}  onChange={(v) => setForm((f) => ({ ...f, lastName: v }))}  />
                  <EditableField label="Պաշտոն"   value={form.position}  onChange={(v) => setForm((f) => ({ ...f, position: v }))}  />
                </>
              ) : (
                <>
                  <InfoField label="Պաշտոն"   value={user?.position || ''} />
                  <InfoField label="Կենտրոն"   value={user?.company  || ''} />
                  <InfoField label="Օգտանուն"  value={user?.username || ''} />
                </>
              )}
            </div>

            <div className="h-px bg-crm-border mb-4" />

            {/* Contact info */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-dark">Կապախց Տեղեկուտյուն</h3>
              {isEditing ? (
                <>
                  <EditableField label="Email"         value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
                  <EditableField label="Բջանակաղորդ"  value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
                </>
              ) : (
                <>
                  <InfoField label="Email"         value={user?.email || ''} />
                  <InfoField label="Բջանակաղորդ"  value={user?.phone || ''} />
                </>
              )}
            </div>

            {isError && (
              <p className="mt-3 text-xs text-red-500 text-center">Պահպանելյ չի հաջողվաց</p>
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 min-w-0 w-full">
          {/* Tab bar */}
          <div className="flex items-center mb-4">
            <div className="flex items-center gap-1 bg-white border border-crm-border rounded-full p-1 shadow-sm">
              {(Object.keys(TAB_LABELS) as Tab[]).map((tab) => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab ? 'bg-primary text-white shadow-sm' : 'text-text-muted hover:text-dark'
                  }`}>
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'tasks'  && <TasksTab  tasks={tasks} loading={isLoading} />}
          {activeTab === 'salary' && <SalaryTab tasks={tasks} userId={user?.id ?? ''} loading={isLoading} />}
        </div>
      </div>
    </div>
  );
}
