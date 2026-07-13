'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '@/services/client.service';
import type { ClientDTO, SourceDTO } from '@/services/client.service';
import { toLocalDateInput, toLocalDateTimeInput } from '@/lib/date';

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayStr() { return toLocalDateInput(new Date()); }
function nowDateTimeStr() { return toLocalDateTimeInput(new Date()); }

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('hy-AM', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Tab logic ─────────────────────────────────────────────────────────────────

type Tab = 'new' | 'overdue' | 'today' | 'upcoming' | 'done';

function getTabs(c: ClientDTO): Tab[] {
  const calls  = c.calls ?? [];
  if (calls.length === 0) return ['new'];
  const undone = calls.filter((call) => !call.is_done);
  if (undone.length === 0) return ['done'];
  const t    = todayStr();
  const tabs: Tab[] = [];
  if (undone.some((call) => call.date.slice(0, 10) < t))  tabs.push('overdue');
  if (undone.some((call) => call.date.slice(0, 10) === t)) tabs.push('today');
  if (undone.some((call) => call.date.slice(0, 10) > t))  tabs.push('upcoming');
  return tabs;
}

// ── Source badge ──────────────────────────────────────────────────────────────

function SourceBadge({ source }: { source: SourceDTO | null | undefined }) {
  if (!source) return null;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary">
      {source.name}
    </span>
  );
}

// ── Call History Modal ────────────────────────────────────────────────────────

function CallHistoryModal({ client, onClose }: {
  client:  ClientDTO;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [note,      setNote]      = useState('');
  const [date,      setDate]      = useState(nowDateTimeStr());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNote,  setEditNote]  = useState('');

  const calls = useMemo(
    () => [...(client.calls ?? [])].sort((a, b) => b.date.localeCompare(a.date)),
    [client.calls],
  );

  const { mutate: addCall, isPending } = useMutation({
    mutationFn: (data: { note: string; date: string }) => clientService.addCall(client.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setNote('');
      setDate(nowDateTimeStr());
    },
  });

  const { mutate: deleteCall } = useMutation({
    mutationFn: (callId: number) => clientService.deleteCall(client.id, callId),
    onSuccess:  () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  const { mutate: markCallDone } = useMutation({
    mutationFn: ({ callId }: { callId: number; date: string }) =>
      clientService.markCallDone(client.id, callId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['clients'] }),
  });

  const { mutate: saveNote } = useMutation({
    mutationFn: ({ callId, note: n, is_done }: { callId: number; note: string; is_done: boolean }) =>
      clientService.updateCall(client.id, callId, { note: n, is_done }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setEditingId(null);
    },
  });

  const [editIsDone, setEditIsDone] = useState(false);

  function startEdit(entry: { id: number; note: string; is_done: boolean }) {
    setEditingId(entry.id);
    setEditNote(entry.note ?? '');
    setEditIsDone(entry.is_done);
  }

  function commitEdit(callId: number) {
    saveNote({ callId, note: editNote, is_done: editIsDone });
  }

  function commitDone(entry: { id: number; date: string }) {
    markCallDone({ callId: entry.id, date: entry.date });
  }

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
          <div>
            <p className="text-sm font-bold text-dark">Զանգերի պատմություն</p>
            <p className="text-xs text-text-muted mt-0.5">
              {client.first_name} {client.last_name}
              {client.phone && <span className="ml-1">· {client.phone}</span>}
            </p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-dark transition-colors p-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Add new call */}
        <div className="px-5 py-4 border-b border-crm-border flex-shrink-0 bg-gray-50/60">
          <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-3">Ավելացնել զանգ</p>
          <div className="flex flex-col gap-2 mb-2">
            <div>
              <label className="text-xs font-medium text-dark block mb-1">Ամսաթիվ</label>
              <input
                type="datetime-local"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-3 py-2 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-dark block mb-1">Նկարագրություն</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Զանգի մանրամասներ..."
                rows={3}
                className="w-full px-3 py-2 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
              />
            </div>
          </div>
          <button
            onClick={() => addCall({ note: note.trim(), date })}
            disabled={!date || !note.trim() || isPending}
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
                 <div key={entry.id} className="group flex gap-3 items-start">
                   {/* Timeline indicator */}
                   <div className="flex flex-col items-center flex-shrink-0 mt-1">
                     <div className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.is_done ? 'bg-success' : 'bg-primary'}`} />
                     {i < calls.length - 1 && <div className="w-px flex-1 bg-crm-border mt-1 min-h-[16px]" />}
                   </div>
                   {/* Content */}
                   <div className="flex-1 min-w-0 pb-2">
                     <p className="text-[11px] font-semibold text-text-muted">{fmtDate(entry.date)}</p>
                     {editingId === entry.id ? (
                       <div className="flex items-center gap-1 mt-0.5">
                         <textarea
                           autoFocus
                           value={editNote}
                           onChange={(e) => setEditNote(e.target.value)}
                           onKeyDown={(e) => {
                             if (e.key === "Enter" && e.ctrlKey) commitEdit(entry.id);
                             if (e.key === "Escape") setEditingId(null);
                           }}
                           rows={2}
                           className="flex-1 px-2 py-1 text-sm rounded-lg border border-primary outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
                         />
                         <button onClick={() => commitEdit(entry.id)} className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover text-xs flex-shrink-0">✓</button>
                         <button onClick={() => setEditingId(null)} className="w-6 h-6 flex items-center justify-center rounded-full border border-crm-border text-text-muted hover:text-error text-xs flex-shrink-0">✕</button>
                       </div>
                     ) : (
                       <p
                         onClick={() => startEdit(entry)}
                         className={"text-sm mt-0.5 cursor-pointer hover:text-primary " + (entry.note ? "text-dark" : "text-text-muted italic")}
                       >
                         {entry.note || "Նկարագրություն չկա"}
                       </p>
                     )}
                   </div>
                   {/* Actions */}
                   <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                     {entry.is_done ? (
                       <div className="w-6 h-6 flex items-center justify-center rounded-full bg-success/10 text-success">
                         <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                           <polyline points="20 6 9 17 4 12"/>
                         </svg>
                       </div>
                     ) : (
                       <button
                         onClick={() => commitDone(entry)}
                         className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full hover:bg-success/10 hover:text-success text-text-muted"
                       >
                         <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                           <polyline points="20 6 9 17 4 12"/>
                         </svg>
                       </button>
                     )}
                     <button
                       onClick={() => deleteCall(entry.id)}
                       className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-full hover:bg-error/10 hover:text-error text-text-muted"
                     >
                       <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                         <polyline points="3 6 5 6 21 6"/>
                         <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                         <path d="M10 11v6M14 11v6"/>
                         <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                       </svg>
                     </button>
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

// ── Schedule Modal ────────────────────────────────────────────────────────────

function ScheduleModal({ client, onClose, onSave }: {
  client:  ClientDTO;
  onClose: () => void;
  onSave:  (date: string, note: string) => void;
}) {
  const [date, setDate] = useState(client.next_call_date?.slice(0, 10) ?? todayStr());
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-crm-border">
          <div>
            <p className="text-sm font-bold text-dark">Նշանակել զանգ</p>
            <p className="text-xs text-text-muted mt-0.5">{client.first_name} {client.last_name}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-dark transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="px-5 py-4 flex flex-col gap-3">
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1.5">Ե՞րղ զանկել</label>
            <input
              type="date"
              value={date}
              min={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted block mb-1.5">Նկարագրություն</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Զանգի մանրամասներ..."
              rows={3}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-crm-border justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50 transition-colors">
            Չեղարկել
          </button>
          <button
            onClick={() => { onSave(date, note.trim()); onClose(); }}
            disabled={!date}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40"
          >
            Նշանակել
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Customer Card ─────────────────────────────────────────────────────────────

const TAB_ACCENT: Record<Tab, string> = {
  overdue:  'border-l-4 border-l-error',
  today:    'border-l-4 border-l-warning',
  upcoming: 'border-l-4 border-l-primary',
  new:      'border-l-4 border-l-gray-300',
  done:     'border-l-4 border-l-success',
};

function CustomerCard({ client, tab, onOpenCalls }: {
  client:      ClientDTO;
  tab:         Tab;
  onOpenCalls: () => void;
}) {
  const initials =
    (client.first_name.charAt(0) + client.last_name.charAt(0)).toUpperCase() ||
    client.first_name.slice(0, 2).toUpperCase();

  return (
    <div className={`bg-white rounded-2xl border border-crm-border shadow-sm flex overflow-hidden ${TAB_ACCENT[tab]}`}>
      <div className="flex-1 px-5 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">

          {/* Info */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-dark">{client.first_name} {client.last_name}</p>
              {client.phone && (
                <a href={`tel:${client.phone}`} className="text-xs text-primary font-medium hover:underline">
                  {client.phone}
                </a>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {client.source && <SourceBadge source={client.source} />}
                {(client.calls?.length ?? 0) > 0 && (
                  <span className="text-[11px] text-text-muted">{client.calls.length} զանգ</span>
                )}
                {client.address && (
                  <span className="text-[11px] text-text-muted truncate">{client.address}</span>
                )}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={onOpenCalls}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.69A2 2 0 012 .9h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.75a16 16 0 006.16 6.16l1.21-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              Զանգեր
            </button>

          </div>
        </div>

        {/* Scheduled date */}
        {client.next_call_date && tab !== 'done' && (
          <div className={`flex items-center gap-1.5 mt-3 text-xs font-medium ${
            tab === 'overdue' ? 'text-error' :
            tab === 'today'   ? 'text-warning' :
            'text-primary'
          }`}>
            <svg className="w-3.5 h-3.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
            </svg>
            {tab === 'overdue' ? 'Ժամկետն անցել է — ' : tab === 'today' ? 'Այսօր — ' : 'Նշանակված — '}
            {fmtDate(client.next_call_date)}
          </div>
        )}

        {/* Last called (done tab) */}
        {tab === 'done' && client.last_called_at && (
          <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-success">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            Զանգվել է — {fmtDate(client.last_called_at)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Call Modal ────────────────────────────────────────────────────────────────────────────────

function AddCallModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn:  clientService.getAll,
  });

  const [clientName,     setClientName]     = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientDTO | null>(null);
  const [phone,          setPhone]          = useState('');
  const [open,           setOpen]           = useState(false);
  const [date,           setDate]           = useState(nowDateTimeStr());
  const [note,           setNote]           = useState('');

  const suggestions = clientName.trim().length >= 1
    ? clients.filter((c) => {
        const full = `${c.first_name} ${c.last_name}`.toLowerCase();
        const q    = clientName.toLowerCase();
        return full.includes(q) || c.phone.includes(q);
      }).slice(0, 6)
    : [];

  const showPhoneField = clientName.trim().length >= 1;

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  const { mutate: addCall, isPending } = useMutation({
    mutationFn: async () => {
      let cid: number | undefined = selectedClient?.id;
      if (!cid && clientName.trim()) {
        const name     = clientName.trim();
        const existing = clients.find((c) => {
          const full = `${c.first_name} ${c.last_name}`.trim().toLowerCase();
          return full === name.toLowerCase() || (phone.trim() && c.phone === phone.trim());
        });
        if (existing) {
          cid = existing.id;
        } else {
          const [firstName, ...rest] = name.split(' ');
          const created = await clientService.create({
            first_name: firstName ?? name,
            last_name:  rest.join(' ') || undefined,
            phone:      phone.trim()   || name,
          });
          cid = created.id;
          queryClient.invalidateQueries({ queryKey: ['clients'] });
        }
      }
      if (!cid) return;
      await clientService.addCall(cid, { note: note.trim(), date });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] mx-4 flex flex-col gap-4 p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-dark">Ավելացնել զանգ</p>
          <button onClick={onClose} className="text-text-muted hover:text-dark p-1">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Client autocomplete */}
        <div>
          <label className="text-xs font-medium text-dark block mb-1">Հաճախորդ</label>
          <div ref={wrapRef} className="relative">
            <input
              value={clientName}
              onChange={(e) => { setClientName(e.target.value); setSelectedClient(null); setOpen(true); }}
              onFocus={() => setOpen(true)}
              placeholder="Որոնել..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            {open && suggestions.length > 0 && (
              <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-crm-border rounded-xl shadow-lg overflow-hidden">
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setSelectedClient(c); setClientName(`${c.first_name} ${c.last_name}`.trim()); setPhone(c.phone ?? ''); setOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-[11px] font-bold text-primary">
                        {c.first_name.charAt(0)}{c.last_name.charAt(0)}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-dark truncate">{c.first_name} {c.last_name}</p>
                      {c.phone && <p className="text-xs text-text-muted">{c.phone}</p>}
                    </div>
                    {c.source && (
                      <span className="ml-auto flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                        {c.source.name}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
          {showPhoneField && (
            <div className="mt-2">
              <label className="text-xs font-medium text-dark block mb-1">Հեռախոս</label>
              <input
                value={phone}
                onChange={(e) => { if (!selectedClient) setPhone(e.target.value); }}
                readOnly={!!selectedClient}
                placeholder="+374 99 123456"
                className={`w-full px-3 py-2 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 ${selectedClient ? 'bg-gray-50 text-text-muted cursor-default' : ''}`}
              />
            </div>
          )}
        </div>

        {/* Date */}
        <div>
          <label className="text-xs font-medium text-dark block mb-1">Ամսաթիվ և ժամ</label>
          <input
            type="datetime-local"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Note */}
        <div>
          <label className="text-xs font-medium text-dark block mb-1">Նկարագրություն</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Զանգի մանրամասներ..."
            rows={3}
            className="w-full px-3 py-2 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
          />
        </div>

        <button
          onClick={() => addCall()}
          disabled={!clientName.trim() || !date || !note.trim() || isPending}
          className="w-full py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40"
        >
          {isPending ? 'Ավելացնում...' : 'Ավելացնել'}
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const TAB_LABELS: Record<Tab, string> = {
  new:      'Նոր հաճախորդներ',
  overdue:  'Ժամկետն անցել է',
  today:    'Այսօր',
  upcoming: 'Առաջիկա',
  done:     'Կատարված',
};

const TAB_DOT: Record<Tab, string> = {
  overdue:  'bg-error',
  today:    'bg-warning',
  upcoming: 'bg-primary',
  new:      'bg-gray-400',
  done:     'bg-success',
};

const EMPTY_LABEL: Record<Tab, string> = {
  new:      'Նոր հաճախորդներ չկան',
  overdue:  'Ժամկետն անցած զանգ չկա',
  today:    'Այսօր զանգ նախատեսված չէ',
  upcoming: 'Առաջիկա զանգ նախատեսված չէ',
  done:     'Կատարված զանգ չկա',
};

export default function CallsPage() {
  const queryClient = useQueryClient();

  const [tab,       setTab]      = useState<Tab>('new');
  const [viewCalls, setViewCalls] = useState<ClientDTO | null>(null);
  const [addingCall, setAddingCall] = useState(false);
  const [search,     setSearch]     = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn:  clientService.getAll,
  });



  const grouped = useMemo<Record<Tab, ClientDTO[]>>(() => {
    const g: Record<Tab, ClientDTO[]> = { new: [], overdue: [], today: [], upcoming: [], done: [] };
    for (const c of clients) for (const t of getTabs(c)) g[t].push(c);
    return g;
  }, [clients]);

  const currentList = [...grouped[tab]].sort((a, b) => {
    const undoneA = (a.calls ?? []).filter((c) => !c.is_done).map((c) => c.date.slice(0, 10)).sort()[0] ?? '';
    const undoneB = (b.calls ?? []).filter((c) => !c.is_done).map((c) => c.date.slice(0, 10)).sort()[0] ?? '';
    return undoneA.localeCompare(undoneB);
  });

  const searchResults = search.trim().length >= 1
    ? clients.filter((c) => {
        const full = `${c.first_name} ${c.last_name}`.toLowerCase();
        const q    = search.toLowerCase();
        return full.includes(q) || c.phone.includes(q);
      }).slice(0, 8)
    : [];

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  return (
    <div className="animate-fade-in absolute inset-0 flex flex-col p-4 overflow-hidden">

            {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4 md:mb-5 flex-shrink-0">
        <div className="flex items-center justify-between sm:block flex-shrink-0">
          <div>
          <h1 className="text-xl sm:text-2xl font-bold text-dark">Զանգեր</h1>
          <p className="text-xs text-text-muted mt-0.5">{clients.length} հաճախորդ ընդհանուր</p>
          </div>
          <button
            onClick={() => setAddingCall(true)}
            className="sm:hidden flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div ref={searchRef} className="relative flex-1">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Որոնել..."
              className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setSearchOpen(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-dark"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>
          {searchOpen && searchResults.length > 0 && (
            <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-crm-border rounded-xl shadow-lg overflow-hidden">
              {searchResults.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setViewCalls(c); setSearch(''); setSearchOpen(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-[11px] font-bold text-primary">
                      {c.first_name.charAt(0)}{c.last_name.charAt(0)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-dark truncate">{c.first_name} {c.last_name}</p>
                    {c.phone && <p className="text-xs text-text-muted">{c.phone}</p>}
                  </div>
                  {c.source && (
                    <span className="flex-shrink-0 text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                      {c.source.name}
                    </span>
                  )}
                  <svg className="w-4 h-4 text-text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.9 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.75a16 16 0 006.16 6.16l1.21-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setAddingCall(true)}
          className="hidden sm:flex flex-shrink-0 items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Ավելացնել զանգ
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 md:mb-5 bg-gray-100 rounded-xl p-1 flex-shrink-0 overflow-x-auto">
        {(Object.keys(TAB_LABELS) as Tab[]).map((id) => {
          const count = grouped[id].length;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`relative flex items-center gap-1.5 px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                tab === id ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${TAB_DOT[id]}`} />
              {TAB_LABELS[id]}
              {count > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold text-white ${
                  id === 'overdue' ? 'bg-error' :
                  id === 'today'   ? 'bg-warning' :
                  id === 'new'     ? 'bg-gray-400' :
                  id === 'done'    ? 'bg-success' : 'bg-primary'
                }`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-52 text-text-muted text-sm">Բեռնում է...</div>
        ) : currentList.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.69A2 2 0 012 .9h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.75a16 16 0 006.16 6.16l1.21-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
            </div>
            <p className="text-sm font-semibold text-dark">{EMPTY_LABEL[tab]}</p>
            {tab === 'new' && (
              <p className="text-xs text-text-muted">Հաճախորդ ավելացնելիս այստեղ կհայտնվի</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3 pb-4">
            {currentList.map((c) => (
              <CustomerCard
                key={c.id}
                client={c}
                tab={tab}
                onOpenCalls={() => setViewCalls(c)}
              />
            ))}
          </div>
        )}
      </div>

      {addingCall && (
        <AddCallModal onClose={() => setAddingCall(false)} />
      )}

      {/* Call history modal */}
      {viewCalls && (
        <CallHistoryModal
          client={clients.find((c) => c.id === viewCalls.id) ?? viewCalls}
          onClose={() => setViewCalls(null)}
        />
      )}


    </div>
  );
}
