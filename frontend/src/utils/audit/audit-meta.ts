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
  CREATE: "Tạo mới",
  CREATED: "Tạo mới",
  UPDATE: "Cập nhật",
  UPDATED: "Cập nhật",
  DELETE: "Xoá",
  DELETED: "Xoá",
  SOFT_DELETE: "Chuyển vào thùng rác",
  RESTORE: "Khôi phục",
  APPROVE: "Phê duyệt",
  APPROVED: "Phê duyệt",
  REJECT: "Từ chối",
  REJECTED: "Từ chối",
  CANCEL: "Huỷ bỏ",
  CANCELLED: "Huỷ bỏ",
  ASSIGN: "Bổ nhiệm vai trò",
  ASSIGNED: "Bổ nhiệm vai trò",
  REVOKE: "Thu hồi vai trò",
  REVOKED: "Thu hồi vai trò",
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
