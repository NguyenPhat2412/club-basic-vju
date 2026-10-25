import { ReactNode } from "react";
import { AlertTriangle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <div role={tone === "error" ? "alert" : "status"}
      className={tone === "error" ? "mx-4 mt-3 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive sm:mx-6"
        : "mx-4 mt-3 rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-medium text-primary sm:mx-6"}>
      {children}
    </div>
  );
}
