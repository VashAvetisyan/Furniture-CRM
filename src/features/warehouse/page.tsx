'use client';
import { SkTable } from '@/components/ui/Skeleton';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  warehouseService,
  type MaterialDTO,
  type CreateMaterialRequest,
  type CreateMovementRequest,
} from '@/services/warehouse.service';


// ── helpers ───────────────────────────────────────────────────────────────────

function fmtNum(n: string | number) {
  const v = Number(n);
  return isNaN(v) ? '—' : v.toLocaleString('hy-AM');
}
function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString('hy-AM', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return s; }
}

// ── shared ────────────────────────────────────────────────────────────────────

function CloseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-text-muted hover:text-dark transition-colors">
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
    </button>
  );
}

function InputField({ label, value, onChange, placeholder, type = 'text', required }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-semibold text-text-muted mb-1.5 block">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-dark bg-white"
      />
    </div>
  );
}

// ── DeleteConfirm ─────────────────────────────────────────────────────────────

function DeleteConfirm({ name, onCancel, onConfirm, isPending }: {
  name: string; onCancel: () => void; onConfirm: () => void; isPending?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-[calc(100%-2rem)] max-w-sm flex flex-col gap-4">
        <div>
          <p className="text-base font-semibold text-dark">Ջնջե՞լ</p>
          <p className="text-sm text-text-muted mt-1">
            «<span className="font-medium text-dark">{name}</span>» կջնջվի։
          </p>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} disabled={isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-crm-border text-dark hover:bg-light transition-colors">
            Չեղարկել
          </button>
          <button onClick={onConfirm} disabled={isPending}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-error text-white hover:bg-error/90 transition-colors disabled:opacity-50">
            {isPending ? 'Ջնջում...' : 'Ջնջել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AddMaterialModal ──────────────────────────────────────────────────────────

function AddMaterialModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name,     setName]     = useState('');
  const [unit,     setUnit]     = useState('');
  const [stock,    setStock]    = useState('');
  const [minStock, setMinStock] = useState('');
  const [cost,     setCost]     = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => warehouseService.createMaterial({
      name:           name.trim(),
      unit:           unit.trim(),
      ...(stock.trim()    && { stock_quantity: stock.trim() }),
      ...(minStock.trim() && { min_stock:      minStock.trim() }),
      ...(cost.trim()     && { cost_per_unit:  cost.trim() }),
    } as CreateMaterialRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wh-materials'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[calc(100%-2rem)] max-w-[440px] flex flex-col max-h-[90dvh]">
        <div className="flex-shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-crm-border">
          <h2 className="text-base font-bold text-dark">Ավելացնել Նյութ</h2>
          <CloseBtn onClick={onClose} />
        </div>
        <div className="overflow-y-auto overflow-x-hidden overscroll-contain flex-1 min-h-0">
          <div className="px-5 sm:px-6 py-5 flex flex-col gap-4">
            <InputField label="Անուն" value={name} onChange={setName} placeholder="Նյութ Անուն..." required />
            <InputField label="Չ.Մ. (Չապ. Միավոր)" value={unit} onChange={setUnit} placeholder="մ, hat, kg, մ², ..." required />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Պահուստ" value={stock} onChange={setStock} placeholder="0" type="number" />
              <InputField label="Նվ. Պահուստ" value={minStock} onChange={setMinStock} placeholder="0" type="number" />
            </div>
            <InputField label="Գին / Չ.Մ. (դ)" value={cost} onChange={setCost} placeholder="0" type="number" />
          </div>
        </div>
        <div className="flex-shrink-0 flex gap-2 px-5 sm:px-6 py-4 border-t border-crm-border justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50 transition-colors">
            Չեղարկել
          </button>
          <button onClick={() => mutate()} disabled={!name.trim() || !unit.trim() || isPending}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {isPending ? 'Ավելացնում...' : 'Ավելացնել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── EditMaterialModal ─────────────────────────────────────────────────────────

function EditMaterialModal({ material, onClose }: { material: MaterialDTO; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name,     setName]     = useState(material.name);
  const [unit,     setUnit]     = useState(material.unit);
  const [stock,    setStock]    = useState(material.stock_quantity);
  const [minStock, setMinStock] = useState(material.min_stock);
  const [cost,     setCost]     = useState(material.cost_per_unit);

  const { mutate, isPending } = useMutation({
    mutationFn: () => warehouseService.updateMaterial(material.id, {
      name: name.trim(), unit: unit.trim(),
      stock_quantity: stock.trim(), min_stock: minStock.trim(), cost_per_unit: cost.trim(),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wh-materials'] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[calc(100%-2rem)] max-w-[440px] flex flex-col max-h-[90dvh]">
        <div className="flex-shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-crm-border">
          <h2 className="text-base font-bold text-dark">խմբագրել</h2>
          <CloseBtn onClick={onClose} />
        </div>
        <div className="overflow-y-auto overflow-x-hidden overscroll-contain flex-1 min-h-0">
          <div className="px-5 sm:px-6 py-5 flex flex-col gap-4">
            <InputField label="Անուն" value={name} onChange={setName} placeholder="Նյութ Անուն..." required />
            <InputField label="Չ.Մ." value={unit} onChange={setUnit} placeholder="մ, hat, kg..." required />
            <div className="grid grid-cols-2 gap-3">
              <InputField label="Պահուստ" value={stock} onChange={setStock} placeholder="0" type="number" />
              <InputField label="Նվ. Պահուստ" value={minStock} onChange={setMinStock} placeholder="0" type="number" />
            </div>
            <InputField label="Գին / Չ.Մ." value={cost} onChange={setCost} placeholder="0" type="number" />
          </div>
        </div>
        <div className="flex-shrink-0 flex gap-2 px-5 sm:px-6 py-4 border-t border-crm-border justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50 transition-colors">
            Չեղարկել
          </button>
          <button onClick={() => mutate()} disabled={!name.trim() || !unit.trim() || isPending}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            {isPending ? 'Պահպանում...' : 'Պահպանել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TransferModal ─────────────────────────────────────────────────────────────

function TransferModal({ materials, onClose, preselect, onSuccess }: {
  materials:  MaterialDTO[];
  onClose:    () => void;
  preselect?: number;
  onSuccess:  () => void;
}) {
  const queryClient               = useQueryClient();
  const [materialId, setMaterial] = useState<number | ''>(preselect ?? '');
  const [quantity,   setQuantity] = useState('');
  const [note,       setNote]     = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => warehouseService.createMovement({
      material:  materialId as number,
      direction: 'out',
      quantity:  quantity.trim(),
      ...(note.trim() && { note: note.trim() }),
    } as CreateMovementRequest),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wh-movements'] });
      queryClient.invalidateQueries({ queryKey: ['wh-materials'] });
      onSuccess();
    },
  });

  const selected = materials.find((m) => m.id === materialId);
  const valid    = materialId !== '' && Number(quantity) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[calc(100%-2rem)] max-w-[440px] flex flex-col max-h-[90dvh]">
        <div className="flex-shrink-0 flex items-center justify-between px-5 sm:px-6 py-4 border-b border-crm-border">
          <div>
            <h2 className="text-base font-bold text-dark">Տեղափոխել Արտադրամաս</h2>
            <p className="text-xs text-text-muted mt-0.5">Նյութ դուրս → Արտադրամաս</p>
          </div>
          <CloseBtn onClick={onClose} />
        </div>
        <div className="overflow-y-auto overflow-x-hidden overscroll-contain flex-1 min-h-0">
          <div className="px-5 sm:px-6 py-5 flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-text-muted mb-1.5 block">
                Նյութ<span className="text-error ml-0.5">*</span>
              </label>
              <select
                value={materialId}
                onChange={(e) => setMaterial(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-dark bg-white"
              >
                <option value="">— Ընտրել Նյութ —</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.unit}) — Պահուստ: {fmtNum(m.stock_quantity)}
                  </option>
                ))}
              </select>
              {selected && Number(selected.stock_quantity) <= 0 && (
                <p className="text-xs text-error mt-1">Պահուստ-ի կանակ-ը 0 է!</p>
              )}
            </div>

            <InputField
              label={`Կանակ${selected ? ` (${selected.unit})` : ''}`}
              value={quantity}
              onChange={setQuantity}
              placeholder="0"
              type="number"
              required
            />

            <div>
              <label className="text-xs font-semibold text-text-muted mb-1.5 block">Նշում (Պատվեր)</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Պատվերի կամ նկատարություն..."
                rows={2}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 text-dark resize-none"
              />
            </div>
          </div>
        </div>
        <div className="flex-shrink-0 flex gap-2 px-5 sm:px-6 py-4 border-t border-crm-border justify-end">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50 transition-colors">
            Չեղարկել
          </button>
          <button onClick={() => mutate()} disabled={!valid || isPending}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
            {isPending ? 'Տեղափոխել...' : 'Տեղափոխել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── MaterialsTable ────────────────────────────────────────────────────────────

function MaterialsTable({ materials, isLoading, onEdit, onDelete, onTransfer }: {
  materials:   MaterialDTO[];
  isLoading:   boolean;
  onEdit:      (m: MaterialDTO) => void;
  onDelete:    (m: MaterialDTO) => void;
  onTransfer:  (id: number) => void;
  onIncoming:  (id: number) => void;
  emptyMsg?:   string;
}) {
  if (isLoading) {
    return <div className="bg-white rounded-2xl border border-crm-border overflow-hidden p-4"><SkTable rows={6} cols={5} /></div>;
  }
  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
        </div>
        <p className="text-sm text-text-muted">Նյութեր չկա</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-crm-border overflow-hidden">
      {/* Mobile card list */}
      <div className="sm:hidden divide-y divide-crm-border">
        {materials.map((m) => (
          <div key={m.id} className="px-4 py-3 hover:bg-gray-50/60 transition-colors">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="text-sm font-semibold text-dark">{m.name}</p>
                  {m.is_low_stock && (
                    <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold bg-error/10 text-error rounded-full">
                      LOW
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-xs text-text-muted">{m.unit || '—'}</span>
                  <span className={`text-xs font-semibold ${m.is_low_stock ? 'text-error' : 'text-dark'}`}>
                    Պահուստ: {fmtNum(m.stock_quantity)}
                  </span>
                  {Number(m.min_stock) > 0 && (
                    <span className="text-xs text-text-muted">Նվ. {fmtNum(m.min_stock)}</span>
                  )}
                  {parseFloat(m.cost_per_unit) > 0 && (
                    <span className="text-xs text-text-muted">{fmtNum(m.cost_per_unit)} դ/չ.մ.</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={() => onTransfer(m.id)}
                  title="Տեղափոխել արտադրամաս"
                  className="p-2 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                  </svg>
                </button>
                <button
                  onClick={() => onEdit(m)}
                  title="խմբագրել"
                  className="p-2 text-text-muted hover:text-warning hover:bg-warning/10 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button
                  onClick={() => onDelete(m)}
                  title="Djnjel"
                  className="p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
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
        <div className="grid grid-cols-[1fr_80px_90px_90px_110px_120px] min-w-[580px] gap-3 px-5 py-3 border-b border-crm-border bg-gray-50">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Անուն</span>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Չ.Մ.</span>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide text-right">Կանակ</span>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide text-right">Նվ. Կանակ</span>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide text-right">Գին/Չ.Մ.</span>
          <span />
        </div>
        {materials.map((m) => (
          <div
            key={m.id}
            className="grid grid-cols-[1fr_80px_90px_90px_110px_120px] gap-3 px-5 py-3.5 border-b border-crm-border last:border-b-0 hover:bg-gray-50/60 transition-colors items-center min-w-[580px]"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-dark truncate">{m.name}</p>
                {m.is_low_stock && (
                  <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] font-bold bg-error/10 text-error rounded-full">
                    LOW
                  </span>
                )}
              </div>
            </div>
            <span className="text-sm text-text-muted">{m.unit || '—'}</span>
            <p className={`text-sm font-semibold text-right ${m.is_low_stock ? 'text-error' : 'text-dark'}`}>
              {fmtNum(m.stock_quantity)}
            </p>
            <p className="text-sm text-text-muted text-right">{fmtNum(m.min_stock)}</p>
            <p className="text-sm text-dark text-right">
              {parseFloat(m.cost_per_unit) > 0 ? fmtNum(m.cost_per_unit) + ' դ' : '—'}
            </p>
            <div className="flex items-center justify-end gap-1">
              <button
                onClick={() => onTransfer(m.id)}
                title="Տեղափոխել արտադրամաս"
                className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </button>
              <button
                onClick={() => onEdit(m)}
                title="խմբագրել"
                className="p-1.5 text-text-muted hover:text-warning hover:bg-warning/10 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                onClick={() => onDelete(m)}
                title="Djnjel"
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
  );
}

// ── MovementsTable ────────────────────────────────────────────────────────────

function MovementsTable({ movements, isLoading, onDelete }: {
  movements: import('@/services/warehouse.service').MovementDTO[];
  isLoading: boolean;
  onDelete:  (id: number) => void;
}) {
  if (isLoading) {
    return <div className="bg-white rounded-2xl border border-crm-border overflow-hidden p-4"><SkTable rows={6} cols={5} /></div>;
  }
  if (movements.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3">
        <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </div>
        <p className="text-sm text-text-muted">Շարժումներ չկան</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-crm-border overflow-hidden">
      {/* Mobile card list */}
      <div className="sm:hidden divide-y divide-crm-border">
        {movements.map((mv) => (
          <div key={mv.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors">
            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${mv.direction === 'in' ? 'bg-success/10' : 'bg-primary/10'}`}>
              <span className={`text-xs font-bold ${mv.direction === 'in' ? 'text-success' : 'text-primary'}`}>
                {mv.direction === 'in' ? '↓' : '→'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-dark truncate">{mv.material_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-semibold text-dark">{fmtNum(mv.quantity)}</span>
                {mv.note && <span className="text-xs text-text-muted truncate">{mv.note}</span>}
              </div>
              <p className="text-[11px] text-text-muted mt-0.5">{fmtDate(mv.created_at)}</p>
            </div>
            <button
              onClick={() => onDelete(mv.id)}
              className="flex-shrink-0 p-2 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto">
        <div className="grid grid-cols-[1fr_80px_80px_1fr_120px_48px] gap-3 px-5 py-3 border-b border-crm-border bg-gray-50 min-w-[580px]">
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Նյութ</span>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Ողղութ.</span>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide text-right">Կանակ</span>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Նշում</span>
          <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Ամսաթիվ</span>
          <span />
        </div>
        {movements.map((mv) => (
          <div
            key={mv.id}
            className="grid grid-cols-[1fr_80px_80px_1fr_120px_48px] gap-3 px-5 py-3.5 border-b border-crm-border last:border-b-0 hover:bg-gray-50/60 transition-colors items-center min-w-[580px]"
          >
            <p className="text-sm font-semibold text-dark truncate">{mv.material_name}</p>
            <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-bold ${
              mv.direction === 'in' ? 'bg-success/10 text-success' : 'bg-primary/10 text-primary'
            }`}>
              {mv.direction === 'in' ? 'Ներս' : 'Արտադր.'}
            </span>
            <p className="text-sm font-semibold text-dark text-right">{fmtNum(mv.quantity)}</p>
            <p className="text-sm text-text-muted truncate">{mv.note || '—'}</p>
            <p className="text-xs text-text-muted">{fmtDate(mv.created_at)}</p>
            <button
              onClick={() => onDelete(mv.id)}
              className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function WarehousePage() {
  const queryClient = useQueryClient();
  const router      = useRouter();

  const [search,     setSearch]     = useState('');
  const [addMat,     setAddMat]     = useState(false);
  const [editMat,    setEditMat]    = useState<MaterialDTO | null>(null);
  const [deleteMat,  setDeleteMat]  = useState<MaterialDTO | null>(null);
  const [transfer,   setTransfer]   = useState<number | true | null>(null);


  const { data: materials = [], isLoading: matsLoading } = useQuery({
    queryKey: ['wh-materials'],
    queryFn:  warehouseService.getMaterials,
  });


  const { mutate: deleteMaterial, isPending: deletingMat } = useMutation({
    mutationFn: (id: number) => warehouseService.deleteMaterial(id),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['wh-materials'] }); setDeleteMat(null); },
  });

  const filteredMats = useMemo(() => {
    const q = search.toLowerCase();
    return !q ? materials : materials.filter((m) => m.name.toLowerCase().includes(q) || m.unit.toLowerCase().includes(q));
  }, [materials, search]);

  return (
    <div className="animate-fade-in absolute inset-0 flex flex-col p-4 overflow-y-auto">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 sm:mb-5 flex-shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-dark">Պահեստ</h1>
          <p className="text-xs text-text-muted mt-0.5">{materials.length} Նյութ</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTransfer(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-white border border-crm-border hover:border-primary text-dark hover:text-primary text-sm font-semibold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
            </svg>
            <span className="hidden sm:inline">Տեղափոխել արտադրամաս</span>
            <span className="sm:hidden">Տեղափոխել</span>
          </button>
          <button
            onClick={() => setAddMat(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span className="hidden sm:inline">Ավելացնել Նյութ</span>
            <span className="sm:hidden">Ավելացնել</span>
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className="relative mb-4 flex-shrink-0">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Որոնել..."
          className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-crm-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* ── Materials table ── */}
      <MaterialsTable
        materials={filteredMats}
        isLoading={matsLoading}
        onEdit={setEditMat}
        onDelete={setDeleteMat}
        onTransfer={(id) => setTransfer(id)}
        onIncoming={() => {}}
      />

      <div className="h-6 flex-shrink-0" />

      {/* ── Modals ── */}
      {addMat   && <AddMaterialModal onClose={() => setAddMat(false)} />}
      {editMat  && <EditMaterialModal material={editMat} onClose={() => setEditMat(null)} />}
      {deleteMat && (
        <DeleteConfirm
          name={deleteMat.name}
          isPending={deletingMat}
          onCancel={() => setDeleteMat(null)}
          onConfirm={() => deleteMaterial(deleteMat.id)}
        />
      )}
      {transfer !== null && (
        <TransferModal
          materials={materials}
          preselect={typeof transfer === 'number' ? transfer : undefined}
          onClose={() => setTransfer(null)}
          onSuccess={() => router.push('/workshops')}
        />
      )}
    </div>
  );
}

