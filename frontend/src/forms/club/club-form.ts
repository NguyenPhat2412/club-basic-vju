import type { Club, ClubInput } from '@/types/club/club.types';
import { getPresentationLocale } from '@/i18n/config';
import { translateUiText } from '@/i18n/translator';

export interface CreateClubFormValues {
  code: string;
  name: string;
  activityField: string;
  contactEmail: string;
  logoUrl: string;
  coverUrl: string;
  description: string;
}

export type ClubFormDraft = CreateClubFormValues;

export const EMPTY_CREATE_CLUB_FORM: CreateClubFormValues = {
  code: '',
  name: '',
  activityField: '',
  contactEmail: '',
  logoUrl: '',
  coverUrl: '',
  description: '',
};

export function emptyClubFormDraft(): CreateClubFormValues {
  return { ...EMPTY_CREATE_CLUB_FORM };
}

export function clubToFormDraft(club: Club): CreateClubFormValues {
  return {
    code: club.code ?? '',
    name: club.name ?? '',
    activityField: club.activityField ?? '',
    contactEmail: club.contactEmail ?? '',
    logoUrl: club.logoUrl ?? '',
    coverUrl: club.coverUrl ?? '',
    description: club.description ?? '',
  };
}

export function canSubmitClubDraft(draft: CreateClubFormValues): boolean {
  return Boolean(draft.code.trim() && draft.name.trim());
}

export function toCreateClubPayload(
  draft: CreateClubFormValues,
  normalizedLogo?: string,
  normalizedCover?: string
): ClubInput {
  return {
    code: draft.code.trim().toUpperCase(),
    name: draft.name.trim(),
    activityField: draft.activityField.trim() || undefined,
    contactEmail: draft.contactEmail.trim() || undefined,
    logoUrl: normalizedLogo || undefined,
    coverUrl: normalizedCover || undefined,
    description: draft.description.trim() || undefined,
  };
}

export type ClubManagementTabKey =
  | 'clubs'
  | 'overview'
  | 'applications'
  | 'forms'
  | 'members'
  | 'departments'
  | 'events'
  | 'tasks'
  | 'chat'
  | 'settings';

export const CLUB_MANAGEMENT_TAB_KEYS: ClubManagementTabKey[] = [
  'clubs',
  'overview',
  'applications',
  'forms',
  'members',
  'departments',
  'events',
  'tasks',
  'chat',
  'settings',
];

export function computeVisibleClubTabs(
  activeClubId: string,
  canInClub: (permissionKey: string, clubId: string) => boolean
): { value: ClubManagementTabKey; label: string }[] {
  const hasAny = (keys: string[]) => Boolean(activeClubId && keys.some((k) => canInClub(k, activeClubId)));
  const list: { value: ClubManagementTabKey; label: string }[] = [];
  if (activeClubId) list.push({ value: 'clubs', label: 'Danh sách CLB' });
  if (hasAny(['club.view'])) list.push({ value: 'overview', label: 'Tổng quan' });
  if (
    hasAny([
      'application.create',
      'application.view',
      'application.view_detail',
      'application.review',
      'application.approve',
      'application.reject',
      'application.update',
    ])
  ) {
    list.push({ value: 'applications', label: 'Đơn ứng tuyển' });
  }
  if (hasAny(['application.manage_form', 'application.review', 'application.approve'])) {
    list.push({ value: 'forms', label: 'Biểu mẫu' });
  }
  if (hasAny(['member.view', 'member.view_detail', 'member.add', 'member.update', 'member.remove'])) {
    list.push({ value: 'members', label: 'Thành viên' });
  }
  if (
    hasAny([
      'department.view',
      'department.create',
      'department.update',
      'department.activate',
      'department.inactive',
      'department.member.view',
      'department.member.add',
      'department.member.remove',
    ])
  ) {
    list.push({ value: 'departments', label: 'Ban chuyên môn' });
  }
  if (hasAny(['event.view', 'event.create', 'event.update', 'event.attendance', 'event.attendance_edit'])) {
    list.push({ value: 'events', label: 'Sự kiện' });
  }
  if (hasAny(['task.view', 'task.create', 'task.update', 'task.verify'])) {
    list.push({ value: 'tasks', label: 'Công việc' });
  }
  if (hasAny(['chat.view', 'chat.send', 'chat.summarize'])) {
    list.push({ value: 'chat', label: 'Chat & AI' });
  }
  if (hasAny(['club.update', 'club.active', 'club.inactive', 'notification.send'])) {
    list.push({ value: 'settings', label: 'Cài đặt CLB' });
  }
  const locale = getPresentationLocale();
  return list.map((item) => ({ ...item, label: translateUiText(item.label, locale) }));
}
