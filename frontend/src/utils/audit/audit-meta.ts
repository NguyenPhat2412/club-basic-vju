import { getPresentationLocale } from "@/i18n/config";
import { translateUiText } from "@/i18n/translator";

export const RESOURCE_LABELS: Record<string, string> = {
  USER: "Tài khoản",
  CLUB: "Câu lạc bộ",
  DEPARTMENT: "Ban chuyên môn",
  MEMBERSHIP: "Thành viên CLB",
  DEPARTMENT_MEMBER: "Thành viên ban",
  PERMISSION_GRANT: "Phân quyền",
  ROLE: "Chức vụ & Vai trò",
  ROLE_ASSIGNMENT: "Bổ nhiệm vai trò",
  APPLICATION: "Đơn đăng ký",
  APPLICATION_FORM: "Biểu mẫu tuyển quân",
  DOCUMENT: "Tài liệu & Quy chế",
  EVENT: "Sự kiện",
  TASK: "Công việc",
  CHAT_CHANNEL: "Kênh trao đổi",
  NOTIFICATION: "Thông báo",
  SYSTEM_SETTINGS: "Cài đặt hệ thống",
};

export const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Đăng nhập",
  LOGOUT: "Đăng xuất",
  CREATE: "Tạo mới",
  CREATED: "Tạo mới",
  UPDATE: "Cập nhật",
  UPDATED: "Cập nhật",
  DELETE: "Xoá",
  DELETED: "Xoá",
  ANONYMIZE: "Ẩn danh tài khoản",
  ANONYMIZED: "Ẩn danh tài khoản",
  LOCK: "Khoá tài khoản",
  LOCKED: "Khoá tài khoản",
  UNLOCK: "Mở khoá tài khoản",
  UNLOCKED: "Mở khoá tài khoản",
  SOFT_DELETE: "Chuyển vào thùng rác",
  RESTORE: "Khôi phục",
  APPROVE: "Phê duyệt",
  APPROVED: "Phê duyệt",
  REJECT: "Từ chối",
  REJECTED: "Từ chối",
  CANCEL: "Huỷ bỏ",
  CANCELLED: "Huỷ bỏ",
  REGISTER: "Đăng ký tham gia",
  REGISTERED: "Đăng ký tham gia",
  COMPLETE: "Hoàn tất",
  COMPLETED: "Hoàn tất",
  REOPEN: "Mở lại công việc",
  REOPENED: "Mở lại công việc",
  MOVE: "Chuyển ban",
  MOVED: "Chuyển ban",
  REMOVE: "Gỡ khỏi ban",
  REMOVED: "Gỡ khỏi ban",
  GRANT: "Cấp quyền",
  GRANTED: "Cấp quyền",
  ASSIGN: "Bổ nhiệm vai trò",
  ASSIGNED: "Bổ nhiệm vai trò",
  REVOKE: "Thu hồi quyền / vai trò",
  REVOKED: "Thu hồi quyền / vai trò",
  ACTIVATE: "Kích hoạt",
  ACTIVATED: "Kích hoạt",
  DEACTIVATE: "Ngừng hoạt động",
  DEACTIVATED: "Ngừng hoạt động",
  RESET_PASSWORD: "Đặt lại mật khẩu",
  PASSWORD_CHANGED: "Đổi mật khẩu",
  UPLOAD: "Tải lên tệp mới",
  ATTENDANCE: "Điểm danh sự kiện",
  VERIFY: "Nghiệm thu công việc",
  SEND: "Gửi thông báo",
};

const SCOPE_LABELS: Record<string, string> = {
  GLOBAL: "Phạm vi toàn hệ thống",
  SYSTEM: "Phạm vi toàn hệ thống",
  CLUB: "Phạm vi Câu lạc bộ",
  DEPARTMENT: "Phạm vi Ban chuyên môn",
};

export function formatRoleScopeLabel(scope?: string): string {
  const raw = SCOPE_LABELS[(scope || "").toUpperCase()] ?? scope ?? "";
  return translateUiText(raw, getPresentationLocale());
}

export function resourceLabel(resourceType: string): string {
  const raw = RESOURCE_LABELS[resourceType] ?? resourceType;
  return translateUiText(raw, getPresentationLocale());
}

export function formatAuditAction(action: string): string {
  const locale = getPresentationLocale();
  const upper = (action || "").toUpperCase();
  if (ACTION_LABELS[upper]) return translateUiText(ACTION_LABELS[upper], locale);
  for (const [key, label] of Object.entries(ACTION_LABELS)) {
    if (upper.endsWith(`_${key}`) || upper.endsWith(`.${key}`)) {
      return translateUiText(label, locale);
    }
  }
  return translateUiText(action, locale);
}
