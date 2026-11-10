import { ReactNode } from "react";
import { getPresentationLocale } from "@/i18n/config";
import { translateKey, translateUiText } from "@/i18n/translator";
import { cn } from "@/lib/utils";

const tones = {
  // opaque like the other tones: badges also sit on top of cover photos
  primary: { box: "bg-rose-50 text-primary border-primary/20", dot: "bg-primary" },
  pending: { box: "bg-amber-50 text-amber-800 border-amber-200", dot: "bg-amber-500" },
  danger: { box: "bg-rose-50 text-rose-700 border-rose-200", dot: "bg-rose-600" },
  neutral: { box: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
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
  INACTIVE: { tone: "danger", label: "Vô hiệu hoá" },
  LOCKED: { tone: "pending", label: "Tạm khoá" },
  LEFT: { tone: "neutral", label: "Đã rời" },
  SUSPENDED: { tone: "pending", label: "Tạm đình chỉ" },
  DELETED: { tone: "danger", label: "Đã xoá" },
  DRAFT: { tone: "neutral", label: "Bản nháp" },
  OPEN_REGISTRATION: { tone: "primary", label: "Đang mở đăng ký" },
  CLOSED_REGISTRATION: { tone: "pending", label: "Đã đóng đăng ký" },
  COMPLETED: { tone: "primary", label: "Đã hoàn thành" },
  REGISTERED: { tone: "primary", label: "Đã đăng ký" },
  PRESENT: { tone: "primary", label: "Có mặt" },
  LATE: { tone: "pending", label: "Đi muộn" },
  EXCUSED: { tone: "pending", label: "Vắng có phép" },
  ABSENT: { tone: "danger", label: "Vắng mặt" },
  CTV: { tone: "pending", label: "Cộng tác viên" },
  MEMBER: { tone: "primary", label: "Thành viên CLB" },
  TODO: { tone: "neutral", label: "Chưa bắt đầu" },
  IN_PROGRESS: { tone: "pending", label: "Đang thực hiện" },
  DONE: { tone: "primary", label: "Chờ nghiệm thu" },
  OVERDUE: { tone: "danger", label: "Quá hạn" },
  LOW: { tone: "neutral", label: "Thấp" },
  MEDIUM: { tone: "pending", label: "Trung bình" },
  HIGH: { tone: "danger", label: "Cao" },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const known = STATUS[status] ?? { tone: "neutral" as Tone, label: status };
  const locale = getPresentationLocale();
  const resolvedLabel = label
    ? translateUiText(label, locale)
    : translateKey(locale, `status.${status}`, undefined, known.label);
  return <Badge tone={known.tone}>{resolvedLabel}</Badge>;
}

export function CountBadge({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-xs font-semibold text-secondary-foreground">{children}</span>;
}
