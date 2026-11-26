import type { Scope } from '@/types/common.types';

export type SystemStatistics = {
  totalUsers: number;
  activeUsers: number;
  lockedUsers: number;
  inactiveUsers: number;
  anonymizedUsers: number;
  totalClubs: number;
  activeClubs: number;
  inactiveClubs: number;
  roleBreakdown: {
    roleCode: string;
    roleName: string;
    scope: Scope;
    activeAssignmentCount: number;
    distinctUserCount: number;
  }[];
  generatedAt: string;
};

export type ClubDepartmentStatsItem = {
  departmentId: string;
  departmentName: string;
  status: string;
  activeMembers: number;
  firstChoiceApplications: number;
  secondChoiceApplications: number;
  openTasks: number;
  completedTasks: number;
};

export type ClubStatistics = {
  clubId: string;
  clubCode: string;
  clubName: string;
  from?: string;
  to?: string;
  activeMembers: number;
  suspendedMembers: number;
  leftMembers: number;
  activeDepartments: number;
  pendingApplications: number;
  applicationsSubmitted: number;
  periodPendingApplications: number;
  approvedApplications: number;
  rejectedApplications: number;
  cancelledApplications: number;
  approvalRate: number;
  totalEvents: number;
  draftEvents: number;
  openEvents: number;
  closedRegistrationEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  uniqueParticipants: number;
  activeRegistrations: number;
  memberRegistrations: number;
  ctvRegistrations: number;
  cancelledRegistrations: number;
  attendedCount: number;
  memberAttended: number;
  ctvAttended: number;
  absentOrExcusedCount: number;
  attendanceRate: number;
  openTasks: number;
  todoTasks: number;
  inProgressTasks: number;
  reviewPendingTasks: number;
  overdueTasks: number;
  completedTasks: number;
  cancelledTasks: number;
  taskCompletionRate: number;
  liveDocuments: number;
  totalDocumentBytes: number;
  chatChannels: number;
  issuedCertificates?: number;
  acknowledgedCertificates?: number;
  pendingAcknowledgeCertificates?: number;
  revokedCertificates?: number;
  certificateAcknowledgementRate?: number;
  departmentBreakdown: ClubDepartmentStatsItem[];
  generatedAt: string;
};

export type TrainingPointReportQuery = {
  clubId?: string;
  academicTerm?: string;
  search?: string;
  from?: string;
  to?: string;
};

export type AttendedEventItem = {
  eventId: string;
  clubId?: string | null;
  clubCode?: string | null;
  clubName?: string | null;
  title: string;
  academicTerm?: string | null;
  startTime?: string | null;
  attendanceStatus?: string | null;
  attendanceLocked?: boolean;
  attendanceLockedAt?: string | null;
  attendanceSignatureSha256?: string | null;
};

export type StudentAttendedEventEvidence = AttendedEventItem;

export type StudentTrainingPointItem = {
  userId: string;
  fullName: string;
  studentCode?: string | null;
  email: string;
  activeClubs: string[];
  presentEventCount: number;
  attendedEventTitles: string[];
  attendanceSignatures?: string[];
  attendedEvents?: AttendedEventItem[];
};

export type TrainingPointReportResponse = {
  generatedAt: string;
  clubId?: string | null;
  clubName?: string | null;
  academicTerm?: string | null;
  from?: string | null;
  to?: string | null;
  totalStudents: number;
  totalPresentCheckIns: number;
  attendanceSignatureSha256?: string | null;
  items: StudentTrainingPointItem[];
};

export type EventsTimelineQuery = {
  clubId?: string;
  academicTerm?: string;
  from?: string;
  to?: string;
};

export type TimelineEventItem = {
  id: string;
  clubId: string;
  clubCode: string;
  clubName: string;
  title: string;
  eventType: string;
  status: string;
  location?: string | null;
  academicTerm?: string | null;
  startTime: string;
  endTime: string;
  registrationCount: number;
  presentCount: number;
  maxParticipants?: number | null;
  participationRate: number;
  attendanceLocked?: boolean;
  attendanceSignatureSha256?: string | null;
  parentEventId?: string | null;
  boothCode?: string | null;
};

export type TimelineUnitSummary = {
  clubId: string;
  clubCode: string;
  clubName: string;
  eventCount: number;
  totalRegistrations: number;
  totalPresent: number;
  participationRate: number;
  events: TimelineEventItem[];
};

export type EventsTimelineResponse = {
  generatedAt: string;
  academicTerm?: string | null;
  from?: string | null;
  to?: string | null;
  totalUnits: number;
  totalEvents: number;
  units: TimelineUnitSummary[];
};
