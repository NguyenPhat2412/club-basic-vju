export type PublicEvent = {
  id: string;
  clubId: string;
  clubName: string;
  departmentId?: string;
  departmentName?: string;
  title: string;
  description?: string;
  eventType: string;
  location?: string;
  startTime: string;
  endTime: string;
  registrationDeadline?: string;
  allowCtv: boolean;
  maxParticipants?: number;
  status: string;
  completedAt?: string;
};

export type ClubEvent = PublicEvent & {
  clubCode?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type CreateEventInput = {
  departmentId?: string;
  title: string;
  description?: string;
  eventType?: string;
  location?: string;
  startTime: string;
  endTime: string;
  registrationDeadline: string;
  allowCtv?: boolean;
  maxParticipants?: number;
  status?: string;
};

export type EventRegistration = {
  id: string;
  eventId: string;
  userId: string;
  userEmail?: string;
  userFullName?: string;
  studentCode?: string;
  participantType: string;
  eventRole?: string;
  status: string;
  note?: string;
  registeredAt: string;
  cancelledAt?: string;
};

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export type AttendanceItemInput = {
  userId: string;
  status: AttendanceStatus;
  note?: string;
  expectedVersion?: number;
};

export type EventAttendance = {
  id: string;
  eventId: string;
  userId: string;
  userEmail?: string;
  userFullName?: string;
  studentCode?: string;
  status: AttendanceStatus;
  note?: string;
  editReason?: string;
  version: number;
  checkedBy: string;
  checkedAt: string;
};

export type MyEventParticipation = {
  registrationId: string;
  eventId: string;
  clubId: string;
  clubCode: string;
  clubName: string;
  eventTitle: string;
  eventType: string;
  eventStatus: string;
  location?: string;
  startTime: string;
  endTime: string;
  registrationDeadline?: string;
  participantType: string;
  eventRole?: string;
  registrationStatus: string;
  registeredAt: string;
  cancelledAt?: string;
  attendanceStatus?: AttendanceStatus;
  attendanceNote?: string;
  attendanceEditReason?: string;
  checkedAt?: string;
  countedAsAttended: boolean;
};

export type CalendarItem = {
  id: string;
  itemType: 'EVENT' | 'TASK';
  clubId: string;
  clubName: string;
  departmentId?: string;
  title: string;
  status: string;
  location?: string;
  startTime: string;
  endTime: string;
};
