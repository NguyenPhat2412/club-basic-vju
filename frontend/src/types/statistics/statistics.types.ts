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
  departmentBreakdown: ClubDepartmentStatsItem[];
  generatedAt: string;
};
