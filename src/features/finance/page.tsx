'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '@/services/finance.service';
import type { TransactionDTO, TransactionCategory, TransactionDirection, CreateTransactionRequest, CustomCategory } from '@/services/finance.service';
import { transferService } from '@/services/transfer.service';
import type { TransferDTO, TransferDirection } from '@/services/transfer.service';
import { useAuthStore } from '@/stores';
import { toLocalDateTimeInput } from '@/lib/date';

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<TransactionCategory, string> = {
  payment_advance:  'Կանխավճար',
  payment_final:    'Վերջնավճար',
  payment:          'Վճարում',
  salary:           'Աշխատավարձ',
  supplier_payment: 'Մատակարարի վճար',
  operating:        'Ծախսեր',
  other:            'Այլ',
};

const CATEGORIES = Object.entries(CATEGORY_LABELS) as [TransactionCategory, string][];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('hy-AM') + ' ֏';
const fmtAmt = (s: string) => parseFloat(s) || 0;
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString('hy-AM', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// ── Creatable category combobox ───────────────────────────────────────────────

interface CatOption { value: string; label: string; isCustom?: boolean; }

function FinanceCategoryCombo({
  builtIn, custom, input, resolved, onChange,
}: {
  builtIn:  [TransactionCategory, string][];
  custom:   CustomCategory[];
  input:    string;
  resolved: string | null;
  onChange: (input: string, resolved: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const allOptions: CatOption[] = [
    ...builtIn.map(([k, label]) => ({ value: k, label })),
    ...custom.map((c) => ({ value: `custom:${c.id}`, label: c.name, isCustom: true })),
  ];

  const filtered = input.trim()
    ? allOptions.filter((o) => o.label.toLowerCase().includes(input.toLowerCase()))
    : allOptions;

  const exactMatch = allOptions.find((o) => o.label.toLowerCase() === input.trim().toLowerCase());
  const isNew = input.trim() && !exactMatch;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function select(opt: CatOption) {
    onChange(opt.label, opt.value);
    setOpen(false);
  }

  return (
    <div ref={ref} className="relative">
      <input
        value={input}
        onChange={(e) => { onChange(e.target.value, null); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Մուտքագրեք կամ ընտրեք..."
        className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
      />
      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-crm-border rounded-xl shadow-lg overflow-hidden max-h-52 overflow-y-auto">
          {filtered.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); select(opt); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-primary/5 transition-colors border-b border-crm-border/40 last:border-0 ${
                resolved === opt.value ? 'bg-primary/5 font-semibold text-primary' : 'text-dark'
              }`}
            >
              {opt.label}
              {opt.isCustom && <span className="ml-1 text-[10px] text-text-muted">(custom)</span>}
            </button>
          ))}
          {isNew && (
            <div className="px-3 py-2 text-sm text-primary/80 border-t border-crm-border/40 bg-primary/5 flex items-center gap-1.5">
              <span className="text-xs">+</span>
              <span>«{input.trim()}» — Կստեղծվի նոր բաժին</span>
            </div>
          )}
          {filtered.length === 0 && !isNew && (
            <p className="px-3 py-2 text-sm text-text-muted">Chgtvec</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Transfer Modal ────────────────────────────────────────────────────────────

function TransferModal({ onClose, editing }: { onClose: () => void; editing?: TransferDTO }) {
  const qc = useQueryClient();
  const [direction, setDirection] = useState<TransferDirection>(editing?.direction ?? 'cash_to_card');
  const [amount, setAmount]       = useState(editing ? String(parseFloat(editing.amount)) : '');
  const [date, setDate]           = useState(() => {
    if (editing?.transferDate) return toLocalDateTimeInput(new Date(editing.transferDate));
    return toLocalDateTimeInput(new Date());
  });
  const [note, setNote] = useState(editing?.note ?? '');

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const payload = { amount: parseFloat(amount), direction, transferDate: date, note: note.trim() || undefined };
      return editing
        ? transferService.update(editing.id, payload)
        : transferService.create(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-transfers'] });
      onClose();
    },
  });

  const DIR_OPTIONS: { value: TransferDirection; label: string; icon: string }[] = [
    { value: 'cash_to_card', label: 'Կանխիկ → Քարտով', icon: '💵→💳' },
    { value: 'card_to_cash', label: 'Քարտով → Կանխիկ', icon: '💳→💵' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto py-6" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] mx-4 my-auto flex flex-col max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <h2 className="text-base font-bold text-dark">{editing ? 'Փոխել' : 'Նոր Տրանսֆեր'}</h2>
          <button onClick={onClose} className="text-text-muted hover:text-dark">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          {/* Direction */}
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Ուղղություն</label>
            <div className="flex rounded-xl overflow-hidden border border-crm-border">
              {DIR_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setDirection(opt.value)}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-colors border-r border-crm-border last:border-r-0 ${
                    direction === opt.value ? 'bg-primary text-white' : 'bg-white text-text-muted hover:bg-gray-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Գումար (֏)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Date */}
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Ամսաթիվ</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {/* Note */}
          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Նշումներ</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="..."
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-crm-border justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50 transition-colors">
            Չеղarkel
          </button>
          <button
            onClick={() => mutate()}
            disabled={!amount || parseFloat(amount) <= 0 || isPending}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40"
          >
            {isPending ? '...' : editing ? 'Պահպանել' : 'Ավելացնել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Modal ─────────────────────────────────────────────────────────────────

function AddModal({ onClose, customCategories }: { onClose: () => void; customCategories: CustomCategory[] }) {
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<TransactionDirection>('in');
  const [catInput,   setCatInput]   = useState<string>('');
  const [catResolved, setCatResolved] = useState<string | null>(null);
  const [amount,        setAmount]        = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('card');
  const [desc,          setDesc]          = useState('');
  const [date,          setDate]          = useState(() => toLocalDateTimeInput(new Date()));

  const { mutate, isPending } = useMutation({
    mutationFn: (data: CreateTransactionRequest) => financeService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      onClose();
    },
  });

  function handleDirectionChange(d: TransactionDirection) {
    setDirection(d);
  }

  async function submit() {
    const amt = parseFloat(amount.replace(/[^\d.]/g, ''));
    if (!amt || amt <= 0) return;

    let resolved = catResolved;

    // Create new custom category if typed value not in list
    if (!resolved && catInput.trim()) {
      try {
        const created = await financeService.createCategory({ name: catInput.trim(), direction: 'both', color: '#6b7280' });
        queryClient.invalidateQueries({ queryKey: ['finance-categories'] });
        resolved = `custom:${created.id}`;
      } catch { return; }
    }

    if (!resolved) return;

    const isCustom = resolved.startsWith('custom:');
    const customId = isCustom ? parseInt(resolved.split(':')[1]) : undefined;
    const category: TransactionCategory = isCustom ? 'other' : resolved as TransactionCategory;
    mutate({ direction, category, custom_category: customId, amount: amt, payment_method: paymentMethod,description: desc.trim() || undefined, transaction_date: date });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center bg-black/30 backdrop-blur-sm overflow-y-auto py-6">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] mx-4 my-auto flex flex-col max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <h2 className="text-base font-bold text-dark">Ավելացնել գործարքում</h2>
          <button onClick={onClose} className="text-text-muted hover:text-dark">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="flex rounded-xl overflow-hidden border border-crm-border">
            <button
              onClick={() => handleDirectionChange('in')}
              className={`flex-1 py-2.5 text-sm font-semibold transition-colors ${direction === 'in' ? 'bg-success text-white' : 'bg-white text-text-muted hover:bg-gray-50'}`}
            >
              ↑ Մուտք
            </button>
            <button
              onClick={() => handleDirectionChange('out')}
              className={`flex-1 py-2.5 text-sm font-semibold border-l border-crm-border transition-colors ${direction === 'out' ? 'bg-error text-white' : 'bg-white text-text-muted hover:bg-gray-50'}`}
            >
              ↓ Ելք
            </button>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Բաժին</label>
            <FinanceCategoryCombo
              builtIn={CATEGORIES}
              custom={customCategories}
              input={catInput}
              resolved={catResolved}
              onChange={(inp, res) => { setCatInput(inp); setCatResolved(res); }}
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Գումար (֏)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Ամսաթիվ</label>
            <input
              type="datetime-local"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>


          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Վճարման Տեսակ</label>
            <div className="flex rounded-xl overflow-hidden border border-crm-border">
              {([['card', 'Քարտով'], ['cash', 'Կանխիկ']] as [string, string][]).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setPaymentMethod(val as 'cash' | 'card')}
                  className={`flex-1 py-2 text-sm font-semibold transition-colors border-r border-crm-border last:border-r-0 ${
                    paymentMethod === val ? 'bg-primary text-white' : 'bg-white text-text-muted hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Նշումներ</label>
            <input
              type="text"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="..."
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-crm-border justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50 transition-colors">
            Չեղարկել
          </button>
          <button
            onClick={submit}
            disabled={!amount || parseFloat(amount) <= 0 || isPending}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isPending ? 'Ավելացնեում...' : 'Ավելացնել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Confirm Delete ────────────────────────────────────────────────────────────

function ConfirmDeleteModal({ onConfirm, onCancel, isPending }: {
  onConfirm: () => void; onCancel: () => void; isPending: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[360px] mx-4 flex flex-col">
        <div className="px-6 py-4 border-b border-crm-border">
          <h2 className="text-base font-bold text-dark">Ջնջե՞լ գործարք?</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-text-muted">Այս գործողությունը հետ դարծնել հնարավոր չի լինի։</p>
        </div>
        <div className="flex gap-2 px-6 py-4 border-t border-crm-border justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50 transition-colors">
            Չեղարկել
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="px-5 py-2 text-sm font-semibold rounded-xl bg-error text-white hover:bg-red-600 transition-colors disabled:opacity-60"
          >
            {isPending ? 'Ջնջում...' : 'Ջնջել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type DirFilter = 'all' | TransactionDirection;
type MainTab = 'transactions' | 'transfers';

export default function FinancePage() {
  const queryClient  = useQueryClient();
  const isDirector   = useAuthStore((s) => s.role) === 'director';

  const [mainTab,       setMainTab]       = useState<MainTab>('transactions');
  const [addOpen,       setAddOpen]       = useState(false);
  const [deleteItem,    setDeleteItem]    = useState<TransactionDTO | null>(null);
  const [dirFilter,     setDirFilter]     = useState<DirFilter>('all');
  const [catFilter,     setCatFilter]     = useState<string>('all');
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');
  const [isExporting,   setIsExporting]   = useState(false);
  const [pmFilter,      setPmFilter]      = useState<'all' | 'cash' | 'card'>('all');
  const [transferOpen,  setTransferOpen]  = useState(false);
  const [editTransfer,  setEditTransfer]  = useState<TransferDTO | null>(null);
  const [deleteTransfer, setDeleteTransfer] = useState<TransferDTO | null>(null);

  const { data: customCategories = [] } = useQuery({
    queryKey: ['finance-categories'],
    queryFn:  () => financeService.getCategories(),
  });

  const txFilters = useMemo(() => ({
    ...(dirFilter !== 'all' && { direction: dirFilter as TransactionDirection }),
    ...(catFilter !== 'all' && !catFilter.startsWith('custom:') && { category: catFilter as TransactionCategory }),
    ...(catFilter.startsWith('custom:') && { custom_category: parseInt(catFilter.split(':')[1]) }),
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo   && { date_to:   dateTo   }),
  }), [dirFilter, catFilter, dateFrom, dateTo]);

  const { data: txData, isLoading } = useQuery({
    queryKey: ['finance-transactions', txFilters],
    queryFn:  () => financeService.getAll(txFilters),
  });

  const { data: summary } = useQuery({
    queryKey: ['finance-summary', { date_from: dateFrom, date_to: dateTo }],
    queryFn:  () => financeService.getSummary({ date_from: dateFrom || undefined, date_to: dateTo || undefined }),
  });

  const { mutate: deleteTx, isPending: isDeleting } = useMutation({
    mutationFn: (id: number) => financeService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      setDeleteItem(null);
    },
  });

  const transferFilters = useMemo(() => ({
    ...(dateFrom && { date_from: dateFrom }),
    ...(dateTo   && { date_to:   dateTo   }),
  }), [dateFrom, dateTo]);

  const { data: transferData, isLoading: transfersLoading } = useQuery({
    queryKey: ['finance-transfers', transferFilters],
    queryFn:  () => transferService.getAll(transferFilters),
    enabled:  mainTab === 'transfers',
  });

  const { mutate: deleteTransferMutate, isPending: isDeletingTransfer } = useMutation({
    mutationFn: (id: number) => transferService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-transfers'] });
      setDeleteTransfer(null);
    },
  });

  const transactions = useMemo(() => {
    const all = txData?.results ?? [];
    if (pmFilter === 'all') return all;
    return all.filter((tx) => tx.payment_method === pmFilter);
  }, [txData, pmFilter]);
  const totalIn  = fmtAmt(String(summary?.total_in  ?? '0'));
  const totalOut = fmtAmt(String(summary?.total_out ?? '0'));
  const balance  = fmtAmt(String(summary?.balance   ?? '0'));

  const pmBreakdown = useMemo(() => {
    const bpm = summary?.by_payment_method;
    if (bpm) {
      return {
        cardIn:  bpm.card?.total_in  ?? 0,
        cashIn:  bpm.cash?.total_in  ?? 0,
        cardOut: bpm.card?.total_out ?? 0,
        cashOut: bpm.cash?.total_out ?? 0,
      };
    }
    // fallback: compute locally
    const all = txData?.results ?? [];
    const sum = (dir: string, pm: string) =>
      all.filter(tx => tx.direction === dir && tx.payment_method === pm)
         .reduce((s, tx) => s + fmtAmt(tx.amount), 0);
    return {
      cardIn:  sum('in',  'card'),
      cashIn:  sum('in',  'cash'),
      cardOut: sum('out', 'card'),
      cashOut: sum('out', 'cash'),
    };
  }, [summary, txData]);

  async function handleExport(format: 'xlsx' | 'pdf') {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const { blob, filename } = await financeService.exportFile({
        format,
        ...(dirFilter !== 'all' && { direction: dirFilter as TransactionDirection }),
        ...(catFilter !== 'all' && !catFilter.startsWith('custom:') && { category: catFilter as TransactionCategory }),
        ...(catFilter.startsWith('custom:') && { custom_category: parseInt(catFilter.split(':')[1]) }),
        ...(dateFrom && { date_from: dateFrom }),
        ...(dateTo   && { date_to:   dateTo }),
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Ֆայլը բեռնել չհաջողվեց');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="animate-fade-in absolute inset-0 flex flex-col p-4 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-5 flex-shrink-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-dark">Մուտք / Ելք</h1>
          <p className="text-xs text-text-muted mt-0.5">{txData?.count ?? 0} Գործարք</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Main tab switcher */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => setMainTab('transactions')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${mainTab === 'transactions' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Գործարքումներ
            </button>
            <button
              onClick={() => setMainTab('transfers')}
              className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition-all ${mainTab === 'transfers' ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              ⇄ Տրանսֆերներ
            </button>
          </div>

          {mainTab === 'transactions' && (
            <button
              onClick={() => handleExport('xlsx')}
              disabled={isExporting}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span className="hidden sm:inline">{isExporting ? 'Բեռնում...' : 'Excel'}</span>
            </button>
          )}
          <button
            onClick={() => mainTab === 'transfers' ? setTransferOpen(true) : setAddOpen(true)}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm flex-shrink-0"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span className="hidden sm:inline">Ավելացնել</span>
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-5 flex-shrink-0">
        {/* In */}
        <div className="bg-white rounded-2xl border border-crm-border p-3 sm:p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-success" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
              </svg>
            </div>
            <div>
              <p className="text-xs text-text-muted leading-none">Մուտք</p>
              <p className="text-base sm:text-lg font-bold text-success leading-tight">{fmt(totalIn)}</p>
            </div>
          </div>
          <div className="border-t border-crm-border pt-2 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                Քարտով
              </span>
              <span className="text-xs font-semibold text-blue-700">{fmt(pmBreakdown.cardIn)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                Կանխիկ
              </span>
              <span className="text-xs font-semibold text-amber-700">{fmt(pmBreakdown.cashIn)}</span>
            </div>
          </div>
        </div>

        {/* Out */}
        <div className="bg-white rounded-2xl border border-crm-border p-3 sm:p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-error/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-error" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 19 19 12"/>
              </svg>
            </div>
            <div>
              <p className="text-xs text-text-muted leading-none">Ելք</p>
              <p className="text-base sm:text-lg font-bold text-error leading-tight">{fmt(totalOut)}</p>
            </div>
          </div>
          <div className="border-t border-crm-border pt-2 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                Քարտով
              </span>
              <span className="text-xs font-semibold text-blue-700">{fmt(pmBreakdown.cardOut)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                Կանխիկ
              </span>
              <span className="text-xs font-semibold text-amber-700">{fmt(pmBreakdown.cashOut)}</span>
            </div>
          </div>
        </div>

        {/* Balance */}
        <div className="bg-white rounded-2xl border border-crm-border p-3 sm:p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${balance >= 0 ? 'bg-primary/10' : 'bg-warning/10'}`}>
              <svg className={`w-3.5 h-3.5 sm:w-5 sm:h-5 ${balance >= 0 ? 'text-primary' : 'text-warning'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {balance >= 0
                  ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
                  : <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 19 19 12"/></>}
              </svg>
            </div>
            <div>
              <p className="text-xs text-text-muted leading-none">Մնացորդ</p>
              <p className={`text-base sm:text-lg font-bold leading-tight ${balance >= 0 ? 'text-primary' : 'text-warning'}`}>{fmt(Math.abs(balance))}</p>
            </div>
          </div>
          <div className="border-t border-crm-border pt-2 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
                Քարտով
              </span>
              <span className={`text-xs font-semibold ${pmBreakdown.cardIn - pmBreakdown.cardOut >= 0 ? 'text-blue-700' : 'text-error'}`}>
                {pmBreakdown.cardIn - pmBreakdown.cardOut >= 0 ? '' : '−'}{fmt(Math.abs(pmBreakdown.cardIn - pmBreakdown.cardOut))}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
                Կանխիկ
              </span>
              <span className={`text-xs font-semibold ${pmBreakdown.cashIn - pmBreakdown.cashOut >= 0 ? 'text-amber-700' : 'text-error'}`}>
                {pmBreakdown.cashIn - pmBreakdown.cashOut >= 0 ? '' : '−'}{fmt(Math.abs(pmBreakdown.cashIn - pmBreakdown.cashOut))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters — transactions only */}
      {mainTab === 'transactions' && <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 mb-4 flex-shrink-0">

        {/* Direction pills */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 self-start sm:self-auto">
          {([['all', 'Բոլոր'], ['in', 'Մուտք'], ['out', 'Ելք']] as [DirFilter, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setDirFilter(id)}
              className={`px-3 sm:px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${dirFilter === id ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Payment method filter chips */}
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setPmFilter('all')}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition-all ${
              pmFilter === 'all'
                ? 'bg-gray-800 text-white border-gray-800'
                : 'bg-white text-gray-500 border-crm-border hover:border-gray-400'
            }`}
          >
            Ընդհանուր
          </button>
          <button
            onClick={() => setPmFilter('card')}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              pmFilter === 'card'
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-blue-600 border-blue-200 hover:border-blue-400'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
            </svg>
            Քարտով
          </button>
          <button
            onClick={() => setPmFilter('cash')}
            className={`h-9 px-3.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              pmFilter === 'cash'
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-amber-600 border-amber-200 hover:border-amber-400'
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
            </svg>
            Կանխիկ
          </button>
        </div>

        {/* Category select + manage */}
        <div className="flex items-center gap-1">
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 text-sm rounded-xl border border-crm-border bg-white text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">Բոլոր բաժիններ</option>
            {CATEGORIES.map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
            {customCategories.map((c) => (
              <option key={c.id} value={`custom:${c.id}`}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 text-sm rounded-xl border border-crm-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <span className="text-text-muted text-sm flex-shrink-0">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 text-sm rounded-xl border border-crm-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="flex-shrink-0 p-1.5 text-text-muted hover:text-error transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>}

      {/* Transfers list */}
      {mainTab === 'transfers' && (
        <div className="flex-1 min-h-[420px]">
          {/* Date filter row for transfers */}
          <div className="flex flex-wrap items-center gap-2 mb-4 flex-shrink-0">
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 sm:flex-none min-w-0 px-3 py-2 text-sm rounded-xl border border-crm-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
            <span className="text-text-muted text-sm flex-shrink-0">—</span>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 sm:flex-none min-w-0 px-3 py-2 text-sm rounded-xl border border-crm-border bg-white focus:outline-none focus:ring-2 focus:ring-primary/30" />
            {(dateFrom || dateTo) && (
              <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="flex-shrink-0 p-1.5 text-text-muted hover:text-error transition-colors">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            )}
          </div>

          {transfersLoading ? (
            <div className="flex items-center justify-center h-48 text-text-muted text-sm">Beռvum e...</div>
          ) : !transferData?.results.length ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/>
                </svg>
              </div>
              <p className="text-sm text-text-muted">Տրանսֆերներ չկան</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-crm-border overflow-hidden">
              <div className="hidden sm:grid grid-cols-[150px_1fr_160px_44px_44px] gap-4 px-5 py-3 border-b border-crm-border bg-gray-50 sticky top-0">
                <span className="text-xs font-semibold text-text-muted">Ամsaθив</span>
                <span className="text-xs font-semibold text-text-muted">Ծanотum</span>
                <span className="text-xs font-semibold text-text-muted text-center">Ուγγuθyun</span>
                <span className="text-xs font-semibold text-text-muted text-right col-span-2">Gumar</span>
              </div>
              {transferData.results.map((tr) => (
                <div key={tr.id} className="grid grid-cols-[1fr_auto] sm:grid-cols-[150px_1fr_160px_44px_44px] gap-3 sm:gap-4 px-5 py-3.5 border-b border-crm-border last:border-b-0 hover:bg-gray-50 transition-colors items-center">
                  <span className="hidden sm:block text-xs text-text-muted whitespace-nowrap">
                    {fmtDate(tr.transferDate)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-dark">
                      {tr.direction === 'cash_to_card' ? 'Կանխիկ → Քարտով' : 'Քարտով → Կանխիկ'}
                    </p>
                    {tr.note && <p className="text-xs text-text-muted truncate">{tr.note}</p>}
                    <p className="text-[11px] text-text-muted sm:hidden mt-0.5">{fmtDate(tr.transferDate)}</p>
                  </div>
                  <div className="hidden sm:flex justify-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${tr.direction === 'cash_to_card' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {tr.direction === 'cash_to_card' ? '💵→💳' : '💳→💵'}
                      {tr.direction === 'cash_to_card' ? 'Կանխիկ→Card' : 'Card→Կանխիկ'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 justify-end sm:justify-normal">
                    <span className="text-sm font-bold text-primary">{fmt(parseFloat(tr.amount))}</span>
                    <button onClick={() => setEditTransfer(tr)} className="p-1.5 text-text-muted hover:text-primary transition-colors">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    {isDirector && (
                      <button onClick={() => setDeleteTransfer(tr)} className="p-1.5 text-text-muted hover:text-error transition-colors">
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Transactions list */}
      {mainTab === 'transactions' && <div className="flex-1 min-h-[420px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">Բերնվում ե...</div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <p className="text-sm text-text-muted">Գործարքումներ չկան</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-crm-border overflow-hidden">
            {/* Mobile card list */}
            <div className="sm:hidden divide-y divide-crm-border">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${tx.direction === 'in' ? 'bg-success/10' : 'bg-error/10'}`}>
                    <span className={`text-xs font-bold ${tx.direction === 'in' ? 'text-success' : 'text-error'}`}>
                      {tx.direction === 'in' ? '↑' : '↓'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-dark truncate">
                      {tx.custom_category_name ?? CATEGORY_LABELS[tx.category] ?? tx.category}
                    </p>
                    {tx.description && <p className="text-xs text-text-muted truncate">{tx.description}</p>}
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <p className="text-[11px] text-text-muted">{fmtDate(tx.transaction_date)}</p>
                      {tx.payment_method && (
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${tx.payment_method === 'card' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                          {tx.payment_method === 'card' ? 'Քարտով' : 'Կանխիկ'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${tx.direction === 'in' ? 'text-success' : 'text-error'}`}>
                      {tx.direction === 'in' ? '+' : '−'}{fmt(fmtAmt(tx.amount))}
                    </span>
                    {isDirector && (
                      <button
                        onClick={() => setDeleteItem(tx)}
                        className="p-1.5 text-text-muted hover:text-error transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <div className="grid grid-cols-[150px_1fr_110px_130px_130px_44px] gap-4 px-5 py-3 border-b border-crm-border bg-gray-50 sticky top-0 min-w-[740px]">
                <span className="text-xs font-semibold text-text-muted">Ամսաթիվ</span>
                <span className="text-xs font-semibold text-text-muted">Բաժին / Նկարագրություն</span>
                <span className="text-xs font-semibold text-text-muted text-center">Վճ. տեսակ</span>
                <span className="text-xs font-semibold text-text-muted text-center">Տեսակ</span>
                <span className="text-xs font-semibold text-text-muted text-right">Գումար</span>
                <span />
              </div>
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="grid grid-cols-[150px_1fr_110px_110px_130px_44px] gap-4 px-5 py-3.5 border-b border-crm-border last:border-b-0 hover:bg-gray-50 transition-colors items-center min-w-[740px]"
                >
                  <span className="text-xs text-text-muted whitespace-nowrap">{fmtDate(tx.transaction_date)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-dark">
                      {tx.custom_category_name ?? CATEGORY_LABELS[tx.category] ?? tx.category}
                    </p>
                    {tx.description && <p className="text-xs text-text-muted truncate">{tx.description}</p>}
                  </div>
                  <div className="flex justify-center">
                    {tx.payment_method ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tx.payment_method === 'card' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
                        {tx.payment_method === 'card' ? 'Քարտով' : 'Կանխիկ'}
                      </span>
                    ) : <span className="text-xs text-text-muted">—</span>}
                  </div>
                  <div className="flex justify-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${tx.direction === 'in' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                      {tx.direction === 'in' ? '↑ Մուտք' : '↓ Ելք'}
                    </span>
                  </div>
                  <span className={`text-sm font-bold text-right ${tx.direction === 'in' ? 'text-success' : 'text-error'}`}>
                    {tx.direction === 'in' ? '+' : '−'}{fmt(fmtAmt(tx.amount))}
                  </span>
                  {isDirector ? (
                    <button
                      onClick={() => setDeleteItem(tx)}
                      className="flex items-center justify-center text-text-muted hover:text-error transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  ) : <span />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>}

      {addOpen && <AddModal onClose={() => setAddOpen(false)} customCategories={customCategories} />}
      {deleteItem && (
        <ConfirmDeleteModal
          onConfirm={() => deleteTx(deleteItem.id)}
          onCancel={() => setDeleteItem(null)}
          isPending={isDeleting}
        />
      )}
      {(transferOpen || editTransfer) && (
        <TransferModal
          onClose={() => { setTransferOpen(false); setEditTransfer(null); }}
          editing={editTransfer ?? undefined}
        />
      )}
      {deleteTransfer && (
        <ConfirmDeleteModal
          onConfirm={() => deleteTransferMutate(deleteTransfer.id)}
          onCancel={() => setDeleteTransfer(null)}
          isPending={isDeletingTransfer}
        />
      )}
    </div>
  );
}














