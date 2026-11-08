export type SystemSettingsInput = {
  maxPendingApplications: number;
  reapplyCooldownDays: number;
  maxActiveClubs: number;
  attendanceEditWindowHours: number;
};

export type SystemSettings = SystemSettingsInput & {
  updatedAt?: string;
  updatedBy?: string;
};
