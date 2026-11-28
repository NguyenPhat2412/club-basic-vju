import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createSystemSettingsDraft,
  hasSystemSettingsChanged,
  toSystemSettingsPayload,
} from '@/forms/settings/settings-form';
import { translateUiText } from '@/i18n/translator';
import { ACTION_LABELS, RESOURCE_LABELS } from '@/utils/audit/audit-meta';
import type { SystemSettings } from '@/types/settings/settings.types';

function sampleSettings(): SystemSettings {
  return {
    maxPendingApplications: 3,
    reapplyCooldownDays: 7,
    maxActiveClubs: 5,
    attendanceEditWindowHours: 48,
    allowSelfRegistration: true,
    attendanceOpensBeforeMinutes: 120,
    eventTaskGraceDays: 7,
    chatSummariesPerHour: 10,
    chatMaxMessageLength: 4000,
    chatMessagesPerMinute: 20,
    documentMaxFileMb: 20,
    clubImageMaxMb: 10,
    avatarMaxMb: 5,
    clubStorageQuotaMb: 500,
    documentMaxVersions: 20,
    maxChannelsPerClub: 30,
    maxDepartmentsPerClub: 20,
    maxActiveEventsPerClub: 50,
    maxOpenTasksPerClub: 200,
    broadcastCooldownMinutes: 5,
    facebookSyncCooldownMinutes: 2,
    facebookAutoSyncEnabled: true,
    facebookAutoSyncIntervalMinutes: 60,
    otpExpiryMinutes: 5,
    otpMaxSendCount: 5,
    otpResendCooldownSeconds: 60,
    otpMaxVerifyAttempts: 5,
    smtpHost: null,
    smtpPort: 587,
    smtpUsername: null,
    smtpPasswordConfigured: false,
    smtpFromEmail: null,
    smtpFromName: 'VJU ClubHub',
    smtpStartTls: true,
    facebookAppId: null,
    facebookAppSecretConfigured: false,
    facebookGraphVersion: null,
    facebookOauthRedirectUri: null,
    frontendBaseUrl: null,
    facebookOauthConfigured: false,
    aiBaseUrl: null,
    aiApiKeyConfigured: false,
    aiModel: null,
    aiConfigured: false,
    googleClientId: null,
    googleAllowedDomains: null,
    googleCreateAccounts: null,
    googleSignInConfigured: false,
    telegramEnabled: false,
    telegramBotTokenConfigured: true,
    telegramChatId: '-100123456',
    telegramThreadId: null,
    telegramAlertOnFailedLogin: true,
    telegramFailedLoginThreshold: 5,
    telegramAlertOnRateLimit: true,
    telegramAlertOnAdminLogin: true,
    telegramAlertOnSettingsChange: true,
    telegramCooldownSeconds: 180,
    telegramConfigured: true,
    maintenanceMode: false,
    maintenanceMessage: null,
    announcementEnabled: false,
    announcementMessage: null,
    announcementTone: 'info',
    announcementExpiresAt: null,
  };
}

test('system settings draft detects Telegram edits, token updates, and token clearing', () => {
  const current = sampleSettings();
  const draft = createSystemSettingsDraft(current);
  assert.equal(hasSystemSettingsChanged(draft, current), false);

  const toggled = { ...draft, telegramEnabled: true, telegramFailedLoginThreshold: 8 };
  assert.equal(hasSystemSettingsChanged(toggled, current), true);
  const payload = toSystemSettingsPayload(toggled);
  assert.equal(payload.telegramEnabled, true);
  assert.equal(payload.telegramFailedLoginThreshold, 8);
  assert.equal(payload.telegramBotToken, undefined);

  const cleared = { ...draft, clearTelegramBotToken: true };
  assert.equal(hasSystemSettingsChanged(cleared, current), true);
  assert.equal(toSystemSettingsPayload(cleared).clearTelegramBotToken, true);
});

test('Telegram settings and Security Monitor UI phrases translate completely to EN and JA', () => {
  const phrases = [
    'Giới hạn & Vận hành',
    'Máy chủ gửi thư & mẫu OTP',
    'Tích hợp ngoài',
    'Cảnh báo Telegram',
    'Giám sát & Bảo mật',
    'Gửi tin nhắn thử Telegram',
    'Đang trực tuyến',
    'Đăng nhập thất bại',
    'Chặn vượt ngưỡng (429)',
    'Địa chỉ IP đáng ngờ & Dấu hiệu tấn công',
    'Mở toàn bộ Nhật ký hệ thống',
    '3 IP cần chú ý',
    'Vận hành & Hạ tầng',
    'Chế độ bảo trì',
    'Banner thông báo toàn trường',
    'Danh sách IP bị chặn',
    'Chặn 24h',
    'Gỡ chặn',
  ];

  for (const vi of phrases) {
    const en = translateUiText(vi, 'en');
    const ja = translateUiText(vi, 'ja');
    assert.notEqual(en, vi, `Missing EN translation for: ${vi}`);
    assert.notEqual(ja, vi, `Missing JA translation for: ${vi}`);
  }

  assert.equal(RESOURCE_LABELS.SECURITY, 'Bảo mật & Chống tấn công');
  assert.equal(ACTION_LABELS.USER_LOGIN_FAILED, 'Đăng nhập thất bại');
  assert.equal(ACTION_LABELS.SECURITY_RATE_LIMIT_BLOCKED, 'Chặn vượt ngưỡng (429)');
  assert.equal(ACTION_LABELS.USER_SESSION_TERMINATED, 'Ngắt phiên hoạt động');
});
