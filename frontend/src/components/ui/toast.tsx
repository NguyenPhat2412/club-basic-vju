"use client";

import { useSyncExternalStore } from "react";
import { CheckCircle2, CircleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Toast = { id: number; message: string; variant: "error" | "success" };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(message: string, variant: Toast["variant"]) {
  const id = nextId++;
  toasts = [...toasts.slice(-3), { id, message, variant }];
  emit();
  setTimeout(() => dismiss(id), 4500);
}

export const toast = {
  error: (message: string) => push(message, "error"),
  success: (message: string) => push(message, "success"),
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const empty: Toast[] = [];

export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => empty);
  return (
    <div aria-live="assertive" className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(360px,calc(100vw-32px))] flex-col gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          role={t.variant === "error" ? "alert" : "status"}
          className={cn(
            "toast-in pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white px-3.5 py-3 text-xs font-medium shadow-lg",
            t.variant === "error" ? "border-rose-200 text-rose-700" : "border-emerald-200 text-emerald-700"
          )}
        >
          {t.variant === "error" ? <CircleAlert size={16} className="mt-px shrink-0" /> : <CheckCircle2 size={16} className="mt-px shrink-0" />}
          <p className="flex-1 leading-relaxed">{t.message}</p>
          <button type="button" aria-label="Đóng thông báo" onClick={() => dismiss(t.id)} className="shrink-0 text-slate-400 hover:text-slate-700">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
