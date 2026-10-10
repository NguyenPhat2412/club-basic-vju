import { ReactNode } from "react";
import { cn } from "@/lib/utils";

const tones = {
  primary: { box: "bg-primary/10 text-primary border-primary/20", dot: "bg-primary" },
  pending: { box: "bg-primary/5 text-primary/80 border-primary/15", dot: "bg-primary/40" },
  danger: { box: "bg-destructive/10 text-destructive border-destructive/20", dot: "bg-destructive" },
  neutral: { box: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground/60" },
} as const;

export type Tone = keyof typeof tones;

export function Badge({ tone = "neutral", children, className, dot = true }: { tone?: Tone; children: ReactNode; className?: string; dot?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold whitespace-nowrap", tones[tone].box, className)}>
      {dot && <span className={cn("size-1.5 rounded-full", tones[tone].dot)} />}
      {children}
    </span>
  );
}

const STATUS: Record<string, { tone: Tone; label: string }> = {
  ACTIVE: { tone: "primary", label: "Hoạt động" },
  APPROVED: { tone: "primary", label: "Đã duyệt" },
  PENDING: { tone: "pending", label: "Chờ duyệt" },
  REJECTED: { tone: "danger", label: "Từ chối" },
  CANCELLED: { tone: "neutral", label: "Đã huỷ" },
  INACTIVE: { tone: "danger", label: "Đã khoá" },
  LEFT: { tone: "neutral", label: "Đã rời" },
  SUSPENDED: { tone: "pending", label: "Tạm đình chỉ" },
  DELETED: { tone: "danger", label: "Đã xoá" },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const known = STATUS[status] ?? { tone: "neutral" as Tone, label: status };
  return <Badge tone={known.tone}>{label ?? known.label}</Badge>;
}

export function CountBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-semibold text-secondary-foreground">{children}</span>;
}
