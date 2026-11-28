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
  telegramEnabled: boolean;
  telegramBotToken?: string;
  clearTelegramBotToken?: boolean;
  telegramChatId: string | null;
  telegramThreadId: string | null;
  telegramAlertOnFailedLogin: boolean;
  telegramFailedLoginThreshold: number;
  telegramAlertOnRateLimit: boolean;
  telegramAlertOnAdminLogin: boolean;
  telegramAlertOnSettingsChange: boolean;
  telegramCooldownSeconds: number;
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  announcementEnabled: boolean;
  announcementMessage: string | null;
  announcementTone: 'info' | 'warning' | 'danger';
  announcementExpiresAt: string | null;
  clearAnnouncementExpiresAt?: boolean;
};

export type SystemSettings = Omit<
  SystemSettingsInput,
  | 'smtpPassword'
  | 'clearSmtpPassword'
  | 'facebookAppSecret'
  | 'clearFacebookAppSecret'
  | 'aiApiKey'
  | 'clearAiApiKey'
  | 'telegramBotToken'
  | 'clearTelegramBotToken'
  | 'clearAnnouncementExpiresAt'
> & {
  smtpPasswordConfigured: boolean;
  facebookAppSecretConfigured: boolean;
  facebookOauthConfigured: boolean;
  aiApiKeyConfigured: boolean;
  aiConfigured: boolean;
  googleSignInConfigured: boolean;
  telegramBotTokenConfigured: boolean;
  telegramConfigured: boolean;
  updatedAt?: string;
  updatedBy?: string;
};

export type PublicSystemStatus = {
  maintenanceMode: boolean;
  maintenanceMessage: string | null;
  announcementEnabled: boolean;
  announcementMessage: string | null;
  announcementTone: string;
  announcementExpiresAt: string | null;
};

export type InfraServiceStatus = {
  key: string;
  name: string;
  status: 'UP' | 'DOWN' | 'PAUSED' | 'UNCONFIGURED' | string;
  latencyMs: number | null;
  detail: string | null;
};

export type SystemInfraHealth = {
  checkedAt: string;
  services: InfraServiceStatus[];
  storage: {
    storageMode: string;
    documentBytes: number;
    chatMediaBytes: number;
    totalBytes: number;
    clubCount: number;
    totalUsers: number;
    activeUsers: number;
  };
};

export type BlockedIpItem = {
  id: string;
  ipAddress: string;
  reason: string | null;
  blockedBy: string | null;
  blockedByName: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type BlockIpInput = {
  ipAddress: string;
  reason?: string | null;
  durationHours?: number | null;
};

export type OnlineUserItem = {
  userId: string;
  fullName: string | null;
  email: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  connections: number;
  connectedAt: string | null;
};

export type SuspiciousIpItem = {
  ipAddress: string;
  failedLoginCount: number;
  rateLimitBlockedCount: number;
  targetEmails: string[];
  lastSeenAt: string | null;
  latestUserAgent: string | null;
};

export type SecurityEventItem = {
  id: string;
  createdAt: string;
  action: string;
  resourceType: string;
  actorUserId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  summary: string | null;
};

export type SystemSecurityOverview = {
  windowHours: number;
  onlineUserCount: number;
  activeConnectionCount: number;
  loginSuccessCount: number;
  loginFailedCount: number;
  rateLimitBlockedCount: number;
  sensitiveChangeCount: number;
  onlineUsers: OnlineUserItem[];
  suspiciousIps: SuspiciousIpItem[];
  recentEvents: SecurityEventItem[];
};
