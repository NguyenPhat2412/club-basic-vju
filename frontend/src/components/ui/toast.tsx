"use client";

import { useSyncExternalStore } from "react";
import { Bell, CheckCircle2, CircleAlert, MessageSquare, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastVariant = "error" | "success" | "info" | "chat";

export type ToastOptions = {
  title?: string;
  onClick?: () => void;
  durationMs?: number;
};

type Toast = {
  id: number;
  title?: string;
  message: string;
  variant: ToastVariant;
  onClick?: () => void;
};

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function dismiss(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

function push(message: string, variant: ToastVariant, opts?: ToastOptions) {
  const id = nextId++;
  toasts = [
    ...toasts.slice(-3),
    { id, title: opts?.title, message, variant, onClick: opts?.onClick },
  ];
  emit();
  setTimeout(() => dismiss(id), opts?.durationMs ?? 5200);
}

export const toast = {
  error: (message: string, opts?: ToastOptions) => push(message, "error", opts),
  success: (message: string, opts?: ToastOptions) => push(message, "success", opts),
  info: (message: string, opts?: ToastOptions) => push(message, "info", opts),
  chat: (message: string, opts?: ToastOptions) => push(message, "chat", opts),
};

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const empty: Toast[] = [];

export function Toaster() {
  const items = useSyncExternalStore(subscribe, () => toasts, () => empty);
  return (
    <div aria-live="polite" className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[min(368px,calc(100vw-32px))] flex-col gap-2">
      {items.map((t) => {
        const clickable = Boolean(t.onClick);
        return (
          <div
            key={t.id}
            role={t.variant === "error" ? "alert" : "status"}
            onClick={
              clickable
                ? () => {
                    t.onClick?.();
                    dismiss(t.id);
                  }
                : undefined
            }
            className={cn(
              "toast-in pointer-events-auto flex items-start gap-2.5 rounded-xl border bg-white px-3.5 py-3 text-xs font-medium shadow-lg transition-colors",
              clickable && "cursor-pointer hover:bg-slate-50",
              t.variant === "error" && "border-rose-200 text-rose-700",
              t.variant === "success" && "border-emerald-200 text-emerald-700",
              (t.variant === "info" || t.variant === "chat") && "border-primary/25 text-slate-800"
            )}
          >
            {t.variant === "error" ? (
              <CircleAlert size={16} className="mt-0.5 shrink-0 text-rose-600" />
            ) : t.variant === "success" ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-600" />
            ) : t.variant === "chat" ? (
              <MessageSquare size={16} className="mt-0.5 shrink-0 text-primary" />
            ) : (
              <Bell size={16} className="mt-0.5 shrink-0 text-primary" />
            )}
            <div className="min-w-0 flex-1">
              {t.title && <p className="truncate font-bold text-slate-900">{t.title}</p>}
              <p className={cn("line-clamp-2 leading-relaxed", t.title && "mt-0.5 text-slate-600")}>{t.message}</p>
            </div>
            <button
              type="button"
              aria-label="Đóng thông báo"
              onClick={(e) => {
                e.stopPropagation();
                dismiss(t.id);
              }}
              className="shrink-0 text-slate-400 hover:text-slate-700"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
