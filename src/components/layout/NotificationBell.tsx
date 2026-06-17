'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BellIcon } from '@/components/icons';
import {
  notificationService,
  telegramService,
  type NotificationDTO,
  type NotificationListResponse,
  type TelegramMeLinked,
} from '@/services/notification.service';

// ── helpers ───────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60)   return `${diff}վ`;
  if (diff < 3600) return `${Math.floor(diff / 60)}ր`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}ժ`;
  return `${Math.floor(diff / 86400)}օ`;
}

function eventIcon(type: NotificationDTO['event_type']) {
  switch (type) {
    case 'task_assigned':  return '📋';
    case 'task_status':    return '🔄';
    case 'task_deadline':  return '⏰';
    case 'task_comment':   return '💬';
    case 'call_reminder':  return '📞';
    default:               return '🔔';
  }
}

// ── Telegram section ──────────────────────────────────────────────────────────

function TelegramSection() {
  const qc = useQueryClient();
  const [linkUrl, setLinkUrl] = useState<string | null>(null);

  const { data: tgData } = useQuery({
    queryKey: ['telegram-me'],
    queryFn:  telegramService.getMe,
    retry:    false,
  });

  const isLinked = tgData && !('linked' in tgData && tgData.linked === false);
  const linked   = isLinked ? (tgData as TelegramMeLinked) : null;

  const linkMut = useMutation({
    mutationFn: telegramService.link,
    onSuccess: (d) => setLinkUrl(d.link_url),
  });

  const unlinkMut = useMutation({
    mutationFn: telegramService.unlink,
    onSuccess: () => {
      setLinkUrl(null);
      qc.invalidateQueries({ queryKey: ['telegram-me'] });
    },
  });

  return (
    <div className="border-t border-gray-100 px-4 py-3">
      <p className="text-[11px] font-bold text-text-muted uppercase tracking-widest mb-2">Telegram</p>

      {linked ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">✓</span>
            <span className="text-sm text-dark font-medium">@{linked.telegram_username}</span>
          </div>
          <button
            onClick={() => unlinkMut.mutate()}
            disabled={unlinkMut.isPending}
            className="text-xs text-error hover:underline disabled:opacity-50"
          >
            Անջատել
          </button>
        </div>
      ) : linkUrl ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-text-muted">Սեղմեք @crm_mozg_bot-ը, հղումը բացելու համար:</p>
          <a
            href={linkUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
            Բացել @crm_mozg_bot
          </a>
        </div>
      ) : (
        <button
          onClick={() => linkMut.mutate()}
          disabled={linkMut.isPending}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-crm-border text-sm text-dark hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current text-blue-500"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.833.941z"/></svg>
          {linkMut.isPending ? '...' : 'Կցել @crm_mozg_bot'}
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function NotificationBell() {
  const router     = useRouter();
  const qc         = useQueryClient();
  const [open, setOpen] = useState(false);
  const panelRef   = useRef<HTMLDivElement>(null);

  // Unread count — poll every 30s
  const { data: countData } = useQuery({
    queryKey:        ['notifications-count'],
    queryFn:         notificationService.getUnreadCount,
    refetchInterval: 30_000,
    staleTime:       10_000,
  });
  const unread = countData?.unread ?? 0;

  // Full list — load when panel opens
  const { data: listData, isLoading } = useQuery<NotificationListResponse>({
    queryKey: ['notifications-list'],
    queryFn:  (): Promise<NotificationListResponse> => notificationService.getAll(),
    enabled:  open,
    staleTime: 0,
  });
  const items: NotificationDTO[] = listData?.results ?? [];

  // Mutations
  const markRead = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications-list'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const markAll = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications-list'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  const del = useMutation({
    mutationFn: notificationService.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications-list'] });
      qc.invalidateQueries({ queryKey: ['notifications-count'] });
    },
  });

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  function handleClick(n: NotificationDTO) {
    if (!n.is_read) markRead.mutate(n.id);
    if (n.object_type === 'task' && n.object_id) {
      router.push(`/projects`);
    }
    setOpen(false);
  }

  return (
    <div ref={panelRef} className="relative flex-shrink-0">

      {/* Bell button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition-colors"
      >
        <BellIcon className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-error text-white rounded-full text-[10px] font-bold flex items-center justify-center leading-none">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 flex flex-col overflow-hidden max-h-[calc(100vh-80px)]">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
            <span className="font-semibold text-dark">Ծանուցումներ</span>
            {unread > 0 && (
              <button
                onClick={() => markAll.mutate()}
                disabled={markAll.isPending}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                Կարդալ բոլորը
              </button>
            )}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-10 text-text-muted text-sm">Բեռնում է...</div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-text-muted">
                <BellIcon className="w-8 h-8 opacity-30" />
                <span className="text-sm">Ծանուցումներ չկան</span>
              </div>
            ) : (
              items.map((n: NotificationDTO) => (
                <div
                  key={n.id}
                  className={`group flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!n.is_read ? 'bg-primary/5' : ''}`}
                  onClick={() => handleClick(n)}
                >
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-base flex-shrink-0 mt-0.5">
                    {eventIcon(n.event_type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className={`text-sm leading-snug ${!n.is_read ? 'font-semibold text-dark' : 'text-gray-700'}`}>
                        {n.title}
                      </p>
                      <span className="text-[11px] text-text-muted flex-shrink-0 mt-0.5">{timeAgo(n.created_at)}</span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.message}</p>
                  </div>

                  {/* Unread dot + delete */}
                  <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary mt-1" />}
                    <button
                      onClick={(e) => { e.stopPropagation(); del.mutate(n.id); }}
                      className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-error transition-all text-xs p-0.5"
                      title="Ջնջել"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Telegram */}
          <TelegramSection />
        </div>
      )}
    </div>
  );
}
