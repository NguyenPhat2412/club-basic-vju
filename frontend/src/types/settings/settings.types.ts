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
  otpExpiryMinutes: number;
  otpMaxSendCount: number;
  otpResendCooldownSeconds: number;
  otpMaxVerifyAttempts: number;
  smtpHost: string | null;
  smtpPort: number;
  smtpUsername: string | null;
  smtpPassword?: string;
  clearSmtpPassword?: boolean;
  smtpFromEmail: string | null;
  smtpFromName: string;
  smtpStartTls: boolean;
};

export type SystemSettings = Omit<SystemSettingsInput, 'smtpPassword' | 'clearSmtpPassword'> & {
  smtpPasswordConfigured: boolean;
  updatedAt?: string;
  updatedBy?: string;
};
