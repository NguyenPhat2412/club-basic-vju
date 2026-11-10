export type SystemSettingsInput = {
  maxPendingApplications: number;
  reapplyCooldownDays: number;
  maxActiveClubs: number;
  attendanceEditWindowHours: number;
  allowSelfRegistration: boolean;
  attendanceOpensBeforeMinutes: number;
  eventTaskGraceDays: number;
  chatSummariesPerHour: number;
  chatMaxMessageLength: number;
  documentMaxFileMb: number;
  clubImageMaxMb: number;
  avatarMaxMb: number;
};

export type SystemSettings = SystemSettingsInput & {
  updatedAt?: string;
  updatedBy?: string;
};
