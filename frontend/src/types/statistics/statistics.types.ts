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

export type ClubStatistics = {
  clubId: string;
  clubCode: string;
  clubName: string;
  from?: string;
  to?: string;
  activeMembers: number;
  activeDepartments: number;
  pendingApplications: number;
  totalEvents: number;
  openEvents: number;
  completedEvents: number;
  cancelledEvents: number;
  uniqueParticipants: number;
  activeRegistrations: number;
  cancelledRegistrations: number;
  attendedCount: number;
  absentOrExcusedCount: number;
  openTasks: number;
  overdueTasks: number;
  completedTasks: number;
  generatedAt: string;
};
