'use client';

import { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskService, taskStatusService, fabricTypeService, softnessService, attachmentService } from '@/services/task.service';
import type { NamedItemDTO, TaskCommentDTO, AttachmentDTO } from '@/services/task.service';
import { deliveryService } from '@/services/delivery.service';
import { debtService } from '@/services/debt.service';
import { mediaUrl } from '@/lib/api';
import { employeeService } from '@/services/employee.service';
import { clientService, type ClientDTO } from '@/services/client.service';
import Avatar from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores';
import { ArrowUpIcon, ArrowDownIcon } from '@/components/icons';
import type { Task, TaskPriority, TaskPayment, TaskDeliveryInfo } from '../types';

const PRIORITIES: TaskPriority[] = ['High', 'Medium', 'Low'];

const priorityConfig: Record<TaskPriority, { bg: string; text: string; label: string; Icon: typeof ArrowUpIcon }> = {
  High:   { bg: 'bg-error/10',   text: 'text-error',   label: 'Բարձր',  Icon: ArrowUpIcon   },
  Medium: { bg: 'bg-warning/10', text: 'text-warning', label: 'Միջին',  Icon: ArrowUpIcon   },
  Low:    { bg: 'bg-success/10', text: 'text-success', label: 'Ցածր',   Icon: ArrowDownIcon },
};

function inputCls() {
  return 'w-full px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all bg-white';
}

function MetaCell({ label, accent, children }: {
  label: string; accent?: 'error' | 'success' | 'primary'; children: React.ReactNode;
}) {
  const valueCls =
    accent === 'error'   ? 'text-error font-semibold' :
    accent === 'success' ? 'text-success font-semibold' :
    accent === 'primary' ? 'text-primary font-semibold' :
    'text-dark font-medium';
  return (
    <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">{label}</p>
      <p className={`text-sm leading-snug ${valueCls}`}>{children}</p>
    </div>
  );
}

function SectionTitle({ icon, children }: { icon: string; children: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-base leading-none">{icon}</span>
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest flex-1 border-b border-crm-border pb-1.5">
        {children}
      </p>
    </div>
  );
}

function EditField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{label}</p>
      {children}
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
        className="w-full px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all bg-white"
      >
        <option value="">—</option>
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

// ── Client autocomplete ───────────────────────────────────────────────────────

function ClientAutocomplete({ value, onChange, onSelect, clients }: {
  value:    string;
  onChange: (v: string) => void;
  onSelect: (c: ClientDTO) => void;
  clients:  ClientDTO[];
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = value.trim().length >= 1
    ? clients.filter((c) => {
        const full = `${c.first_name} ${c.last_name}`.toLowerCase();
        return full.includes(value.toLowerCase()) || c.phone?.includes(value);
      }).slice(0, 6)
    : [];

  useEffect(() => {
    function h(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={value}
        onChange={(e) => { onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Անուն Ազգանուն..."
        className={inputCls()}
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-crm-border rounded-xl shadow-lg overflow-hidden">
          {suggestions.map((c) => (
            <button
              key={c.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(c); setOpen(false); }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex flex-col gap-0.5"
            >
              <span className="font-medium text-dark">{c.first_name} {c.last_name}</span>
              {c.phone && <span className="text-xs text-text-muted">{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Assignee rows ─────────────────────────────────────────────────────────────

interface AssigneeRow { key: string; assigneeId: string; payment: string; }

function makeRow(assigneeId = '', payment = ''): AssigneeRow {
  return { key: crypto.randomUUID(), assigneeId, payment };
}

function initRows(task: Task): AssigneeRow[] {
  if (task.assignees && task.assignees.length > 0) {
    return task.assignees.map((a) => makeRow(String(a.userId), a.salaryAmount));
  }
  return [makeRow(task.assigneeId ?? '')];
}

// ─────────────────────────────────────────────────────────────────────────────

interface TaskDetailModalProps {
  task:               Task;
  projectName?:       string;
  onClose:            () => void;
  allowArchive?:      boolean;
  allowSendDelivery?: boolean;
}

export default function TaskDetailModal({ task, projectName, onClose, allowArchive = false, allowSendDelivery = false }: TaskDetailModalProps) {
  const queryClient = useQueryClient();
  const role        = useAuthStore((s) => s.role);
  const user        = useAuthStore((s) => s.user);
  const isEmployee  = role === 'employee';
  const myUserId    = user?.id ? Number(user.id) : null;
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: async ({ taskData }: { taskData: Parameters<typeof taskService.update>[1] }) => {
      await taskService.update(task.id, taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setEditing(false);
      onClose();
    },
    onError: (err: Error) => setSaveError(err.message),
  });

  const [sendToDelivery,      setSendToDelivery]      = useState(false);
  const [sendDeliveryAddr,    setSendDeliveryAddr]    = useState('');
  const [sendDeliveryRecip,   setSendDeliveryRecip]   = useState('');
  const [sendDeliveryNotes,   setSendDeliveryNotes]   = useState('');
  const [invoiceLoading,      setInvoiceLoading]      = useState(false);
  const [invoiceError,        setInvoiceError]        = useState('');

  async function handleInvoice() {
    setInvoiceLoading(true);
    setInvoiceError('');
    try {
      await taskService.downloadInvoice(task.id);
    } catch (e) {
      setInvoiceError((e as Error).message);
    } finally {
      setInvoiceLoading(false);
    }
  }

  const { mutate: sendDeliveryMutate, isPending: isSendingDelivery } = useMutation({
    mutationFn: async () => {
      const existingDelivery = task.delivery;
      if (existingDelivery) {
        await deliveryService.update(existingDelivery.id, {
          address:       sendDeliveryAddr.trim()  || undefined,
          recipientName: sendDeliveryRecip.trim() || undefined,
          notes:         sendDeliveryNotes.trim() || undefined,
        });
      } else {
        await deliveryService.create({
          task:          taskNumericId,
          address:       sendDeliveryAddr.trim() || task.deliveryAddress || '',
          recipientName: sendDeliveryRecip.trim() || undefined,
          notes:         sendDeliveryNotes.trim() || undefined,
        });
      }
      await taskService.update(task.id, { deliveryConfirmed: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      setSendToDelivery(false);
      onClose();
    },
    onError: (err: Error) => setSaveError(err.message),
  });

  const { data: statusData } = useQuery({
    queryKey: ['task-statuses'],
    queryFn:  taskStatusService.getAll,
    staleTime: 5 * 60 * 1000,
  });
  const statuses = statusData?.results ?? [];
  const isLastStatus = statuses.length > 0 && String(statuses[statuses.length - 1].id) === String(task.status);

  const [currentStatus,   setCurrentStatus]   = useState(String(task.status));
  const [pendingStatusId, setPendingStatusId] = useState<number | null>(null);
  const [stageComment,    setStageComment]    = useState('');

  const { data: stageComments, refetch: refetchComments } = useQuery({
    queryKey: ['task-comments', task.id],
    queryFn:  () => taskService.getComments(task.id),
    initialData: (task.comments ?? []) as TaskCommentDTO[],
    staleTime: 0,
  });


  // ── Attachments ───────────────────────────────────────────────────────────────
  const attachFileRef = useRef<HTMLInputElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const { data: attachments = [], refetch: refetchAttachments } = useQuery<AttachmentDTO[]>({
    queryKey: ['task-attachments', task.id],
    queryFn:  () => attachmentService.getAll(task.id),
    staleTime: 0,
  });

  const taskNumericId = Number((task as unknown as Record<string, unknown>).id ?? 0);

  async function handleAttachUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadingFile(true);
    try {
      await Promise.allSettled(Array.from(files).map((f) => attachmentService.upload(task.id, f)));
      refetchAttachments();
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleAttachDelete(attachId: number) {
    await attachmentService.delete(task.id, attachId);
    refetchAttachments();
  }

  function resolveAttachUrl(url: string): string {
    return mediaUrl(url) ?? url;
  }

  const { mutate: moveStatus, isPending: isMovingStatus } = useMutation({
    mutationFn: async ({ statusId, comment }: { statusId: number; comment?: string }) => {
      // If same status — only add comment, don't change status
      if (String(statusId) !== currentStatus) {
        await taskService.update(task.id, { statusId });
      }
      if (comment) {
        await taskService.createComment(task.id, { text: comment, task_status_id: statusId });
      }
    },
    onSuccess: (_, { statusId }) => {
      if (String(statusId) !== currentStatus) {
        setCurrentStatus(String(statusId));
      }
      setPendingStatusId(null);
      setStageComment('');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      refetchComments();
    },
  });

  const [archiveConfirm,   setArchiveConfirm]   = useState(false);
  const [archivePayAmt,    setArchivePayAmt]    = useState('');
  const [archivePayMethod, setArchivePayMethod] = useState<'cash' | 'card'>('cash');

  const { data: costSummary, isLoading: costLoading } = useQuery({
    queryKey: ['cost-summary', task.id],
    queryFn:  () => taskService.getCostSummary(task.id),
    enabled:  archiveConfirm,
  });

  const balanceDue = parseFloat(costSummary?.balance_due ?? '0') || 0;

  const { mutate: archiveTask, isPending: isArchiving } = useMutation({
    mutationFn: async ({ addDebt }: { addDebt: boolean }) => {
      const payAmt = parseFloat(archivePayAmt) || 0;
      if (payAmt > 0) {
        await taskService.addPayment(task.id, {
          amount:        payAmt,
          paymentType:   'final',
          paymentMethod: archivePayMethod,
        });
      }
      if (addDebt) {
        const remaining = Math.max(0, balanceDue - payAmt);
        if (remaining > 0 && task.clientLinkId) {
          await debtService.create({
            client: task.clientLinkId,
            title:  `${task.taskId} — ${task.name}`,
            task:   Number(task.id),
            amount: String(remaining),
            notes:  `${task.taskId} — ${task.name}`,
          });
        }
      }
      if (task.delivery?.id) {
        await deliveryService.delete(task.delivery.id);
      }
      await taskService.update(task.id, { section: 'archive' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
      queryClient.invalidateQueries({ queryKey: ['debts'] });
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-stats'] });
      onClose();
    },
  });

  const { mutate: removeComment } = useMutation({
    mutationFn: (commentId: number) => taskService.deleteComment(task.id, commentId),
    onSuccess: () => refetchComments(),
  });

  const { mutate: doMarkStarted, isPending: isMarkingStarted } = useMutation({
    mutationFn: ({ userId, isStarted }: { userId: number; isStarted: boolean }) =>
      taskService.markStarted(task.id, userId, isStarted),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
    },
  });

  const { mutate: doMarkDone, isPending: isMarkingDone } = useMutation({
    mutationFn: ({ userId, isDone }: { userId: number; isDone: boolean }) =>
      taskService.markDone(task.id, userId, isDone),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['tasks', 'my'] });
    },
  });

  const [client,          setClient]   = useState('');
  const [clientId,        setClientId] = useState(task.client          ?? '');
  const [phone,           setPhone]    = useState(task.phone           ?? '');
  const [passportSeries,  setPassport] = useState(task.passportSeries  ?? '');
  const [acceptanceDate,  setAccDate]  = useState(task.acceptanceDate  ?? '');
  const [deliveryAddress, setAddress]  = useState(task.deliveryAddress ?? '');
  const [clientNotes,     setClientNotes] = useState(task.description  ?? '');
  const [model,           setModel]    = useState(task.model           ?? '');
  const [dimensions,      setDims]     = useState(task.dimensions      ?? '');
  const [fabricType,      setFabric]   = useState(task.fabricTypeId != null ? String(task.fabricTypeId) : '');
  const [softness,        setSoftness] = useState(task.softnessId  != null ? String(task.softnessId)  : '');
  const [price,           setPrice]    = useState(task.price           ?? '');
  const [deadline,        setDeadline] = useState(task.deadline        ?? '');
  const [priority,        setPriority] = useState<TaskPriority>(task.priority);
  const [notes,           setNotes]    = useState(task.notes ?? '');
  const [assigneeRows,    setAssigneeRows] = useState<AssigneeRow[]>(() => initRows(task));
  const [addingPayment, setAddingPayment] = useState(false);
  const [newPayAmt,     setNewPayAmt]     = useState('');
  const [newPayType,    setNewPayType]    = useState<'advance' | 'partial' | 'final' | 'other'>('advance');
  const [newPayMethod,  setNewPayMethod]  = useState<'cash' | 'card'>('cash');
  const [newPayDate,    setNewPayDate]    = useState('');
  const [newPayNote,    setNewPayNote]    = useState('');

  function updateRow(key: string, patch: Partial<AssigneeRow>) {
    setAssigneeRows((r) => r.map((x) => x.key === key ? { ...x, ...patch } : x));
  }
  function removeRow(key: string) {
    setAssigneeRows((r) => r.length > 1 ? r.filter((x) => x.key !== key) : r);
  }
  function addRow() {
    setAssigneeRows((r) => [...r, makeRow()]);
  }

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn:  () => employeeService.getAll(),
  });
  const employees = employeesData?.data ?? [];

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn:  clientService.getAll,
    staleTime: 5 * 60 * 1000,
  });

  const linkedClient: ClientDTO | undefined = task.clientLinkId
    ? clients.find((c) => c.id === task.clientLinkId)
    : clients.find((c) => {
        const num = Number(task.client);
        return !isNaN(num) && num > 0 && c.id === num;
      });

  useEffect(() => {
    if (!linkedClient) return;
    if (linkedClient.id_document) setPassport(linkedClient.id_document);
    if (linkedClient.description) setClientNotes(linkedClient.description);
  }, [linkedClient?.id]);

  function resolveClientName(clientIdOrName: string | undefined): string {
    if (!clientIdOrName) return '—';
    const asNum = Number(clientIdOrName);
    if (!isNaN(asNum) && asNum > 0) {
      const found = clients.find((c) => c.id === asNum);
      if (found) return `${found.first_name} ${found.last_name}`.trim();
    }
    return clientIdOrName;
  }

  useEffect(() => {
    if (clients.length > 0) {
      const resolved = resolveClientName(task.client);
      setClient(resolved === '—' ? '' : resolved);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients]);

  const { data: fabricTypes = [] } = useQuery({
    queryKey: ['fabric-types'],
    queryFn:  fabricTypeService.getAll,
    staleTime: 10 * 60 * 1000,
  });

  const { data: taskPayments = [], refetch: refetchPayments } = useQuery({
    queryKey: ['task-payments', task.id],
    queryFn:  () => taskService.listPayments(task.id),
    initialData: (task.payments ?? []) as TaskPayment[],
    staleTime: 0,
  });

  const { mutate: addPaymentMutate, isPending: isAddingPayment } = useMutation({
    mutationFn: () => taskService.addPayment(task.id, {
      amount:        Number(newPayAmt),
      paymentType:   newPayType,
      paymentMethod: newPayMethod,
      paidAt:        newPayDate ? new Date(newPayDate).toISOString() : undefined,
      note:          newPayNote.trim() || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      refetchPayments();
      setAddingPayment(false);
      setNewPayAmt('');
      setNewPayType('advance');
      setNewPayMethod('cash');
      setNewPayDate('');
      setNewPayNote('');
    },
    onError: (err: Error) => setSaveError(err.message),
  });

  const { mutate: deletePaymentMutate } = useMutation({
    mutationFn: (paymentId: number) => taskService.removePayment(task.id, paymentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      refetchPayments();
    },
    onError: (err: Error) => setSaveError(err.message),
  });

  const { data: softnessLevels = [] } = useQuery({
    queryKey: ['softness-levels'],
    queryFn:  softnessService.getAll,
    staleTime: 10 * 60 * 1000,
  });

  function handleSave() {
    setSaveError('');
    const firstRow = assigneeRows[0];
    mutate({
      taskData: {
        name:            (client.trim() || task.name) + (model.trim() ? ` — ${model.trim()}` : ''),
        client:          clientId.trim()        || undefined,
        phone:           phone.trim()           || undefined,
        passportSeries:  passportSeries.trim()  || undefined,
        description:     clientNotes.trim()     || undefined,
        acceptanceDate:  acceptanceDate         || undefined,
        deliveryAddress: deliveryAddress.trim() || undefined,
        model:           model.trim()           || undefined,
        dimensions:      dimensions.trim()      || undefined,
        fabricTypeId:    fabricType ? Number(fabricType) : null,
        softnessId:      softness   ? Number(softness)   : null,
        price:           price.trim()           || undefined,
        deadline:        deadline               || undefined,
        priority,
        notes:           notes.trim()           || undefined,
        assigneeId:      firstRow?.assigneeId   || undefined,
        assignees: assigneeRows
          .filter((r) => r.assigneeId)
          .map((r) => ({
            userId:       Number(r.assigneeId),
            salaryAmount: r.payment.trim() || undefined,
          })),
      },
    });
  }

  function handleCancel() {
    setClient(resolveClientName(task.client) === '—' ? '' : resolveClientName(task.client));
    setClientId(task.client ?? '');
    setPhone(task.phone ?? '');
    setPassport(linkedClient?.id_document || task.passportSeries || '');
    setAccDate(task.acceptanceDate ?? '');
    setAddress(task.deliveryAddress ?? '');
    setClientNotes(linkedClient?.description || task.description || '');
    setModel(task.model ?? '');
    setDims(task.dimensions ?? '');
    setFabric(task.fabricTypeId != null ? String(task.fabricTypeId) : '');
    setSoftness(task.softnessId  != null ? String(task.softnessId)  : '');
    setPrice(task.price ?? '');
    setDeadline(task.deadline ?? '');
    setPriority(task.priority);
    setNotes(task.notes ?? '');
    setAssigneeRows(initRows(task));
    setEditing(false);
  }

  const { bg, text: tc, label: pLabel, Icon } = priorityConfig[priority];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      onClick={!editing ? onClose : undefined}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-[calc(100%-2rem)] max-w-[580px] max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 border-b border-crm-border bg-white rounded-t-2xl flex flex-col gap-2">
          {/* Row 1: meta + close */}
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="text-xs font-mono text-primary bg-primary-light px-2 py-0.5 rounded-md font-semibold">
                  {task.taskId}
                </span>
                {task.createdAt && (
                  <span className="text-xs text-text-muted">
                    {new Date(task.createdAt).toLocaleString('ru-RU', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                  </span>
                )}
                {projectName && (
                  <span className="text-xs text-text-muted">· {projectName}</span>
                )}
              </div>
              <h2 className="text-sm sm:text-base font-bold text-dark leading-snug">{task.name}</h2>
            </div>
            {!editing && (
              <button
                onClick={onClose}
                className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:bg-gray-100 hover:text-dark transition-colors text-sm mt-0.5"
              >
                ✕
              </button>
            )}
          </div>

          {/* Row 2: action buttons */}
          {!editing && !isEmployee && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {task.section === 'archive' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-success/10 text-success">
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                  Կատարված
                </span>
              )}
              <button
                onClick={handleInvoice}
                disabled={invoiceLoading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-crm-border text-dark hover:bg-gray-50 transition-colors disabled:opacity-40"
              >
                <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="12" y1="18" x2="12" y2="12"/>
                  <polyline points="9 15 12 18 15 15"/>
                </svg>
                {invoiceLoading ? '...' : 'Invoice'}
              </button>
              {task.section !== 'archive' && (
                <>
                  <button
                    onClick={() => setEditing(true)}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-crm-border text-dark hover:bg-gray-50 transition-colors"
                  >
                    Խմբագրել
                  </button>
                  {allowSendDelivery && isLastStatus && (
                    <button
                      onClick={() => {
                        setSendDeliveryAddr(task.delivery?.address || task.deliveryAddress || '');
                        setSendDeliveryRecip(task.delivery?.recipientName || resolveClientName(task.client));
                        setSendDeliveryNotes('');
                        setSendToDelivery(true);
                      }}
                      disabled={isSendingDelivery}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                    >
                      {isSendingDelivery ? '...' : task.delivery ? 'Թnrgrlu Arakvman' : 'Ուղղարկել Առաքման'}
                    </button>
                  )}
                  {allowArchive && (
                    <button
                      onClick={() => { setArchiveConfirm(true); setArchivePayAmt(''); }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-crm-border text-text-muted hover:border-amber-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                    >
                      Կատարված
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="overflow-y-auto overscroll-contain flex-1 min-h-0">
        <div className="px-4 sm:px-6 py-4 sm:py-5 flex flex-col gap-5 sm:gap-6">

          {/* ── Պատվիրատու ── */}
          <div className="flex flex-col gap-3">
            <SectionTitle icon="👤">Պատվիրատու</SectionTitle>
            {editing ? (
              <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <EditField label="Անուն Ազգանուն">
                  <ClientAutocomplete
                    value={client}
                    onChange={setClient}
                    onSelect={(c: ClientDTO) => {
                      setClient(`${c.first_name} ${c.last_name}`.trim());
                      setClientId(String(c.id));
                    }}
                    clients={clients}
                  />
                </EditField>
                <EditField label="Հեռախոսահամար">
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls()} />
                </EditField>
                <EditField label="Ընդունման ամսաթիվ">
                  <input type="date" value={acceptanceDate} onChange={(e) => setAccDate(e.target.value)} className={inputCls()} />
                </EditField>
                <EditField label="Առաքման հասցե">
                  <input value={deliveryAddress} onChange={(e) => setAddress(e.target.value)} className={inputCls()} />
                </EditField>
                <EditField label="Անձնագրի Սերիա">
                  <input value={passportSeries} onChange={(e) => setPassport(e.target.value)} placeholder="AB 1234567..." className={inputCls()} />
                </EditField>
              </div>
              <EditField label="Հաճախորդի նշումներ">
                <textarea value={clientNotes} onChange={(e) => setClientNotes(e.target.value)} rows={2} className={inputCls() + " resize-none mt-2"} />
              </EditField>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetaCell label="Անուն Ազգանուն">{resolveClientName(task.client)}</MetaCell>
                <MetaCell label="Հեռախոսահամար">{task.phone || '—'}</MetaCell>
                <MetaCell label="Ընդունման ամսաթիվը">{task.acceptanceDate ? new Date(task.acceptanceDate).toLocaleString('ru-RU', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}</MetaCell>
                <MetaCell label="Առաքման հասցե">{task.deliveryAddress || '—'}</MetaCell>
                <MetaCell label="Անձնագրերի սերիա">{linkedClient?.id_document || task.passportSeries || "—"}</MetaCell>
                <MetaCell label="Հաճախորդի նշումներ">{linkedClient?.description || task.description || "—"}</MetaCell>
              </div>
            )}
          </div>

          {/* ── Կահույքի բնութագիր ── */}
          <div className="flex flex-col gap-3">
            <SectionTitle icon="🪑">Կահույքի բնութագիր</SectionTitle>
            {editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <EditField label="Մոդել">
                  <input value={model} onChange={(e) => setModel(e.target.value)} className={inputCls()} />
                </EditField>
                <EditField label="Չափեր">
                  <input value={dimensions} onChange={(e) => setDims(e.target.value)} className={inputCls()} />
                </EditField>
                <EditField label="Կտորի տեսակ">
                  <SelectWithAdd
                    value={fabricType}
                    onChange={setFabric}
                    items={fabricTypes}
                    onCreate={(name) => fabricTypeService.create(name)}
                    queryKey="fabric-types"
                  />
                </EditField>
                <EditField label="Փափկություն">
                  <SelectWithAdd
                    value={softness}
                    onChange={setSoftness}
                    items={softnessLevels}
                    onCreate={(name) => softnessService.create(name)}
                    queryKey="softness-levels"
                  />
                </EditField>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <MetaCell label="Մոդել">{task.model || '—'}</MetaCell>
                <MetaCell label="Չափեր">{task.dimensions || '—'}</MetaCell>
                <MetaCell label="Կտորի տեսակ">
                  {fabricTypes.find((f) => f.id === task.fabricTypeId)?.name || task.fabricType || '—'}
                </MetaCell>
                <MetaCell label="Փափկություն">
                  {softnessLevels.find((s) => s.id === task.softnessId)?.name || task.softness || '—'}
                </MetaCell>
              </div>
            )}
          </div>

          {/* ── Arzhek ── */}
          {!isEmployee && <div className="flex flex-col gap-3">
            <SectionTitle icon="💰">Արժեք</SectionTitle>
            {editing ? (
              <div className="flex flex-col gap-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <EditField label="Ընդհանուր արժեք">
                    <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0 ֏" className={inputCls()} />
                  </EditField>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {/* Total price */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <MetaCell label="Ընդհանուր արժեք" accent="success">{task.price || '—'}</MetaCell>
                </div>

                {/* Payments list */}
                <div className="rounded-xl border border-crm-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Վճարումներ</p>
                    {!addingPayment && (
                      <button
                        onClick={() => { setAddingPayment(true); setNewPayDate(new Date().toISOString().slice(0, 16)); }}
                        className="flex items-center gap-1 text-xs text-primary hover:text-primary-hover font-semibold transition-colors"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                        Ավելացնել
                      </button>
                    )}
                  </div>
                  {(() => {
                    // Legacy rows from old task fields (if not already in taskPayments)
                    const legacyRows: { key: string; label: string; cls: string; amount: number; date?: string; method?: string }[] = [];
                    const advAmt = parseFloat(task.advancePayment ?? '0') || 0;
                    const finAmt = parseFloat(task.finalPayment   ?? '0') || 0;
                    if (advAmt > 0) legacyRows.push({ key: 'legacy-adv', label: 'Կանխավճար', cls: 'bg-blue-100 text-blue-700', amount: advAmt, date: task.advancePaymentDate, method: task.advancePaymentMethod });
                    if (finAmt > 0) legacyRows.push({ key: 'legacy-fin', label: 'Վերջնացճար',   cls: 'bg-green-100 text-green-700', amount: finAmt, date: task.finalPaymentDate,   method: task.finalPaymentMethod   });
                    const allRows = [
                      ...legacyRows.map(r => ({ ...r, isLegacy: true as const })),
                      ...taskPayments.map(p => ({ ...p, isLegacy: false as const })),
                    ].sort((a, b) => {
                      const da = 'paidAt' in a ? a.paidAt : (a.date ?? '');
                      const db = 'paidAt' in b ? b.paidAt : (b.date ?? '');
                      return new Date(da).getTime() - new Date(db).getTime();
                    });
                    if (allRows.length === 0 && !addingPayment) return <p className="text-xs text-text-muted text-center py-1">—</p>;
                    return (
                      <div className="flex flex-col gap-0">
                        {allRows.map((row) => {
                          if (row.isLegacy) {
                            const r = row as typeof legacyRows[0] & { isLegacy: true };
                            return (
                              <div key={r.key} className="flex items-center gap-2 text-xs py-1.5 border-b border-crm-border/30 last:border-b-0 opacity-70">
                                <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-md font-semibold text-[10px] ${r.cls}`}>{r.label}</span>
                                <span className="font-bold text-dark">{r.amount.toLocaleString()}&#1423;</span>
                                {r.date && <span className="text-text-muted">{new Date(r.date).toLocaleDateString('ru-RU')}</span>}
                                {r.method && <span className="text-text-muted flex-shrink-0">{r.method === 'cash' ? '💵' : '💳'}</span>}
                              </div>
                            );
                          }
                          const p = row as TaskPayment & { isLegacy: false };
                          const typeLabel = ({ advance: 'Կանխավճար', partial: 'Միջնավճար', final: 'Verdjnits', other: 'Ayl' } as Record<string, string>)[p.paymentType] ?? p.paymentType;
                          const typeCls = ({ advance: 'bg-blue-100 text-blue-700', partial: 'bg-amber-100 text-amber-700', final: 'bg-green-100 text-green-700', other: 'bg-gray-100 text-gray-600' } as Record<string, string>)[p.paymentType] ?? 'bg-gray-100 text-gray-600';
                          return (
                            <div key={p.id} className="flex items-center gap-2 text-xs py-1.5 border-b border-crm-border/30 last:border-b-0">
                              <span className={`flex-shrink-0 px-1.5 py-0.5 rounded-md font-semibold text-[10px] ${typeCls}`}>{typeLabel}</span>
                              <span className="font-bold text-dark">{Number(p.amount).toLocaleString()}&#1423;</span>
                              <span className="text-text-muted">{new Date(p.paidAt).toLocaleDateString('ru-RU')}</span>
                              <span className="text-text-muted flex-shrink-0">{p.paymentMethod === 'cash' ? '💵' : '💳'}</span>
                              {p.note && <span className="text-text-muted truncate flex-1 min-w-0">{p.note}</span>}
                              <button
                                onClick={() => deletePaymentMutate(p.id)}
                                className="ml-auto flex-shrink-0 p-0.5 text-text-muted hover:text-error rounded transition-colors"
                              >
                                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* Add payment inline form */}
                  {addingPayment && (
                    <div className="mt-3 pt-3 border-t border-crm-border flex flex-col gap-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Գումար</p>
                          <input value={newPayAmt} onChange={(e) => setNewPayAmt(e.target.value)} placeholder="0 ֏" className={inputCls()} />
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Վճարում</p>
                          <select value={newPayType} onChange={(e) => setNewPayType(e.target.value as typeof newPayType)} className={inputCls()}>
                            <option value="advance">Կանխավճար</option>
                            <option value="partial">Միջնավճար</option>
                            <option value="final">Վերջնավճար</option>
                            <option value="other">Այլ</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Մեթոդ</p>
                          <select value={newPayMethod} onChange={(e) => setNewPayMethod(e.target.value as 'cash' | 'card')} className={inputCls()}>
                            <option value="cash">💵 Կանխիկ</option>
                            <option value="card">💳 Քարտով</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Ամսաթիվ</p>
                          <input type="datetime-local" value={newPayDate} onChange={(e) => setNewPayDate(e.target.value)} className={inputCls()} />
                        </div>
                      </div>
                      <input value={newPayNote} onChange={(e) => setNewPayNote(e.target.value)} placeholder="Նշում..." className={inputCls()} />
                      {saveError && <p className="text-xs text-error">{saveError}</p>}
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setAddingPayment(false); setSaveError(''); }} className="px-3 py-1.5 text-xs font-medium rounded-lg border border-crm-border text-dark hover:bg-gray-50 transition-colors">Չեղարկել</button>
                        <button onClick={() => addPaymentMutate()} disabled={isAddingPayment || !newPayAmt.trim()} className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-60">
                          {isAddingPayment ? '...' : 'Ավելացնել'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Debt summary */}
                {(() => {
                  const total = parseFloat(task.price ?? '0') || 0;
                  // Use backend totalPaid if >0, else sum legacy fields + new payments
                  const backendPaid = parseFloat(task.totalPaid ?? '0') || 0;
                  const legacyPaid = (parseFloat(task.advancePayment ?? '0') || 0) + (parseFloat(task.finalPayment ?? '0') || 0);
                  const newPaysPaid = taskPayments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
                  const paid = backendPaid > 0 ? backendPaid : legacyPaid + newPaysPaid;
                  const rawDebt = parseFloat(task.balanceDue ?? '');
                  const computedDebt = (!isNaN(rawDebt) && (backendPaid > 0 || rawDebt === 0)) ? rawDebt : Math.max(0, total - paid);
                  if (total === 0) return null;
                  return (
                    <div className={`rounded-xl border-2 p-4 flex items-center justify-between gap-4 ${computedDebt <= 0 ? 'border-success/40 bg-success/5' : 'border-error/30 bg-error/5'}`}>
                      <div className="flex flex-col gap-1 text-xs text-text-muted">
                        <span>{total.toLocaleString()}&#1423; Ընդհանուր արժեք</span>
                        <span className="text-success">&#x2212; {paid.toLocaleString()}&#1423; Վճարված</span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-0.5">Մնացորդ</p>
                        <p className={`text-2xl font-bold ${computedDebt <= 0 ? 'text-success' : 'text-error'}`}>
                          {computedDebt <= 0 ? '0' : computedDebt.toLocaleString()}&#1423;
                        </p>
                        {computedDebt <= 0 && <p className="text-[10px] text-success font-semibold mt-0.5">Ամբողջությամբ Վճարված ✓</p>}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>}

          {/* ── Կататарողners + Verghnazhamket ── */}
          <div className="flex flex-col gap-3">
            <SectionTitle icon="⚙️">Կատարում</SectionTitle>

            {editing ? (
              <div className="flex flex-col gap-3">
                {/* Assignee rows */}
                <div className="flex flex-col gap-2">
                  {assigneeRows.map((row, idx) => (
                    <div key={row.key} className="flex gap-2 items-end">
                      <div className="flex-1">
                        {idx === 0 && (
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Կատարող</p>
                        )}
                        <select
                          value={row.assigneeId}
                          onChange={(e) => updateRow(row.key, { assigneeId: e.target.value })}
                          className={inputCls()}
                        >
                          <option value="">Ընտրել...</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-20 sm:w-28 flex-shrink-0">
                        {idx === 0 && (
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Գումար</p>
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
                        className="mb-px p-2.5 text-text-muted hover:text-error hover:bg-error/10 rounded-xl transition-colors disabled:opacity-20 flex-shrink-0"
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
                  className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-hover transition-colors w-fit"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                Կատարող
                </button>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <EditField label="Կարևորություն">
                    <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={inputCls()}>
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{priorityConfig[p].label}</option>
                      ))}
                    </select>
                  </EditField>
                  <EditField label="Վերջնաժամկետ">
                    <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className={inputCls()} />
                  </EditField>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {/* Assignees full-width */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Կատարողներ</p>
                  {(task.assignees && task.assignees.length > 0) ? (
                    <div className="flex flex-col gap-2">
                      {task.assignees.map((a) => {
                        const isMe     = myUserId === a.userId;
                        const canAct   = isEmployee ? isMe : false;
                        const busy     = isMarkingStarted || isMarkingDone;
                        return (
                          <div key={a.id} className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Avatar color={a.color} initials={a.initials} size="sm" />
                              <div className="min-w-0">
                                <span className="text-sm font-medium text-dark truncate block">{a.name}</span>
                                {a.isDone ? (
                                  <span className="text-[10px] text-success font-semibold">✓ Ավարտված</span>
                                ) : a.isStarted ? (
                                  <span className="text-[10px] text-primary font-semibold">▶ Սկսած</span>
                                ) : (
                                  <span className="text-[10px] text-text-muted">Չսկսած</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {!a.isDone && !a.isStarted && canAct && (
                                <button
                                  disabled={busy}
                                  onClick={() => doMarkStarted({ userId: a.userId, isStarted: true })}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-40"
                                >
                                  Սկсел
                                </button>
                              )}
                              {a.isStarted && !a.isDone && canAct && (
                                <button
                                  disabled={busy}
                                  onClick={() => doMarkDone({ userId: a.userId, isDone: true })}
                                  className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors disabled:opacity-40"
                                >
                                  Ավарtel
                                </button>
                              )}
                              {a.isPaid && Number(a.salaryAmount) > 0 && (
                                <span className={`text-xs font-semibold ${a.isPaid ? 'text-success' : 'text-primary'}`}>
                                  {Number(a.salaryAmount).toLocaleString()} ֏{a.isPaid && ' ✓'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    (() => {
                      const emp   = employees.find((e) => String(e.id) === String(task.assigneeId));
                      const name  = task.assigneeName     || emp?.name     || '—';
                      const color = task.assigneeColor    || emp?.color    || '#94a3b8';
                      const inits = task.assigneeInitials || emp?.initials || '?';
                      return (
                        <div className="flex items-center gap-1.5">
                          <Avatar color={color} initials={inits} size="sm" />
                          <span className="text-sm font-medium text-dark truncate">{name}</span>
                        </div>
                      );
                    })()
                  )}
                </div>

                {/* Priority + Deadline */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Կարևորություն</p>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${tc}`}>
                      <Icon className="w-3 h-3" />
                      {pLabel}
                    </span>
                  </div>
                  <MetaCell label="Վերջնաժամկետ" accent={task.deadline ? 'error' : undefined}>
                    {task.deadline ? new Date(task.deadline).toLocaleString('ru-RU', {day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'}
                  </MetaCell>
                </div>
                {/* Stage selector */}
                <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                  <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Փուլ</p>
                  {statuses.length > 0 ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {statuses.map((s) => {
                          const isCurrent = String(s.id) === currentStatus;
                          const isPending = pendingStatusId === Number(s.id);
                          if (task.section === 'archive') {
                            return (
                              <span
                                key={s.id}
                                className={`px-3 py-1 text-xs rounded-full font-semibold ${
                                  isCurrent
                                    ? 'bg-primary text-white ring-2 ring-primary/30'
                                    : 'border border-crm-border text-text-muted bg-white opacity-40'
                                }`}
                              >
                                {s.name}
                              </span>
                            );
                          }
                          return (
                            <button
                              key={s.id}
                              disabled={isMovingStatus}
                              onClick={() => {
                                setPendingStatusId(Number(s.id));
                                setStageComment('');
                              }}
                              className={`px-3 py-1 text-xs rounded-full font-semibold transition-colors ${
                                isCurrent && !isPending
                                  ? 'bg-primary text-white ring-2 ring-primary/30 hover:bg-primary-hover'
                                  : isPending
                                    ? 'border border-primary bg-primary/10 text-primary'
                                    : 'border border-crm-border text-text-muted hover:border-primary hover:text-primary bg-white'
                              }`}
                            >
                              {s.name}
                            </button>
                          );
                        })}
                      </div>
                      {stageComments.length > 0 && (
                        <div className="flex flex-col gap-0 border border-crm-border/40 rounded-xl overflow-hidden mt-1">
                          {stageComments.map((c) => (
                            <div key={c.id} className="flex items-start gap-2.5 px-3 py-2 text-xs bg-white border-b border-crm-border/30 last:border-b-0 group">
                              {c.taskStatus && (
                                <span
                                  className="flex-shrink-0 px-1.5 py-0.5 rounded-md font-semibold text-[10px] leading-4 mt-px text-white"
                                  style={{ backgroundColor: c.taskStatus.color }}
                                >
                                  {c.taskStatus.name}
                                </span>
                              )}
                              <span className="flex-1 text-dark leading-5">{c.text}</span>
                              <div className="flex-shrink-0 flex items-center gap-1.5 ml-auto">
                                <span className="text-[10px] text-text-muted">{c.authorName}</span>
                                <span className="text-[10px] text-text-muted/60">
                                  {new Date(c.createdAt).toLocaleDateString('hy-AM')}
                                </span>
                                <button
                                  onClick={() => removeComment(c.id)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-text-muted hover:text-error transition-all rounded"
                                  title="Ջնջել"
                                >
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                                  </svg>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {pendingStatusId !== null && (
                        <div className="flex flex-col gap-2 pt-2 border-t border-crm-border/40">
                          <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                            Մեկնաբանություն · {statuses.find((s) => Number(s.id) === pendingStatusId)?.name}
                          </p>
                          <textarea
                            value={stageComment}
                            onChange={(e) => setStageComment(e.target.value)}
                            rows={2}
                            placeholder="Ավելացնել մեկնաբանություն..."
                            className="w-full px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all bg-white resize-none"
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => { setPendingStatusId(null); setStageComment(''); }}
                              disabled={isMovingStatus}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-crm-border text-dark hover:bg-gray-50 transition-colors disabled:opacity-50"
                            >
                              Չեղարկել
                            </button>
                            <button
                              onClick={() => moveStatus({ statusId: pendingStatusId!, comment: stageComment.trim() || undefined })}
                              disabled={isMovingStatus || (String(pendingStatusId) === currentStatus && !stageComment.trim())}
                              className="px-4 py-1.5 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary-hover transition-colors disabled:opacity-60"
                            >
                              {isMovingStatus ? '...' : 'Հաստատել'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-dark font-medium">{String(task.status)}</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Նшumner ── */}
          <div className="flex flex-col gap-3">
            <SectionTitle icon="📝">Նշումներ</SectionTitle>
            {editing ? (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Ավելացնել նշում..."
                className={inputCls() + ' resize-none'}
              />
            ) : (
              (task.notes)
                ? <p className="text-sm text-dark leading-relaxed bg-gray-50 rounded-xl p-3 border border-gray-100">
                    {task.notes}
                  </p>
                : <p className="text-sm text-text-muted italic">—</p>
            )}
          </div>

          {/* ── Նկարներ (Attachments) ── */}
          <div className="flex flex-col gap-3">
            <SectionTitle icon="📎">Նկարներ</SectionTitle>

            {/* Grid */}
            <div className="flex flex-wrap gap-2">
              {attachments.map((att) => {
                const src = resolveAttachUrl(att.url);
                const isImg = att.fileType === 'image';
                return (
                  <div key={att.id} className="relative group w-20 h-20 rounded-xl overflow-hidden border border-crm-border bg-gray-50 flex-shrink-0 flex items-center justify-center">
                    {isImg ? (
                      <img
                        src={src}
                        alt={att.name}
                        className="w-full h-full object-cover cursor-pointer"
                        onClick={() => setLightboxUrl(src)}
                      />
                    ) : (
                      <a href={src} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center gap-1 p-2">
                        <svg className="w-8 h-8 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/>
                        </svg>
                        <p className="text-[9px] text-text-muted text-center leading-tight line-clamp-2">{att.name}</p>
                      </a>
                    )}

                    {/* Delete overlay */}
                    <button
                      onClick={() => handleAttachDelete(att.id)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] leading-none hover:bg-error/80"
                    >✕</button>

                    {/* Name tooltip */}
                    {isImg && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/40 px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-[9px] text-white truncate">{att.name}</p>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Upload button */}
              <div>
                <input
                  ref={attachFileRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/avi,video/x-matroska,video/webm"
                  multiple
                  className="hidden"
                  onChange={(e) => { handleAttachUpload(e.target.files); e.target.value = ''; }}
                />
                <button
                  type="button"
                  onClick={() => attachFileRef.current?.click()}
                  disabled={uploadingFile}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-crm-border flex flex-col items-center justify-center gap-1 text-text-muted hover:border-primary hover:text-primary hover:bg-primary/5 transition-all disabled:opacity-50"
                >
                  {uploadingFile ? (
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                  ) : (
                    <>
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      <span className="text-[10px] font-medium text-center">Ավելացնել</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Lightbox */}
          {lightboxUrl && (
            <div
              className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
              onClick={() => setLightboxUrl(null)}
            >
              <button
                onClick={() => setLightboxUrl(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors text-lg"
              >✕</button>
              <img
                src={lightboxUrl}
                alt=""
                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {/* ── Footer (edit mode) ── */}
          {editing && (
            <div className="flex flex-col gap-2 pt-2 border-t border-crm-border">
              {saveError && <p className="text-xs text-error text-right">{saveError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancel}
                  disabled={isPending}
                  className="px-5 py-2.5 text-sm font-medium rounded-xl border border-crm-border text-dark hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Չեղարկել
                </button>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-xl transition-colors shadow-sm disabled:opacity-60"
                >
                  {isPending ? 'Պահpanaum...' : 'Պահպանել'}
                </button>
              </div>
            </div>
          )}

        </div>
        </div>
      </div>

      {/* ── Complete (archive) modal ── */}
      {archiveConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[calc(100%-2rem)] max-w-sm flex flex-col gap-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-dark">Կատարված նշե՞լ</p>
              <button onClick={() => setArchiveConfirm(false)} className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-dark text-sm">✕</button>
            </div>
            <p className="text-xs text-text-muted -mt-2">{task.taskId} · {task.name}</p>

            {costLoading ? (
              <p className="text-sm text-text-muted text-center py-2">Բեռնվում է...</p>
            ) : (
              <>
                {/* Balance summary */}
                <div className="rounded-xl border border-crm-border overflow-hidden">
                  <div className="flex justify-between px-3 py-2 text-xs border-b border-crm-border/50">
                    <span className="text-text-muted">Ընդհանուր արժեք</span>
                    <span className="font-semibold text-dark">{Number(costSummary?.price ?? 0).toLocaleString()} ֏</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 text-xs border-b border-crm-border/50">
                    <span className="text-text-muted">Վճարված</span>
                    <span className="font-semibold text-success">{Number(costSummary?.total_received ?? 0).toLocaleString()} ֏</span>
                  </div>
                  <div className="flex justify-between px-3 py-2 text-xs">
                    <span className="text-text-muted">Մնացք</span>
                    <span className={`font-bold ${balanceDue > 0 ? 'text-error' : 'text-success'}`}>
                      {balanceDue > 0 ? `${balanceDue.toLocaleString()} ֏` : '✓ Լիովին վճ.'}
                    </span>
                  </div>
                </div>

                {balanceDue > 0 && (
                  <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Վճարել հիմա (ոչ պարտ.)</p>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={archivePayAmt}
                        onChange={(e) => setArchivePayAmt(e.target.value)}
                        placeholder={`${balanceDue}`}
                        className="flex-1 px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
                      />
                      <select
                        value={archivePayMethod}
                        onChange={(e) => setArchivePayMethod(e.target.value as 'cash' | 'card')}
                        className="px-2 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary bg-white"
                      >
                        <option value="cash">Կանխ.</option>
                        <option value="card">Քարտ</option>
                      </select>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-1">
                  {balanceDue > 0 ? (
                    <>
                      <button
                        onClick={() => archiveTask({ addDebt: false })}
                        disabled={isArchiving}
                        className="w-full py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
                      >
                        {isArchiving ? '...' : parseFloat(archivePayAmt) > 0 ? 'Վճ. և կատարված' : 'Կատարված (առանց վճ.)'}
                      </button>
                      {task.clientLinkId && (
                        <button
                          onClick={() => archiveTask({ addDebt: true })}
                          disabled={isArchiving}
                          className="w-full py-2 text-sm font-semibold rounded-xl border border-error/40 text-error hover:bg-error/5 transition-colors disabled:opacity-50"
                        >
                          {isArchiving ? '...' : 'Ավ. պարտք և կատարված'}
                        </button>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => archiveTask({ addDebt: false })}
                      disabled={isArchiving}
                      className="w-full py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
                    >
                      {isArchiving ? '...' : 'Կատարված'}
                    </button>
                  )}
                  <button
                    onClick={() => setArchiveConfirm(false)}
                    className="w-full py-2 text-sm font-medium rounded-xl border border-crm-border text-dark hover:bg-gray-50 transition-colors"
                  >
                    Չեղարկել
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Send to delivery modal ── */}
      {sendToDelivery && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={(e) => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-[calc(100%-2rem)] max-w-sm flex flex-col gap-4 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </div>
              <p className="text-base font-bold text-dark text-center">Ուղարկել Առաքման</p>
              <p className="text-xs text-text-muted text-center">{task.taskId} · {resolveClientName(task.client)}</p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Առաքման հասցե</p>
                <input
                  value={sendDeliveryAddr}
                  onChange={(e) => setSendDeliveryAddr(e.target.value)}
                  placeholder="Hasце..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Ստացողի անուն</p>
                <input
                  value={sendDeliveryRecip}
                  onChange={(e) => setSendDeliveryRecip(e.target.value)}
                  placeholder="Anun Azganun..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Նշում</p>
                <textarea
                  value={sendDeliveryNotes}
                  onChange={(e) => setSendDeliveryNotes(e.target.value)}
                  rows={2}
                  placeholder="Նշումներ..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white resize-none"
                />
              </div>
            </div>

            {saveError && <p className="text-xs text-error text-center">{saveError}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => { setSendToDelivery(false); setSaveError(''); }}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl border border-crm-border text-dark hover:bg-gray-50 transition-colors"
              >
                Չեղարկել
              </button>
              <button
                onClick={() => sendDeliveryMutate()}
                disabled={isSendingDelivery}
                className="flex-1 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-60"
              >
                {isSendingDelivery ? '...' : 'Ուղարկել'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
