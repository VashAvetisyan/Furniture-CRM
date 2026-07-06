'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { payrollService, type PayrollFormula, type PayrollFormulaPayload, type CalculateResult } from '@/services/payroll.service';
import { employeeService } from '@/services/employee.service';
import { positionService } from '@/services/position.service';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(val: string) {
  const n = parseFloat(val) || 0;
  return n.toLocaleString('hy-AM', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

const SCOPE_COLORS: Record<string, string> = {
  company:  'bg-blue-100 text-blue-700',
  employee: 'bg-purple-100 text-purple-700',
};

// ── FormulaModal ──────────────────────────────────────────────────────────────

function FormulaModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: PayrollFormula;
  onClose: () => void;
  onSaved: () => void;
}) {
  const queryClient = useQueryClient();

  const [name,        setName]       = useState(initial?.name        ?? '');
  const [desc,        setDesc]       = useState(initial?.description ?? '');
  const [targetType,  setTargetType] = useState<'position' | 'user'>(initial?.target_type ?? 'position');
  const [positionId,  setPositionId] = useState(initial?.position != null ? String(initial.position) : '');
  const [userId,      setUserId]     = useState(initial?.user     != null ? String(initial.user)     : '');
  const [expression,  setExpression] = useState(initial?.expression ?? '');
  const [isActive,    setIsActive]   = useState(initial?.is_active ?? true);
  const [validating,  setValidating] = useState(false);
  const [validResult, setValidResult] = useState<{ valid: boolean; vars?: string[]; error?: string } | null>(null);
  const [saveError,   setSaveError]  = useState('');

  const { data: positionsData } = useQuery({ queryKey: ['positions'], queryFn: positionService.getAll, staleTime: 5 * 60_000 });
  const { data: variablesData } = useQuery({ queryKey: ['payroll-variables'], queryFn: payrollService.getVariables, staleTime: 10 * 60_000 });
  const { data: employeesData } = useQuery({ queryKey: ['employees'], queryFn: () => employeeService.getAll(), staleTime: 5 * 60_000 });

  const positions = positionsData?.results ?? [];
  const variables = variablesData ?? [];
  const employees = employeesData?.data ?? [];

  const { mutate: save, isPending } = useMutation({
    mutationFn: () => {
      const payload: PayrollFormulaPayload = {
        name:        name.trim(),
        description: desc.trim() || undefined,
        target_type: targetType,
        position:    targetType === 'position' && positionId ? Number(positionId) : null,
        user:        targetType === 'user'     && userId     ? Number(userId)     : null,
        expression:  expression.trim(),
        is_active:   isActive,
      };
      return initial
        ? payrollService.updateFormula(initial.id, payload)
        : payrollService.createFormula(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-formulas'] });
      onSaved();
    },
    onError: (err: Error) => setSaveError(err.message),
  });

  async function handleValidate() {
    if (!expression.trim()) return;
    setValidating(true);
    setValidResult(null);
    try {
      const res = await payrollService.validateFormula(expression.trim());
      setValidResult({ valid: res.valid, vars: res.referenced_variables, error: res.error });
    } catch (e) {
      setValidResult({ valid: false, error: (e as Error).message });
    } finally {
      setValidating(false);
    }
  }

  function insertVar(v: string) {
    setExpression((prev) => prev + (prev.endsWith(' ') || prev === '' ? '' : ' ') + v + ' ');
    setValidResult(null);
  }

  const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-crm-border">
          <h2 className="text-base font-bold text-dark">
            {initial ? 'Խmbagrél բանաձեVez' : 'Nor բanadzev'}
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:bg-gray-100 hover:text-dark transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4 flex flex-col gap-4">
          {/* Name + description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Անuun *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Վաճaroshi formula..." className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Naratagutyun</label>
              <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Opsional..." className={inputCls} />
            </div>
          </div>

          {/* Target type */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Kem kiroharvel</label>
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1 w-fit">
              {(['position', 'user'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTargetType(t); setPositionId(''); setUserId(''); }}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    targetType === t ? 'bg-white text-dark shadow-sm' : 'text-text-muted hover:text-dark'
                  }`}
                >
                  {t === 'position' ? 'Պաshatony' : 'Konkret ashkhatos'}
                </button>
              ))}
            </div>

            {targetType === 'position' ? (
              <select value={positionId} onChange={(e) => setPositionId(e.target.value)} className={inputCls}>
                <option value="">Chntrel pashaton...</option>
                {positions.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            ) : (
              <select value={userId} onChange={(e) => setUserId(e.target.value)} className={inputCls}>
                <option value="">Chntrel ashkhatos...</option>
                {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            )}
          </div>

          {/* Variables palette */}
          {variables.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Հasaneli pokhokhanakner (click = avel formula-yin)</label>
              <div className="flex flex-wrap gap-1.5">
                {variables.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => insertVar(v.name)}
                    title={v.description}
                    className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg cursor-pointer hover:opacity-80 transition-opacity ${SCOPE_COLORS[v.scope] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    {v.name}
                    {v.label && <span className="font-normal opacity-70 ml-1">· {v.label}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Expression editor */}
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Բanadzev *</label>
            <textarea
              value={expression}
              onChange={(e) => { setExpression(e.target.value); setValidResult(null); }}
              rows={3}
              placeholder="(total_sales - 4500000) * 8% + 90000"
              spellCheck={false}
              className={`${inputCls} resize-none font-mono text-xs`}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleValidate}
                disabled={validating || !expression.trim()}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-crm-border text-dark hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {validating ? (
                  <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
                Stugel
              </button>
              {validResult && (
                <span className={`text-xs font-semibold flex items-center gap-1 ${validResult.valid ? 'text-success' : 'text-error'}`}>
                  {validResult.valid ? '✓ Ճiht e' : `✕ ${validResult.error ?? 'Skhale'}`}
                  {validResult.valid && validResult.vars && validResult.vars.length > 0 && (
                    <span className="font-normal text-text-muted">· {validResult.vars.join(', ')}</span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Active toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none w-fit">
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={() => setIsActive((v) => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${isActive ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
            <span className="text-sm font-medium text-dark">Aktiv</span>
          </label>

          {saveError && <p className="text-xs text-error">{saveError}</p>}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-crm-border">
          <button onClick={onClose} disabled={isPending} className="px-5 py-2.5 text-sm font-medium rounded-xl border border-crm-border text-dark hover:bg-gray-50 transition-colors disabled:opacity-50">
            Chegharksel
          </button>
          <button
            onClick={() => save()}
            disabled={isPending || !name.trim() || !expression.trim()}
            className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-60"
          >
            {isPending ? 'Pahpanum...' : 'Pahpanel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── CalculatorModal ───────────────────────────────────────────────────────────

function CalculatorModal({ onClose }: { onClose: () => void }) {
  const [empId,    setEmpId]    = useState('');
  const [dateFrom, setDateFrom] = useState(firstOfMonth());
  const [dateTo,   setDateTo]   = useState(today());
  const [result,   setResult]   = useState<CalculateResult | null>(null);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const { data: employeesData } = useQuery({ queryKey: ['employees'], queryFn: () => employeeService.getAll(), staleTime: 5 * 60_000 });
  const employees = employeesData?.data ?? [];

  async function handleCalc() {
    if (!empId) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await payrollService.calculate({ user_id: Number(empId), date_from: dateFrom, date_to: dateTo });
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const emp = employees.find((e) => String(e.id) === empId);
  const inputCls = 'w-full px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white transition-all';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-crm-border">
          <h2 className="text-base font-bold text-dark flex items-center gap-2">
            <span className="text-lg">🧮</span> Ashkhatavarzehi hasvarkel
          </h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:bg-gray-100 transition-colors">✕</button>
        </div>

        <div className="px-5 py-4 flex flex-col gap-4">
          {/* Employee */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Ashkhatos *</label>
            <select value={empId} onChange={(e) => { setEmpId(e.target.value); setResult(null); setError(''); }} className={inputCls}>
              <option value="">Chntrel ashkhatos...</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Skzbit amsatxiv</label>
              <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setResult(null); }} className={inputCls} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Verj amsatxiv</label>
              <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setResult(null); }} className={inputCls} />
            </div>
          </div>

          {error && <p className="text-xs text-error bg-error/5 rounded-xl px-3 py-2">{error}</p>}

          {/* Result card */}
          {result && (
            <div className="rounded-2xl border-2 border-primary/30 bg-primary/5 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {emp && <Avatar color={emp.color} initials={emp.initials} size="sm" />}
                  <div>
                    <p className="text-sm font-bold text-dark">{result.employee_name}</p>
                    <p className="text-[11px] text-text-muted">{result.formula_name}</p>
                  </div>
                </div>
                <p className="text-2xl font-black text-primary">{fmt(result.result)} ֏</p>
              </div>

              {/* Variables breakdown */}
              {Object.keys(result.variables).length > 0 && (
                <div className="bg-white rounded-xl border border-crm-border p-3">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Pokhokhanakner</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {Object.entries(result.variables).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono text-text-muted truncate">{k}</span>
                        <span className="text-[11px] font-semibold text-dark flex-shrink-0">{fmt(v)} ֏</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-text-muted">
                Period: {result.period_start} — {result.period_end} · Formula: {result.formula_name}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-crm-border">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium rounded-xl border border-crm-border text-dark hover:bg-gray-50 transition-colors">
            Klonel
          </button>
          <button
            onClick={handleCalc}
            disabled={loading || !empId}
            className="px-6 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-60 flex items-center gap-2"
          >
            {loading && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>}
            {loading ? 'Hasvarkvum...' : 'Hasvarkel'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PayrollPage() {
  const role = useAuthStore((s) => s.role);
  const isDirector = role === 'director';

  const queryClient = useQueryClient();
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState<PayrollFormula | undefined>(undefined);
  const [calcOpen,   setCalcOpen]   = useState(false);
  const [deleteId,   setDeleteId]   = useState<number | null>(null);

  const { data: formulasRaw, isLoading } = useQuery({
    queryKey: ['payroll-formulas'],
    queryFn:  payrollService.getFormulas,
    staleTime: 60_000,
    enabled: isDirector,
  });
  const formulas = Array.isArray(formulasRaw)
    ? formulasRaw
    : ((formulasRaw as unknown as { results?: PayrollFormula[] })?.results ?? []);

  const { data: variablesRaw } = useQuery({
    queryKey: ['payroll-variables'],
    queryFn:  payrollService.getVariables,
    staleTime: 10 * 60_000,
    enabled: isDirector,
  });
  const variables = Array.isArray(variablesRaw)
    ? variablesRaw
    : ((variablesRaw as unknown as { results?: typeof variablesRaw })?.results ?? []);

  const { mutate: doDelete } = useMutation({
    mutationFn: (id: number) => payrollService.deleteFormula(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payroll-formulas'] });
      setDeleteId(null);
    },
  });

  if (!isDirector) {
    return (
      <div className="flex-1 flex items-center justify-center text-text-muted text-sm p-6">
        Այս բաzhnum mijain tnorenn e hasaнeli
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 md:gap-6 p-3 md:p-6 overflow-y-auto overflow-x-hidden">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-dark">Աշխատավարձի բանաձևեր</h1>
          <p className="text-xs text-text-muted mt-0.5">{formulas.length} banadzev · {variables.length} pokhokhanakner</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCalcOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl border border-crm-border text-dark hover:bg-gray-50 transition-colors"
          >
            <span>🧮</span>
            <span className="hidden sm:inline">Hasvarkel</span>
          </button>
          <button
            onClick={() => { setEditTarget(undefined); setModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-sm"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span className="hidden sm:inline">Nor banadzev</span>
          </button>
        </div>
      </div>

      {/* Variables reference card */}
      {variables.length > 0 && (
        <div className="bg-white rounded-2xl border border-crm-border p-4">
          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3">Hasaneli pokhokhanakner</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {variables.map((v) => (
              <div key={v.name} className="flex items-start gap-2">
                <span className={`flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-md ${SCOPE_COLORS[v.scope] ?? 'bg-gray-100 text-gray-600'}`}>
                  {v.scope}
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-mono font-semibold text-dark leading-tight">{v.name}</p>
                  {v.label && <p className="text-[11px] text-text-muted leading-tight">{v.label}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formula list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-text-muted text-sm gap-3">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Bernvum e...
        </div>
      ) : formulas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-crm-border flex flex-col items-center justify-center py-16 gap-3 text-text-muted">
          <svg className="w-12 h-12 opacity-20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2V9"/>
            <path d="M9 3v6h6M9 3l6 6"/>
            <line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="12" y2="17"/>
          </svg>
          <p className="text-sm">Banadzevner chunen — aveletstsel nor banadzev</p>
          <button
            onClick={() => { setEditTarget(undefined); setModalOpen(true); }}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            Avel nor banadzev
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {formulas.map((f) => (
            <div key={f.id} className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col sm:flex-row sm:items-start gap-3 ${f.is_active ? 'border-crm-border' : 'border-crm-border opacity-60'}`}>
              {/* Left: info */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${f.is_active ? 'bg-success/10 text-success' : 'bg-gray-100 text-gray-500'}`}>
                    {f.is_active ? 'Aktiv' : 'Anaktiv'}
                  </span>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {f.target_type === 'position' ? `Pashaton: ${f.position_name ?? f.position ?? '—'}` : `Ogtater: ${f.user_name ?? f.user ?? '—'}`}
                  </span>
                </div>

                <p className="text-sm font-bold text-dark leading-snug">{f.name}</p>
                {f.description && <p className="text-xs text-text-muted">{f.description}</p>}

                <code className="text-xs font-mono bg-gray-50 border border-crm-border rounded-lg px-3 py-1.5 text-dark break-all">
                  {f.expression}
                </code>

                {f.referenced_variables && f.referenced_variables.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {f.referenced_variables.map((v) => (
                      <span key={v} className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-600">{v}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => { setEditTarget(f); setModalOpen(true); }}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-crm-border text-dark hover:bg-gray-50 transition-colors"
                >
                  Xmbagrél
                </button>
                <button
                  onClick={() => setDeleteId(f.id)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:bg-error/10 hover:text-error transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                    <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Formula editor modal */}
      {modalOpen && (
        <FormulaModal
          initial={editTarget}
          onClose={() => { setModalOpen(false); setEditTarget(undefined); }}
          onSaved={() => { setModalOpen(false); setEditTarget(undefined); }}
        />
      )}

      {/* Calculator modal */}
      {calcOpen && <CalculatorModal onClose={() => setCalcOpen(false)} />}

      {/* Delete confirm */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <p className="text-base font-bold text-dark">Djnjel banadzev?</p>
            <p className="text-sm text-text-muted">Ays gortsoghutyune hery che karo veradardzel.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium rounded-xl border border-crm-border text-dark hover:bg-gray-50 transition-colors">
                Chegharksel
              </button>
              <button onClick={() => doDelete(deleteId)} className="px-4 py-2 text-sm font-semibold rounded-xl bg-error text-white hover:bg-error/90 transition-colors">
                Djnjel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
