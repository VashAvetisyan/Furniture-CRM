'use client';

import { useState } from 'react';
import { SkTable, SkListRow } from '@/components/ui/Skeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { otherDebtService, type OtherDebtDTO, type DebtPayment } from '@/services/debt.service';
import { financeService } from '@/services/finance.service';
import { useToastStore } from '@/stores/toast';
import { toLocalDateTimeInput } from '@/lib/date';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v?: string | null): string {
  if (!v) return '—';
  const n = parseFloat(v);
  if (isNaN(n)) return v;
  return n.toLocaleString('ru-RU') + ' ֏';
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmtDateTime(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  paid:    { label: 'Վճարված',   cls: 'bg-success/10 text-success' },
  partial: { label: 'Մասամբ',    cls: 'bg-warning/10 text-warning' },
  pending: { label: 'Չվճարված',  cls: 'bg-error/10 text-error'     },
  overdue: { label: 'Ուշացած',   cls: 'bg-red-100 text-red-700'    },
};

const DIRECTION_MAP: Record<string, { label: string; cls: string }> = {
  owed_to_us: { label: 'Դեբիտ',  cls: 'bg-success/10 text-success' },
  we_owe:     { label: 'Կրեդիտ', cls: 'bg-error/10 text-error'     },
};

const STATUS_FILTERS = [
  { value: '',        label: 'Բոլոր' },
  { value: 'pending', label: 'Չվճարված' },
  { value: 'partial', label: 'Մասամբ' },
  { value: 'paid',    label: 'Վճարված' },
];

const DIRECTION_FILTERS = [
  { value: '',            label: 'Բոլոր' },
  { value: 'owed_to_us',  label: 'Դեբիտ' },
  { value: 'we_owe',      label: 'Կրեդիտ' },
];

const INPUT_CLS = 'w-full px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white transition-all';

function XIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
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

// ── Direction toggle ─────────────────────────────────────────────────────────

function DirectionToggle({ value, onChange }: { value: 'owed_to_us' | 'we_owe'; onChange: (v: 'owed_to_us' | 'we_owe') => void }) {
  return (
    <div className="flex gap-2">
      {(['owed_to_us', 'we_owe'] as const).map((d) => (
        <button key={d} type="button" onClick={() => onChange(d)}
          className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-colors ${value === d ? 'border-primary bg-primary/5 text-primary' : 'border-crm-border text-text-muted hover:bg-gray-50'}`}>
          {DIRECTION_MAP[d].label}
        </button>
      ))}
    </div>
  );
}

// ── Pay method toggle ────────────────────────────────────────────────────────

function PayMethodToggle({ value, onChange }: { value: 'cash' | 'card'; onChange: (v: 'cash' | 'card') => void }) {
  return (
    <div className="flex gap-2">
      {(['cash', 'card'] as const).map((m) => (
        <button key={m} type="button" onClick={() => onChange(m)}
          className={`flex-1 py-2 text-sm font-semibold rounded-xl border transition-colors ${value === m ? 'border-primary bg-primary/5 text-primary' : 'border-crm-border text-text-muted hover:bg-gray-50'}`}>
          {m === 'cash' ? 'Կանխիկ' : 'Բանկային Կարտ'}
        </button>
      ))}
    </div>
  );
}

// ── Add Debt Modal ────────────────────────────────────────────────────────────

function AddDebtModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [partyName,     setPartyName]     = useState('');
  const [direction,     setDirection]     = useState<'owed_to_us' | 'we_owe'>('we_owe');
  const [title,         setTitle]         = useState('');
  const [amount,        setAmount]        = useState('');
  const [dueDate,       setDueDate]       = useState(() => toLocalDateTimeInput(new Date()));
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash');
  const [notes,         setNotes]         = useState('');
  const [err,           setErr]           = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => otherDebtService.create({
      party_name: partyName.trim(),
      direction,
      title:      title.trim(),
      amount:     amount.trim(),
      due_date:   dueDate || undefined,
      notes:      notes.trim() || undefined,
    }),
    onSuccess: async () => {
      qc.invalidateQueries({ queryKey: ['other-debts'] });
      // The debt itself is already saved at this point — the Finance entry
      // below is best-effort bookkeeping and must NOT surface as a creation
      // error (that would tempt a retry and create a duplicate debt).
      // "owed_to_us" means we're the one handing out cash right now (a
      // loan/advance that makes the other party owe us back) — money leaves us.
      // "we_owe" means the other party is the one handing us cash right now
      // (a loan we're taking) — money comes in to us. Either way, cash moves
      // at the moment the debt is created, so both get a linked transaction.
      try {
        await financeService.create({
          direction:        direction === 'owed_to_us' ? 'out' : 'in',
          category:         'other',
          amount:           parseFloat(amount.trim()),
          description:      `Պարտք՝ ${partyName.trim()}${title.trim() ? ' — ' + title.trim() : ''}`,
          transaction_date: new Date().toISOString(),
          payment_method:   paymentMethod,
        });
        qc.invalidateQueries({ queryKey: ['finance-transactions'] });
        qc.invalidateQueries({ queryKey: ['finance-summary'] });
      } catch {
        useToastStore.getState().addToast({
          type:    'warning',
          message: 'Պարտքը պահպանվեց, բայց Մուտք/Ելք գործարքը չստեղծվեց ավտոմատ — ավելացրեք ձեռքով։',
        });
      }
      onClose();
    },
    onError: (e: Error) => setErr(e.message),
  });

  function submit() {
    if (!partyName.trim()) { setErr('Կողմի անուն'); return; }
    if (!title.trim()) { setErr('Վերնագիր'); return; }
    if (!amount.trim() || parseFloat(amount) <= 0) { setErr('Գումարի մուտքը'); return; }
    setErr('');
    mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[460px] mx-4 flex flex-col max-h-[90vh] animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border flex-shrink-0">
          <h2 className="text-base font-bold text-dark">Ավելացնել Պարտք</h2>
          <button onClick={onClose} className="text-text-muted hover:text-dark"><XIcon /></button>
        </div>
        <div className="px-6 py-5 flex flex-col gap-4 overflow-y-auto flex-1">
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Կողմ *</label>
            <input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Օր. Վարձատու ՍՊԸ" className={INPUT_CLS} />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Ուղղություն *</label>
            <DirectionToggle value={direction} onChange={setDirection} />
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Վերնագիր *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Գրասենյակի վարձավճար" className={INPUT_CLS} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-text-muted mb-1.5 block">Գումար (֏) *</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" min="0" className={INPUT_CLS} />
            </div>
            <div>
              <label className="text-xs font-semibold text-text-muted mb-1.5 block">Կատարման ամսաթիվ</label>
              <input type="datetime-local" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={INPUT_CLS} />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Վճարման եղանակ</label>
            <PayMethodToggle value={paymentMethod} onChange={setPaymentMethod} />
            <p className="text-[11px] text-text-muted mt-1.5">
              Գումարը կգրանցվի որպես {direction === 'owed_to_us' ? 'ելք' : 'մուտք'} Մուտք/Ելք բաժնում
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Նշում</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${INPUT_CLS} resize-none`} />
          </div>
          {err && <p className="text-xs text-error bg-error/5 px-3 py-2 rounded-lg">{err}</p>}
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-crm-border justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2.5 text-sm font-semibold rounded-xl border border-crm-border text-dark hover:bg-gray-50 transition-colors">
            Չեղարկել
          </button>
          <button onClick={submit} disabled={isPending}
            className="px-5 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40">
            {isPending ? '...' : 'Ավելացնել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Pay Modal ─────────────────────────────────────────────────────────────────

function PayModal({ debt, onClose }: { debt: OtherDebtDTO; onClose: () => void }) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState(debt.balance ?? debt.amount ?? '');
  const [paidAt, setPaidAt] = useState(() => toLocalDateTimeInput(new Date()));
  const [method, setMethod] = useState<'cash' | 'card'>('cash');
  const [note,   setNote]   = useState('');
  const [err,    setErr]    = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => otherDebtService.pay(debt.id, {
      amount:         amount.trim(),
      paid_at:        paidAt || undefined,
      payment_method: method,
      note:           note.trim() || undefined,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['other-debts'] });
      onClose();
    },
    onError: (e: Error) => setErr(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 flex flex-col gap-4 animate-fade-in">
        <div>
          <h3 className="text-base font-bold text-dark">Վճարում կատարել</h3>
          <p className="text-xs text-text-muted mt-0.5">
            {debt.direction === 'owed_to_us' ? 'Կստանանք' : 'Կվճարենք'} — Մնացած՝ {fmt(debt.balance)}
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Գումար (֏)</label>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className={INPUT_CLS}
              type="number"
              min="0"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Վճարման եղանակ</label>
            <PayMethodToggle value={method} onChange={setMethod} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Վճ. Ամսաթիվ</label>
            <input type="datetime-local" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} className={INPUT_CLS} />
          </div>
          <div>
            <label className="text-[11px] font-bold text-text-muted uppercase tracking-wide mb-1.5 block">Նշում</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="..." className={INPUT_CLS} />
          </div>
          {err && <p className="text-xs text-error bg-error/5 px-3 py-2 rounded-lg">{err}</p>}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-crm-border text-dark hover:bg-gray-50 transition-colors"
          >
            Չեղարկել
          </button>
          <button
            onClick={() => mutate()}
            disabled={isPending || !amount.trim()}
            className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-success text-white hover:bg-green-600 transition-colors disabled:opacity-60"
          >
            {isPending ? '...' : 'Վճարել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Payments History Modal ────────────────────────────────────────────────────

function PaymentsModal({ debt, onClose }: { debt: OtherDebtDTO; onClose: () => void }) {
  const { data: payments = [], isLoading } = useQuery<DebtPayment[]>({
    queryKey: ['other-debt-payments', debt.id],
    queryFn:  () => otherDebtService.getPayments(debt.id),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 flex flex-col gap-4 animate-fade-in max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-dark">Վճարումների Պատմություն</h3>
            <p className="text-xs text-text-muted mt-0.5">Կատարված վճարումների ցանկ</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-gray-100 text-text-muted transition-colors"
          >
            <XIcon />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {isLoading ? (
            <div className="p-3 space-y-1">{Array.from({ length: 5 }).map((_, i) => <SkListRow key={i} />)}</div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-muted">
              <svg className="w-8 h-8 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <p className="text-sm">Վճարումներ չկան</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-xl border border-crm-border">
                  <div>
                    <p className="text-sm font-bold text-success">{fmt(p.amount)}</p>
                    {p.note && <p className="text-xs text-text-muted mt-0.5">{p.note}</p>}
                  </div>
                  <p className="text-xs text-text-muted">{fmtDate(p.paid_at)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

const COLS = ['Կողմ', 'Ուղղություն', 'Ընդամենը', 'Վճարված', 'Մնացած', 'Ամսաթիվ', 'Կարգավիճակ', ''];

export default function OtherDebtPage() {
  const qc = useQueryClient();
  const [search,     setSearch]     = useState('');
  const [statusFilt, setStatusFilt] = useState('');
  const [dirFilt,    setDirFilt]    = useState('');
  const [addOpen,    setAddOpen]    = useState(false);
  const [payDebt,    setPayDebt]    = useState<OtherDebtDTO | null>(null);
  const [histDebt,   setHistDebt]   = useState<OtherDebtDTO | null>(null);
  const [delConfirm, setDelConfirm] = useState<OtherDebtDTO | null>(null);

  const { data: raw, isLoading, isError, refetch } = useQuery({
    queryKey: ['other-debts', statusFilt, dirFilt, search],
    queryFn:  () => otherDebtService.getAll({
      status:    statusFilt || undefined,
      direction: dirFilt || undefined,
      search:    search.trim() || undefined,
    }),
  });

  const debts: OtherDebtDTO[] = (() => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    const r = (raw as { results?: unknown })?.results;
    if (Array.isArray(r)) return r as OtherDebtDTO[];
    return [];
  })();

  const { mutate: deleteDebt } = useMutation({
    mutationFn: (id: number) => otherDebtService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['other-debts'] });
      setDelConfirm(null);
    },
  });

  return (
    <div className="animate-fade-in flex flex-col h-full overflow-hidden">

      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-4 flex-shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-error/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-dark truncate">Այլ Պարտքեր</h1>
            {debts.length > 0 && (
              <p className="text-xs text-text-muted">{debts.length} գրառում</p>
            )}
          </div>
        </div>
        <button
          onClick={() => setAddOpen(true)}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <PlusIcon /><span className="hidden sm:inline">Ավելացնել</span>
        </button>
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 pb-3 flex-shrink-0 flex flex-col gap-2">
        <div className="relative sm:max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Փնտրել կողմ, վերնագիր..."
            className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-dark"
            >
              <XIcon />
            </button>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1">
            {STATUS_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setStatusFilt(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${statusFilt === f.value ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1 bg-gray-100 rounded-xl p-1">
            {DIRECTION_FILTERS.map((f) => (
              <button key={f.value} onClick={() => setDirFilt(f.value)}
                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${dirFilt === f.value ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-6 pb-6">
        {isLoading ? (
          <div className="bg-white rounded-2xl border border-crm-border overflow-hidden p-4">
            <SkTable rows={6} cols={6} />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-text-muted">
            <svg className="w-10 h-10 opacity-30 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" />
              <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none" />
            </svg>
            <p className="text-sm font-medium text-error/70">Սերվերի սխալ</p>
            <button onClick={() => refetch()} className="text-xs text-primary font-semibold hover:underline">
              Կրկին փորձել
            </button>
          </div>
        ) : debts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-text-muted">
            <svg className="w-12 h-12 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            <p className="text-sm font-medium">Պարտքեր չկան</p>
          </div>
        ) : (
          <>
            {/* ── Mobile cards ── */}
            <div className="md:hidden flex flex-col gap-3">
              {debts.map((debt) => {
                const st  = STATUS_MAP[debt.status] ?? { label: debt.status_display ?? debt.status, cls: 'bg-gray-100 text-gray-600' };
                const dir = DIRECTION_MAP[debt.direction] ?? { label: debt.direction_display ?? debt.direction, cls: 'bg-gray-100 text-gray-600' };
                return (
                  <div key={debt.id} className="bg-white rounded-2xl border border-crm-border shadow-sm p-4 flex flex-col gap-3">
                    {/* Name + status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-dark">{debt.party_name}</p>
                        {debt.title && <p className="text-xs text-text-muted mt-0.5">{debt.title}</p>}
                      </div>
                      <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${st.cls}`}>
                        {st.label}
                      </span>
                    </div>

                    <span className={`self-start text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${dir.cls}`}>
                      {dir.label}
                    </span>

                    {/* Amounts */}
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 rounded-xl p-2">
                        <p className="text-[10px] text-text-muted mb-0.5">Ընդամենը</p>
                        <p className="text-xs font-bold text-dark">{fmt(debt.amount)}</p>
                      </div>
                      <div className="bg-success/5 rounded-xl p-2">
                        <p className="text-[10px] text-text-muted mb-0.5">Վճարված</p>
                        <p className="text-xs font-bold text-success">{fmt(debt.paid_amount)}</p>
                      </div>
                      <div className="bg-error/5 rounded-xl p-2">
                        <p className="text-[10px] text-text-muted mb-0.5">Մնացած</p>
                        <p className={`text-xs font-bold ${parseFloat(debt.balance ?? '0') > 0 ? 'text-error' : 'text-success'}`}>{fmt(debt.balance)}</p>
                      </div>
                    </div>

                    {/* Taken date + actions */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-text-muted">
                        {fmtDateTime(debt.created_at)}
                      </span>
                      <div className="flex items-center gap-2">
                        {debt.status !== 'paid' && (
                          <button
                            onClick={() => setPayDebt(debt)}
                            className="px-3 py-1.5 text-xs font-semibold bg-success text-white rounded-lg hover:bg-green-600 transition-colors"
                          >
                            Վճարել
                          </button>
                        )}
                        <button
                          onClick={() => setHistDebt(debt)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-crm-border text-text-muted hover:text-primary hover:border-primary/40 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDelConfirm(debt)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-crm-border text-text-muted hover:text-error hover:border-error/40 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" /><path d="M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Desktop table ── */}
            <div className="hidden md:block bg-white rounded-2xl border border-crm-border shadow-sm overflow-x-auto">
              <div style={{ minWidth: "1010px" }}>
                <div
                  className="grid gap-3 px-4 py-2.5 bg-gray-50/80 border-b border-crm-border"
                  style={{ gridTemplateColumns: 'minmax(160px,1fr) 140px 120px 110px 120px 150px 130px 160px' }}
                >
                  {COLS.map((h) => (
                    <span key={h} className="text-[11px] font-bold text-text-muted uppercase tracking-wide">
                      {h}
                    </span>
                  ))}
                </div>

                {debts.map((debt) => {
                  const st  = STATUS_MAP[debt.status] ?? { label: debt.status_display ?? debt.status, cls: 'bg-gray-100 text-gray-600' };
                  const dir = DIRECTION_MAP[debt.direction] ?? { label: debt.direction_display ?? debt.direction, cls: 'bg-gray-100 text-gray-600' };

                  return (
                    <div
                      key={debt.id}
                      className="grid gap-3 px-4 py-3 border-b border-crm-border last:border-0 hover:bg-primary/[0.02] transition-colors items-center"
                      style={{ gridTemplateColumns: 'minmax(160px,1fr) 140px 120px 110px 120px 150px 130px 160px' }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-dark truncate">{debt.party_name}</p>
                        {debt.title && <p className="text-xs text-text-muted truncate">{debt.title}</p>}
                      </div>

                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-center whitespace-nowrap ${dir.cls}`}>
                        {dir.label}
                      </span>

                      <span className="text-sm font-bold text-dark">{fmt(debt.amount)}</span>
                      <span className="text-sm text-success font-semibold">{fmt(debt.paid_amount)}</span>
                      <span className={`text-sm font-bold ${parseFloat(debt.balance ?? '0') > 0 ? 'text-error' : 'text-success'}`}>
                        {fmt(debt.balance)}
                      </span>

                      <span className="text-xs font-medium text-dark">
                        {fmtDateTime(debt.created_at)}
                      </span>

                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full text-center whitespace-nowrap ${st.cls}`}>
                        {st.label}
                      </span>

                      <div className="flex items-center gap-2 justify-end pr-1">
                        {debt.status !== 'paid' && (
                          <button
                            onClick={() => setPayDebt(debt)}
                            className="px-3 py-1.5 text-xs font-semibold bg-success text-white rounded-lg hover:bg-green-600 transition-colors whitespace-nowrap"
                          >
                            Վճարել
                          </button>
                        )}
                        <button
                          onClick={() => setHistDebt(debt)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-crm-border text-text-muted hover:text-primary hover:border-primary/40 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDelConfirm(debt)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg border border-crm-border text-text-muted hover:text-error hover:border-error/40 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 11v6" /><path d="M14 11v6" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {addOpen    && <AddDebtModal  onClose={() => setAddOpen(false)}  />}
      {payDebt    && <PayModal      debt={payDebt}  onClose={() => setPayDebt(null)}  />}
      {histDebt   && <PaymentsModal debt={histDebt} onClose={() => setHistDebt(null)} />}

      {delConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-80 flex flex-col gap-4 animate-fade-in">
            <div>
              <p className="text-base font-bold text-dark">Ջնջե՞լ Պարտքը</p>
              <p className="text-sm text-text-muted mt-1">
                {delConfirm.party_name} — {fmt(delConfirm.amount)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDelConfirm(null)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-crm-border text-dark hover:bg-gray-50 transition-colors"
              >
                Չեղարկել
              </button>
              <button
                onClick={() => deleteDebt(delConfirm.id)}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-error text-white hover:bg-red-600 transition-colors"
              >
                Ջնջել
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
