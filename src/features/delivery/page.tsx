'use client';
import { SkTable } from '@/components/ui/Skeleton';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  deliveryService,
  type DeliveryDTO,
  type DeliveryStatus,
  type CreateDeliveryRequest,
} from '@/services/delivery.service';
import { taskService, type TaskDTO } from '@/services/task.service';
import { employeeService } from '@/services/employee.service';
import { useAuthStore } from '@/stores';
import { mediaUrl } from '@/lib/api';
import TaskDetailModal from '@/features/projects/components/TaskDetailModal';
import type { Task } from '@/features/projects/types';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<DeliveryStatus, { label: string; bg: string; text: string; dot: string }> = {
  pending:    { label: 'Սպասում',        bg: 'bg-gray-100',   text: 'text-gray-600',   dot: 'bg-gray-400'   },
  scheduled:  { label: 'Նշանակված',     bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500'   },
  in_transit: { label: 'Ճանապարհին',    bg: 'bg-amber-100',  text: 'text-amber-700',  dot: 'bg-amber-500'  },
  delivered:  { label: 'Հաստատված',     bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500'  },
  failed:     { label: 'Ձախողված',      bg: 'bg-red-100',    text: 'text-red-700',    dot: 'bg-red-500'    },
  cancelled:  { label: 'Չեղարկված',     bg: 'bg-gray-200',  text: 'text-gray-700',   dot: 'bg-gray-500'   },
};

const ALL_STATUSES: DeliveryStatus[] = [
  'pending', 'scheduled', 'in_transit', 'delivered', 'failed', 'cancelled',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDatetime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all bg-white';

// ── Add Delivery Modal ────────────────────────────────────────────────────────

function AddDeliveryModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();

  const [taskSearch,   setTaskSearch]   = useState('');
  const [taskResults,  setTaskResults]  = useState<TaskDTO[]>([]);
  const [taskSearching,setTaskSearching]= useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskDTO | null>(null);

  const [address,       setAddress]       = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [status,        setStatus]        = useState<DeliveryStatus>('scheduled');
  const [scheduledDate, setScheduledDate] = useState('');
  const [driver,        setDriver]        = useState('');
  const [notes,         setNotes]         = useState('');
  const [error,         setError]         = useState('');

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn:  () => employeeService.getAll(),
  });
  const employees = employeesData?.data ?? [];

  async function searchTasks() {
    const q = taskSearch.trim();
    if (!q) return;
    setTaskSearching(true);
    try {
      const res = await taskService.findByTaskId(q);
      setTaskResults(res.results);
    } finally {
      setTaskSearching(false);
    }
  }

  function selectTask(t: TaskDTO) {
    setSelectedTask(t);
    setTaskResults([]);
    if (t.deliveryAddress) setAddress(t.deliveryAddress);
    const name = t.clientLinkName || (t.client && isNaN(Number(t.client)) ? t.client : '');
    if (name) setRecipientName(name);
  }

  const { mutate: doCreate, isPending } = useMutation({
    mutationFn: (data: CreateDeliveryRequest) => deliveryService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-stats'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  function handleSave() {
    if (!selectedTask?.id) { setError('Ընտրեք task'); return; }
    const taskNumId = Number(selectedTask.id);
    if (isNaN(taskNumId)) { setError('Task ID invalid'); return; }
    setError('');
    doCreate({
      task:          taskNumId,
      status,
      scheduledDate: scheduledDate || undefined,
      address:       address.trim()       || undefined,
      driver:        driver ? Number(driver) : undefined,
      notes:         notes.trim()         || undefined,
      recipientName: recipientName.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border flex-shrink-0">
          <h2 className="text-base font-bold text-dark">Ավելացնել Delivery</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:bg-gray-100 text-sm">✕</button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-4">
          {/* Task search */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Պատվեր *</p>
            {selectedTask ? (
              <div className="flex items-center justify-between px-3 py-2.5 rounded-xl border border-primary/40 bg-primary/5">
                <div className="min-w-0">
                  <span className="text-xs font-mono font-bold text-primary">{selectedTask.taskId}</span>
                  <span className="text-sm text-dark ml-2 font-medium">{selectedTask.name}</span>
                  {(selectedTask.clientLinkName || selectedTask.client) && (
                    <span className="text-xs text-text-muted ml-2">
                      · {selectedTask.clientLinkName || selectedTask.client}
                    </span>
                  )}
                </div>
                <button onClick={() => { setSelectedTask(null); setAddress(''); setRecipientName(''); }} className="text-text-muted hover:text-error ml-3 flex-shrink-0 text-xs">✕</button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-2">
                  <input
                    value={taskSearch}
                    onChange={(e) => setTaskSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchTasks()}
                    placeholder="PN0000001 կամ task-ի անունը..."
                    className={inputCls}
                  />
                  <button
                    onClick={searchTasks}
                    disabled={taskSearching || !taskSearch.trim()}
                    className="flex-shrink-0 px-4 py-2 text-sm font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {taskSearching ? '...' : 'Փնտրել'}
                  </button>
                </div>
                {taskResults.length > 0 && (
                  <div className="border border-crm-border rounded-xl overflow-hidden shadow-sm">
                    {taskResults.slice(0, 6).map((t) => (
                      <button
                        key={t.taskId}
                        onClick={() => selectTask(t)}
                        className="w-full text-left px-3 py-2.5 flex flex-col gap-0.5 hover:bg-gray-50 transition-colors border-b border-crm-border/50 last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">{t.taskId}</span>
                          <span className="text-sm font-medium text-dark truncate">{t.name}</span>
                        </div>
                        {(t.clientLinkName || t.client) && (
                          <span className="text-xs text-text-muted pl-0.5">
                            {t.clientLinkName || t.client}
                          </span>
                        )}
                      </button>
                    ))}
                    {taskResults.length === 0 && (
                      <p className="px-3 py-2.5 text-sm text-text-muted">Չգտնվավ</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Status + Scheduled date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Փուլ</p>
              <select value={status} onChange={(e) => setStatus(e.target.value as DeliveryStatus)} className={inputCls}>
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_CFG[s].label}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Նշ. ամս. ժամ</p>
              <input type="datetime-local" value={scheduledDate} onChange={(e) => setScheduledDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Driver + Recipient */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Վարորդ</p>
              <select value={driver} onChange={(e) => setDriver(e.target.value)} className={inputCls}>
                <option value="">—</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Ստացողի անուն</p>
              <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Անուն Ազգանուն..." className={inputCls} />
            </div>
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Հասցե</p>
            <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Երևան, Մաշտոց 15..." className={inputCls} />
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Նշումներ</p>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="2-րդ հարկ, զանգել..."
              className={inputCls + ' resize-none'}
            />
          </div>

          {error && <p className="text-xs text-error">{error}</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-crm-border flex justify-end gap-2 flex-shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-medium rounded-xl border border-crm-border text-dark hover:bg-gray-50 transition-colors">
            Չեղարկել
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || !selectedTask}
            className="px-6 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-60"
          >
            {isPending ? 'Պահպանվում...' : 'Պահպանել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Change Status Modal ───────────────────────────────────────────────────────

function ChangeStatusModal({ delivery, onClose }: { delivery: DeliveryDTO; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<DeliveryStatus>(delivery.status);
  const [note,   setNote]   = useState('');
  const [error,  setError]  = useState('');

  const { mutate, isPending } = useMutation({
    mutationFn: () => deliveryService.changeStatus(delivery.id, status, note.trim() || undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-stats'] });
      onClose();
    },
    onError: (e: Error) => setError(e.message),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-80 flex flex-col gap-4 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-dark text-sm">Կարգավիճակի փոփոխություն</h3>
            <p className="text-[11px] text-text-muted mt-0.5">{delivery.task_id} · {delivery.task_name}</p>
          </div>
          <button onClick={onClose} className="w-6 h-6 flex items-center justify-center text-text-muted hover:text-dark text-sm flex-shrink-0">✕</button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {ALL_STATUSES.map((s) => {
            const cfg = STATUS_CFG[s];
            return (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                  status === s
                    ? `${cfg.bg} ${cfg.text} ring-2 ring-offset-1 ring-current/40`
                    : 'bg-gray-100 text-text-muted hover:bg-gray-200'
                }`}
              >
                {cfg.label}
              </button>
            );
          })}
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Նշում (ոչ պարտադիր)..."
          rows={2}
          className="w-full px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 resize-none bg-white"
        />

        {error && <p className="text-xs text-error">{error}</p>}

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-xl border border-crm-border text-dark hover:bg-gray-50 transition-colors">
            Չեղարկել
          </button>
          <button
            onClick={() => mutate()}
            disabled={isPending || status === delivery.status}
            className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover transition-colors disabled:opacity-60"
          >
            {isPending ? '...' : 'Հաստատել'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delivery Card ─────────────────────────────────────────────────────────────

function DeliveryCard({
  delivery,
  isDirector,
  onChangeStatus,
  onDelete,
  onTaskClick,
}: {
  delivery:       DeliveryDTO;
  isDirector:     boolean;
  onChangeStatus: (d: DeliveryDTO) => void;
  onDelete:       (d: DeliveryDTO) => void;
  onTaskClick:    (taskId: number) => void;
}) {
  const queryClient = useQueryClient();
  const proofRef    = useRef<HTMLInputElement>(null);
  const galleryRef  = useRef<HTMLInputElement>(null);
  const [uploading, setUploading]        = useState(false);
  const [uploadingImg, setUploadingImg]  = useState(false);
  const [deletingImgId, setDeletingImgId] = useState<number | null>(null);
  const [lightbox,  setLightbox]  = useState<string | null>(null);

  const cfg     = STATUS_CFG[delivery.status] ?? STATUS_CFG.pending;
  const proofUrl = delivery.proofImageUrl
    ? (mediaUrl(delivery.proofImageUrl) ?? delivery.proofImageUrl)
    : null;
  const images = delivery.images ?? [];

  async function handleProof(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true);
    try {
      await deliveryService.uploadProof(delivery.id, files[0]);
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    } catch { /* non-fatal */ }
    finally { setUploading(false); }
  }

  async function handleGalleryUpload(files: FileList | null) {
    if (!files?.[0]) return;
    setUploadingImg(true);
    try {
      await deliveryService.uploadImage(delivery.id, files[0], undefined, images.length);
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    } catch { /* non-fatal */ }
    finally { setUploadingImg(false); }
  }

  async function handleDeleteImage(imageId: number) {
    setDeletingImgId(imageId);
    try {
      await deliveryService.deleteImage(delivery.id, imageId);
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
    } catch { /* non-fatal */ }
    finally { setDeletingImgId(null); }
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-crm-border shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-[10px] font-mono font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-md">
                {delivery.task_id}
              </span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                {delivery.status_display || cfg.label}
              </span>
            </div>
            <button
              onClick={() => onTaskClick(delivery.task)}
              className="text-sm font-bold text-dark leading-snug truncate text-left hover:text-primary transition-colors"
            >
              {delivery.task_name}
            </button>
          </div>
          {isDirector && (
            <button
              onClick={() => onDelete(delivery)}
              className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full text-text-muted hover:text-error hover:bg-error/10 transition-colors text-xs mt-0.5"
            >✕</button>
          )}
        </div>

        {/* Client + phone */}
        {(delivery.task_client || delivery.task_phone) && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span>{delivery.task_client}</span>
            {delivery.task_phone && <span className="text-text-muted/60">· {delivery.task_phone}</span>}
          </div>
        )}

        {/* Recipient (if different from client) */}
        {delivery.recipientName && delivery.recipientName !== delivery.task_client && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <span>Ստացող: <span className="font-medium text-dark">{delivery.recipientName}</span></span>
          </div>
        )}

        {/* Address */}
        {delivery.address && (
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 1118 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span className="truncate">{delivery.address}</span>
          </div>
        )}

        {/* Driver + dates */}
        <div className="flex flex-col gap-1">
          {delivery.driver_name && (
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              <span>{delivery.driver_name}</span>
            </div>
          )}
          {delivery.scheduledDate && (
            <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
              <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              <span>{fmtDatetime(delivery.scheduledDate)}</span>
            </div>
          )}
          {delivery.deliveredAt && (
            <div className="flex items-center gap-1.5 text-[11px] text-success font-semibold">
              <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Հաստատված {fmtDatetime(delivery.deliveredAt)}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {delivery.notes && (
          <p className="text-[11px] text-text-muted italic bg-gray-50 rounded-lg px-2.5 py-1.5 border border-gray-100 leading-relaxed">
            {delivery.notes}
          </p>
        )}

        {/* Proof image */}
        {proofUrl && (
          <div
            className="relative w-full h-28 rounded-xl overflow-hidden border border-crm-border cursor-pointer group"
            onClick={() => setLightbox(proofUrl)}
          >
            <img src={proofUrl} alt="proof" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors flex items-center justify-center">
              <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0119 12.55M5 5a10.94 10.94 0 01-3 7.55M10.9 4.01A16 16 0 0112 4c4.42 0 8 1.79 8 4s-3.58 4-8 4a16 16 0 01-5.36-.9"/></svg>
            </div>
          </div>
        )}

        {/* Gallery */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((img) => {
              const url = mediaUrl(img.image) ?? img.image;
              return (
                <div
                  key={img.id}
                  className="relative w-16 h-16 rounded-lg overflow-hidden border border-crm-border cursor-pointer group flex-shrink-0"
                  onClick={() => setLightbox(url)}
                  title={img.note ?? undefined}
                >
                  <img src={url} alt={img.note ?? 'gallery'} className="w-full h-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteImage(img.id); }}
                    disabled={deletingImgId === img.id}
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] disabled:opacity-100"
                  >
                    {deletingImgId === img.id ? '…' : '✕'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-crm-border/50 mt-auto">
          <button
            onClick={() => onChangeStatus(delivery)}
            className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg border border-crm-border text-dark hover:bg-gray-50 transition-colors"
          >
            Փոխ. կարգ.
          </button>
          <input
            ref={proofRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => { handleProof(e.target.files); e.target.value = ''; }}
          />
          <button
            onClick={() => proofRef.current?.click()}
            disabled={uploading}
            className="flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {uploading ? '...' : proofUrl ? '🔄 Նկար' : '📷 Նկար'}
          </button>
          <input
            ref={galleryRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={(e) => { handleGalleryUpload(e.target.files); e.target.value = ''; }}
          />
          <button
            onClick={() => galleryRef.current?.click()}
            disabled={uploadingImg}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-xs font-semibold rounded-lg border border-dashed border-crm-border text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
            title="Ավելացնել նկար"
          >
            {uploadingImg ? '…' : '+'}
          </button>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors text-lg"
          >✕</button>
          <img
            src={lightbox}
            alt="proof"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DeliveryPage() {
  const role       = useAuthStore((s) => s.role);
  const isDirector = role === 'director';
  const queryClient = useQueryClient();

  const [search,   setSearch]   = useState('');
  const [statusF,  setStatusF]  = useState<DeliveryStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [driverF,  setDriverF]  = useState('');

  const [showAdd,       setShowAdd]       = useState(false);
  const [statusModal,   setStatusModal]   = useState<DeliveryDTO | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeliveryDTO | null>(null);
  const [taskDetailId,  setTaskDetailId]  = useState<number | null>(null);

  const { data: deliveryData, isLoading } = useQuery({
    queryKey: ['deliveries', { search, statusF, dateFrom, dateTo, driverF }],
    queryFn: () => {
      const p: Parameters<typeof deliveryService.getAll>[0] = {};
      if (search)   p.search    = search;
      if (statusF)  p.status    = statusF as DeliveryStatus;
      if (dateFrom) p.date_from = dateFrom;
      if (dateTo)   p.date_to   = dateTo;
      if (driverF)  p.driver    = Number(driverF);
      return deliveryService.getAll(p);
    },
  });
  const deliveries = deliveryData?.results ?? [];

  const { data: stats } = useQuery({
    queryKey: ['delivery-stats'],
    queryFn:  deliveryService.getStats,
    staleTime: 60_000,
  });

  const { data: employeesData } = useQuery({
    queryKey: ['employees'],
    queryFn:  () => employeeService.getAll(),
  });
  const employees = employeesData?.data ?? [];

  const { data: taskDetailDto } = useQuery<TaskDTO>({
    queryKey: ['task-detail', taskDetailId],
    queryFn:  () => taskService.getById(String(taskDetailId)),
    enabled:  taskDetailId != null,
  });

  const taskDetail: Task | null = taskDetailDto
    ? {
        ...(taskDetailDto as unknown as Task),
        id:      String((taskDetailDto as unknown as { id?: unknown }).id ?? taskDetailDto.taskId),
        taskId:  taskDetailDto.taskId,
        section: (taskDetailDto.section ?? 'active') as Task['section'],
        status:  (taskDetailDto.statusId !== undefined
          ? String(taskDetailDto.statusId)
          : taskDetailDto.status) as Task['status'],
      }
    : null;

  const { mutate: doDelete } = useMutation({
    mutationFn: (id: number) => deliveryService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['delivery-stats'] });
      setDeleteConfirm(null);
    },
  });

  const hasFilters = search || statusF || dateFrom || dateTo || driverF;

  function clearFilters() {
    setSearch('');
    setStatusF('');
    setDateFrom('');
    setDateTo('');
    setDriverF('');
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-3 md:px-6 pt-4 pb-3 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-dark">Առաքումներ</h1>
          {stats && (
            <p className="text-xs text-text-muted mt-0.5">
              Ընդհանուր {stats.total} · Այսօր {stats.today_count}
            </p>
          )}
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary-hover transition-colors shadow-sm flex-shrink-0"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Ավելացնել
        </button>
      </div>

      {/* Status stats pills */}
      {stats && (
        <div className="flex-shrink-0 px-3 md:px-6 pb-3">
          <div className="flex flex-wrap gap-2">
            {ALL_STATUSES.map((s) => {
              const cfg   = STATUS_CFG[s];
              const count = stats.by_status[s] ?? 0;
              return (
                <button
                  key={s}
                  onClick={() => setStatusF(statusF === s ? '' : s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                    statusF === s
                      ? `${cfg.bg} ${cfg.text} border-transparent`
                      : 'bg-white text-text-muted border-crm-border hover:border-gray-300 hover:text-dark'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                  {cfg.label}
                  <span className="font-bold">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex-shrink-0 px-3 md:px-6 pb-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Պատվեր, Հաճախորդ, հասցե..."
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white"
            />
          </div>

          <select
            value={driverF}
            onChange={(e) => setDriverF(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary bg-white text-dark"
          >
            <option value="">Բոլոր վարորդները</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary bg-white text-dark"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-crm-border outline-none focus:border-primary bg-white text-dark"
          />

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-xs font-medium text-text-muted hover:text-dark border border-crm-border rounded-xl hover:bg-gray-50 transition-colors"
            >
              Մաքրել
            </button>
          )}
        </div>
      </div>

      {/* Delivery list */}
      <div className="flex-1 overflow-y-auto px-3 md:px-6 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-48 text-text-muted text-sm">
            Բեռնվում է...
          </div>
        ) : deliveries.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2 text-text-muted">
            <svg className="w-10 h-10 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
              <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
            </svg>
            <span className="text-sm">Delivery-ներ չկան</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {deliveries.map((d) => (
              <DeliveryCard
                key={d.id}
                delivery={d}
                isDirector={isDirector}
                onChangeStatus={setStatusModal}
                onDelete={setDeleteConfirm}
                onTaskClick={setTaskDetailId}
              />
            ))}
          </div>
        )}
      </div>

      {/* Task detail modal */}
      {taskDetail && (
        <TaskDetailModal
          task={taskDetail}
          onClose={() => setTaskDetailId(null)}
          allowArchive={true}
        />
      )}

      {/* Modals */}
      {showAdd && <AddDeliveryModal onClose={() => setShowAdd(false)} />}
      {statusModal && (
        <ChangeStatusModal delivery={statusModal} onClose={() => setStatusModal(null)} />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-80 flex flex-col gap-4">
            <p className="text-base font-semibold text-dark">Ջնջե՞լ delivery-ն?</p>
            <p className="text-sm text-text-muted">
              «<span className="font-medium text-dark">{deleteConfirm.task_id} — {deleteConfirm.task_name}</span>» delivery-ն կջնջվի։
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-crm-border text-dark hover:bg-gray-50 transition-colors"
              >
                Չեղարկել
              </button>
              <button
                onClick={() => doDelete(deleteConfirm.id)}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-error text-white hover:bg-error/90 transition-colors"
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

