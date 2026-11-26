import type { ClubEvent, CreateEventInput } from '@/types/event/event.types';

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
  parentEventId: string;
  boothCode: string;
  venueMapUrl: string;
  facebookPostUrl: string;
  recapAlbumUrl: string;
  allowShuttleBus: boolean;
  coHostClubIds: string[];
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
  parentEventId: '',
  boothCode: '',
  venueMapUrl: '',
  facebookPostUrl: '',
  recapAlbumUrl: '',
  allowShuttleBus: false,
  coHostClubIds: [],
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

export function areEventsRelatedInFestival(
  a: { id: string; parentEventId?: string | null },
  b: { id: string; parentEventId?: string | null },
): boolean {
  if (a.id === b.parentEventId || b.id === a.parentEventId) return true;
  return Boolean(a.parentEventId && a.parentEventId === b.parentEventId);
}

export function emptyEventFormDraft(): EventFormValues {
  return { ...EMPTY_EVENT_FORM, coHostClubIds: [] };
}

export function toEventFormValues(ev: ClubEvent): EventFormValues {
  return {
    title: ev.title,
    eventType: ev.eventType,
    departmentId: ev.departmentId ?? '',
    location: ev.location ?? '',
    startTime: toLocalInput(ev.startTime),
    endTime: toLocalInput(ev.endTime),
    registrationDeadline: toLocalInput(ev.registrationDeadline),
    maxParticipants: ev.maxParticipants ? String(ev.maxParticipants) : '',
    allowCtv: ev.allowCtv,
    allowPublicAttendees: ev.allowPublicAttendees ?? ev.allowCtv,
    requiresSubmission: Boolean(ev.requiresSubmission),
    status: ev.status,
    description: ev.description ?? '',
    parentEventId: ev.parentEventId ?? '',
    boothCode: ev.boothCode ?? '',
    venueMapUrl: ev.venueMapUrl ?? '',
    facebookPostUrl: ev.facebookPostUrl ?? '',
    recapAlbumUrl: ev.recapAlbumUrl ?? '',
    allowShuttleBus: Boolean(ev.allowShuttleBus),
    coHostClubIds: (ev.coHosts ?? []).map((c) => c.clubId),
  };
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

export function toCreateEventPayload(
  draft: EventFormValues,
  academicTerm?: string,
  editingParentId?: string | null,
): CreateEventInput {
  const nextParentId = draft.parentEventId.trim() || undefined;
  const clearParent = Boolean(editingParentId && !nextParentId);
  return {
    departmentId: draft.departmentId || undefined,
    title: draft.title.trim(),
    description: draft.description.trim() || undefined,
    eventType: draft.eventType || 'CLUB_EVENT',
    location: draft.location.trim() || undefined,
    startTime: toIso(draft.startTime),
    endTime: toIso(draft.endTime),
    registrationDeadline: toIso(draft.registrationDeadline || draft.startTime),
    allowCtv: draft.allowCtv,
    allowPublicAttendees: draft.allowPublicAttendees,
    requiresSubmission: draft.requiresSubmission,
    maxParticipants: draft.maxParticipants ? Number(draft.maxParticipants) : undefined,
    status: draft.status || undefined,
    academicTerm: academicTerm || undefined,
    parentEventId: nextParentId,
    clearParentEvent: clearParent || undefined,
    boothCode: nextParentId ? draft.boothCode.trim() : '',
    venueMapUrl: draft.venueMapUrl.trim(),
    facebookPostUrl: draft.facebookPostUrl.trim(),
    recapAlbumUrl: draft.recapAlbumUrl.trim(),
    allowShuttleBus: draft.allowShuttleBus,
    coHostClubIds: draft.coHostClubIds,
  };
}
