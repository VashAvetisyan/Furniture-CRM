'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { taskService, taskStatusService, fabricTypeService, softnessService, attachmentService } from '@/services/task.service';
import type { NamedItemDTO } from '@/services/task.service';
import { clientService } from '@/services/client.service';
import type { ClientDTO, CreateClientRequest } from '@/services/client.service';
import { catalogService, type ProductDTO } from '@/services/catalog.service';
import { companySettingsService } from '@/services/companySettings.service';
import { toLocalDateInput, toLocalDateTimeInput } from '@/lib/date';
import { useAuthStore } from '@/stores';
import { useToastStore } from '@/stores/toast';
import type { PanelAssignee } from './ProjectsListPanel';

interface AddTaskModalProps {
  assignees:  PanelAssignee[];
  onClose:    () => void;
  onCreated?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────


function inputCls(hasError = false) {
  return `w-full px-4 py-2.5 text-sm rounded-xl border outline-none transition-all bg-white ${
    hasError
      ? 'border-error focus:ring-1 focus:ring-error/30'
      : 'border-crm-border focus:border-primary focus:ring-1 focus:ring-primary/20'
  }`;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest border-b border-crm-border pb-1.5">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, required, error, children }: {
  label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-dark mb-1.5">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </p>
      {children}
      {error && <p className="text-xs text-error mt-1">{error}</p>}
    </div>
  );
}

// ── Client autocomplete ───────────────────────────────────────────────────────

function ClientAutocomplete({ value, onChange, onSelect, hasError }: {
  value:    string;
  onChange: (v: string) => void;
  onSelect: (c: ClientDTO) => void;
  hasError: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn:  clientService.getAll,
  });

  const suggestions = value.trim().length >= 1
    ? clients.filter((c) => {
        const full = `${c.first_name} ${c.last_name}`.toLowerCase();
        const q    = value.toLowerCase();
        return full.includes(q) || c.phone.includes(q);
      }).slice(0, 6)
    : [];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Անուն Ազգանուն"
        className={inputCls(hasError)}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-crm-border rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onSelect(c); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-primary/5 transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[11px] font-bold text-primary">
                  {c.first_name.charAt(0)}{c.last_name.charAt(0)}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-dark truncate">
                  {c.first_name} {c.last_name}
                </p>
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
  );
}

// ── CreatableCombo ────────────────────────────────────────────────────────────
// Text input with autocomplete dropdown. If the typed value doesn't match any
// existing item, it shows a "will be created" hint and auto-creates on task save.

function CreatableCombo({ items, id, name, onChange, placeholder }: {
  items:       NamedItemDTO[];
  id:          string;
  name:        string;
  onChange:    (id: string, name: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);

  const filtered = name.trim()
    ? items.filter(i => i.name.toLowerCase().includes(name.toLowerCase()))
    : items;

  const isNew = name.trim() !== '' && !items.some(
    i => i.name.toLowerCase() === name.trim().toLowerCase()
  );

  return (
    <div className="relative">
      <input
        value={name}
        onChange={(e) => { onChange('', e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder ?? 'Ընտրել կամ մուտքագրել...'}
        className={inputCls()}
        autoComplete="off"
      />
      {open && (filtered.length > 0 || isNew) && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-crm-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => { onChange(String(item.id), item.name); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                id === String(item.id)
                  ? 'bg-primary/5 text-primary font-semibold'
                  : 'text-dark hover:bg-gray-50'
              }`}
            >
              {item.name}
            </button>
          ))}
          {isNew && (
            <div className="px-3 py-2 text-xs border-t border-crm-border flex items-center gap-1.5 bg-gray-50/60 text-text-muted">
              <span className="text-primary font-bold">+</span>
              <span>«{name.trim()}» — կստեղծվի</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Assignee rows ─────────────────────────────────────────────────────────────

interface AssigneeRow { key: string; assigneeId: string; payment: string; }

function newRow(defaultId = ''): AssigneeRow {
  return { key: crypto.randomUUID(), assigneeId: defaultId, payment: '' };
}

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function AddTaskModal({ assignees: allAssignees, onClose, onCreated }: AddTaskModalProps) {
  const queryClient = useQueryClient();
  const currentUser  = useAuthStore((s) => s.user);
  // Directors aren't assignable executors — the employees list can still include
  // the director's own record, so exclude them from this picker specifically.
  const assignees = allAssignees.filter((a) => a.id !== currentUser?.id && a.name !== currentUser?.name);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn:  clientService.getAll,
  });

  const { data: statusData } = useQuery({
    queryKey: ['task-statuses'],
    queryFn:  taskStatusService.getAll,
    staleTime: 5 * 60 * 1000,
  });
  const firstStatusId = statusData?.results?.[0]?.id;

  const { data: fabricTypes = [] } = useQuery({
    queryKey: ['fabric-types'],
    queryFn:  fabricTypeService.getAll,
    staleTime: 10 * 60 * 1000,
  });

  const { data: softnessLevels = [] } = useQuery({
    queryKey: ['softness-levels'],
    queryFn:  softnessService.getAll,
    staleTime: 10 * 60 * 1000,
  });

  const { data: catalogRaw } = useQuery({
    queryKey: ['catalog-products'],
    queryFn:  () => catalogService.getAll({ is_active: true }),
    staleTime: 5 * 60 * 1000,
  });
  const catalogProducts: ProductDTO[] = (() => {

    if (!catalogRaw) return [];
    if (Array.isArray(catalogRaw)) return catalogRaw;
    const r = (catalogRaw as { results?: unknown })?.results;
    return Array.isArray(r) ? (r as ProductDTO[]) : [];
  })();


  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn:  companySettingsService.get,
    staleTime: 60_000,
  });

  const defaultDeadline = (() => {
    const days = companySettings?.default_completion_days;
    if (!days || days <= 0) return '';
    const d = new Date();
    d.setDate(d.getDate() + days);
    return toLocalDateInput(d);
  })();

  const [client, setClient]           = useState('');
  const [acceptanceDate, setAccDate]  = useState(() => toLocalDateTimeInput(new Date()));
  const [deadline, setDeadline]       = useState('');

  useEffect(() => {
    if (deadline === '' && defaultDeadline) setDeadline(defaultDeadline);
  }, [defaultDeadline]);

  function handleAcceptanceDate(date: string) {
    setAccDate(date);
    setAdvanceDate(date.slice(0, 16));
    const days = companySettings?.default_completion_days ?? parseInt(localStorage.getItem('crm_default_deadline_days') ?? '');
    if (date && days > 0) {
      const d = new Date(date);
      d.setDate(d.getDate() + days);
      setDeadline(toLocalDateInput(d));
    }
  }
  const [deliveryAddress, setAddress] = useState('');
  const [phone, setPhone]             = useState('');
  const [passportSeries, setPassport] = useState('');
  const [model, setModel]             = useState('');
  const [modelQuery, setModelQuery]   = useState('');
  const [showModelDrop, setShowModelDrop] = useState(false);
  const [dimensions, setDimensions]   = useState('');
  const [fabricTypeId, setFabricTypeId]     = useState('');
  const [fabricTypeName, setFabricTypeName] = useState('');
  const [softnessId, setSoftnessId]         = useState('');
  const [softnessName, setSoftnessName]     = useState('');
  const [clientNotes, setClientNotes] = useState('');
  const [notes, setNotes]             = useState('');
  const [price, setPrice]             = useState('');
  const [advancePayment, setAdvance]       = useState('');
  const [advancePercent, setAdvancePct]    = useState(
    () => localStorage.getItem('crm_default_advance_pct') ?? ''
  );

  useEffect(() => {
    if (companySettings?.advance_payment_percent && !localStorage.getItem('crm_default_advance_pct')) {
      setAdvancePct(String(companySettings.advance_payment_percent));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companySettings?.advance_payment_percent]);

  // Single source of truth: whenever price or percent changes, recompute the advance
  // amount. Avoids stale amounts when the percent gets filled asynchronously (e.g.
  // from company settings) after the price was already typed.
  useEffect(() => {
    const pct   = parseFloat(advancePercent);
    const total = parseFloat(price);
    if (advancePercent !== '' && pct >= 0 && total > 0) {
      setAdvance(String(Math.round(total * pct / 100)));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [price, advancePercent]);
  const [advanceDate, setAdvanceDate]      = useState(() => toLocalDateTimeInput(new Date()));
  const [advanceMethod, setAdvanceMethod]  = useState<'card' | 'cash' | ''>('');
  const [finalPayment, setFinal]           = useState('');
  const [finalDate, setFinalDate]          = useState('');
  const [finalMethod, setFinalMethod]      = useState<'card' | 'cash' | ''>('');

  type MidRow = { key: string; amount: string; date: string; method: 'card' | 'cash' | '' };
  const newMidRow = (): MidRow => ({ key: Math.random().toString(36).slice(2), amount: '', date: '', method: '' });
  const [midPayments, setMidPayments] = useState<MidRow[]>([]);
  function addMidRow() { setMidPayments(r => [...r, newMidRow()]); }
  function removeMidRow(key: string) { setMidPayments(r => r.filter(x => x.key !== key)); }
  function updateMidRow(key: string, patch: Partial<MidRow>) {
    setMidPayments(r => r.map(x => x.key === key ? { ...x, ...patch } : x));
  }
  const [error, setError]             = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED = ['image/jpeg','image/jpg','image/png','image/gif','image/webp',
                   'video/mp4','video/quicktime','video/avi','video/x-matroska','video/webm'];

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const valid = Array.from(files).filter((f) => ALLOWED.includes(f.type));
    if (valid.length < files.length) setError('Թույլատրվում են միայն նկար և վիդեո ֆայլեր');
    setPendingFiles((prev) => [...prev, ...valid]);
  }

  function removeFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  const [assigneeRows, setAssigneeRows] = useState<AssigneeRow[]>([newRow()]);

  function updateRow(key: string, patch: Partial<AssigneeRow>) {
    setAssigneeRows((r) => r.map((x) => x.key === key ? { ...x, ...patch } : x));
  }
  function removeRow(key: string) {
    setAssigneeRows((r) => r.length > 1 ? r.filter((x) => x.key !== key) : r);
  }
  function addRow() {
    setAssigneeRows((r) => [...r, newRow()]);
  }
  function addAllEmployees() {
    if (assignees.length === 0) return;
    setAssigneeRows(assignees.map((a) => newRow(a.id)));
  }

  // track which client was picked from dropdown (null = typed manually)
  const [selectedClient, setSelectedClient] = useState<ClientDTO | null>(null);

  function handleSelectClient(c: ClientDTO) {
    setSelectedClient(c);
    setClient(`${c.first_name} ${c.last_name}`.trim());
    if (c.phone)        setPhone(c.phone);
    if (c.address)      setAddress(c.address);
    if (c.id_document)  setPassport(c.id_document);
    if (c.description)  setClientNotes(c.description);
    setError('');
  }

  const isBusy = uploading;

  async function handleSave() {
    if (!client.trim()) { setError('Պատվիրատուի անուն պարտադիրա'); return; }
    const firstRow = assigneeRows[0];

    // Capture files BEFORE any async work — avoids stale closure
    const filesToUpload = [...pendingFiles];

    setUploading(true);
    setError('');
    try {
      // 1. Resolve client pk
      let clientId: number | undefined = selectedClient?.id;
      if (!clientId && client.trim()) {
        const name = client.trim();
        const existing = clients.find((c) => {
          const full = `${c.first_name} ${c.last_name}`.trim().toLowerCase();
          return full === name.toLowerCase();
        });
        if (existing) {
          clientId = existing.id;
        } else {
          try {
            const [firstName, ...rest] = name.split(' ');
            const created = await clientService.create({
              first_name:  firstName ?? name,
              last_name:   rest.join(' ') || undefined,
              phone:       phone.trim()   || name,
              address:     deliveryAddress.trim() || undefined,
              id_document: passportSeries.trim()  || undefined,
              description: clientNotes.trim()     || undefined,
            } as CreateClientRequest);
            clientId = created.id;
            queryClient.invalidateQueries({ queryKey: ['clients'] });
          } catch { /* continue without id */ }
        }
      }

      // 1b. Patch existing client with passport / notes
      if (clientId && (selectedClient || clients.find((c) => c.id === clientId))) {
        const patch: Partial<{ id_document: string; description: string }> = {};
        if (passportSeries.trim()) patch.id_document = passportSeries.trim();
        if (clientNotes.trim())    patch.description  = clientNotes.trim();
        if (Object.keys(patch).length) {
          try { await clientService.update(clientId, patch); } catch { /* non-fatal */ }
        }
      }

      // 2. Resolve creatable combos — create if typed value is new
      let resolvedFabricId = fabricTypeId ? Number(fabricTypeId) : undefined;
      if (fabricTypeName.trim() && !fabricTypeId) {
        try {
          const created = await fabricTypeService.create(fabricTypeName.trim());
          queryClient.invalidateQueries({ queryKey: ['fabric-types'] });
          resolvedFabricId = created.id;
        } catch { /* skip */ }
      }
      let resolvedSoftnessId = softnessId ? Number(softnessId) : undefined;
      if (softnessName.trim() && !softnessId) {
        try {
          const created = await softnessService.create(softnessName.trim());
          queryClient.invalidateQueries({ queryKey: ['softness-levels'] });
          resolvedSoftnessId = created.id;
        } catch { /* skip */ }
      }

      // 3. Create task
      const taskName = client.trim() + (model.trim() ? ` — ${model.trim()}` : '');
      const createdTask = await taskService.create({
        name:            taskName,
        statusId:        firstStatusId !== undefined ? Number(firstStatusId) : undefined,
        priority: 'Medium',
        section:         'active',
        assigneeId:      firstRow.assigneeId || undefined,
        client:          client.trim()       || undefined,
        clientLinkId:    clientId != null ? Number(clientId) : undefined,
        phone:           phone.trim()           || undefined,
        passportSeries:  passportSeries.trim()  || undefined,
        acceptanceDate:  acceptanceDate         || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        model:           model.trim()           || undefined,
        dimensions:      dimensions.trim()      || undefined,
        fabricTypeId:    resolvedFabricId,
        softnessId:      resolvedSoftnessId,
        notes:           notes.trim()           || undefined,
        deadline:        deadline               || undefined,
        price:           price.trim()           || undefined,
        assigneePayment: firstRow.payment.trim() || undefined,
        assignees: assigneeRows
          .filter((r) => r.assigneeId)
          .map((r) => ({
            userId:       Number(r.assigneeId),
            salaryAmount: r.payment.trim() || undefined,
          })),
      });

      // 4. Resolve numeric task ID for payments and attachments
      const raw       = createdTask as unknown as Record<string, unknown>;
      const taskIdStr = String(raw?.taskId ?? '');
      let numericId   = raw?.id != null && Number(raw.id) > 0 ? Number(raw.id) : 0;
      if (numericId === 0 && taskIdStr) {
        try {
          const found = await taskService.findByTaskId(taskIdStr);
          const match = found?.results?.find((t) => t.taskId === taskIdStr);
          if (match) numericId = Number((match as unknown as Record<string, unknown>).id ?? 0);
        } catch { /* skip if lookup fails */ }
      }

      // 5. Add payments via task payment endpoint — best-effort: the task
      // itself is already saved by this point, so a payment failure here must
      // not look like the whole submission failed (that invites a re-submit
      // and a duplicate task). Collect what failed and warn instead.
      const warnings: string[] = [];
      if (numericId > 0) {
        const advanceAmt = parseFloat(advancePayment || '0') || 0;
        if (advanceAmt > 0) {
          try {
            await taskService.addPayment(String(numericId), {
              amount:        advanceAmt,
              paymentType:   'advance',
              paymentMethod: advanceMethod || 'cash',
              paidAt:        advanceDate ? new Date(advanceDate).toISOString() : undefined,
            });
          } catch { warnings.push('Կանխավճարը'); }
        }

        for (const mid of midPayments) {
          const midAmt = parseFloat(mid.amount || '0') || 0;
          if (midAmt > 0) {
            try {
              await taskService.addPayment(String(numericId), {
                amount:        midAmt,
                paymentType:   'partial',
                paymentMethod: mid.method || 'cash',
                paidAt:        mid.date ? new Date(mid.date + 'T00:00:00').toISOString() : undefined,
              });
            } catch { warnings.push('Միջանկյալ վճարումը'); }
          }
        }

        const finalAmt = parseFloat(finalPayment || '0') || 0;
        if (finalAmt > 0) {
          try {
            await taskService.addPayment(String(numericId), {
              amount:        finalAmt,
              paymentType:   'final',
              paymentMethod: finalMethod || 'cash',
              paidAt:        finalDate ? new Date(finalDate + 'T00:00:00').toISOString() : undefined,
            });
          } catch { warnings.push('Վերջնավճարը'); }
        }
      }

      // 6. Upload attachments — same reasoning: non-fatal, task already exists.
      if (filesToUpload.length > 0 && numericId > 0) {
        for (const file of filesToUpload) {
          try {
            await attachmentService.upload(numericId, file);
          } catch {
            warnings.push('Ֆայլերի վերբեռնումը');
            break;
          }
        }
      }

      if (warnings.length) {
        useToastStore.getState().addToast({
          type: 'warning',
          message: `Պատվերը պահպանվեց, բայց ${warnings.join(', ')} չհաջողվեց ավտոմատ — ավելացրեք ձեռքով։`,
        });
      }

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      onCreated?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Սխալ');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-[calc(100%-2rem)] max-w-[560px] max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-crm-border bg-white rounded-t-2xl">
          <h2 className="text-lg font-bold text-dark">Ավելացնել պատվեր</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:bg-gray-100 hover:text-dark transition-colors"
          >✕</button>
        </div>

        <div className="overflow-y-auto overflow-x-hidden overscroll-contain flex-1 min-h-0">
        <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-5">

          {/* ── Պատվիրատու ── */}
          <Section title="Պատվիրատու">
            <Field label="Անուն Ազգանուն" required error={error}>
              <ClientAutocomplete
                value={client}
                onChange={(v) => { setClient(v); setSelectedClient(null); setError(''); }}
                onSelect={handleSelectClient}
                hasError={!!error}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Հեռախոսահամար">
                <input
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d+\s-]/g, ''))}
                  placeholder="+374 XX XXX XXX"
                  className={inputCls()}
                />
              </Field>
              <Field label="Ընդունման ամսաթիվ">
                <input
                  type="datetime-local"
                  value={acceptanceDate}
                  onChange={(e) => handleAcceptanceDate(e.target.value)}
                  className={inputCls()}
                />
              </Field>
            </div>
            <Field label="Առաքման հասցե">
              <input
                value={deliveryAddress}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Քաղաք, փողոց, տուն․․․"
                className={inputCls()}
              />
            </Field>
            <Field label="Անձնագրի Սերիա">
              <input
                value={passportSeries}
                onChange={(e) => setPassport(e.target.value)}
                placeholder="AB 1234567..."
                className={inputCls()}
              />
            </Field>
            <Field label="Հաճախորդի Նշումներ">
              <textarea
                value={clientNotes}
                onChange={(e) => setClientNotes(e.target.value)}
                placeholder="Նշումներ․․․"
                rows={3}
                className={inputCls() + ' resize-none'}
              />
            </Field>
          </Section>

          {/* ── Ապրանքի բնութագիր ── */}
          <Section title="Ապրանքի բնութագիր">
            <Field label="Մոդել">
              <div className="relative">
                <input
                  value={modelQuery}
                  onChange={(e) => {
                    setModelQuery(e.target.value);
                    setModel(e.target.value);
                    setShowModelDrop(true);
                  }}
                  onFocus={() => setShowModelDrop(true)}
                  onBlur={() => setTimeout(() => setShowModelDrop(false), 150)}
                  placeholder="Մոդելի անուն..."
                  className={inputCls()}
                />
                {showModelDrop && catalogProducts.filter((p) =>
                  !modelQuery.trim() ||
                  p.name.toLowerCase().includes(modelQuery.toLowerCase()) ||
                  p.sku.toLowerCase().includes(modelQuery.toLowerCase())
                ).length > 0 && (
                  <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-crm-border rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                    {catalogProducts
                      .filter((p) =>
                        !modelQuery.trim() ||
                        p.name.toLowerCase().includes(modelQuery.toLowerCase()) ||
                        p.sku.toLowerCase().includes(modelQuery.toLowerCase())
                      )
                      .slice(0, 8)
                      .map((p) => {
                        const dims = [p.width_cm, p.height_cm, p.depth_cm].filter(Boolean).join(' × ');
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={() => {
                              setModel(p.name);
                              setModelQuery(p.name);
                              if (dims) setDimensions(dims + ' sm');
                              setShowModelDrop(false);
                            }}
                            className="w-full text-left px-4 py-2.5 hover:bg-primary/5 transition-colors border-b border-crm-border/60 last:border-0"
                          >
                            <p className="text-sm font-semibold text-dark">{p.name}</p>
                            <p className="text-xs text-text-muted mt-0.5">
                              {p.sku && <span className="font-mono mr-2">{p.sku}</span>}
                              {dims && <span>{dims} sm</span>}
                            </p>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>
            </Field>
            <Field label="Չափեր">
              <input
                value={dimensions}
                onChange={(e) => setDimensions(e.target.value)}
                placeholder="Չափեր"
                className={inputCls()}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Կտորի տեսակ">
                <CreatableCombo
                  items={fabricTypes}
                  id={fabricTypeId}
                  name={fabricTypeName}
                  onChange={(id, name) => { setFabricTypeId(id); setFabricTypeName(name); }}
                />
              </Field>
              <Field label="Փափկություն">
                <CreatableCombo
                  items={softnessLevels}
                  id={softnessId}
                  name={softnessName}
                  onChange={(id, name) => { setSoftnessId(id); setSoftnessName(name); }}
                />
              </Field>
            </div>
          </Section>

          {/* ── Task notes ── */}
          <Section title="Նշումներ">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Լրացուցիչ նշումներ․․․"
              rows={3}
              className={inputCls() + ' resize-none'}
            />
          </Section>

          {/* ── Արժեք ── */}
          <Section title="Արժեք">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Ընդհանուր արժեք">
                <input
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0 ֏"
                  className={inputCls()}
                />
              </Field>
            </div>

            {/* Advance payment */}
            <div className="mt-3 p-3 rounded-xl border border-crm-border bg-gray-50">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2.5">Կանխավճար</p>
              <div className="flex flex-col gap-3">
                <Field label="Գումար">
                  <div className="flex gap-1.5 items-center">
                    <input
                      value={advancePayment}
                      onChange={(e) => { setAdvance(e.target.value); setAdvancePct(''); }}
                      placeholder="0 ֏"
                      className={`${inputCls()} flex-1 min-w-0`}
                    />
                    <div className="relative flex-shrink-0 w-20">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={advancePercent}
                        onChange={(e) => setAdvancePct(e.target.value)}
                        placeholder="%"
                        className={`${inputCls()} pr-5`}
                      />
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted pointer-events-none">%</span>
                    </div>
                  </div>
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Ամսաթիվ">
                    <input type="datetime-local" value={advanceDate} onChange={(e) => setAdvanceDate(e.target.value)} className={inputCls()} />
                  </Field>
                  <Field label="Վճարման մեթոդ">
                    <select value={advanceMethod} onChange={(e) => setAdvanceMethod(e.target.value as 'card' | 'cash' | '')} className={inputCls()}>
                      <option value="">—</option>
                      <option value="card">Քարտով</option>
                      <option value="cash">Կանխիկ</option>
                    </select>
                  </Field>
                </div>
              </div>
            </div>

            {/* Mid payments */}
            <div className="mt-3 p-3 rounded-xl border border-crm-border bg-gray-50">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest">Միջնավճար</p>
                <button
                  type="button"
                  onClick={addMidRow}
                  className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  Ավելացնել
                </button>
              </div>
              {midPayments.length === 0 && (
                <p className="text-xs text-text-muted text-center py-2">Միջնավճարներ չկան</p>
              )}
              <div className="flex flex-col gap-2">
                {midPayments.map((mid) => (
                  <div key={mid.key} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                    <Field label="Գումար">
                      <input
                        value={mid.amount}
                        onChange={(e) => updateMidRow(mid.key, { amount: e.target.value })}
                        placeholder="0 ֏"
                        className={inputCls()}
                      />
                    </Field>
                    <Field label="Ամսաթիվ">
                      <input
                        type="date"
                        value={mid.date}
                        onChange={(e) => updateMidRow(mid.key, { date: e.target.value })}
                        className={inputCls()}
                      />
                    </Field>
                    <Field label="Վճարման մեթոդ">
                      <select
                        value={mid.method}
                        onChange={(e) => updateMidRow(mid.key, { method: e.target.value as 'card' | 'cash' | '' })}
                        className={inputCls()}
                      >
                        <option value="">—</option>
                        <option value="card">Qartov</option>
                        <option value="cash">Kanxik</option>
                      </select>
                    </Field>
                    <button
                      type="button"
                      onClick={() => removeMidRow(mid.key)}
                      className="mb-0.5 p-1.5 text-text-muted hover:text-error transition-colors rounded-lg"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Final payment */}
            <div className="mt-3 p-3 rounded-xl border border-crm-border bg-gray-50">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2.5">Վերջնավճար</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Գումար">
                  <input value={finalPayment} onChange={(e) => setFinal(e.target.value)} placeholder="0 ֏" className={inputCls()} />
                </Field>
                <Field label="Ամսաթիվ">
                  <input type="date" value={finalDate} onChange={(e) => setFinalDate(e.target.value)} className={inputCls()} />
                </Field>
                <Field label="Վճարման մեթոդ">
                  <select value={finalMethod} onChange={(e) => setFinalMethod(e.target.value as 'card' | 'cash' | '')} className={inputCls()}>
                    <option value="">—</option>
                    <option value="card">Քարտով</option>
                    <option value="cash">Կանխիկ</option>
                  </select>
                </Field>
              </div>
            </div>

            {/* Debt summary */}
            {(() => {
              const total    = parseFloat(price)         || 0;
              const advance  = parseFloat(advancePayment) || 0;
              const midTotal = midPayments.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0);
              const final    = parseFloat(finalPayment)  || 0;
              const paid     = advance + midTotal + final;
              const debt     = total - paid;
              if (total === 0) return null;
              return (
                <div className={`mt-3 p-4 rounded-xl border-2 flex items-center justify-between gap-4 ${
                  debt <= 0 ? 'border-success/40 bg-success/5' : 'border-error/30 bg-error/5'
                }`}>
                  <div className="flex flex-col gap-1 text-xs text-text-muted">
                    <span>{total.toLocaleString('hy-AM')} ֏ Ընդհանուր</span>
                    <span className="text-success">− {paid.toLocaleString('hy-AM')} ֏ Վճարված </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-0.5">Պարտք</p>
                    <p className={`text-xl font-bold ${debt <= 0 ? 'text-success' : 'text-error'}`}>
                      {debt <= 0 ? '0' : debt.toLocaleString('hy-AM')} ֏
                    </p>
                    {debt <= 0 && <p className="text-[10px] text-success font-semibold">Ամբողջովին Վճարված ✓</p>}
                  </div>
                </div>
              );
            })()}
          </Section>

          {/* ── Կատարագրություն ── */}
          <Section title="Կատարագրություն">
            {/* Assignee rows */}
            <div className="flex flex-col gap-2">
              {assigneeRows.map((row, idx) => {
                // Hide employees already picked in another row — an already-selected
                // executor's own row still shows their name via row.assigneeId.
                const pickedElsewhere = new Set(
                  assigneeRows.filter((r) => r.key !== row.key && r.assigneeId).map((r) => r.assigneeId)
                );
                const rowOptions = assignees.filter((a) => !pickedElsewhere.has(a.id ?? ''));
                return (
                <div key={row.key} className="flex gap-2 items-end">
                  <div className="flex-1">
                    {idx === 0 && (
                      <p className="text-sm font-medium text-dark mb-1.5">
                        Կատարող
                      </p>
                    )}
                    <select
                      value={row.assigneeId}
                      onChange={(e) => { updateRow(row.key, { assigneeId: e.target.value }); setError(''); }}
                      className={inputCls(false)}
                    >
                      <option value="">Ընտրել...</option>
                      {rowOptions.map((a) => (
                        <option key={a.id ?? a.name} value={a.id ?? ''}>{a.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24 sm:w-32">
                    {idx === 0 && (
                      <p className="text-sm font-medium text-dark mb-1.5">Գումար</p>
                    )}
                    <input
                      value={row.payment}
                      onChange={(e) => updateRow(row.key, { payment: e.target.value })}
                      placeholder="0 ֏"
                      className={inputCls()}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    disabled={assigneeRows.length === 1}
                    className="mb-px p-2.5 text-text-muted hover:text-error hover:bg-error/10 rounded-xl transition-colors disabled:opacity-20"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Ավելացնել կատարող
              </button>
              <button
                type="button"
                onClick={addAllEmployees}
                disabled={assignees.length === 0}
                className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                </svg>
                Ավելացնել բոլորին
              </button>
            </div>

            <Field label="Վերջնաժամկետ">
              <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls()} />
            </Field>
          </Section>

          {/* Footer */}
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {pendingFiles.map((file, idx) => {
                const isImg = file.type.startsWith('image/');
                const objUrl = isImg ? URL.createObjectURL(file) : null;
                return (
                  <div key={idx} className="relative group w-16 h-16 rounded-xl overflow-hidden border border-crm-border bg-gray-50 flex items-center justify-center flex-shrink-0">
                    {objUrl ? (
                      <img src={objUrl} alt={file.name} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-7 h-7 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                      </svg>
                    )}
                    <button type="button" onClick={() => removeFile(idx)}
                      className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] leading-none"
                    >✕</button>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1 py-0.5">
                      <p className="text-[9px] text-white truncate">{file.name}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/avi,video/x-matroska,video/webm"
                multiple
                className="hidden"
                onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isBusy}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-crm-border text-text-muted hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-50"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                Ավելացնել նկար
                {pendingFiles.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold">
                    {pendingFiles.length}
                  </span>
                )}
              </button>
            </div>
            <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isBusy}
              className="px-5 py-2.5 text-sm font-medium rounded-xl border border-crm-border text-dark hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Չեղարկել
            </button>
            <button
              onClick={handleSave}
              disabled={isBusy}
              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60"
            >
              {isBusy ? 'Պահպանում...' : 'Պատվիրել'}
            </button>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
