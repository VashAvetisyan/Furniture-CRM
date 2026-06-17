'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores';
import {
  supplierService,
  supplierDebtService,
  type SupplierDTO,
  type SupplierDebtDTO,
} from '@/services/supplier.service';

// ── Status maps ────────────────────────────────────────────────────────────────

const DEBT_STATUS: Record<string, { label: string; cls: string }> = {
  paid:    { label: 'Վճարված',   cls: 'bg-success/10 text-success' },
  partial: { label: 'Մասնակի',     cls: 'bg-warning/10 text-warning' },
  pending: { label: 'Չվճարված', cls: 'bg-error/10 text-error'     },
  overdue: { label: 'կալանծած',   cls: 'bg-red-100 text-red-700'    },
};


const DEBT_FILTERS = [
  { value: '',        label: 'Բոլոր' },
  { value: 'pending', label: 'Չվճարված' },
  { value: 'partial', label: 'Մասնակի' },
  { value: 'paid',    label: 'Վճարված' },
  { value: 'overdue', label: 'կալանծած' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (v?: string | null) =>
  v == null ? '—' : `${parseFloat(v).toLocaleString('hy-AM')} ֏`;

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('hy-AM', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

function XIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function BalanceIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

// ── ConfirmModal ───────────────────────────────────────────────────────────────

function ConfirmModal({ title, text, onConfirm, onClose }: {
  title: string; text: string; onConfirm: () => void; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4">
        <p className="text-base font-bold text-dark text-center">{title}</p>
        <p className="text-sm text-text-muted text-center">{text}</p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-crm-border text-dark hover:bg-gray-50">
            Չեղարկել
          </button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-error text-white hover:bg-red-600">
            Ջնջել
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SupplierModal ──────────────────────────────────────────────────────────────

function SupplierModal({ supplier, onClose }: { supplier?: SupplierDTO; onClose: () => void }) {
  const qc = useQueryClient();
  const [name,    setName]    = useState(supplier?.name ?? '');
  const [contact, setContact] = useState(supplier?.contact_person ?? '');
  const [phone,   setPhone]   = useState(supplier?.phone ?? '');
  const [email,   setEmail]   = useState(supplier?.email ?? '');
  const [address, setAddress] = useState(supplier?.address ?? '');
  const [notes,   setNotes]   = useState(supplier?.notes ?? '');
  const [active,  setActive]  = useState(supplier?.is_active ?? true);
  const [err,     setErr]     = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () =>
      supplier
        ? supplierService.update(supplier.id, {
            name: name.trim(), contact_person: contact.trim() || undefined,
            phone: phone.trim() || undefined, email: email.trim() || undefined,
            address: address.trim() || undefined, notes: notes.trim() || undefined, is_active: active,
          })
        : supplierService.create({
            name: name.trim(), contact_person: contact.trim() || undefined,
            phone: phone.trim() || undefined, email: email.trim() || undefined,
            address: address.trim() || undefined, notes: notes.trim() || undefined, is_active: active,
          }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); onClose(); },
    onError:   (e: Error) => setErr(e.message),
  });

  function submit() {
    if (!name.trim()) { setErr('Անուն'); return; }
    setErr('');
    mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border flex-shrink-0">
          <h2 className="text-base font-bold text-dark">
            {supplier ? 'Խմբագրել Մատակարար' : 'Ավելացնել Մատակարար'}
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-dark"><XIcon /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Անուն *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Մատակարարի անուն"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-muted mb-1.5 block">Կոնտակտային անձ</label>
              <input value={contact} onChange={(e) => setContact(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted mb-1.5 block">Հեռախոսահամար</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-muted mb-1.5 block">Էլ. Հասցե</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted mb-1.5 block">Հասցե</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Նկարագրություն</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-4 h-4 rounded" />
            <span className="text-sm text-dark">Ակտիվ</span>
          </label>
          {err && <p className="text-xs text-error">{err}</p>}
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-crm-border justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50">
            Չեղարկել
          </button>
          <button onClick={submit} disabled={isPending}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover disabled:opacity-40">
            {isPending ? '...' : 'Պահպանել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BalanceModal ───────────────────────────────────────────────────────────────

function BalanceModal({ supplier, onClose }: { supplier: SupplierDTO; onClose: () => void }) {
  const { data = [], isLoading } = useQuery<SupplierDebtDTO[]>({
    queryKey: ['supplier-balance-debts', supplier.id],
    queryFn:  () => supplierDebtService.getAll({ supplier: supplier.id }),
  });

  const totalAmount  = data.reduce((s, d) => s + parseFloat(d.amount     || '0'), 0);
  const totalPaid    = data.reduce((s, d) => s + parseFloat(d.paid_amount || '0'), 0);
  const totalBalance = data.reduce((s, d) => s + parseFloat(d.balance     || '0'), 0);
  const unpaidCount  = data.filter(d => d.status !== 'paid').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[380px] mx-4 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <h2 className="text-base font-bold text-dark">{supplier.name} — Բալանս</h2>
          <button onClick={onClose} className="text-text-muted hover:text-dark"><XIcon /></button>
        </div>
        <div className="px-6 py-5">
          {isLoading ? (
            <div className="flex justify-center py-8 text-text-muted text-sm">…</div>
          ) : (
            <div className="flex flex-col gap-3">
              <BalRow label="Պարտքներ" value={String(data.length)} />
              <BalRow label="Չվճարված Պարտքներ" value={String(unpaidCount)} color="text-error" />
              <hr className="border-crm-border" />
              <BalRow label="Համարկե Գումար" value={fmt(String(totalAmount))} />
              <BalRow label="Վճարված" value={fmt(String(totalPaid))} color="text-success" />
              <BalRow
                label="Մնացած"
                value={fmt(String(totalBalance))}
                color={totalBalance > 0 ? 'text-error font-bold' : 'text-success font-bold'}
              />
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-crm-border flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50">
            Չեղարկել
          </button>
        </div>
      </div>
    </div>
  );
}

function BalRow({ label, value, color = 'text-dark' }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-text-muted">{label}</span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

// ── Supplier autocomplete input ────────────────────────────────────────────────

function SupplierSelect({
  suppliers, value, onChange,
}: { suppliers: SupplierDTO[]; value: string; onChange: (id: string, name: string) => void }) {
  const [q, setQ]           = useState(value ? suppliers.find((s) => String(s.id) === value)?.name ?? '' : '');
  const [open, setOpen]     = useState(false);
  const filtered            = q.trim()
    ? suppliers.filter((s) => s.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6)
    : suppliers.slice(0, 6);

  return (
    <div className="relative">
      <input
        value={q}
        onChange={(e) => { setQ(e.target.value); setOpen(true); onChange('', ''); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Որոնել..."
        className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-crm-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map((s) => (
            <button key={s.id} type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(String(s.id), s.name); setQ(s.name); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 font-medium text-dark"
            >{s.name}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PayMethodToggle ────────────────────────────────────────────────────────────

function PayMethodToggle({ value, onChange }: { value: 'cash' | 'card'; onChange: (v: 'cash' | 'card') => void }) {
  return (
    <div className="flex gap-2">
      {(['cash', 'card'] as const).map((m) => (
        <button key={m} type="button" onClick={() => onChange(m)}
          className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-colors ${value === m ? 'border-primary bg-primary/5 text-primary' : 'border-crm-border text-text-muted hover:bg-gray-50'}`}>
          {m === 'cash' ? 'Կանկի' : 'Բանկային Կարտ'}
        </button>
      ))}
    </div>
  );
}

// ── DebtModal ──────────────────────────────────────────────────────────────────

function DebtModal({ suppliers, onClose }: { suppliers: SupplierDTO[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [supplierId, setSupplierId] = useState('');
  const [title,      setTitle]      = useState('');
  const [amount,     setAmount]     = useState('');
  const [dueDate,    setDueDate]    = useState('');
  const [notes,      setNotes]      = useState('');
  const [err,        setErr]        = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => supplierDebtService.create({
      supplier: Number(supplierId),
      title:    title.trim(),
      amount:   amount.trim(),
      due_date: dueDate || undefined,
      notes:    notes.trim() || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-debts'] }); onClose(); },
    onError:   (e: Error) => setErr(e.message),
  });

  function submit() {
    if (!supplierId) { setErr('Մատակարար'); return; }
    if (!title.trim()) { setErr('Վերնագիր'); return; }
    if (!amount.trim() || parseFloat(amount) <= 0) { setErr('Գումարի մուտքը'); return; }
    setErr('');
    mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[460px] mx-4 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border flex-shrink-0">
          <h2 className="text-base font-bold text-dark">Ավելացնել Պարտքներ</h2>
          <button onClick={onClose} className="text-text-muted hover:text-dark"><XIcon /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Մատակարար *</label>
            <SupplierSelect suppliers={suppliers} value={supplierId} onChange={(id) => setSupplierId(id)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Վերնագիր *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-muted mb-1.5 block">Գումար (֏) *</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0"
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted mb-1.5 block">Կատարման ամսաթիվ</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Նկարագրություն</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
          </div>
          {err && <p className="text-xs text-error">{err}</p>}
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-crm-border justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50">
            Չեղարկել
          </button>
          <button onClick={submit} disabled={isPending}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover disabled:opacity-40">
            {isPending ? '...' : 'Ավելացնել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PayDebtModal ───────────────────────────────────────────────────────────────

function PayDebtModal({ debt, onClose }: { debt: SupplierDebtDTO; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'cash' | 'card'>('cash');
  const [note,   setNote]   = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => supplierDebtService.pay(debt.id, {
      amount:         amount.trim(),
      paid_at:        new Date().toISOString().slice(0, 10),
      payment_method: method,
      note:           note.trim() || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['supplier-debts'] }); onClose(); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[360px] mx-4 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <h2 className="text-base font-bold text-dark">Վչարում</h2>
          <button onClick={onClose} className="text-text-muted hover:text-dark"><XIcon /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-text-muted">{debt.supplier_name} — {debt.title}</p>
            <p className="text-sm font-bold text-error mt-0.5">Մնացած: {fmt(debt.balance)}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Գումար (֏)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
              max={parseFloat(debt.balance ?? debt.amount)} placeholder="0"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Վչարման եղանակ</label>
            <PayMethodToggle value={method} onChange={setMethod} />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Նկարագրություն</label>
            <input value={note} onChange={(e) => setNote(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-crm-border justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50">
            Չեղարկել
          </button>
          <button onClick={() => mutate()} disabled={isPending || !amount || parseFloat(amount) <= 0}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-success text-white hover:bg-green-600 disabled:opacity-40">
            {isPending ? '...' : 'Վճարել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SuppliersTab ───────────────────────────────────────────────────────────────

function SuppliersTab() {
  const qc         = useQueryClient();
  const isDirector = useAuthStore((s) => s.role === 'director');
  const [search,     setSearch]     = useState('');
  const [addOpen,    setAddOpen]    = useState(false);
  const [editTarget, setEditTarget] = useState<SupplierDTO | null>(null);
  const [balTarget,  setBalTarget]  = useState<SupplierDTO | null>(null);
  const [delTarget,  setDelTarget]  = useState<SupplierDTO | null>(null);

  const { data = [], isLoading, isError, refetch } = useQuery<SupplierDTO[]>({
    queryKey: ['suppliers', search],
    queryFn:  () => supplierService.getAll(search ? { search } : undefined),
    staleTime: 30_000,
  });

  const { mutate: doDelete } = useMutation({
    mutationFn: (id: number) => supplierService.delete(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['suppliers'] }); setDelTarget(null); },
  });

  return (
    <>
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-4 flex-shrink-0">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Որոնել..."
          className="w-full sm:flex-1 sm:max-w-xs px-3 py-2 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        {isDirector && (
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
            <PlusIcon />Ավելացնել
          </button>
        )}
      </div>

      <div className="flex-1 md:overflow-auto md:min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">…</div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <button onClick={() => refetch()} className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-white">Retry</button>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">Մատակարարներ չկան</div>
        ) : (
          <>
          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-3">
            {data.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border border-crm-border p-4 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-dark">{s.name}</p>
                    {s.contact_person && <p className="text-xs text-text-muted mt-0.5">{s.contact_person}</p>}
                  </div>
                  <span className={`ml-2 flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${s.is_active ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'}`}>
                    {s.is_active ? 'Ակտիվ' : '—'}
                  </span>
                </div>
                {(s.phone || s.address) && (
                  <div className="flex flex-col gap-1 mb-3 text-xs text-text-muted">
                    {s.phone   && <span>{s.phone}</span>}
                    {s.address && <span>{s.address}</span>}
                  </div>
                )}
                <div className="flex gap-1.5 justify-end pt-2 border-t border-crm-border">
                  <button onClick={() => setBalTarget(s)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-crm-border text-blue-500 hover:bg-blue-50 transition-colors">
                    <BalanceIcon />
                  </button>
                  {isDirector && (
                    <>
                      <button onClick={() => setEditTarget(s)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-crm-border text-text-muted hover:text-primary hover:border-primary/40 transition-colors">
                        <EditIcon />
                      </button>
                      <button onClick={() => setDelTarget(s)} className="w-8 h-8 flex items-center justify-center rounded-lg border border-crm-border text-text-muted hover:text-error hover:border-error/40 transition-colors">
                        <TrashIcon />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-crm-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div style={{ minWidth: '700px' }}>
                <div className="grid gap-3 px-4 py-2.5 bg-gray-50/80 border-b border-crm-border"
                  style={{ gridTemplateColumns: 'minmax(180px,1fr) 160px 140px 80px 120px' }}>
                  {['Անուն', 'Հեռախոսահամար', 'Հասցե', 'Ակտիվ', ''].map((h, i) => (
                    <span key={i} className="text-[11px] font-bold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</span>
                  ))}
                </div>
                {data.map((s) => (
                  <div key={s.id}
                    className="grid gap-3 px-4 py-3 border-b border-crm-border last:border-0 hover:bg-primary/[0.02] transition-colors items-center"
                    style={{ gridTemplateColumns: 'minmax(180px,1fr) 160px 140px 80px 120px' }}>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-dark truncate">{s.name}</p>
                      {s.contact_person && <p className="text-xs text-text-muted truncate">{s.contact_person}</p>}
                    </div>
                    <span className="text-sm text-dark">{s.phone ?? '—'}</span>
                    <span className="text-sm text-dark truncate">{s.address ?? '—'}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.is_active ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'}`}>
                      {s.is_active ? 'Ակտիվ' : '—'}
                    </span>
                    <div className="flex items-center gap-1.5 justify-end pr-1">
                      <button onClick={() => setBalTarget(s)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg border border-crm-border text-blue-500 hover:bg-blue-50 transition-colors" title="Բալանս">
                        <BalanceIcon />
                      </button>
                      {isDirector && (
                        <>
                          <button onClick={() => setEditTarget(s)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-crm-border text-text-muted hover:text-primary hover:border-primary/40 transition-colors">
                            <EditIcon />
                          </button>
                          <button onClick={() => setDelTarget(s)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg border border-crm-border text-text-muted hover:text-error hover:border-error/40 transition-colors">
                            <TrashIcon />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {addOpen    && <SupplierModal               onClose={() => setAddOpen(false)} />}
      {editTarget && <SupplierModal supplier={editTarget} onClose={() => setEditTarget(null)} />}
      {balTarget  && <BalanceModal  supplier={balTarget}  onClose={() => setBalTarget(null)} />}
      {delTarget  && (
        <ConfirmModal
          title="Մատակարար Ջնջել?"
          text="Այս գործությունը հետ դարնել հնարավոր չի լինի."
          onConfirm={() => doDelete(delTarget.id)}
          onClose={() => setDelTarget(null)}
        />
      )}
    </>
  );
}

// ── DebtsTab ───────────────────────────────────────────────────────────────────

function DebtsTab({ suppliers }: { suppliers: SupplierDTO[] }) {
  const qc = useQueryClient();
  const [suppFilter, setSuppFilter] = useState<number | ''>('');
  const [statusFilt, setStatusFilt] = useState('');
  const [addOpen,    setAddOpen]    = useState(false);
  const [payTarget,  setPayTarget]  = useState<SupplierDebtDTO | null>(null);
  const [delTarget,  setDelTarget]  = useState<SupplierDebtDTO | null>(null);

  const { data = [], isLoading, isError, refetch } = useQuery<SupplierDebtDTO[]>({
    queryKey: ['supplier-debts', suppFilter, statusFilt],
    queryFn:  () => supplierDebtService.getAll({
      supplier: suppFilter || undefined,
      status:   statusFilt || undefined,
    }),
  });

  const { mutate: doDelete } = useMutation({
    mutationFn: (id: number) => supplierDebtService.delete(id),
    onSuccess:  () => { qc.invalidateQueries({ queryKey: ['supplier-debts'] }); setDelTarget(null); },
  });

  const totalBalance = data.reduce((s, d) => s + parseFloat(d.balance ?? '0'), 0);

  return (
    <>
      <div className="flex flex-col gap-2 mb-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row gap-2">
          <select value={suppFilter} onChange={(e) => setSuppFilter(e.target.value ? Number(e.target.value) : '')}
            className="w-full sm:w-auto px-3 py-2 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white">
            <option value="">Բոլոր Մատակարարներ</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1">
            {DEBT_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setStatusFilt(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${statusFilt === f.value ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between sm:justify-end gap-3">
          {totalBalance > 0 && (
            <span className="text-sm font-semibold text-error">Մնացած: {fmt(String(totalBalance))}</span>
          )}
          <button onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
            <PlusIcon />Ավելացնել
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">…</div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <button onClick={() => refetch()} className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-white">Retry</button>
          </div>
        ) : data.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">Պարտքներ չկան</div>
        ) : (
          <>
          {/* Mobile cards */}
          <div className="sm:hidden flex flex-col gap-3">
            {data.map((debt) => {
              const st = DEBT_STATUS[debt.status] ?? { label: debt.status_display ?? debt.status, cls: 'bg-gray-100 text-gray-600' };
              const overdue = debt.due_date && debt.status !== 'paid' && new Date(debt.due_date) < new Date();
              return (
                <div key={debt.id} className="bg-white rounded-2xl border border-crm-border p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-dark truncate">{debt.supplier_name}</p>
                      <p className="text-xs text-text-muted mt-0.5 truncate">{debt.title}</p>
                    </div>
                    <span className={`ml-2 flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${st.cls}`}>{st.label}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 mb-3 text-xs">
                    <div>
                      <p className="text-text-muted mb-0.5">Գումար</p>
                      <p className="font-bold text-dark">{fmt(debt.amount)}</p>
                    </div>
                    <div>
                      <p className="text-text-muted mb-0.5">Վճարված</p>
                      <p className="font-semibold text-success">{fmt(debt.paid_amount)}</p>
                    </div>
                    <div>
                      <p className="text-text-muted mb-0.5">Մնացած</p>
                      <p className={`font-bold ${parseFloat(debt.balance ?? '0') > 0 ? 'text-error' : 'text-success'}`}>{fmt(debt.balance)}</p>
                    </div>
                  </div>
                  {debt.due_date && (
                    <p className={`text-xs mb-3 ${overdue ? 'text-error font-semibold' : 'text-text-muted'}`}>
                      {overdue && '⚠ '}Կատարման ամսաթիվ: {fmtDate(debt.due_date)}
                    </p>
                  )}
                  <div className="flex gap-1.5 justify-end pt-2 border-t border-crm-border">
                    {debt.status !== 'paid' && (
                      <button onClick={() => setPayTarget(debt)}
                        className="px-3 py-1.5 text-xs font-semibold bg-success text-white rounded-lg hover:bg-green-600 transition-colors">
                        Վճարել
                      </button>
                    )}
                    <button onClick={() => setDelTarget(debt)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-crm-border text-text-muted hover:text-error hover:border-error/40 transition-colors">
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block bg-white rounded-2xl border border-crm-border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div style={{ minWidth: '960px' }}>
                <div className="grid gap-3 px-4 py-2.5 bg-gray-50/80 border-b border-crm-border"
                  style={{ gridTemplateColumns: 'minmax(160px,1fr) 160px 100px 100px 110px 130px 110px 120px' }}>
                  {['Մատակարար', 'Վերնագիր', 'Գումար', 'Վճարված', 'Մնացած', 'Կատարման ամսաթիվ', '', ''].map((h, i) => (
                    <span key={i} className="text-[11px] font-bold text-text-muted uppercase tracking-wide whitespace-nowrap">{h}</span>
                  ))}
                </div>
                {data.map((debt) => {
                  const st = DEBT_STATUS[debt.status] ?? { label: debt.status_display ?? debt.status, cls: 'bg-gray-100 text-gray-600' };
                  const overdue = debt.due_date && debt.status !== 'paid' && new Date(debt.due_date) < new Date();
                  return (
                    <div key={debt.id}
                      className="grid gap-3 px-4 py-3 border-b border-crm-border last:border-0 hover:bg-primary/[0.02] transition-colors items-center"
                      style={{ gridTemplateColumns: 'minmax(160px,1fr) 160px 100px 100px 110px 130px 110px 120px' }}>
                      <span className="text-sm font-semibold text-dark truncate">{debt.supplier_name}</span>
                      <span className="text-sm text-dark truncate">{debt.title}</span>
                      <span className="text-sm font-bold text-dark">{fmt(debt.amount)}</span>
                      <span className="text-sm text-success font-semibold">{fmt(debt.paid_amount)}</span>
                      <span className={`text-sm font-bold ${parseFloat(debt.balance ?? '0') > 0 ? 'text-error' : 'text-success'}`}>{fmt(debt.balance)}</span>
                      <span className={`text-xs ${overdue ? 'text-error font-semibold' : 'text-dark'}`}>
                        {overdue && '⚠ '}{fmtDate(debt.due_date)}
                      </span>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-center whitespace-nowrap ${st.cls}`}>{st.label}</span>
                      <div className="flex items-center gap-1.5 justify-end pr-1">
                        {debt.status !== 'paid' && (
                          <button onClick={() => setPayTarget(debt)}
                            className="px-3 py-1.5 text-xs font-semibold bg-success text-white rounded-lg hover:bg-green-600 transition-colors whitespace-nowrap">
                            Վճարել
                          </button>
                        )}
                        <button onClick={() => setDelTarget(debt)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-crm-border text-text-muted hover:text-error hover:border-error/40 transition-colors">
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          </>
        )}
      </div>

      {addOpen   && <DebtModal    suppliers={suppliers} onClose={() => setAddOpen(false)} />}
      {payTarget && <PayDebtModal debt={payTarget}      onClose={() => setPayTarget(null)} />}
      {delTarget && (
        <ConfirmModal
          title="Պարտքներ Ջնջել?"
          text="Այս գործությունը հետ դարնել հնարավոր չի լինի."
          onConfirm={() => doDelete(delTarget.id)}
          onClose={() => setDelTarget(null)}
        />
      )}
    </>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

type Tab = 'suppliers' | 'debts';

export default function SuppliersPage() {

  const [tab, setTab] = useState<Tab>('suppliers');

  const { data: suppliers = [] } = useQuery<SupplierDTO[]>({
    queryKey: ['suppliers', ''],
    queryFn:  () => supplierService.getAll(),
    staleTime: 60_000,
  });

  const TABS: { key: Tab; label: string }[] = [
    { key: 'suppliers', label: 'Մատակարարներ' },
    { key: 'debts', label: 'Պարտքներ' },
  ];

  return (
    <div className="animate-fade-in flex flex-col p-4 md:absolute md:inset-0 md:overflow-hidden">
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-dark">Մատակարարներ</h1>
          <p className="text-xs text-text-muted mt-0.5">{suppliers.length} մատակարարներ</p>
        </div>
      </div>

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-5 flex-shrink-0">
      {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col md:min-h-0">
        {tab === 'suppliers' && <SuppliersTab />}

        {tab === 'debts'     && <DebtsTab suppliers={suppliers} />}
      </div>
    </div>
  );
}
