'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { clientService } from '@/services/client.service';
import type { ClientDTO } from '@/services/client.service';

function nowDateTimeStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('hy-AM', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('hy-AM', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

export default function CallHistoryModal({ client, onClose }: {
  client:  ClientDTO;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [note,      setNote]      = useState('');
  const [date,      setDate]      = useState(nowDateTimeStr());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNote,  setEditNote]  = useState('');
  const [editIsDone, setEditIsDone] = useState(false);

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

  function startEdit(entry: { id: number; note: string; is_done: boolean }) {
    setEditingId(entry.id);
    setEditNote(entry.note ?? '');
    setEditIsDone(entry.is_done);
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
            disabled={!date || isPending}
            className="w-full py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40"
          >
            {isPending ? 'Ավելացնում է...' : 'Ավելացնել'}
          </button>
        </div>

        {/* History */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {calls.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-28 gap-2 text-center">
              <svg className="w-8 h-8 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.9 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.75a16 16 0 006.16 6.16l1.21-1.21a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              <p className="text-sm text-text-muted">Zangneri patmoutyoun chka</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {calls.map((entry, i) => (
                <div key={entry.id} className="group flex gap-3 items-start">
                  <div className="flex flex-col items-center flex-shrink-0 mt-1">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${entry.is_done ? 'bg-success' : 'bg-primary'}`} />
                    {i < calls.length - 1 && <div className="w-px flex-1 bg-crm-border mt-1 min-h-[16px]" />}
                  </div>
                  <div className="flex-1 min-w-0 pb-2">
                    <p className="text-[11px] font-semibold text-text-muted">{fmtDate(entry.date)}</p>
                    {editingId === entry.id ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <textarea
                          autoFocus
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && e.ctrlKey) saveNote({ callId: entry.id, note: editNote, is_done: editIsDone });
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          rows={2}
                          className="flex-1 px-2 py-1 text-sm rounded-lg border border-primary outline-none focus:ring-2 focus:ring-primary/30 bg-white resize-none"
                        />
                        <button onClick={() => saveNote({ callId: entry.id, note: editNote, is_done: editIsDone })} className="w-6 h-6 flex items-center justify-center rounded-full bg-primary text-white hover:bg-primary-hover text-xs flex-shrink-0">✓</button>
                        <button onClick={() => setEditingId(null)} className="w-6 h-6 flex items-center justify-center rounded-full border border-crm-border text-text-muted hover:text-error text-xs flex-shrink-0">✕</button>
                      </div>
                    ) : (
                      <p
                        onClick={() => startEdit(entry)}
                        className={'text-sm mt-0.5 cursor-pointer hover:text-primary ' + (entry.note ? 'text-dark' : 'text-text-muted italic')}
                      >
                        {entry.note || 'Nkarаgroutyoun chka'}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                    {entry.is_done ? (
                      <div className="w-6 h-6 flex items-center justify-center rounded-full bg-success/10 text-success">
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      </div>
                    ) : (
                      <button
                        onClick={() => markCallDone({ callId: entry.id, date: entry.date })}
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
