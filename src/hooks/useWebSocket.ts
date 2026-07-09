'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { BASE_URL } from '@/lib/api';
import { useAuthStore } from '@/stores';
import { useToastStore } from '@/stores/toast';
import { showBrowserNotification } from '@/lib/browserNotifications';

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

  const wsRef    = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout>>();
  const tries    = useRef(0);
  const alive    = useRef(false);

  function connect() {
    if (!alive.current) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;

    const ws = new WebSocket(buildWsUrl(token));
    wsRef.current = ws;

    ws.onopen = () => { tries.current = 0; };

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
      const delay = Math.min(1000 * 2 ** tries.current, 30_000);
      tries.current++;
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
      wsRef.current?.close(1000, 'unmount');
    };
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps
}
