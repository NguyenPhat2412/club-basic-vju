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
  chatMessagesPerMinute: number;
  documentMaxFileMb: number;
  clubImageMaxMb: number;
  avatarMaxMb: number;
  clubStorageQuotaMb: number;
  documentMaxVersions: number;
  maxChannelsPerClub: number;
  maxDepartmentsPerClub: number;
  maxActiveEventsPerClub: number;
  maxOpenTasksPerClub: number;
  broadcastCooldownMinutes: number;
  facebookSyncCooldownMinutes: number;
  facebookAutoSyncEnabled: boolean;
  facebookAutoSyncIntervalMinutes: number;
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
  facebookAppId: string | null;
  facebookAppSecret?: string;
  clearFacebookAppSecret?: boolean;
  facebookGraphVersion: string | null;
  facebookOauthRedirectUri: string | null;
  frontendBaseUrl: string | null;
  aiBaseUrl: string | null;
  aiApiKey?: string;
  clearAiApiKey?: boolean;
  aiModel: string | null;
  googleClientId: string | null;
  googleAllowedDomains: string | null;
  googleCreateAccounts: boolean | null;
};

export type SystemSettings = Omit<
  SystemSettingsInput,
  'smtpPassword' | 'clearSmtpPassword' | 'facebookAppSecret' | 'clearFacebookAppSecret' | 'aiApiKey' | 'clearAiApiKey'
> & {
  smtpPasswordConfigured: boolean;
  facebookAppSecretConfigured: boolean;
  facebookOauthConfigured: boolean;
  aiApiKeyConfigured: boolean;
  aiConfigured: boolean;
  googleSignInConfigured: boolean;
  updatedAt?: string;
  updatedBy?: string;
};
