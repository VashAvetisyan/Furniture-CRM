'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { taskService, taskStatusService, fabricTypeService, softnessService, attachmentService } from '@/services/task.service';
import type { NamedItemDTO } from '@/services/task.service';
import { clientService } from '@/services/client.service';
import type { ClientDTO, CreateClientRequest } from '@/services/client.service';
import { financeService } from '@/services/finance.service';
import { catalogService, type ProductDTO } from '@/services/catalog.service';
import type { TaskPriority } from '../types';
import type { PanelAssignee } from './ProjectsListPanel';

interface AddTaskModalProps {
  assignees:  PanelAssignee[];
  onClose:    () => void;
  onCreated?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────

const PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];

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

// ── SelectWithAdd ─────────────────────────────────────────────────────────────

function SelectWithAdd({ value, onChange, items, onCreate, queryKey }: {
  value:    string;
  onChange: (v: string) => void;
  items:    NamedItemDTO[];
  onCreate: (name: string) => Promise<NamedItemDTO>;
  queryKey: string;
}) {
  const queryClient   = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (adding) inputRef.current?.focus(); }, [adding]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) { setAdding(false); return; }
    setSaving(true);
    try {
      const created = await onCreate(name);
      queryClient.invalidateQueries({ queryKey: [queryKey] });
      onChange(String(created.id));
    } finally {
      setSaving(false);
      setNewName('');
      setAdding(false);
    }
  }

  return (
    <div className="flex gap-1.5 items-center">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls()}
      >
        <option value="">Ընտրել...</option>
        {items.map((i) => <option key={i.id} value={String(i.id)}>{i.name}</option>)}
      </select>

      {adding ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            ref={inputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') { setAdding(false); setNewName(''); }
            }}
            disabled={saving}
            placeholder="Անուն..."
            className="w-24 px-2 py-1.5 text-xs rounded-lg border border-primary outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
          />
          <button type="button" onClick={handleCreate} disabled={saving || !newName.trim()}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-primary text-white text-xs hover:bg-primary-hover disabled:opacity-40 transition-colors flex-shrink-0"
          >{saving ? '…' : '✓'}</button>
          <button type="button" onClick={() => { setAdding(false); setNewName(''); }}
            className="w-7 h-7 flex items-center justify-center rounded-full border border-crm-border text-text-muted hover:border-error hover:text-error text-xs transition-colors flex-shrink-0"
          >✕</button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          title="Ավելացնել նոր"
          className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl border-2 border-dashed border-crm-border text-text-muted hover:border-primary hover:text-primary transition-colors text-lg font-light"
        >+</button>
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

export default function AddTaskModal({ assignees, onClose, onCreated }: AddTaskModalProps) {
  const queryClient = useQueryClient();

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


  const [client, setClient]           = useState('');
  const [acceptanceDate, setAccDate]  = useState('');
  const [deliveryAddress, setAddress] = useState('');
  const [phone, setPhone]             = useState('');
  const [model, setModel]             = useState('');
  const [modelQuery, setModelQuery]   = useState('');
  const [showModelDrop, setShowModelDrop] = useState(false);
  const [dimensions, setDimensions]   = useState('');
  const [fabricType, setFabric]       = useState('');
  const [softness, setSoftness]       = useState('');
  const [notes, setNotes]             = useState('');
  const [deadline, setDeadline]       = useState('');
  const [price, setPrice]             = useState('');
  const [advancePayment, setAdvance]       = useState('');
  const [advanceDate, setAdvanceDate]      = useState('');
  const [advanceMethod, setAdvanceMethod]  = useState<'card' | 'cash' | ''>('');
  const [finalPayment, setFinal]           = useState('');
  const [finalDate, setFinalDate]          = useState('');
  const [finalMethod, setFinalMethod]      = useState<'card' | 'cash' | ''>('');
  const [priority, setPriority]       = useState<TaskPriority>('Medium');
  const [error, setError]             = useState('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ALLOWED = ['image/jpeg','image/jpg','image/png','image/gif','image/webp',
                   'video/mp4','video/quicktime','video/avi','video/x-matroska','video/webm'];

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const valid = Array.from(files).filter((f) => ALLOWED.includes(f.type));
    if (valid.length < files.length) setError('Թuylatretvum en miayni nkar u video fayleр');
    setPendingFiles((prev) => [...prev, ...valid]);
  }

  function removeFile(idx: number) {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  }

  const [assigneeRows, setAssigneeRows] = useState<AssigneeRow[]>([newRow(assignees[0]?.id ?? '')]);

  function updateRow(key: string, patch: Partial<AssigneeRow>) {
    setAssigneeRows((r) => r.map((x) => x.key === key ? { ...x, ...patch } : x));
  }
  function removeRow(key: string) {
    setAssigneeRows((r) => r.length > 1 ? r.filter((x) => x.key !== key) : r);
  }
  function addRow() {
    setAssigneeRows((r) => [...r, newRow()]);
  }

  // track which client was picked from dropdown (null = typed manually)
  const [selectedClient, setSelectedClient] = useState<ClientDTO | null>(null);

  function handleSelectClient(c: ClientDTO) {
    setSelectedClient(c);
    setClient(`${c.first_name} ${c.last_name}`.trim());
    if (c.phone)   setPhone(c.phone);
    if (c.address) setAddress(c.address);
    setError('');
  }

  const isBusy = uploading;

  async function handleSave() {
    if (!client.trim()) { setError('Պատвiritatuyi anuny partadiр'); return; }
    const firstRow = assigneeRows[0];
    if (!firstRow?.assigneeId) { setError('Yntreq kataroghi'); return; }

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
              first_name: firstName ?? name,
              last_name:  rest.join(' ') || undefined,
              phone:      phone.trim()   || name,
              address:    deliveryAddress.trim() || undefined,
            } as CreateClientRequest);
            clientId = created.id;
            queryClient.invalidateQueries({ queryKey: ['clients'] });
          } catch { /* continue without id */ }
        }
      }

      // 2. Create task
      const taskName = client.trim() + (model.trim() ? ` — ${model.trim()}` : '');
      const createdTask = await taskService.create({
        name:            taskName,
        statusId:        firstStatusId !== undefined ? Number(firstStatusId) : undefined,
        priority,
        section:         'active',
        assigneeId:      firstRow.assigneeId,
        client:          client.trim() || undefined,
        clientLinkId:    clientId != null ? Number(clientId) : undefined,
        phone:           phone.trim()           || undefined,
        acceptanceDate:  acceptanceDate         || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        model:           model.trim()           || undefined,
        dimensions:      dimensions.trim()      || undefined,
        fabricTypeId:    fabricType ? Number(fabricType) : undefined,
        softnessId:      softness   ? Number(softness)   : undefined,
        notes:           notes.trim()           || undefined,
        deadline:        deadline               || undefined,
        price:           price.trim()           || undefined,
        advancePayment:       advancePayment.trim()  || undefined,
        advancePaymentDate:   advanceDate            || undefined,
        advancePaymentMethod: advanceMethod          || undefined,
        finalPayment:         finalPayment.trim()    || undefined,
        finalPaymentDate:     finalDate              || undefined,
        finalPaymentMethod:   finalMethod            || undefined,
        assigneePayment: firstRow.payment.trim() || undefined,
        assignees: assigneeRows
          .filter((r) => r.assigneeId)
          .map((r) => ({
            user:          Number(r.assigneeId),
            salary_amount: r.payment.trim() || '0',
            is_paid:       false,
            paid_at:       null,
          })),
      });

      // 3. Finance transactions for advance / final payments
      const rawTask   = createdTask as unknown as Record<string, unknown>;
      const taskDbId  = rawTask?.id != null && Number(rawTask.id) > 0 ? Number(rawTask.id) : 0;
      const taskLabel = String(rawTask?.taskId ?? '');
      const today     = new Date().toISOString().slice(0, 10);

      const advanceAmt = parseFloat(advancePayment || '0') || 0;
      const finalAmt   = parseFloat(finalPayment   || '0') || 0;

      if (advanceAmt > 0) {
        try {
          await financeService.create({
            direction:        'in',
            category:         'payment_advance',
            amount:           advanceAmt,
            description:      `Կանխավճար — ${taskLabel}`,
            transaction_date: advanceDate || today,
            payment_method:   advanceMethod || undefined,
            task:             taskDbId > 0 ? taskDbId : undefined,
          });
        } catch { /* transaction failure doesn't cancel task */ }
      }

      if (finalAmt > 0) {
        try {
          await financeService.create({
            direction:        'in',
            category:         'payment_final',
            amount:           finalAmt,
            description:      `Վերջնավճար — ${taskLabel}`,
            transaction_date: finalDate || today,
            payment_method:   finalMethod || undefined,
            task:             taskDbId > 0 ? taskDbId : undefined,
          });
        } catch { /* transaction failure doesn't cancel task */ }
      }

      // 4. Upload attachments
      // POST /tasks/ often omits "id" — fetch the created task by taskId to get real DB id
      if (filesToUpload.length > 0) {
        const raw       = createdTask as unknown as Record<string, unknown>;
        const taskIdStr = String(raw?.taskId ?? '');

        // Try direct id first, then fetch by search to get real numeric id
        let uploadId = raw?.id != null && Number(raw.id) > 0 ? Number(raw.id) : 0;

        if (uploadId === 0 && taskIdStr) {
          try {
            const found = await taskService.findByTaskId(taskIdStr);
            const match = found?.results?.find((t) => t.taskId === taskIdStr);
            if (match) {
              const mRaw = match as unknown as Record<string, unknown>;
              uploadId = Number(mRaw.id ?? 0);
            }
          } catch { /* skip if lookup fails */ }
        }

        if (uploadId > 0) {
          for (const file of filesToUpload) {
            try {
              await attachmentService.upload(uploadId, file);
            } catch (uploadErr: unknown) {
              const msg = uploadErr instanceof Error ? uploadErr.message : 'Upload error';
              setError(`Ֆայlero upload chstacav: ${msg}`);
              setUploading(false);
              return;
            }
          }
        }
      }

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['finance-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      onCreated?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Сехалт');
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

        <div className="overflow-y-auto overscroll-contain flex-1 min-h-0">
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
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+374 XX XXX XXX"
                  className={inputCls()}
                />
              </Field>
              <Field label="Ընդունման ամսաթիվ">
                <input
                  type="date"
                  value={acceptanceDate}
                  onChange={(e) => setAccDate(e.target.value)}
                  className={inputCls()}
                />
              </Field>
            </div>
            <Field label="Առաքման հասցե">
              <input
                value={deliveryAddress}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Քաղաք, Տուն, Բնակ..."
                className={inputCls()}
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
                placeholder="Օ — 90, Կուրծք — 44, Բազուկ — 60..."
                className={inputCls()}
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Կտորի տեսակ">
                <SelectWithAdd
                  value={fabricType}
                  onChange={setFabric}
                  items={fabricTypes}
                  onCreate={(name) => fabricTypeService.create(name)}
                  queryKey="fabric-types"
                />
              </Field>
              <Field label="Փափկություն">
                <SelectWithAdd
                  value={softness}
                  onChange={setSoftness}
                  items={softnessLevels}
                  onCreate={(name) => softnessService.create(name)}
                  queryKey="softness-levels"
                />
              </Field>
            </div>
          </Section>

          {/* ── Արժեք ── */}
          <Section title="Արժեք">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Ընդհանուր արժեք">
                <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0 ֏" className={inputCls()} />
              </Field>
            </div>

            {/* Advance payment */}
            <div className="mt-3 p-3 rounded-xl border border-crm-border bg-gray-50">
              <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2.5">Կանխավճար</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field label="Գումար">
                  <input value={advancePayment} onChange={(e) => setAdvance(e.target.value)} placeholder="0 ֏" className={inputCls()} />
                </Field>
                <Field label="Ամսաթիվ">
                  <input type="date" value={advanceDate} onChange={(e) => setAdvanceDate(e.target.value)} className={inputCls()} />
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
          </Section>

          {/* ── Կատարագրություն ── */}
          <Section title="Կատարագրություն">
            {/* Assignee rows */}
            <div className="flex flex-col gap-2">
              {assigneeRows.map((row, idx) => (
                <div key={row.key} className="flex gap-2 items-end">
                  <div className="flex-1">
                    {idx === 0 && (
                      <p className="text-sm font-medium text-dark mb-1.5">
                        Կատարող<span className="text-error ml-0.5">*</span>
                      </p>
                    )}
                    <select
                      value={row.assigneeId}
                      onChange={(e) => { updateRow(row.key, { assigneeId: e.target.value }); setError(''); }}
                      className={inputCls(!row.assigneeId && !!error)}
                    >
                      <option value="">Ընտրել...</option>
                      {assignees.map((a) => (
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
              ))}
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Կարևություն">
                <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputCls()}>
                  {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Վերջնաժամկետ">
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls()} />
              </Field>
            </div>
          </Section>

          {/* ── Նիշումներ ── */}
          <Section title="Նիշումներ">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Լրացուցիչ նկատառություններ..."
              rows={3}
              className={inputCls() + ' resize-none'}
            />
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
