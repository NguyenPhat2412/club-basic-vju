import { api, cleanParams } from '@/lib/api/client';
import { API_ROUTES } from '@/lib/api/routes';
import type { Page } from '@/types/common.types';
import type {
  AttendanceItemInput,
  CalendarItem,
  ClubEvent,
  CreateEventInput,
  EventAttendance,
  EventRegistration,
  MyEventParticipation,
  PublicEvent,
} from '@/types/event/event.types';

export const eventsApi = {
  publicEvents: (offset = 0, limit = 10) =>
    api<Page<PublicEvent>>(`/public/events?${new URLSearchParams({ offset: String(offset), limit: String(limit) })}`),
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
  registerEvent: (eventId: string, note?: string) =>
    api<EventRegistration>(`/events/${eventId}/registrations`, {
      method: 'POST',
      body: JSON.stringify({ note: note || undefined }),
    }),
  cancelEventRegistration: (eventId: string) =>
    api<EventRegistration>(`/events/${eventId}/registrations/me/cancel`, { method: 'PATCH' }),
  updateEventRegistration: (
    eventId: string,
    registrationId: string,
    body: { eventRole?: string; status?: 'REGISTERED' | 'CANCELLED'; note?: string }
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
  myCalendar: (from?: string, to?: string) =>
    api<CalendarItem[]>(
      `${API_ROUTES.users.myCalendar}${cleanParams({ from, to }) ? `?${cleanParams({ from, to })}` : ''}`
    ),
};
