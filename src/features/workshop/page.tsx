'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehouseService, type MovementDTO } from '@/services/warehouse.service';

function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleString('hy-AM', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return s; }
}

// ── EditQuantityModal ─────────────────────────────────────────────────────────

function EditQuantityModal({ movement, onClose }: {
  movement: MovementDTO;
  onClose:  () => void;
}) {
  const queryClient  = useQueryClient();
  const current      = Number(movement.quantity);
  const [qty, setQty] = useState(String(current));

  const { mutate, isPending } = useMutation({
    mutationFn: () => warehouseService.updateMovement(movement.id, { quantity: qty.trim() }),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['wh-movements'] });
      queryClient.invalidateQueries({ queryKey: ['wh-materials'] });
      onClose();
    },
  });

  const newVal = Number(qty);
  const valid  = qty.trim() !== '' && newVal > 0 && newVal !== current;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[380px] mx-4 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <div>
            <h2 className="text-base font-bold text-dark">Փոխել քանակը</h2>
            <p className="text-xs text-text-muted mt-0.5">{movement.material_name}</p>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-dark transition-colors">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Current */}
          <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gray-50 border border-crm-border">
            <span className="text-sm text-text-muted">Ներկայիս քանակ</span>
            <span className="text-lg font-bold text-dark">{current.toLocaleString('hy-AM')}</span>
          </div>
          {/* New quantity */}
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">
              Նոր Քանակ<span className="text-error ml-0.5">*</span>
            </label>
            <input
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              min="0.01"
              step="any"
              className="w-full px-4 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-dark"
              autoFocus
            />
            {valid && newVal < current && (
              <p className="text-xs text-success mt-1">
                − {(current - newVal).toLocaleString('hy-AM')} կնվազեցնել
              </p>
            )}
            {valid && newVal > current && (
              <p className="text-xs text-primary mt-1">
                + {(newVal - current).toLocaleString('hy-AM')} ավելացնել
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-crm-border justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50 transition-colors">
            Չեղարկել
          </button>
          <button onClick={() => mutate()} disabled={!valid || isPending}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {isPending ? 'Պահպանում...' : 'Պահպանել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function WorkshopPage() {
  const queryClient = useQueryClient();
  const [search,    setSearch]  = useState('');
  const [editMov,   setEditMov] = useState<MovementDTO | null>(null);

  const { data: allMovements = [], isLoading } = useQuery({
    queryKey: ['wh-movements'],
    queryFn:  warehouseService.getMovements,
  });

  const transfers = useMemo(() => {
    const out = allMovements.filter((m) => m.direction === 'out');
    if (!search.trim()) return out;
    const q = search.toLowerCase();
    return out.filter((m) =>
      m.material_name.toLowerCase().includes(q) ||
      (m.note && m.note.toLowerCase().includes(q))
    );
  }, [allMovements, search]);

  const { mutate: deleteMovement } = useMutation({
    mutationFn: (id: number) => warehouseService.deleteMovement(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['wh-movements'] });
      queryClient.invalidateQueries({ queryKey: ['wh-materials'] });
    },
  });

  return (
    <div className="animate-fade-in absolute inset-0 flex flex-col p-4 overflow-y-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-dark">Արտադրամաս</h1>
          <p className="text-xs text-text-muted mt-0.5">{transfers.length} Տեղափոխում</p>
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
          placeholder="Փնտրել..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-crm-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {search && (
          <button onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-dark transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-shrink-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">Բեռնվում է...</div>
        ) : transfers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-52 gap-3 bg-white rounded-2xl border border-dashed border-crm-border">
            <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            <p className="text-sm text-text-muted">Արտադրամաս — դեռ տեղափոխում չկա</p>
            <p className="text-xs text-text-muted">Պահեստից նյութ տեղափոխել արտադրամաս</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-crm-border overflow-hidden">

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-crm-border">
              {transfers.map((t) => (
                <div key={t.id} className="px-4 py-3 hover:bg-gray-50/60 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-dark">{t.material_name}</p>
                      {t.note && <p className="text-xs text-text-muted mt-0.5">{t.note}</p>}
                      <p className="text-[11px] text-text-muted mt-1">{fmtDate(t.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => setEditMov(t)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                      >
                        {Number(t.quantity).toLocaleString('hy-AM')}
                        <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => deleteMovement(t.id)}
                        className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <div className="grid grid-cols-[1fr_130px_160px_80px] gap-4 px-5 py-3 border-b border-crm-border bg-gray-50 min-w-[480px]">
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Նյութ</span>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wide text-right">Քանակ</span>
                <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Ամսաթիվ</span>
                <span />
              </div>
              {transfers.map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-[1fr_130px_160px_80px] gap-4 px-5 py-3.5 border-b border-crm-border last:border-b-0 hover:bg-gray-50/60 transition-colors items-center min-w-[480px]"
                >
                  <div>
                    <p className="text-sm font-semibold text-dark">{t.material_name}</p>
                    {t.note && <p className="text-xs text-text-muted truncate mt-0.5">{t.note}</p>}
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => setEditMov(t)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      {Number(t.quantity).toLocaleString('hy-AM')}
                      <svg className="w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                  <p className="text-xs text-text-muted">{fmtDate(t.created_at)}</p>
                  <div className="flex justify-end">
                    <button
                      onClick={() => deleteMovement(t.id)}
                      className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

          </div>
        )}
      </div>

      <div className="h-6 flex-shrink-0" />

      {editMov && (
        <EditQuantityModal movement={editMov} onClose={() => setEditMov(null)} />
      )}
    </div>
  );
}
