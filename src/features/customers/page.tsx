'use client';
import { SkTable } from '@/components/ui/Skeleton';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '@/services/client.service';
import type { ClientDTO, SourceDTO, CreateClientRequest } from '@/services/client.service';
import { taskService } from '@/services/task.service';
import type { TaskDTO } from '@/services/task.service';
import TaskDetailModal from '@/features/projects/components/TaskDetailModal';
import type { Task } from '@/features/projects/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function taskDtoToTask(t: TaskDTO): Task {
  return {
    id:               t.id ?? t.taskId,
    taskId:           t.taskId,
    name:             t.name,
    description:      t.description,
    estimate:         t.estimate,
    spentTime:        t.spentTime,
    loggedTime:       t.loggedTime,
    status:           t.status,
    section:          t.section,
    priority:         t.priority,
    assigneeId:       t.assigneeId,
    assigneeColor:    t.assigneeColor,
    assigneeInitials: t.assigneeInitials,
    assigneeName:     t.assigneeName,
    assignees:        t.assignees,
    reporterName:     t.reporterName,
    deadline:         t.deadline,
    client:           t.client,
    phone:            t.phone,
    acceptanceDate:   t.acceptanceDate,
    deliveryAddress:  t.deliveryAddress,
    model:            t.model,
    dimensions:       t.dimensions,
    fabricType:       t.fabricType,
    fabricTypeId:     t.fabricTypeId,
    softness:         t.softness,
    softnessId:       t.softnessId,
    notes:            t.notes,
    price:            t.price,
    totalPaid:        t.totalPaid,
    balanceDue:       t.balanceDue,
    payments:         t.payments as Task['payments'],
    advancePayment:   t.advancePayment,
    finalPayment:     t.finalPayment,
    delivery:          t.delivery ?? null,
    deliveryConfirmed: t.deliveryConfirmed ?? false,
  };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('hy-AM', { day: '2-digit', month: 'short', year: 'numeric' });
}

const inputCls =
  'w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-dark bg-white placeholder:text-text-muted/50';

function Field({ label, optional, children }: {
  label: string; optional?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-text-muted mb-1.5 flex items-center gap-1.5">
        {label}
        {optional && <span className="text-[10px] font-normal text-text-muted/60">(կամընտիր)</span>}
      </label>
      {children}
    </div>
  );
}

// ── Source badge ──────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: SourceDTO | null | undefined }) {
  if (!source) return <span className="text-text-muted text-xs">—</span>;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
      {source.name}
    </span>
  );
}

// ── Call History Modal ────────────────────────────────────────────────────────

function CallHistoryModal({ client, onClose, onBack }: {
  client:   ClientDTO;
  onClose:  () => void;
  onBack?:  () => void;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const calls = useMemo(
    () => [...(client.calls ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [client.calls],
  );

  const { mutate: addCall, isPending } = useMutation({
    mutationFn: (data: { note: string; date: string }) =>
      clientService.addCall(client.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setNote('');
      setDate(new Date().toISOString().slice(0, 10));
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] mx-4 max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-crm-border flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-dark hover:bg-gray-100 transition-colors"
                title="Հet"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
                </svg>
              </button>
            )}
            <div className="min-w-0">
              <p className="text-sm font-bold text-dark">Զանգերի Պատմություն</p>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                {client.first_name} {client.last_name}
                {client.phone && <span className="ml-1">· {client.phone}</span>}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 text-text-muted hover:text-dark transition-colors p-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Add new call */}
        <div className="px-5 py-4 border-b border-crm-border flex-shrink-0 bg-gray-50/60">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-3">Ավելացնել զանգ</p>
          <div className="flex gap-2 mb-2">
            <div className="flex-shrink-0">
              <label className="text-xs font-medium text-dark block mb-1">Ամսաթիվ</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-dark block mb-1">Նկարագրություն</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !isPending && addCall({ note: note.trim(), date })}
                placeholder="Զանգի մանրամասներ..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              />
            </div>
          </div>
          <button
            onClick={() => addCall({ note: note.trim(), date })}
            disabled={!date || isPending}
            className="w-full py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40"
          >
            {isPending ? 'Ավելացնում...' : 'Ավելացնել'}
          </button>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 gap-2 text-center">
              <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.9 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.75a16 16 0 006.16 6.16l1.21-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              <p className="text-sm text-text-muted">Զանգերի պատմություն չկա</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {calls.map((entry, i) => (
                <div key={entry.id} className="flex gap-3 items-start">
                  <div className="flex flex-col items-center flex-shrink-0 mt-1">
                    <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                    {i < calls.length - 1 && <div className="w-px flex-1 bg-crm-border mt-1 min-h-[16px]" />}
                  </div>
                  <div className="flex-1 pb-2">
                    <p className="text-[11px] font-semibold text-text-muted">{fmtDate(entry.date)}</p>
                    {entry.note ? (
                      <p className="text-sm text-dark mt-0.5">{entry.note}</p>
                    ) : (
                      <p className="text-sm text-text-muted italic mt-0.5">Նկարագրություն չկա</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Customer Modal (add / edit) ───────────────────────────────────────────────

function CustomerModal({ initial, sources, onClose }: {
  initial?: ClientDTO;
  sources:  SourceDTO[];
  onClose:  () => void;
}) {
  const queryClient = useQueryClient();

  const [clientType,   setClientType]   = useState<'individual' | 'legal'>(initial?.client_type ?? 'individual');
  const [firstName,    setFirstName]    = useState(initial?.first_name    ?? '');
  const [lastName,     setLastName]     = useState(initial?.last_name     ?? '');
  const [companyName,  setCompanyName]  = useState(initial?.company_name  ?? '');
  const [phone,        setPhone]        = useState(initial?.phone         ?? '');
  const [phoneAlt,     setPhoneAlt]     = useState(initial?.phone_alt     ?? '');
  const [email,        setEmail]        = useState(initial?.email         ?? '');
  const [address,      setAddress]      = useState(initial?.address       ?? '');
  const [notes,        setNotes]        = useState(initial?.notes         ?? '');
  const [nextCallDate, setNextCallDate] = useState(initial?.next_call_date?.slice(0, 10) ?? '');
  const [sourceId,     setSourceId]     = useState<number | null>(initial?.source?.id ?? null);
  const [addingSource, setAddingSource] = useState(false);
  const [newSource,    setNewSource]    = useState('');

  const { mutate: createSource, isPending: creatingSource } = useMutation({
    mutationFn: (name: string) => clientService.createSource(name),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['client-sources'] });
      setSourceId(created.id);
      setNewSource('');
      setAddingSource(false);
    },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateClientRequest) =>
      initial
        ? clientService.update(initial.id, data)
        : clientService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onClose();
    },
  });

  function submit() {
    if (!firstName.trim() || !phone.trim()) return;
    mutate({
      client_type:    clientType,
      first_name:     firstName.trim(),
      last_name:      lastName.trim()     || undefined,
      company_name:   companyName.trim()  || undefined,
      phone:          phone.trim(),
      phone_alt:      phoneAlt.trim()     || undefined,
      email:          email.trim()        || undefined,
      address:        address.trim()      || undefined,
      notes:          notes.trim()        || undefined,
      next_call_date: nextCallDate        || null,
      source:         sourceId,
    });
  }

  const valid = firstName.trim() && phone.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border flex-shrink-0">
          <h2 className="text-base font-bold text-dark">
            {initial ? 'Խմբагրел' : 'Նоr hачаxоrd'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-dark transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">

          {/* Client type */}
          <Field label="Տipі" optional>
            <div className="flex rounded-xl overflow-hidden border border-crm-border">
              {(['individual', 'legal'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setClientType(t)}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-r border-crm-border last:border-r-0 ${clientType === t ? 'bg-primary text-white' : 'bg-white text-text-muted hover:bg-gray-50'}`}
                >
                  {t === 'individual' ? 'Ֆիզիկական' : 'Իравабанакан'}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Անун *">
              <input className={inputCls} placeholder="Անун..." value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field label="Азгануn" optional>
              <input className={inputCls} placeholder="Азгануn..." value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
          </div>

          {clientType === 'legal' && (
            <Field label="Ynkerутян анун" optional>
              <input className={inputCls} placeholder="LLC / ՍՊԸ..." value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
            </Field>
          )}

          <Field label="Heřaxosaamar *">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.69A2 2 0 012 .9h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.75a16 16 0 006.16 6.16l1.21-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              <input className={`${inputCls} pl-9`} placeholder="+374 __ ______" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
            </div>
          </Field>

          <Field label="Lracucich heřaxos" optional>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.69A2 2 0 012 .9h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.75a16 16 0 006.16 6.16l1.21-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              <input className={`${inputCls} pl-9`} placeholder="+374 __ ______" value={phoneAlt} onChange={(e) => setPhoneAlt(e.target.value)} type="tel" />
            </div>
          </Field>

          <Field label="Email" optional>
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
              <input className={`${inputCls} pl-9`} placeholder="example@mail.com" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            </div>
          </Field>

          <Field label="Hascе" optional>
            <input className={inputCls} placeholder="Qałak, połoc..." value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>

          <Field label="Nshumer" optional>
            <textarea
              className={`${inputCls} resize-none`}
              rows={3}
              placeholder="Nshumer hachaxordi masin..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </Field>

          <Field label="Hajord zangi amsativ" optional>
            <input type="date" className={inputCls} value={nextCallDate} onChange={(e) => setNextCallDate(e.target.value)} />
          </Field>

          <Field label="Ałbyur" optional>
            <div className="flex flex-wrap gap-2 items-center">
              {sources.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSourceId(sourceId === s.id ? null : s.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    sourceId === s.id
                      ? 'bg-primary/10 text-primary border-primary/30 ring-2 ring-primary/20 ring-offset-1'
                      : 'bg-white text-text-muted border-crm-border hover:bg-gray-50'
                  }`}
                >
                  {s.name}
                </button>
              ))}
              {addingSource ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={newSource}
                    onChange={(e) => setNewSource(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newSource.trim()) createSource(newSource.trim());
                      if (e.key === 'Escape') { setAddingSource(false); setNewSource(''); }
                    }}
                    placeholder="Anunn..."
                    disabled={creatingSource}
                    className="w-24 px-2 py-1 text-xs rounded-lg border border-primary outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
                  />
                  <button type="button" onClick={() => newSource.trim() && createSource(newSource.trim())} disabled={!newSource.trim() || creatingSource} className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white text-xs hover:bg-primary-hover disabled:opacity-40 transition-colors">✓</button>
                  <button type="button" onClick={() => { setAddingSource(false); setNewSource(''); }} className="w-6 h-6 flex items-center justify-center rounded-full border border-crm-border text-text-muted hover:border-error hover:text-error text-xs transition-colors">✕</button>
                </div>
              ) : (
                <button type="button" onClick={() => setAddingSource(true)} className="w-7 h-7 flex items-center justify-center rounded-full border-2 border-dashed border-crm-border text-text-muted hover:border-primary hover:text-primary transition-colors text-base font-light" title="Ավելացնել Աղբյուր">+</button>
              )}
            </div>
          </Field>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-crm-border justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50 transition-colors">
            Чеłarkеl
          </button>
          <button
            onClick={submit}
            disabled={!valid || isPending}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40"
          >
            {isPending ? 'Պահպանում...' : initial ? 'Պահպանել' : 'Ավելացնել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Customer Tasks Modal ──────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  todo:        'Սկսած չէ',
  in_progress: 'Ընթացքում',
  in_review:   'Ստուգման մեջ',
  done:        'Ավարտված',
};
const STATUS_CLS: Record<string, string> = {
  todo:        'bg-gray-100 text-gray-500',
  in_progress: 'bg-blue-100 text-blue-600',
  in_review:   'bg-pink-100 text-pink-600',
  done:        'bg-green-100 text-green-600',
};

function CustomerTasksModal({ client, onClose, onBack }: {
  client:  ClientDTO;
  onClose: () => void;
  onBack?: () => void;
}) {
  const [openTask, setOpenTask] = useState<Task | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn:  () => taskService.getAll(),
  });

  const fullName = `${client.first_name} ${client.last_name}`.trim().toLowerCase();

  const tasks = useMemo(() => {
    const all = data?.results ?? [];
    return all.filter((t) =>
      String(t.client) === String(client.id) ||
      (client.phone && t.phone && t.phone === client.phone) ||
      (t.client ?? '').trim().toLowerCase() === fullName,
    );
  }, [data, client.id, client.phone, fullName]);

  const activeCount = tasks.filter((t) => t.status !== 'done').length;

  return (
    <>
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[600px] flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {onBack && (
              <button
                onClick={onBack}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-text-muted hover:text-dark hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/>
                </svg>
              </button>
            )}
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">
                {client.first_name.charAt(0)}{client.last_name.charAt(0)}
              </span>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-dark truncate">{client.first_name} {client.last_name}</h2>
              <p className="text-xs text-text-muted">{client.phone}</p>
            </div>
            {activeCount > 0 && (
              <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-primary text-white text-xs font-bold flex-shrink-0">
                {activeCount} ակտիվ
              </span>
            )}
          </div>
          <button onClick={onClose} className="flex-shrink-0 text-text-muted hover:text-dark transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-text-muted text-sm">Բեռնում է...</div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <p className="text-sm text-text-muted">Այս հաճախորդի պատվերով task չկա</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {tasks.map((t) => {
                const assigneeName = t.assignees?.[0]?.name || t.assigneeName;
                return (
                  <div
                    key={t.id}
                    onClick={() => setOpenTask(taskDtoToTask(t))}
                    className={`rounded-xl border border-crm-border p-4 cursor-pointer hover:border-primary/40 hover:shadow-sm transition-all ${t.status === 'done' ? 'opacity-60' : ''}`}
                  >
                    {/* Title + status */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-mono text-text-muted mb-0.5">{t.taskId}</p>
                        <p className="text-sm font-semibold text-dark leading-snug">{t.name}</p>
                      </div>
                      <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLS[t.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {STATUS_LABEL[t.status] ?? t.status}
                      </span>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest w-20 flex-shrink-0">Կատարող</span>
                        <span className="text-xs text-dark font-medium truncate">{assigneeName || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest w-20 flex-shrink-0">Մոդել</span>
                        <span className="text-xs text-dark font-medium truncate">
                          {t.model ? (t.dimensions ? `${t.model} · ${t.dimensions}` : t.model) : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest w-20 flex-shrink-0">Արժեք</span>
                        <span className={`text-xs font-semibold ${t.price ? 'text-success' : 'text-text-muted'}`}>
                          {t.price || '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest w-20 flex-shrink-0">Վերջնաժամ</span>
                        <span className={`text-xs font-medium ${t.deadline ? 'text-error' : 'text-text-muted'}`}>
                          {t.deadline
                            ? new Date(t.deadline).toLocaleDateString('hy-AM', { day: '2-digit', month: 'short', year: 'numeric' })
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-crm-border flex-shrink-0 flex justify-between items-center">
          <p className="text-xs text-text-muted">{tasks.length} Ենդանուր Պատվերներ</p>
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50 transition-colors">
            Փակել
          </button>
        </div>
      </div>
    </div>

    {openTask && (
      <TaskDetailModal
        task={openTask}
        onClose={() => setOpenTask(null)}
      />
    )}
    </>
  );
}

// ── Delete confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ name, onCancel, onConfirm, isPending }: {
  name: string; onCancel: () => void; onConfirm: () => void; isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-80 flex flex-col gap-4">
        <div>
          <p className="text-base font-semibold text-dark">Ջնջե՞լ հաճախորդը</p>
          <p className="text-sm text-text-muted mt-1">
            «<span className="font-medium text-dark">{name}</span>» հաճախորդը կջնջվի ծրագրից։
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium rounded-lg border border-crm-border text-dark hover:bg-light transition-colors">
            Չեղարկել
          </button>
          <button onClick={onConfirm} disabled={isPending} className="px-4 py-2 text-sm font-medium rounded-lg bg-error text-white hover:bg-error/90 transition-colors disabled:opacity-60">
            {isPending ? 'Ջնջում...' : 'Ջնջել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Customer View Modal ───────────────────────────────────────────────────────

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 px-3 bg-gray-50 rounded-xl border border-gray-100">
      <span className="flex-shrink-0 mt-0.5 text-text-muted">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">{label}</p>
        <div className="text-sm text-dark">{children}</div>
      </div>
    </div>
  );
}

function CustomerViewModal({ client, sources, onClose, onEdit, onViewTasks, onViewCalls, onDelete }: {
  client:      ClientDTO;
  sources:     SourceDTO[];
  onClose:     () => void;
  onEdit:      () => void;
  onViewTasks: () => void;
  onViewCalls: () => void;
  onDelete:    () => void;
}) {
  const initials = `${client.first_name.charAt(0)}${(client.last_name ?? '').charAt(0)}`.toUpperCase();
  const fullName = [client.first_name, client.last_name].filter(Boolean).join(' ');

  const phoneIcon = (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.69A2 2 0 012 .9h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.75a16 16 0 006.16 6.16l1.21-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
    </svg>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-xl font-bold text-primary">{initials}</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-dark">{fullName}</h2>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${client.client_type === 'legal' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                  {client.client_type === 'legal' ? 'Իրավաբանական' : 'Ֆիզիկական'}
                </span>
                {client.source && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    {client.source.name}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-text-muted hover:text-dark hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Scrollable info */}
        <div className="px-6 pb-5 flex flex-col gap-2 overflow-y-auto flex-1">

          <InfoRow label="Հեռախոսահամար" icon={phoneIcon}>
            <a href={`tel:${client.phone}`} className="font-semibold text-primary hover:underline">{client.phone}</a>
          </InfoRow>

          {client.phone_alt && (
            <InfoRow label="Լրացուցիչ հեռախոս" icon={phoneIcon}>
              <a href={`tel:${client.phone_alt}`} className="text-primary hover:underline">{client.phone_alt}</a>
            </InfoRow>
          )}

          {client.email && (
            <InfoRow label="Email" icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
              </svg>
            }>
              <a href={`mailto:${client.email}`} className="text-primary hover:underline break-all">{client.email}</a>
            </InfoRow>
          )}

          {client.company_name && (
            <InfoRow label="Ընկերության անուն" icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            }>
              {client.company_name}
            </InfoRow>
          )}

          {client.address && (
            <InfoRow label="Հասցե" icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            }>
              {client.address}
            </InfoRow>
          )}

          {client.id_document && (
            <InfoRow label="Passport series" icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            }>
              {client.id_document}
            </InfoRow>
          )}

          {client.description && (
            <InfoRow label="Նկարագրություն" icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            }>
              <span className="whitespace-pre-wrap text-text-muted">{client.description}</span>
            </InfoRow>
          )}

          {client.notes && (
            <InfoRow label="Նշումներ" icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
            }>
              <span className="whitespace-pre-wrap text-text-muted">{client.notes}</span>
            </InfoRow>
          )}

          {client.next_call_date && (
            <InfoRow label="Հաջորդ զանգ" icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
            }>
              <span className="font-medium text-warning">{fmtDate(client.next_call_date)}</span>
            </InfoRow>
          )}

          {client.last_called_at && (
            <InfoRow label="Վերջին զանգ" icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            }>
              {fmtDate(client.last_called_at)}
            </InfoRow>
          )}

          <InfoRow label="Ավելացվել է" icon={
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
          }>
            <span className="text-text-muted">{fmtDate(client.created_at)}</span>
          </InfoRow>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2.5 mt-1">
            <button onClick={onViewCalls} className="flex items-center gap-2.5 py-3 px-4 rounded-xl border border-crm-border hover:border-success/40 hover:bg-success/5 transition-all text-left">
              <svg className="w-5 h-5 text-success flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.69A2 2 0 012 .9h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.75a16 16 0 006.16 6.16l1.21-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              <div>
                <p className="text-xs font-bold text-success">{client.calls?.length ?? 0}</p>
                <p className="text-[11px] text-text-muted">Զանգեր</p>
              </div>
            </button>
            <button onClick={onViewTasks} className="flex items-center gap-2.5 py-3 px-4 rounded-xl border border-crm-border hover:border-primary/40 hover:bg-primary/5 transition-all text-left">
              <svg className="w-5 h-5 text-primary flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
              <div>
                <p className="text-xs font-bold text-primary">Պատվերներ</p>
                <p className="text-[11px] text-text-muted">Տեսնել</p>
              </div>
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-crm-border flex-shrink-0">
          <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-error hover:bg-error/10 rounded-xl transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
            </svg>
            Ջնջել
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-xl border border-crm-border text-dark hover:bg-gray-50 transition-colors">Փակել</button>
            <button onClick={onEdit} className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Խմբագրել
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
// ── Page ──────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const queryClient = useQueryClient();

  const [addOpen,       setAddOpen]       = useState(false);
  const [viewItem,      setViewItem]       = useState<ClientDTO | null>(null);
  const [editItem,      setEditItem]       = useState<ClientDTO | null>(null);
  const [deleteItem,    setDeleteItem]     = useState<ClientDTO | null>(null);
  const [viewTasksItem, setViewTasksItem]  = useState<ClientDTO | null>(null);
  const [viewCallsItem, setViewCallsItem]  = useState<ClientDTO | null>(null);
  const [search,        setSearch]         = useState('');

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn:  clientService.getAll,
  });

  const { data: sources = [] } = useQuery({
    queryKey: ['client-sources'],
    queryFn:  clientService.getSources,
  });

  const { mutate: deleteClient, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) => clientService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setDeleteItem(null);
    },
  });

  const filtered = useMemo(() => {
    const list = search.trim()
      ? clients.filter((c) => {
          const q = search.toLowerCase();
          return (
            `${c.first_name} ${c.last_name}`.toLowerCase().includes(q) ||
            c.phone.includes(q) ||
            c.email.toLowerCase().includes(q)
          );
        })
      : [...clients];
    return list.sort((a, b) => b.id - a.id);
  }, [clients, search]);

  const totalCalls = clients.reduce((s, c) => s + (c.calls?.length ?? 0), 0);

  return (
    <div className="animate-fade-in absolute inset-0 flex flex-col p-4 overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-4 md:mb-5 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-dark">Հաճախորդներ</h1>
          <p className="text-xs text-text-muted mt-0.5">{clients.length} հաճախորդ</p>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          <span className="hidden sm:inline">Ավելացնել Հաճախորդ</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5 flex-shrink-0">
        <div className="bg-white rounded-2xl border border-crm-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
            </svg>
          </div>
          <div>
            <p className="text-xs text-text-muted">Ընդհանուր</p>
            <p className="text-xl font-bold text-primary">{clients.length}</p>
            <p className="text-xs text-text-muted mt-0.5">հաճախորդ</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-crm-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5"/><path d="M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
            </svg>
          </div>
          <div>
            <p className="text-xs text-text-muted">Աղբյուրներ</p>
            <p className="text-xl font-bold text-pink-500">{sources.length}</p>
            <p className="text-xs text-text-muted mt-0.5">տեսակ</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-crm-border p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.69A2 2 0 012 .9h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.75a16 16 0 006.16 6.16l1.21-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
            </svg>
          </div>
          <div>
            <p className="text-xs text-text-muted">Զանգեր</p>
            <p className="text-xl font-bold text-success">{totalCalls}</p>
            <p className="text-xs text-text-muted mt-0.5">ընդհանուր զանգ</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 flex-shrink-0">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Որոնել անունով, հեռախոսով, email-ով..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-crm-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* List */}
      <div className="flex-shrink-0">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-crm-border overflow-hidden p-4"><SkTable rows={6} cols={5} /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 bg-white rounded-2xl border border-dashed border-crm-border">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <svg className="w-7 h-7 text-primary/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
              </svg>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-dark">{search ? 'Հածախորդներ չկա' : 'Դëрр Հածախորդներ չկա'}</p>
              {!search && <p className="text-xs text-text-muted mt-1">Սկսբելու համար կաթլիկ կատարել</p>}
            </div>
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="md:hidden flex flex-col gap-3">
              {filtered.map((c) => (
                <div key={c.id} onClick={() => setViewItem(c)} className="bg-white rounded-2xl border border-crm-border p-4 flex flex-col gap-3 cursor-pointer hover:border-primary/30 hover:shadow-sm transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{c.first_name.charAt(0).toUpperCase()}{c.last_name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-dark truncate">{c.first_name} {c.last_name}</p>
                      {c.phone && <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className="text-xs text-primary font-medium hover:underline">{c.phone}</a>}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); setEditItem(c); }} className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteItem(c); }} className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {c.source && <SourceBadge source={c.source} />}
                    <button onClick={(e) => { e.stopPropagation(); setViewCallsItem(c); }} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${(c.calls?.length ?? 0) > 0 ? 'bg-success/10 text-success' : 'bg-gray-100 text-text-muted'}`}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.69A2 2 0 012 .9h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.75a16 16 0 006.16 6.16l1.21-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                      {(c.calls?.length ?? 0) > 0 ? c.calls.length : '0'} 
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setViewTasksItem(c); }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">Պատվերներ</button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl border border-crm-border overflow-x-auto">
              <div className="grid grid-cols-[1fr_140px_150px_100px_90px_90px_72px] gap-4 px-5 py-3 border-b border-crm-border bg-gray-50 min-w-[800px]">
                <span className="text-xs font-semibold text-text-muted">Անուն</span>
                <span className="text-xs font-semibold text-text-muted">Հեռախոսահամար</span>
                <span className="text-xs font-semibold text-text-muted">Email</span>
                <span className="text-xs font-semibold text-text-muted">Աղբյուր</span>
                <span className="text-xs font-semibold text-text-muted text-center">Զանգեր</span>
                <span className="text-xs font-semibold text-text-muted text-center">Պատվերներ</span>
                <span />
              </div>
              {filtered.map((c) => (
                <div key={c.id} onClick={() => setViewItem(c)} className="grid grid-cols-[1fr_140px_150px_100px_90px_90px_72px] gap-4 px-5 py-3.5 border-b border-crm-border last:border-b-0 hover:bg-primary/5 transition-colors items-center cursor-pointer min-w-[800px]">
                  <div className="min-w-0 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0"><span className="text-xs font-bold text-primary">{c.first_name.charAt(0).toUpperCase()}{c.last_name.charAt(0).toUpperCase()}</span></div>
                    <div className="min-w-0"><p className="text-sm font-semibold text-dark truncate">{c.first_name} {c.last_name}</p>{c.address && <p className="text-xs text-text-muted truncate">{c.address}</p>}</div>
                  </div>
                  <a href={`tel:${c.phone}`} onClick={(e) => e.stopPropagation()} className="text-sm text-primary font-medium hover:underline truncate">{c.phone}</a>
                  {c.email ? <a href={`mailto:${c.email}`} onClick={(e) => e.stopPropagation()} className="text-sm text-text-muted hover:text-primary truncate">{c.email}</a> : <span className="text-sm text-text-muted/40">--</span>}
                  <SourceBadge source={c.source} />
                  <div className="flex justify-center">
                    <button onClick={(e) => { e.stopPropagation(); setViewCallsItem(c); }} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-colors ${(c.calls?.length ?? 0) > 0 ? 'bg-success/10 text-success hover:bg-success/20' : 'bg-gray-100 text-text-muted hover:bg-gray-200'}`}>
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.69A2 2 0 012 .9h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.75a16 16 0 006.16 6.16l1.21-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
                      {(c.calls?.length ?? 0) > 0 ? c.calls.length : '+'}
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <button onClick={(e) => { e.stopPropagation(); setViewTasksItem(c); }} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors">Տեսնել</button>
                  </div>
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setEditItem(c); }} className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteItem(c); }} className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg></button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="h-6 flex-shrink-0" />

      {/* Modals */}
      {addOpen      && <CustomerModal sources={sources} onClose={() => setAddOpen(false)} />}
      {editItem     && <CustomerModal initial={editItem} sources={sources} onClose={() => setEditItem(null)} />}
      {viewItem && !editItem && !viewTasksItem && !viewCallsItem && !deleteItem && (
        <CustomerViewModal
          client={viewItem}
          sources={sources}
          onClose={() => setViewItem(null)}
          onEdit={() => { setEditItem(viewItem); setViewItem(null); }}
          onViewTasks={() => { setViewTasksItem(viewItem); }}
          onViewCalls={() => { setViewCallsItem(viewItem); }}
          onDelete={() => { setDeleteItem(viewItem); setViewItem(null); }}
        />
      )}
      {viewTasksItem && (
        <CustomerTasksModal
          client={viewTasksItem}
          onClose={() => { setViewTasksItem(null); setViewItem(null); }}
          onBack={() => setViewTasksItem(null)}
        />
      )}
      {viewCallsItem && (
        <CallHistoryModal
          client={viewCallsItem}
          onClose={() => { setViewCallsItem(null); setViewItem(null); }}
          onBack={() => setViewCallsItem(null)}
        />
      )}
      {deleteItem && (
        <DeleteConfirm
          name={`${deleteItem.first_name} ${deleteItem.last_name}`}
          onCancel={() => setDeleteItem(null)}
          onConfirm={() => deleteClient(deleteItem.id)}
          isPending={isDeleting}
        />
      )}
    </div>
  );
}

