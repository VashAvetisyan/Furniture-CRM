'use client';

import { useToastStore } from '@/stores/toast';

export default function ToastStack() {
  const { toasts, removeToast } = useToastStore();
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto max-w-sm animate-fade-in ${
            t.type === 'warning'
              ? 'bg-amber-50 border border-amber-200 text-amber-800'
              : 'bg-white border border-gray-200 text-gray-800'
          }`}
        >
          <span className="flex-1 leading-snug">{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="text-gray-400 hover:text-gray-600 flex-shrink-0 leading-none"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
