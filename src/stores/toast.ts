import { create } from 'zustand';

export interface ToastItem {
  id:      number;
  message: string;
  type:    'info' | 'warning';
}

let seq = 0;

interface ToastStore {
  toasts:      ToastItem[];
  addToast:    (t: Omit<ToastItem, 'id'>) => void;
  removeToast: (id: number) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  addToast: (t) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts.slice(-4), { ...t, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, 5000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));
