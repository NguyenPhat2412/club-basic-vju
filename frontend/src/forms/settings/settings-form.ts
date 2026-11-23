import type { SystemSettings, SystemSettingsInput } from '@/types/settings/settings.types';

type NumberKey = {
  [K in keyof SystemSettingsInput]-?: SystemSettingsInput[K] extends number ? K : never;
}[keyof SystemSettingsInput];

type BooleanKey = {
  [K in keyof SystemSettingsInput]-?: SystemSettingsInput[K] extends boolean ? K : never;
}[keyof SystemSettingsInput];

export type SystemSettingsFieldMeta =
  | { kind: 'number'; key: NumberKey; label: string; hint: string; unit: string; min: number; max: number }
  | { kind: 'toggle'; key: BooleanKey; label: string; hint: string };

export interface SystemSettingsGroup {
  title: string;
  fields: SystemSettingsFieldMeta[];
}

// min/max mirror UpdateSystemSettingsRequest on the backend
export const SYSTEM_SETTINGS_GROUPS: SystemSettingsGroup[] = [
  {
    title: 'Tài khoản & Đăng ký',
    fields: [
      { kind: 'toggle', key: 'allowSelfRegistration', label: 'Cho phép tự đăng ký tài khoản', hint: 'Tắt để chỉ quản trị viên được tạo tài khoản (áp dụng cho cả đăng ký bằng email và Google).' },
    ],
  },
  {
    title: 'Mã OTP & Khôi phục mật khẩu',
    fields: [
      { kind: 'number', key: 'otpExpiryMinutes', label: 'Thời gian hiệu lực mã OTP', hint: 'Số phút một mã xác thực OTP 6 chữ số có hiệu lực kể từ lúc phát hành.', unit: 'phút', min: 1, max: 60 },
      { kind: 'number', key: 'otpMaxSendCount', label: 'Số lần gửi OTP tối đa (60 phút)', hint: 'Giới hạn số lần một tài khoản được yêu cầu gửi mã OTP trong vòng 1 giờ.', unit: 'lần', min: 1, max: 30 },
      { kind: 'number', key: 'otpResendCooldownSeconds', label: 'Thời gian chờ gửi lại OTP', hint: 'Số giây người dùng phải chờ trước khi bấm gửi lại mã OTP mới (0 = không chờ).', unit: 'giây', min: 0, max: 600 },
      { kind: 'number', key: 'otpMaxVerifyAttempts', label: 'Số lần nhập sai OTP tối đa', hint: 'Vượt quá số lần thử này, mã OTP hiện tại sẽ tự động bị vô hiệu hoá để chống dò mã.', unit: 'lần', min: 1, max: 15 },
    ],
  },
  {
    title: 'Tuyển thành viên',
    fields: [
      { kind: 'number', key: 'maxPendingApplications', label: 'Số đơn chờ duyệt tối đa', hint: 'Số đơn đang chờ duyệt mà mỗi sinh viên được có cùng lúc (0 = không giới hạn).', unit: 'đơn', min: 0, max: 100 },
      { kind: 'number', key: 'reapplyCooldownDays', label: 'Thời gian chờ nộp lại đơn', hint: 'Số ngày sinh viên phải chờ để nộp lại vào CLB vừa từ chối đơn (0 = nộp lại ngay).', unit: 'ngày', min: 0, max: 365 },
      { kind: 'number', key: 'maxActiveClubs', label: 'Số CLB tham gia tối đa', hint: 'Số câu lạc bộ mỗi sinh viên được tham gia cùng lúc (0 = không giới hạn).', unit: 'CLB', min: 0, max: 100 },
    ],
  },
  {
    title: 'Chat & AI',
    fields: [
      { kind: 'number', key: 'chatSummariesPerHour', label: 'Lượt tóm tắt AI mỗi giờ', hint: 'Số lần mỗi người được yêu cầu AI tóm tắt trong một giờ (0 = tắt tóm tắt AI).', unit: 'lượt', min: 0, max: 100 },
      { kind: 'number', key: 'chatMaxMessageLength', label: 'Độ dài tin nhắn tối đa', hint: 'Số ký tự tối đa của một tin nhắn trong kênh CLB.', unit: 'ký tự', min: 100, max: 4000 },
      { kind: 'number', key: 'chatMessagesPerMinute', label: 'Tin nhắn tối đa mỗi phút', hint: 'Giới hạn số tin nhắn mỗi người được gửi trong 1 phút để chống spam kênh chat.', unit: 'tin', min: 1, max: 200 },
    ],
  },
  {
    title: 'Chống spam & Tần suất',
    fields: [
      { kind: 'number', key: 'broadcastCooldownMinutes', label: 'Chờ giữa 2 lần phát thông báo CLB', hint: 'Số phút tối thiểu giữa hai lần gửi thông báo hàng loạt của cùng một CLB (0 = không chờ).', unit: 'phút', min: 0, max: 1440 },
      { kind: 'number', key: 'facebookSyncCooldownMinutes', label: 'Chờ giữa 2 lần đồng bộ Facebook', hint: 'Số phút tối thiểu giữa hai lần bấm đồng bộ Fanpage Facebook trong cùng một CLB (0 = không chờ).', unit: 'phút', min: 0, max: 1440 },
    ],
  },
  {
    title: 'Hạn mức tài nguyên mỗi CLB',
    fields: [
      { kind: 'number', key: 'maxChannelsPerClub', label: 'Số kênh chat tối đa', hint: 'Số kênh thảo luận tối đa một câu lạc bộ được tạo.', unit: 'kênh', min: 1, max: 200 },
      { kind: 'number', key: 'maxDepartmentsPerClub', label: 'Số ban chuyên môn tối đa', hint: 'Số ban chuyên môn tối đa trong một câu lạc bộ.', unit: 'ban', min: 1, max: 100 },
      { kind: 'number', key: 'maxActiveEventsPerClub', label: 'Sự kiện đang hoạt động tối đa', hint: 'Số sự kiện đang mở hoặc nháp cùng lúc (không tính sự kiện đã kết thúc/huỷ).', unit: 'SK', min: 1, max: 500 },
      { kind: 'number', key: 'maxOpenTasksPerClub', label: 'Công việc đang mở tối đa', hint: 'Số công việc chưa hoàn thành tối đa cùng lúc trong một câu lạc bộ.', unit: 'việc', min: 1, max: 2000 },
    ],
  },
  {
    title: 'Sự kiện & Điểm danh',
    fields: [
      { kind: 'number', key: 'attendanceOpensBeforeMinutes', label: 'Mở điểm danh trước giờ bắt đầu', hint: 'Bao nhiêu phút trước khi sự kiện bắt đầu thì được điểm danh.', unit: 'phút', min: 0, max: 1440 },
      { kind: 'number', key: 'attendanceEditWindowHours', label: 'Thời hạn chỉnh sửa điểm danh', hint: 'Số giờ sau khi sự kiện kết thúc mà Ban Chủ nhiệm được phép chỉnh sửa điểm danh.', unit: 'giờ', min: 0, max: 720 },
      { kind: 'number', key: 'eventTaskGraceDays', label: 'Hạn công việc sau sự kiện', hint: 'Hạn hoàn thành công việc của sự kiện được kéo dài tối đa bao nhiêu ngày sau khi sự kiện kết thúc.', unit: 'ngày', min: 0, max: 90 },
    ],
  },
  {
    title: 'Dung lượng & Lưu trữ',
    fields: [
      { kind: 'number', key: 'clubStorageQuotaMb', label: 'Hạn mức lưu trữ mỗi CLB', hint: 'Tổng dung lượng tối đa cho kho tài liệu và tệp đính kèm chat của từng CLB.', unit: 'MB', min: 50, max: 10240 },
      { kind: 'number', key: 'documentMaxVersions', label: 'Phiên bản tối đa / tài liệu', hint: 'Số phiên bản lịch sử tối đa được phép tải lên cho một tài liệu.', unit: 'bản', min: 1, max: 100 },
      { kind: 'number', key: 'documentMaxFileMb', label: 'File tài liệu tối đa', hint: 'Áp dụng cho tài liệu CLB và file đính kèm đơn ứng tuyển.', unit: 'MB', min: 1, max: 20 },
      { kind: 'number', key: 'clubImageMaxMb', label: 'Ảnh logo / ảnh bìa CLB tối đa', hint: 'Dung lượng tối đa của mỗi ảnh logo hoặc ảnh bìa câu lạc bộ.', unit: 'MB', min: 1, max: 20 },
      { kind: 'number', key: 'avatarMaxMb', label: 'Ảnh đại diện tối đa', hint: 'Dung lượng tối đa khi người dùng tải ảnh đại diện lên.', unit: 'MB', min: 1, max: 20 },
    ],
  },
];

export const SYSTEM_SETTINGS_FIELDS: SystemSettingsFieldMeta[] = SYSTEM_SETTINGS_GROUPS.flatMap((g) => g.fields);

export function defaultSystemSettingsInput(): SystemSettingsInput {
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
    otpExpiryMinutes: 5,
    otpMaxSendCount: 5,
    otpResendCooldownSeconds: 60,
    otpMaxVerifyAttempts: 5,
    smtpHost: null,
    smtpPort: 587,
    smtpUsername: null,
    smtpPassword: '',
    clearSmtpPassword: false,
    smtpFromEmail: null,
    smtpFromName: 'VJU ClubHub',
    smtpStartTls: true,
    facebookAppId: null,
    facebookAppSecret: '',
    clearFacebookAppSecret: false,
    facebookGraphVersion: null,
    facebookOauthRedirectUri: null,
    frontendBaseUrl: null,
    aiBaseUrl: null,
    aiApiKey: '',
    clearAiApiKey: false,
    aiModel: null,
    googleClientId: null,
    googleAllowedDomains: null,
    googleCreateAccounts: null,
  };
}

export function createSystemSettingsDraft(settings?: SystemSettings | null): SystemSettingsInput {
  const draft = defaultSystemSettingsInput();
  if (!settings) return draft;
  for (const f of SYSTEM_SETTINGS_FIELDS) {
    const val = settings[f.key as keyof SystemSettings];
    if (val !== undefined && val !== null) {
      (draft as Record<string, unknown>)[f.key] = val;
    }
  }
  draft.smtpHost = settings.smtpHost ?? null;
  draft.smtpPort = settings.smtpPort ?? 587;
  draft.smtpUsername = settings.smtpUsername ?? null;
  draft.smtpPassword = '';
  draft.clearSmtpPassword = false;
  draft.smtpFromEmail = settings.smtpFromEmail ?? null;
  draft.smtpFromName = settings.smtpFromName || 'VJU ClubHub';
  draft.smtpStartTls = settings.smtpStartTls ?? true;
  draft.facebookAppId = settings.facebookAppId ?? null;
  draft.facebookAppSecret = '';
  draft.clearFacebookAppSecret = false;
  draft.facebookGraphVersion = settings.facebookGraphVersion ?? null;
  draft.facebookOauthRedirectUri = settings.facebookOauthRedirectUri ?? null;
  draft.frontendBaseUrl = settings.frontendBaseUrl ?? null;
  draft.aiBaseUrl = settings.aiBaseUrl ?? null;
  draft.aiApiKey = '';
  draft.clearAiApiKey = false;
  draft.aiModel = settings.aiModel ?? null;
  draft.googleClientId = settings.googleClientId ?? null;
  draft.googleAllowedDomains = settings.googleAllowedDomains ?? null;
  draft.googleCreateAccounts = settings.googleCreateAccounts ?? null;
  return draft;
}

export const settingsToFormInput = createSystemSettingsDraft;

function normStr(value: string | null | undefined): string {
  return (value ?? '').trim();
}

export function hasSystemSettingsChanged(draft: SystemSettingsInput, current?: SystemSettings | null): boolean {
  if (!current) return true;
  if (SYSTEM_SETTINGS_FIELDS.some((f) => draft[f.key] !== current[f.key as keyof SystemSettings])) {
    return true;
  }
  if (normStr(draft.smtpHost) !== normStr(current.smtpHost)) return true;
  if ((draft.smtpPort || 587) !== (current.smtpPort || 587)) return true;
  if (normStr(draft.smtpUsername) !== normStr(current.smtpUsername)) return true;
  if (normStr(draft.smtpFromEmail) !== normStr(current.smtpFromEmail)) return true;
  if ((normStr(draft.smtpFromName) || 'VJU ClubHub') !== (normStr(current.smtpFromName) || 'VJU ClubHub')) return true;
  if (Boolean(draft.smtpStartTls) !== Boolean(current.smtpStartTls)) return true;
  if (Boolean(draft.smtpPassword && draft.smtpPassword.trim())) return true;
  if (Boolean(draft.clearSmtpPassword) && current.smtpPasswordConfigured) return true;
  if (normStr(draft.facebookAppId) !== normStr(current.facebookAppId)) return true;
  if (Boolean(draft.facebookAppSecret && draft.facebookAppSecret.trim())) return true;
  if (Boolean(draft.clearFacebookAppSecret) && current.facebookAppSecretConfigured) return true;
  if (normStr(draft.facebookGraphVersion) !== normStr(current.facebookGraphVersion)) return true;
  if (normStr(draft.facebookOauthRedirectUri) !== normStr(current.facebookOauthRedirectUri)) return true;
  if (normStr(draft.frontendBaseUrl) !== normStr(current.frontendBaseUrl)) return true;
  if (normStr(draft.aiBaseUrl) !== normStr(current.aiBaseUrl)) return true;
  if (Boolean(draft.aiApiKey && draft.aiApiKey.trim())) return true;
  if (Boolean(draft.clearAiApiKey) && current.aiApiKeyConfigured) return true;
  if (normStr(draft.aiModel) !== normStr(current.aiModel)) return true;
  if (normStr(draft.googleClientId) !== normStr(current.googleClientId)) return true;
  if (normStr(draft.googleAllowedDomains) !== normStr(current.googleAllowedDomains)) return true;
  if ((draft.googleCreateAccounts ?? null) !== (current.googleCreateAccounts ?? null)) return true;
  return false;
}

export function toSystemSettingsPayload(draft: SystemSettingsInput): SystemSettingsInput {
  return {
    ...draft,
    smtpHost: normStr(draft.smtpHost) || null,
    smtpPort: draft.smtpPort || 587,
    smtpUsername: normStr(draft.smtpUsername) || null,
    smtpPassword: normStr(draft.smtpPassword) || undefined,
    clearSmtpPassword: draft.clearSmtpPassword ? true : undefined,
    smtpFromEmail: normStr(draft.smtpFromEmail) || null,
    smtpFromName: normStr(draft.smtpFromName) || 'VJU ClubHub',
    facebookAppId: normStr(draft.facebookAppId) || null,
    facebookAppSecret: normStr(draft.facebookAppSecret) || undefined,
    clearFacebookAppSecret: draft.clearFacebookAppSecret ? true : undefined,
    facebookGraphVersion: normStr(draft.facebookGraphVersion) || null,
    facebookOauthRedirectUri: normStr(draft.facebookOauthRedirectUri) || null,
    frontendBaseUrl: normStr(draft.frontendBaseUrl) || null,
    aiBaseUrl: normStr(draft.aiBaseUrl) || null,
    aiApiKey: normStr(draft.aiApiKey) || undefined,
    clearAiApiKey: draft.clearAiApiKey ? true : undefined,
    aiModel: normStr(draft.aiModel) || null,
    googleClientId: normStr(draft.googleClientId) || null,
    googleAllowedDomains: normStr(draft.googleAllowedDomains) || null,
    googleCreateAccounts: draft.googleCreateAccounts,
  };
}
