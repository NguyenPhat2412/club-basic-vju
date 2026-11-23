import type { EventAttendance, EventRegistration } from "@/types/event/event.types";

export type ParticipantStatusFilter = "ALL" | "REGISTERED" | "CANCELLED";

const COMBINING_MARKS_RE = /[\u0300-\u036f]/g;

function normalizeVietnamese(value: string): string {
  return value.trim().toLocaleLowerCase("vi");
}

function foldVietnamese(value: string): string {
  return value
    .normalize("NFD")
    .replace(COMBINING_MARKS_RE, "")
    .replace(/[đĐ]/g, "d")
    .trim()
    .toLocaleLowerCase("vi");
}

function hasVietnameseDiacritics(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.normalize("NFD") !== trimmed.normalize("NFD").replace(COMBINING_MARKS_RE, "") || /[đĐ]/.test(trimmed);
}

function matchesSearchField(field: string | undefined, normalizedQuery: string, foldedQuery: string, queryHasDiacritics: boolean): boolean {
  if (!field) return false;
  if (normalizeVietnamese(field).includes(normalizedQuery)) return true;
  if (!queryHasDiacritics && foldVietnamese(field).includes(foldedQuery)) return true;
  return false;
}

export function filterEventRegistrations(
  registrations: readonly EventRegistration[],
  query = "",
  statusFilter: ParticipantStatusFilter = "ALL",
): EventRegistration[] {
  const normalizedQuery = normalizeVietnamese(query);
  const foldedQuery = foldVietnamese(query);
  const queryHasDiacritics = hasVietnameseDiacritics(query);

  return registrations.filter((registration) => {
    if (statusFilter !== "ALL" && registration.status !== statusFilter) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }

    return (
      matchesSearchField(registration.userFullName, normalizedQuery, foldedQuery, queryHasDiacritics) ||
      matchesSearchField(registration.studentCode, normalizedQuery, foldedQuery, queryHasDiacritics) ||
      matchesSearchField(registration.userEmail, normalizedQuery, foldedQuery, queryHasDiacritics) ||
      matchesSearchField(registration.eventRole, normalizedQuery, foldedQuery, queryHasDiacritics) ||
      matchesSearchField(registration.note, normalizedQuery, foldedQuery, queryHasDiacritics)
    );
  });
}

export function buildAttendanceStatusMap(
  attendances: readonly EventAttendance[] = [],
): Map<string, EventAttendance> {
  const map = new Map<string, EventAttendance>();
  for (const attendance of attendances) {
    const existing = map.get(attendance.userId);
    if (!existing || attendance.version >= existing.version) {
      map.set(attendance.userId, attendance);
    }
  }
  return map;
}
