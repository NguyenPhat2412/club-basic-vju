"use client";
import { FormEvent, ReactNode, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function useEscape(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);
}

const sizes = { sm: "max-w-[480px]", md: "max-w-[520px]", lg: "max-w-[640px]" } as const;

type ModalProps = {
  open: boolean; onClose: () => void; title: string; icon?: ReactNode; size?: keyof typeof sizes; children: ReactNode;
  onSubmit?: () => void; submitLabel?: string; submitLoading?: boolean; submitDanger?: boolean; submitDisabled?: boolean;
};

export function ModalShell({ open, onClose, title, icon, size = "md", children, onSubmit, submitLabel = "Lưu", submitLoading, submitDanger, submitDisabled }: ModalProps) {
  useEscape(open, onClose);
  if (!open) return null;
  const submit = (e: FormEvent) => { e.preventDefault(); onSubmit?.(); };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 fade-in" onMouseDown={onClose}>
      <form role="dialog" aria-modal="true" aria-label={title} onSubmit={submit} onMouseDown={(e) => e.stopPropagation()}
        className={cn("panel-modal flex max-h-[90vh] w-full flex-col", sizes[size])}>
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h3 className="flex items-center gap-2 text-[15px] font-bold">{icon && <span className="text-primary [&_svg]:size-4">{icon}</span>}{title}</h3>
          <button type="button" aria-label="Đóng" onClick={onClose} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X size={16} /></button>
        </div>
        <div className="grid gap-4 overflow-y-auto px-6 py-4">{children}</div>
        {onSubmit && (
          <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Huỷ</Button>
            <Button type="submit" size="sm" variant={submitDanger ? "destructive" : "default"} disabled={submitLoading || submitDisabled}>{submitLoading ? "Đang xử lý…" : submitLabel}</Button>
          </div>
        )}
      </form>
    </div>
  );
}

export function EntityDrawer({ open, onClose, title, subtitle, icon, children, footer }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string; icon?: ReactNode; children: ReactNode; footer?: ReactNode;
}) {
  useEscape(open, onClose);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs" onMouseDown={onClose}>
      <aside role="dialog" aria-modal="true" aria-label={title} onMouseDown={(e) => e.stopPropagation()}
        className="flex h-full w-full flex-col border-l border-border/80 bg-card shadow-2xl sm:max-w-xl md:max-w-2xl fade-in">
        <div className="flex min-h-16 items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-5 py-4">
          <div className="flex min-w-0 items-center gap-3">
            {icon && <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">{icon}</span>}
            <div className="min-w-0"><h3 className="truncate text-[15px] font-bold">{title}</h3>{subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}</div>
          </div>
          <button aria-label="Đóng" onClick={onClose} className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">{footer}</div>}
      </aside>
    </div>
  );
}

export function DetailList({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-1 gap-x-4 gap-y-3 text-sm sm:grid-cols-[140px_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
          <dd className="min-w-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Section({ title, icon, children, className }: { title: string; icon?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("mt-6 grid gap-3 border-t border-border pt-5", className)}>
      <h4 className="flex items-center gap-2 text-sm font-bold">{icon && <span className="text-primary [&_svg]:size-4">{icon}</span>}{title}</h4>
      {children}
    </section>
  );
}
