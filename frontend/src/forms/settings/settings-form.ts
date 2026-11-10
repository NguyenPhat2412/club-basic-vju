import type { SystemSettings, SystemSettingsInput } from '@/types/settings/settings.types';

type NumberKey = { [K in keyof SystemSettingsInput]: SystemSettingsInput[K] extends number ? K : never }[keyof SystemSettingsInput];
type BooleanKey = { [K in keyof SystemSettingsInput]: SystemSettingsInput[K] extends boolean ? K : never }[keyof SystemSettingsInput];

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
    title: 'Dung lượng tải lên',
    fields: [
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
    reapplyCooldownDays: 30,
    maxActiveClubs: 3,
    attendanceEditWindowHours: 48,
    allowSelfRegistration: true,
    attendanceOpensBeforeMinutes: 120,
    eventTaskGraceDays: 7,
    chatSummariesPerHour: 10,
    chatMaxMessageLength: 4000,
    documentMaxFileMb: 20,
    clubImageMaxMb: 10,
    avatarMaxMb: 5,
  };
}

export function createSystemSettingsDraft(settings?: SystemSettings | null): SystemSettingsInput {
  const draft = defaultSystemSettingsInput();
  if (!settings) return draft;
  for (const f of SYSTEM_SETTINGS_FIELDS) {
    (draft as Record<string, unknown>)[f.key] = settings[f.key] ?? draft[f.key];
  }
  return draft;
}

export const settingsToFormInput = createSystemSettingsDraft;

export function hasSystemSettingsChanged(draft: SystemSettingsInput, current?: SystemSettings | null): boolean {
  if (!current) return true;
  return SYSTEM_SETTINGS_FIELDS.some((f) => draft[f.key] !== current[f.key]);
}
