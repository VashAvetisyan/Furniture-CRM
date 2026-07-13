'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { BASE_URL } from '@/lib/api';
import { useAuthStore } from '@/stores';
import { useToastStore } from '@/stores/toast';
import { showBrowserNotification } from '@/lib/browserNotifications';

// Shared hosting (not yet a VPS) can't proxy WebSocket upgrades — after a few
// failed handshakes, stop hammering it and fall back to plain HTTP polling of
// the same query keys the WS messages would have invalidated. A slow recovery
// timer keeps retrying the real WebSocket in the background so the app quietly
// switches back to push updates the moment the server does support it, with no
// redeploy needed.
const MAX_WS_ATTEMPTS       = 4;
const POLL_INTERVAL_MS      = 20_000;
const WS_RECOVERY_INTERVAL_MS = 2 * 60_000;

function buildWsUrl(token: string): string {
  const base = BASE_URL
    .replace(/\/api\/v1\/?$/, '')
    .replace(/^https/, 'wss')
    .replace(/^http:/, 'ws:');
  return `${base}/ws/notifications/?token=${token}`;
}

export function useWebSocket() {
  const qc     = useQueryClient();
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();

  const wsRef           = useRef<WebSocket | null>(null);
  const retryRef        = useRef<ReturnType<typeof setTimeout>>();
  const pollTimerRef     = useRef<ReturnType<typeof setInterval>>();
  const recoveryTimerRef = useRef<ReturnType<typeof setInterval>>();
  const tries    = useRef(0);
  const alive    = useRef(false);
  const polling  = useRef(false);

  // Every query key any WS message type below can invalidate — polling can't
  // know which one actually changed, so on each tick it just refreshes them
  // all. invalidateQueries only refetches queries currently mounted somewhere,
  // so this stays cheap regardless of which page is open.
  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ['notifications-count'] });
    qc.invalidateQueries({ queryKey: ['notifications-list'] });
    qc.invalidateQueries({ queryKey: ['tasks'] });
    qc.invalidateQueries({ queryKey: ['calls'] });
    qc.invalidateQueries({ queryKey: ['deliveries'] });
    qc.invalidateQueries({ queryKey: ['delivery-stats'] });
    qc.invalidateQueries({ queryKey: ['warehouse'] });
    qc.invalidateQueries({ queryKey: ['materials'] });
    qc.invalidateQueries({ queryKey: ['cost-summary'] });
    qc.invalidateQueries({ queryKey: ['finance'] });
    qc.invalidateQueries({ queryKey: ['transactions'] });
    qc.invalidateQueries({ queryKey: ['debts'] });
  }

  function onVisibilityChange() {
    if (!document.hidden && polling.current) invalidateAll();
  }

  function pollTick() {
    if (document.hidden) return; // skip while the tab is backgrounded
    invalidateAll();
  }

  function startPolling() {
    if (polling.current) return;
    polling.current = true;
    invalidateAll();
    pollTimerRef.current = setInterval(pollTick, POLL_INTERVAL_MS);
    recoveryTimerRef.current = setInterval(() => {
      if (alive.current) connect();
    }, WS_RECOVERY_INTERVAL_MS);
    document.addEventListener('visibilitychange', onVisibilityChange);
  }

  function stopPolling() {
    if (!polling.current) return;
    polling.current = false;
    clearInterval(pollTimerRef.current);
    clearInterval(recoveryTimerRef.current);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  }

  function connect() {
    if (!alive.current) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const ws = new WebSocket(buildWsUrl(token));
    wsRef.current = ws;

    ws.onopen = () => {
      tries.current = 0;
      stopPolling();
    };

    ws.onmessage = ({ data }) => {
      try {
        dispatch(JSON.parse(data as string) as Record<string, unknown>);
      } catch {}
    };

    ws.onclose = ({ code }) => {
      if (code === 4001) {
        logout();
        qc.clear();
        router.replace('/login');
        return;
      }
      if (!alive.current) return;
      // Already polling — the recovery timer owns retrying the socket now,
      // no need for a second parallel retry loop.
      if (polling.current) return;
      tries.current++;
      if (tries.current > MAX_WS_ATTEMPTS) {
        startPolling();
        return;
      }
      const delay = Math.min(1000 * 2 ** tries.current, 30_000);
      retryRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }

  function dispatch(msg: Record<string, unknown>) {
    const { addToast } = useToastStore.getState();

    switch (msg.type) {
      case 'notification': {
        qc.invalidateQueries({ queryKey: ['notifications-count'] });
        qc.invalidateQueries({ queryKey: ['notifications-list'] });

        const et = msg.event_type as string;
        if (['task_assigned', 'task_status', 'task_comment', 'task_deadline'].includes(et)) {
          qc.invalidateQueries({ queryKey: ['tasks'] });
          qc.invalidateQueries({ queryKey: ['tasks', 'my'] });
        }
        if (et === 'call_reminder') {
          qc.invalidateQueries({ queryKey: ['calls'] });
        }

        {
          const title = (msg.title as string) ?? 'Ծանուցում';
          addToast({ message: title, type: 'info' });
          showBrowserNotification(title, msg.message as string | undefined);
        }
        break;
      }

      case 'delivery_update': {
        qc.invalidateQueries({ queryKey: ['deliveries'] });
        qc.invalidateQueries({ queryKey: ['delivery-stats'] });
        {
          const text = `${msg.task_id ?? ''}: ${msg.status_display ?? ''}`;
          addToast({ message: `🚚 ${text}`, type: 'info' });
          showBrowserNotification('Առաքում', text);
        }
        break;
      }

      case 'warehouse_alert': {
        qc.invalidateQueries({ queryKey: ['warehouse'] });
        qc.invalidateQueries({ queryKey: ['materials'] });
        {
          const text = `${msg.name}: ${msg.stock_quantity} ${msg.unit} — min-ից ցածր`;
          addToast({ message: `⚠️ ${text}`, type: 'warning' });
          showBrowserNotification('Պահեստի զգուշացում', text);
        }
        break;
      }

      case 'task_created': {
        qc.invalidateQueries({ queryKey: ['tasks'] });
        qc.invalidateQueries({ queryKey: ['tasks', 'my'] });
        {
          const text = `${msg.task_id ?? ''}: ${msg.client ?? msg.name ?? ''}`;
          addToast({ message: `📋 ${text}`, type: 'info' });
          showBrowserNotification('Նոր պատվեր', text);
        }
        break;
      }

      case 'task_stage_update': {
        qc.invalidateQueries({ queryKey: ['tasks'] });
        qc.invalidateQueries({ queryKey: ['tasks', 'my'] });
        break;
      }

      case 'task_payment': {
        qc.invalidateQueries({ queryKey: ['tasks'] });
        qc.invalidateQueries({ queryKey: ['cost-summary'] });
        {
          const text = `${msg.task_id ?? ''}: ֏${msg.amount ?? ''}`;
          addToast({ message: `💰 ${text}`, type: 'info' });
          showBrowserNotification('Վճարում', text);
        }
        break;
      }

      case 'finance_transaction': {
        qc.invalidateQueries({ queryKey: ['finance'] });
        qc.invalidateQueries({ queryKey: ['transactions'] });
        break;
      }

      case 'debt_created': {
        qc.invalidateQueries({ queryKey: ['debts'] });
        {
          const text = `${msg.title ?? ''}: ֏${msg.amount ?? ''}`;
          addToast({ message: `🔴 ${text}`, type: 'warning' });
          showBrowserNotification('Նոր պարտք', text);
        }
        break;
      }
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    alive.current = true;
    connect();
    return () => {
      alive.current = false;
      clearTimeout(retryRef.current);
      stopPolling();
      wsRef.current?.close(1000, 'unmount');
    };
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps
}
