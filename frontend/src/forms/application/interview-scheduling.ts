import type { ApplicationSummary } from '@/types/application/application.types';

const BLOCKED_INTERVIEW_STATUSES = new Set(['REJECTED', 'CANCELLED']);

export function extractUpcomingInterviews<T extends ApplicationSummary>(
  applications: readonly T[],
  nowMs: number = Date.now(),
): T[] {
  return applications
    .filter((app) => {
      if (!app.interviewAt || BLOCKED_INTERVIEW_STATUSES.has(app.status)) {
        return false;
      }
      const ts = Date.parse(app.interviewAt);
      return Number.isFinite(ts) && ts >= nowMs;
    })
    .sort((a, b) => Date.parse(a.interviewAt!) - Date.parse(b.interviewAt!));
}

export function toDateTimeLocalInput(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function fromDateTimeLocalInput(localValue: string): string | null {
  const trimmed = localValue.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

export function formatInterviewReminderLabel(sentAt?: string | null): string {
  if (!sentAt) return 'Chưa gửi nhắc lịch hẹn';
  const d = new Date(sentAt);
  if (Number.isNaN(d.getTime())) return 'Chưa gửi nhắc lịch hẹn';
  const formatted = new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(d);
  return `Đã nhắc hẹn gần nhất: ${formatted}`;
}

export function formatInterviewCountdown(interviewAt: string, nowMs: number = Date.now()): string {
  const ts = Date.parse(interviewAt);
  if (!Number.isFinite(ts)) return '';
  const diffMs = ts - nowMs;
  if (diffMs < 0) return 'Đã qua';
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 60) {
    return diffMinutes <= 1 ? 'Sắp diễn ra' : `Trong ${diffMinutes} phút`;
  }
  const diffHours = Math.floor(diffMs / 3_600_000);
  if (diffHours < 24) {
    return `Trong ${diffHours} giờ`;
  }
  const diffDays = Math.ceil(diffMs / 86_400_000);
  return diffDays === 1 ? 'Ngày mai' : `Còn ${diffDays} ngày`;
}
