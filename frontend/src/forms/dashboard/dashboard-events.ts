import type { CalendarItem, PublicEvent } from "@/lib/api";

export interface StudentUpcomingEvent {
  id: string;
  title: string;
  clubId?: string;
  clubName: string;
  location?: string;
  startTime: string;
  status?: string;
  mine: boolean;
}

export function buildStudentUpcomingEvents(
  calendarItems: CalendarItem[],
  publicEventItems: PublicEvent[],
  now: number,
): StudentUpcomingEvent[] {
  const upcoming = new Map<string, StudentUpcomingEvent>();
  const publicById = new Map(publicEventItems.map((e) => [e.id, e]));
  for (const item of calendarItems) {
    if (item.itemType === "EVENT" && new Date(item.endTime).getTime() > now) {
      const pub = publicById.get(item.id);
      upcoming.set(item.id, {
        id: item.id,
        title: item.title,
        clubId: item.clubId ?? pub?.clubId,
        clubName: item.clubName,
        location: item.location || pub?.location,
        startTime: item.startTime,
        status: item.status || pub?.status,
        mine: true,
      });
    }
  }
  for (const event of publicEventItems) {
    if (!upcoming.has(event.id) && new Date(event.endTime).getTime() > now) {
      upcoming.set(event.id, {
        id: event.id,
        title: event.title,
        clubId: event.clubId,
        clubName: event.clubName,
        location: event.location,
        startTime: event.startTime,
        status: event.status,
        mine: false,
      });
    }
  }
  return [...upcoming.values()].sort((a, b) => a.startTime.localeCompare(b.startTime)).slice(0, 5);
}
