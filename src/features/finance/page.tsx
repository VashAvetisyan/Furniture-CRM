'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { financeService } from '@/services/finance.service';
import type { TransactionDTO, TransactionCategory, TransactionDirection, CreateTransactionRequest, CustomCategory, CreateCategoryRequest } from '@/services/finance.service';

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
  new Date(iso).toLocaleDateString('hy-AM', { day: '2-digit', month: 'short', year: 'numeric' });
const todayIso = () => new Date().toISOString().slice(0, 10);

// ── Add Modal ─────────────────────────────────────────────────────────────────

function AddModal({ onClose, customCategories }: { onClose: () => void; customCategories: CustomCategory[] }) {
  const queryClient = useQueryClient();
  const [direction, setDirection] = useState<TransactionDirection>('in');
  const [catVal,    setCatVal]    = useState<string>('payment_advance');
  const [amount,    setAmount]    = useState('');
  const [desc,      setDesc]      = useState('');
  const [date,      setDate]      = useState(todayIso());

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

  function submit() {
    const amt = parseFloat(amount.replace(/[^\d.]/g, ''));
    if (!amt || amt <= 0) return;
    const isCustom  = catVal.startsWith('custom:');
    const customId  = isCustom ? parseInt(catVal.split(':')[1]) : undefined;
    const category: TransactionCategory = isCustom ? 'other' : catVal as TransactionCategory;
    mutate({ direction, category, custom_category: customId, amount: amt, description: desc.trim() || undefined, transaction_date: date });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[420px] mx-4 flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <h2 className="text-base font-bold text-dark">Ավելացնել գործարկում</h2>
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
            <select
              value={catVal}
              onChange={(e) => setCatVal(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border bg-white text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {CATEGORIES.map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
              {customCategories.map((c) => (
                <option key={c.id} value={`custom:${c.id}`}>{c.name}</option>
              ))}
            </select>
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
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-muted mb-1.5 block">Նյութեր</label>
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
          <h2 className="text-base font-bold text-dark">Ջndjel գործարկ?</h2>
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

// ── Manage Categories Modal ───────────────────────────────────────────────────

function ManageCategoriesModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name,      setName]      = useState('');
  const [direction, setDirection] = useState<'in' | 'out' | 'both'>('both');
  const [color,     setColor]     = useState('#4361EE');

  const { data: categories = [] } = useQuery({
    queryKey: ['finance-categories'],
    queryFn:  () => financeService.getCategories(),
  });

  const { mutate: createCat, isPending: isCreating } = useMutation({
    mutationFn: (data: CreateCategoryRequest) => financeService.createCategory(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance-categories'] });
      setName('');
    },
  });

  const { mutate: deleteCat } = useMutation({
    mutationFn: (id: number) => financeService.deleteCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['finance-categories'] }),
  });

  const DIR_LABELS: Record<'in' | 'out' | 'both', string> = {
    in:   'Մուտք',
    out:  'Ելք',
    both: 'Բոլոր',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[460px] mx-4 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <h2 className="text-base font-bold text-dark">Բաժիններ</h2>
          <button onClick={onClose} className="text-text-muted hover:text-dark">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-4 flex flex-col gap-2 min-h-0">
          {categories.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">Բաժիններ չկան</p>
          ) : (
            categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-3 py-2.5 border-b border-crm-border/50 last:border-0">
                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cat.color }} />
                <span className="text-sm text-dark flex-1">{cat.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  cat.direction === 'in'   ? 'bg-success/10 text-success' :
                  cat.direction === 'out'  ? 'bg-error/10 text-error' :
                                             'bg-primary/10 text-primary'
                }`}>
                  {DIR_LABELS[cat.direction]}
                </span>
                <button
                  onClick={() => deleteCat(cat.id)}
                  className="text-text-muted hover:text-error transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-crm-border flex flex-col gap-3">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Նոր բաժին</p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Բաժնի անունը..."
              className="flex-1 px-3 py-2 text-sm rounded-xl border border-crm-border focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              title="Գույն"
              className="w-10 h-10 rounded-xl border border-crm-border cursor-pointer p-1 flex-shrink-0"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
            {(['in', 'out', 'both'] as const).map((val) => (
              <button
                key={val}
                onClick={() => setDirection(val)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${direction === val ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {DIR_LABELS[val]}
              </button>
            ))}
          </div>
          <button
            onClick={() => name.trim() && createCat({ name: name.trim(), direction, color })}
            disabled={!name.trim() || isCreating}
            className="py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Ստեղծում...' : '+ Ավելացնել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type DirFilter = 'all' | TransactionDirection;

export default function FinancePage() {
  const queryClient = useQueryClient();

  const [addOpen,       setAddOpen]       = useState(false);
  const [deleteItem,    setDeleteItem]    = useState<TransactionDTO | null>(null);
  const [dirFilter,     setDirFilter]     = useState<DirFilter>('all');
  const [catFilter,     setCatFilter]     = useState<string>('all');
  const [dateFrom,      setDateFrom]      = useState('');
  const [dateTo,        setDateTo]        = useState('');
  const [isExporting,   setIsExporting]   = useState(false);
  const [manageCatsOpen, setManageCatsOpen] = useState(false);

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

  const transactions = txData?.results ?? [];
  const totalIn  = fmtAmt(summary?.total_in  ?? '0');
  const totalOut = fmtAmt(summary?.total_out ?? '0');
  const balance  = fmtAmt(summary?.balance   ?? '0');

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
      alert('Ֆայлը բեռնել չհաջողվեց');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="animate-fade-in absolute inset-0 flex flex-col p-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 sm:mb-5 flex-shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-dark">Մուտք / Ելք</h1>
          <p className="text-xs text-text-muted mt-0.5">{txData?.count ?? 0} գործարկ</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('xlsx')}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border border-crm-border text-text-muted hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            {isExporting ? 'Բեռնում...' : 'Excel'}
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Ավելացնել
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-5 flex-shrink-0">
        {[
          { label: 'Մուտք',  value: totalIn,           color: 'text-success', bg: 'bg-success/10', arrow: 'up'   },
          { label: 'Ելք',    value: totalOut,          color: 'text-error',   bg: 'bg-error/10',   arrow: 'down' },
          { label: 'Սալդո', value: Math.abs(balance), color: balance >= 0 ? 'text-primary' : 'text-warning', bg: balance >= 0 ? 'bg-primary/10' : 'bg-warning/10', arrow: balance >= 0 ? 'up' : 'down' },
        ].map(({ label, value, color, bg, arrow }) => (
          <div key={label} className="bg-white rounded-2xl border border-crm-border p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:gap-4">
            <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
              <svg className={`w-4 h-4 sm:w-6 sm:h-6 ${color}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                {arrow === 'up'
                  ? <><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></>
                  : <><line x1="12" y1="5" x2="12" y2="19"/><polyline points="5 12 12 19 19 12"/></>
                }
              </svg>
            </div>
            <div className="mt-1.5 sm:mt-0">
              <p className="text-[10px] sm:text-xs text-text-muted">{label}</p>
              <p className={`text-xs sm:text-xl font-bold ${color} leading-tight`}>{fmt(value)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 mb-4 flex-shrink-0">

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
          <button
            onClick={() => setManageCatsOpen(true)}
            title="Karavаrel bazhinneр"
            className="flex-shrink-0 p-2 rounded-xl border border-crm-border text-text-muted hover:bg-gray-50 hover:text-primary transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
            </svg>
          </button>
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
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">Բերնվում ե...</div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-7 h-7 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/>
              </svg>
            </div>
            <p className="text-sm text-text-muted">գործարկում չկան</p>
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
                    <p className="text-[11px] text-text-muted mt-0.5">{fmtDate(tx.transaction_date)}</p>
                  </div>
                  <div className="flex-shrink-0 flex items-center gap-1.5">
                    <span className={`text-sm font-bold ${tx.direction === 'in' ? 'text-success' : 'text-error'}`}>
                      {tx.direction === 'in' ? '+' : '−'}{fmt(fmtAmt(tx.amount))}
                    </span>
                    <button
                      onClick={() => setDeleteItem(tx)}
                      className="p-1.5 text-text-muted hover:text-error transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <div className="grid grid-cols-[110px_1fr_160px_160px_44px] gap-4 px-5 py-3 border-b border-crm-border bg-gray-50 sticky top-0 min-w-[580px]">
                <span className="text-xs font-semibold text-text-muted">Ամսաթիվ</span>
                <span className="text-xs font-semibold text-text-muted">Բաժին / Նկարագրություն</span>
                <span className="text-xs font-semibold text-text-muted text-center">Տեսակ</span>
                <span className="text-xs font-semibold text-text-muted text-right">Գումար</span>
                <span />
              </div>
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="grid grid-cols-[110px_1fr_160px_160px_44px] gap-4 px-5 py-3.5 border-b border-crm-border last:border-b-0 hover:bg-gray-50 transition-colors items-center min-w-[580px]"
                >
                  <span className="text-xs text-text-muted whitespace-nowrap">{fmtDate(tx.transaction_date)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-dark">
                      {tx.custom_category_name ?? CATEGORY_LABELS[tx.category] ?? tx.category}
                    </p>
                    {tx.description && <p className="text-xs text-text-muted truncate">{tx.description}</p>}
                  </div>
                  <div className="flex justify-center">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${tx.direction === 'in' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'}`}>
                      {tx.direction === 'in' ? '↑ Մուտք' : '↓ Ելք'}
                    </span>
                  </div>
                  <span className={`text-sm font-bold text-right ${tx.direction === 'in' ? 'text-success' : 'text-error'}`}>
                    {tx.direction === 'in' ? '+' : '−'}{fmt(fmtAmt(tx.amount))}
                  </span>
                  <button
                    onClick={() => setDeleteItem(tx)}
                    className="flex items-center justify-center text-text-muted hover:text-error transition-colors"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {addOpen && <AddModal onClose={() => setAddOpen(false)} customCategories={customCategories} />}
      {deleteItem && (
        <ConfirmDeleteModal
          onConfirm={() => deleteTx(deleteItem.id)}
          onCancel={() => setDeleteItem(null)}
          isPending={isDeleting}
        />
      )}
      {manageCatsOpen && <ManageCategoriesModal onClose={() => setManageCatsOpen(false)} />}
    </div>
  );
}














