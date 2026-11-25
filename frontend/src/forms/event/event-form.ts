import type { CreateEventInput } from '@/types/event/event.types';

export interface EventFormValues {
  departmentId: string;
  title: string;
  description: string;
  eventType: string;
  location: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  allowCtv: boolean;
  allowPublicAttendees: boolean;
  requiresSubmission: boolean;
  maxParticipants: string;
  status: string;
}

export type EventFormState = EventFormValues;
export type EventFormDraft = EventFormValues;

export const EVENT_TYPE_LABELS: Record<string, string> = {
  CLUB_EVENT: 'Sự kiện câu lạc bộ',
  MEETING: 'Lịch sinh hoạt nội bộ CLB',
  WORKSHOP: 'Workshop / Hội thảo',
  RECRUITMENT: 'Tuyển thành viên / CTV',
};

export const EMPTY_EVENT_FORM: EventFormValues = {
  departmentId: '',
  title: '',
  description: '',
  eventType: 'CLUB_EVENT',
  location: '',
  startTime: '',
  endTime: '',
  registrationDeadline: '',
  allowCtv: true,
  allowPublicAttendees: true,
  requiresSubmission: false,
  maxParticipants: '',
  status: 'OPEN_REGISTRATION',
};

export function isEventPublic(ev: { allowPublicAttendees?: boolean; allowCtv: boolean }): boolean {
  const allowPublic = ev.allowPublicAttendees ?? ev.allowCtv;
  return allowPublic || ev.allowCtv;
}

export function getEventScopeLabel(ev: { allowPublicAttendees?: boolean; allowCtv: boolean }): string {
  const allowPublic = ev.allowPublicAttendees ?? ev.allowCtv;
  if (allowPublic && ev.allowCtv) return 'Mở tham dự & tuyển CTV';
  if (allowPublic) return 'Mở tham dự toàn trường';
  if (ev.allowCtv) return 'Mở tuyển CTV toàn trường';
  return 'Sự kiện nội bộ CLB';
}

export function emptyEventFormDraft(): EventFormValues {
  return { ...EMPTY_EVENT_FORM };
}

export function isEventSubmissionLocked(
  eventStatus: string,
  registrationDeadline?: string | null,
  nowMs = Date.now(),
): boolean {
  if (eventStatus !== 'OPEN_REGISTRATION') return true;
  if (!registrationDeadline) return false;
  const deadlineMs = new Date(registrationDeadline).getTime();
  return !Number.isNaN(deadlineMs) && nowMs > deadlineMs;
}

export function toIso(localStr: string): string {
  if (!localStr) return '';
  const d = new Date(localStr);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

export function toLocalInput(isoStr?: string | null): string {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toCreateEventPayload(draft: EventFormValues): CreateEventInput {
  return {
    departmentId: draft.departmentId || undefined,
    title: draft.title.trim(),
    description: draft.description.trim() || undefined,
    eventType: draft.eventType || 'CLUB_EVENT',
    location: draft.location.trim() || undefined,
    startTime: toIso(draft.startTime),
    endTime: toIso(draft.endTime),
    registrationDeadline: toIso(draft.registrationDeadline),
    allowCtv: draft.allowCtv,
    allowPublicAttendees: draft.allowPublicAttendees,
    requiresSubmission: draft.requiresSubmission,
    maxParticipants: draft.maxParticipants ? Number(draft.maxParticipants) : undefined,
    status: draft.status || undefined,
  };
}
