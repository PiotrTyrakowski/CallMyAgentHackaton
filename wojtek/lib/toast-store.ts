"use client";
import { create } from "zustand";

export type ToastTone = "info" | "success" | "warning" | "danger" | "gold";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  emoji?: string;
  ttl: number;
  createdAt: number;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id" | "createdAt" | "ttl"> & { ttl?: number }) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToasts = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const toast: Toast = {
      id,
      createdAt: Date.now(),
      ttl: t.ttl ?? 3200,
      title: t.title,
      description: t.description,
      tone: t.tone,
      emoji: t.emoji,
    };
    set((s) => ({ toasts: [...s.toasts, toast] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) }));
    }, toast.ttl);
  },
  dismiss: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

export function toast(t: Parameters<ToastState["push"]>[0]) {
  useToasts.getState().push(t);
}
