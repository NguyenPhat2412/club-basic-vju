"use client";

import { ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Inbox, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

function ensureToastStack(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  let root = document.getElementById("vju-toast-stack");
  if (!root) {
    root = document.createElement("div");
    root.id = "vju-toast-stack";
    root.className =
      "pointer-events-none fixed right-4 top-16 z-[80] flex w-[min(400px,calc(100vw-2rem))] flex-col gap-2.5";
    document.body.appendChild(root);
  }
  return root;
}

export function EmptyState({ icon, title, description, actionLabel, onAction }: { icon?: ReactNode; title: string; description?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="flex size-15 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary [&_svg]:size-7">{icon ?? <Inbox />}</span>
      <div><p className="text-sm font-bold sm:text-base">{title}</p>{description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}</div>
      {actionLabel && onAction && <Button size="sm" className="rounded-xl px-5 text-xs font-bold" onClick={onAction}>{actionLabel}</Button>}
    </div>
  );
}

export function LoadingRows({ rows = 6 }: { rows?: number }) {
  return <div className="flex flex-col gap-2 p-4">{Array.from({ length: rows }, (_, i) => <div key={i} className="h-14 shrink-0 animate-pulse rounded-xl bg-muted/60" />)}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <EmptyState icon={<AlertTriangle />} title="Không tải được dữ liệu" description={message} actionLabel={onRetry ? "Thử lại" : undefined} onAction={onRetry} />;
}

export function Notice({ tone, children }: { tone: "success" | "error"; children: ReactNode }) {
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [closedTarget, setClosedTarget] = useState<ReactNode | null>(null);
  const durationMs = tone === "error" ? 6500 : 4500;
  const isDismissed = closedTarget === children;

  useEffect(() => {
    if (!isClient || isDismissed) return;
    const timer = window.setTimeout(() => setClosedTarget(children), durationMs);
    return () => window.clearTimeout(timer);
  }, [children, durationMs, isClient, isDismissed]);

  if (!isClient || isDismissed) return null;
  const root = ensureToastStack();
  if (!root) return null;

  const isError = tone === "error";

  return createPortal(
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={cn(
        "pointer-events-auto slide-in-right relative overflow-hidden rounded-xl border bg-white px-4 py-3 shadow-xl",
        isError ? "border-rose-200 text-rose-950" : "border-emerald-200 text-slate-900"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
            isError ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
          )}
        >
          {isError ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={cn("text-xs font-bold", isError ? "text-rose-700" : "text-emerald-700")}>
            {isError ? "Thông báo lỗi" : "Thao tác thành công"}
          </p>
          <div className="mt-0.5 text-xs leading-relaxed text-slate-700">{children}</div>
        </div>
        <button
          type="button"
          aria-label="Đóng thông báo"
          onClick={() => setClosedTarget(children)}
          className="shrink-0 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={14} />
        </button>
      </div>
      <span
        aria-hidden
        style={{ animationDuration: `${durationMs}ms` }}
        className={cn(
          "toast-progress absolute bottom-0 left-0 right-0 h-0.5",
          isError ? "bg-rose-500/80" : "bg-emerald-500/80"
        )}
      />
    </div>,
    root
  );
}
