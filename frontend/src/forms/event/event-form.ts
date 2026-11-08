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
  maxParticipants: string;
  status: string;
}

export type EventFormDraft = EventFormValues;

export const EVENT_TYPE_LABELS: Record<string, string> = {
  WORKSHOP: 'Workshop / Hội thảo',
  SEMINAR: 'Toạ đàm chuyên đề',
  COMPETITION: 'Cuộc thi học thuật',
  RECRUITMENT: 'Tuyển thành viên / CTV',
  CULTURAL: 'Giao lưu văn hoá',
  VOLUNTEER: 'Hoạt động tình nguyện',
  INTERNAL: 'Sinh hoạt nội bộ CLB',
  OTHER: 'Hoạt động khác',
};

export const EMPTY_EVENT_FORM: EventFormValues = {
  departmentId: '',
  title: '',
  description: '',
  eventType: 'WORKSHOP',
  location: '',
  startTime: '',
  endTime: '',
  registrationDeadline: '',
  allowCtv: true,
  maxParticipants: '',
  status: 'OPEN_REGISTRATION',
};

export function emptyEventFormDraft(): EventFormValues {
  return { ...EMPTY_EVENT_FORM };
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
    eventType: draft.eventType || 'WORKSHOP',
    location: draft.location.trim() || undefined,
    startTime: toIso(draft.startTime),
    endTime: toIso(draft.endTime),
    registrationDeadline: toIso(draft.registrationDeadline),
    allowCtv: draft.allowCtv,
    maxParticipants: draft.maxParticipants ? Number(draft.maxParticipants) : undefined,
    status: draft.status || undefined,
  };
}
