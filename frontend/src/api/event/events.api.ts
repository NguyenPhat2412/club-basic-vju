import { api, apiBlob, apiForm, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { Page } from '@/types/common.types';
import type {
  AttendanceItemInput,
  CalendarItem,
  ClubEvent,
  CreateEventFeedbackInput,
  CreateEventInput,
  EventAttendance,
  EventAttendanceQrToken,
  EventFeedback,
  EventParticipantRole,
  EventRegistration,
  MyEventParticipation,
  PublicEvent,
} from '@/types/event/event.types';

export type EventFeedbackSummary = {
  eventId: string;
  totalCount: number;
  averageRating: number;
  items: EventFeedback[];
  canSubmit?: boolean;
};

export const eventsApi = {
  publicEvents: (offset = 0, limit = 10) =>
    api<Page<PublicEvent>>(`/public/events?${new URLSearchParams({ offset: String(offset), limit: String(limit) })}`),
  publicEventBooths: (eventId: string) =>
    api<PublicEvent[]>(`/public/events/${eventId}/booths`),
  discoverEvents: (offset = 0, limit = 50) =>
    api<Page<PublicEvent>>(`${API_ROUTES.events.discover}?${cleanParams({ offset, limit })}`),
  clubEvents: (clubId: string, q: { status?: string; departmentId?: string; offset?: number; limit?: number } = {}) =>
    api<Page<ClubEvent>>(
      `${API_ROUTES.clubs.events(clubId)}?${cleanParams({
        status: q.status,
        departmentId: q.departmentId,
        offset: q.offset ?? 0,
        limit: q.limit ?? 50,
      })}`
    ),
  eventDetail: (eventId: string) => api<ClubEvent>(`/events/${eventId}`),
  createEvent: (clubId: string, body: CreateEventInput) =>
    api<ClubEvent>(API_ROUTES.clubs.events(clubId), { method: 'POST', body: JSON.stringify(body) }),
  updateEvent: (clubId: string, eventId: string, body: Partial<CreateEventInput>) =>
    api<ClubEvent>(API_ROUTES.clubs.eventDetail(clubId, eventId), {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  uploadEventCover: (eventId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiForm<ClubEvent>(`/events/${eventId}/cover`, form);
  },
  deleteEventCover: (eventId: string) =>
    api<ClubEvent>(`/events/${eventId}/cover`, { method: 'DELETE' }),
  registerEvent: (
    eventId: string,
    note?: string,
    participantType?: EventParticipantRole,
    needsShuttleBus?: boolean,
  ) =>
    api<EventRegistration>(`/events/${eventId}/registrations`, {
      method: 'POST',
      body: JSON.stringify({
        note: note || undefined,
        participantType: participantType || undefined,
        needsShuttleBus: needsShuttleBus ?? undefined,
      }),
    }),
  cancelEventRegistration: (eventId: string) =>
    api<EventRegistration>(`/events/${eventId}/registrations/me/cancel`, { method: 'PATCH' }),
  uploadEventSubmission: (eventId: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiForm<EventRegistration>(API_ROUTES.events.mySubmission(eventId), form);
  },
  downloadEventSubmission: (eventId: string, registrationId: string) =>
    apiBlob(API_ROUTES.events.submissionDownload(eventId, registrationId)),
  updateEventRegistration: (
    eventId: string,
    registrationId: string,
    body: {
      eventRole?: string;
      participantType?: EventParticipantRole;
      status?: 'REGISTERED' | 'CANCELLED';
      note?: string;
    }
  ) =>
    api<EventRegistration>(`/events/${eventId}/registrations/${registrationId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
  myEventRegistrations: (q: { status?: string; participantType?: string; offset?: number; limit?: number } = {}) =>
    api<Page<MyEventParticipation>>(
      `${API_ROUTES.users.myEventRegistrations}?${cleanParams({
        status: q.status,
        participantType: q.participantType,
        offset: q.offset ?? 0,
        limit: q.limit ?? 50,
      })}`
    ),
  eventRegistrations: (eventId: string, offset = 0, limit = 100) =>
    api<Page<EventRegistration>>(`/events/${eventId}/registrations?${cleanParams({ offset, limit })}`),
  eventAttendances: (eventId: string) => api<EventAttendance[]>(`/events/${eventId}/attendances`),
  recordAttendance: (eventId: string, items: AttendanceItemInput[], reason?: string) =>
    api<EventAttendance[]>(`/events/${eventId}/attendances`, {
      method: 'PUT',
      body: JSON.stringify({ items, reason: reason?.trim() || undefined }),
    }),
  issueEventAttendanceQrToken: (eventId: string) =>
    api<EventAttendanceQrToken>(`/events/${eventId}/attendances/qr-token`, {
      method: 'POST',
    }),
  checkInEventWithQr: (eventId: string, token: string) =>
    api<EventAttendance>(`/events/${eventId}/attendances/qr-check-in`, {
      method: 'POST',
      body: JSON.stringify({ token: token.trim() }),
    }),
  lockEventAttendance: (eventId: string, otpCode?: string) =>
    api<ClubEvent>(`/events/${eventId}/attendances/lock`, {
      method: 'POST',
      body: JSON.stringify({ otpCode: otpCode?.trim() || undefined }),
    }),
  listEventFeedbacks: (eventId: string) =>
    api<EventFeedbackSummary>(`/events/${eventId}/feedbacks`),
  submitEventFeedback: (eventId: string, input: CreateEventFeedbackInput) =>
    api<EventFeedback>(`/events/${eventId}/feedbacks`, {
      method: 'POST',
      body: JSON.stringify({
        rating: input.rating,
        comment: input.comment?.trim() || undefined,
      }),
    }),
  myCalendar: (from?: string, to?: string) =>
    api<CalendarItem[]>(
      `${API_ROUTES.users.myCalendar}${cleanParams({ from, to }) ? `?${cleanParams({ from, to })}` : ''}`
    ),
};
