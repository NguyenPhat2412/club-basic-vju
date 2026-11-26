export type EventParticipantRole = 'MEMBER' | 'ORGANIZER' | 'CTV' | 'ATTENDEE';

export type EventCoHostItem = {
  clubId: string;
  clubCode: string;
  clubName: string;
};

export type PublicEvent = {
  id: string;
  clubId: string;
  clubCode?: string | null;
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
  allowPublicAttendees?: boolean;
  requiresSubmission?: boolean;
  maxParticipants?: number;
  status: string;
  completedAt?: string;
  academicTerm?: string | null;
  attendanceLockedAt?: string | null;
  attendanceLockedBy?: string | null;
  attendanceSignatureSha256?: string | null;
  certificateTemplateUrl?: string | null;
  coverImageUrl?: string | null;
  parentEventId?: string | null;
  parentEventTitle?: string | null;
  boothCode?: string | null;
  venueMapUrl?: string | null;
  facebookPostUrl?: string | null;
  recapAlbumUrl?: string | null;
  allowShuttleBus?: boolean;
  childBoothCount?: number;
  coHosts?: EventCoHostItem[];
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
  allowPublicAttendees?: boolean;
  requiresSubmission?: boolean;
  maxParticipants?: number;
  status?: string;
  academicTerm?: string;
  coverImageUrl?: string;
  parentEventId?: string;
  clearParentEvent?: boolean;
  boothCode?: string;
  venueMapUrl?: string;
  facebookPostUrl?: string;
  recapAlbumUrl?: string;
  allowShuttleBus?: boolean;
  coHostClubIds?: string[];
};

export type EventRegistration = {
  id: string;
  eventId: string;
  userId: string;
  userEmail?: string;
  userFullName?: string;
  studentCode?: string;
  userAvatarUrl?: string;
  participantType: string;
  eventRole?: string;
  status: string;
  note?: string;
  registeredAt: string;
  cancelledAt?: string;
  submissionFileName?: string;
  submissionUploadedAt?: string;
  needsShuttleBus?: boolean;
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

export type EventAttendanceQrToken = {
  eventId: string;
  eventTitle: string;
  token: string;
  expiresAt: string;
  ttlSeconds: number;
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
  requiresSubmission?: boolean;
  submissionFileName?: string;
  submissionUploadedAt?: string;
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

export type EventFeedback = {
  id: string;
  eventId: string;
  userId: string;
  userFullName?: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
};

export type CreateEventFeedbackInput = {
  rating: number;
  comment?: string;
};
