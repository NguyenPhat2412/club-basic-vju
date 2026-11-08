import type { SystemSettings, SystemSettingsInput } from '@/types/settings/settings.types';

export interface SystemSettingsFieldMeta {
  key: keyof SystemSettingsInput;
  label: string;
  hint: string;
  unit: string;
  max: number;
}

export const SYSTEM_SETTINGS_FIELDS: SystemSettingsFieldMeta[] = [
  {
    key: 'maxPendingApplications',
    label: 'Số đơn chờ duyệt tối đa',
    hint: 'Số đơn ứng tuyển đang ở trạng thái PENDING tối đa của mỗi sinh viên.',
    unit: 'đơn',
    max: 20,
  },
  {
    key: 'reapplyCooldownDays',
    label: 'Thời gian chờ nộp lại đơn',
    hint: 'Số ngày chờ trước khi nộp lại vào CLB vừa từ chối.',
    unit: 'ngày',
    max: 365,
  },
  {
    key: 'maxActiveClubs',
    label: 'Số CLB tham gia tối đa',
    hint: 'Số câu lạc bộ đang hoạt động (ACTIVE) tối đa của mỗi sinh viên (0 = không giới hạn).',
    unit: 'CLB',
    max: 50,
  },
  {
    key: 'attendanceEditWindowHours',
    label: 'Thời hạn chỉnh sửa điểm danh',
    hint: 'Số giờ sau khi sự kiện kết thúc mà Ban Chủ nhiệm được phép chỉnh sửa điểm danh.',
    unit: 'giờ',
    max: 720,
  },
];

export function defaultSystemSettingsInput(): SystemSettingsInput {
  return {
    maxPendingApplications: 3,
    reapplyCooldownDays: 30,
    maxActiveClubs: 3,
    attendanceEditWindowHours: 24,
  };
}

export function createSystemSettingsDraft(settings?: SystemSettings | null): SystemSettingsInput {
  if (!settings) return defaultSystemSettingsInput();
  return {
    maxPendingApplications: settings.maxPendingApplications,
    reapplyCooldownDays: settings.reapplyCooldownDays,
    maxActiveClubs: settings.maxActiveClubs,
    attendanceEditWindowHours: settings.attendanceEditWindowHours,
  };
}

export const settingsToFormInput = createSystemSettingsDraft;

export function hasSystemSettingsChanged(
  draft: SystemSettingsInput,
  current?: SystemSettings | null
): boolean {
  if (!current) return true;
  return (
    draft.maxPendingApplications !== current.maxPendingApplications ||
    draft.reapplyCooldownDays !== current.reapplyCooldownDays ||
    draft.maxActiveClubs !== current.maxActiveClubs ||
    draft.attendanceEditWindowHours !== current.attendanceEditWindowHours
  );
}
