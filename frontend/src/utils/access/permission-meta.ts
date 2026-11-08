import { PermissionItem, Role, Scope } from "@/types";
import { getPresentationLocale } from "@/i18n/config";
import { translateUiText } from "@/i18n/translator";
import { scopeLabel } from "@/components/shared/RolePicker";

export const BREADTH: Record<Scope, number> = { DEPARTMENT: 0, CLUB: 1, GLOBAL: 2 };

export const MODULE_LABELS: Record<string, string> = {
  user: "Tài khoản người dùng",
  club: "Câu lạc bộ",
  department: "Ban chuyên môn",
  member: "Thành viên CLB",
  "department.member": "Thành viên ban",
  permission: "Bổ nhiệm & Phân quyền",
  role: "Vai trò & Ma trận quyền",
  audit: "Nhật ký hệ thống",
  setting: "Cài đặt hệ thống",
  application: "Đơn đăng ký & Tuyển quân",
  document: "Quy chế & Kho tài liệu",
  event: "Sự kiện & Lịch sinh hoạt",
  task: "Công việc & Tiến độ",
  chat: "Kênh trao đổi & AI",
  notification: "Thông báo",
};

export const PERMISSION_META: Record<string, { label: string; description: string }> = {
  // Đơn đăng ký
  "application.view": { label: "Xem danh sách đơn đăng ký", description: "Xem danh sách đơn xin gia nhập câu lạc bộ" },
  "application.view_detail": { label: "Xem chi tiết đơn đăng ký", description: "Xem nội dung chi tiết từng hồ sơ đăng ký" },
  "application.create": { label: "Gửi đơn đăng ký", description: "Nộp đơn xin gia nhập câu lạc bộ" },
  "application.cancel": { label: "Huỷ đơn đăng ký", description: "Huỷ đơn đăng ký đang chờ xét duyệt" },
  "application.review": { label: "Xét duyệt đơn đăng ký", description: "Đánh giá hồ sơ ứng viên đăng ký vào câu lạc bộ" },
  "application.approve": { label: "Phê duyệt đơn đăng ký", description: "Chấp thuận đơn đăng ký và kết nạp thành viên vào CLB" },
  "application.reject": { label: "Từ chối đơn đăng ký", description: "Từ chối hồ sơ đăng ký gia nhập câu lạc bộ" },
  "application.manage_form": { label: "Quản lý biểu mẫu tuyển thành viên", description: "Tạo và cấu hình biểu mẫu đơn đăng ký câu lạc bộ" },
  "application.update": { label: "Cập nhật đơn đăng ký", description: "Chỉnh sửa thông tin hồ sơ đăng ký câu lạc bộ" },
  "application.delete": { label: "Xoá đơn đăng ký", description: "Xoá hồ sơ đăng ký khỏi danh sách" },

  // Nhật ký
  "audit.view": { label: "Xem nhật ký hệ thống", description: "Tra cứu lịch sử thao tác và thay đổi dữ liệu trên toàn hệ thống" },

  // Kênh chat & AI
  "chat.view": { label: "Xem kênh trao đổi nội bộ", description: "Truy cập các kênh thảo luận và đọc tin nhắn trong CLB / Ban" },
  "chat.send": { label: "Tạo kênh & gửi tin nhắn", description: "Tạo kênh trao đổi mới và gửi tin nhắn thảo luận" },
  "chat.summarize": { label: "Tóm tắt thảo luận bằng AI", description: "Dùng trợ lý AI tóm tắt nội dung họp, quyết định và gợi ý công việc" },

  // Câu lạc bộ
  "club.view": { label: "Xem thông tin câu lạc bộ", description: "Xem thông tin chi tiết và danh sách câu lạc bộ" },
  "club.create": { label: "Tạo câu lạc bộ mới", description: "Thành lập câu lạc bộ mới trên hệ thống" },
  "club.update": { label: "Cập nhật thông tin câu lạc bộ", description: "Chỉnh sửa tên, giới thiệu, lĩnh vực hoạt động và liên hệ của CLB" },
  "club.active": { label: "Kích hoạt câu lạc bộ", description: "Mở lại trạng thái hoạt động cho câu lạc bộ" },
  "club.inactive": { label: "Ngừng hoạt động câu lạc bộ", description: "Tạm ngừng hoạt động câu lạc bộ" },

  // Ban chuyên môn
  "department.view": { label: "Xem danh sách ban", description: "Xem cơ cấu các ban chuyên môn trong câu lạc bộ" },
  "department.create": { label: "Tạo ban chuyên môn", description: "Thêm ban chuyên môn mới vào câu lạc bộ" },
  "department.update": { label: "Cập nhật thông tin ban", description: "Chỉnh sửa tên và mô tả nhiệm vụ của ban chuyên môn" },
  "department.activate": { label: "Kích hoạt ban chuyên môn", description: "Mở lại hoạt động cho ban chuyên môn" },
  "department.inactive": { label: "Ngừng hoạt động ban chuyên môn", description: "Tạm ngừng hoạt động ban chuyên môn" },

  // Thành viên ban
  "department.member.view": { label: "Xem thành viên trong ban", description: "Xem danh sách thành viên thuộc từng ban chuyên môn" },
  "department.member.add": { label: "Phân thành viên vào ban", description: "Thêm thành viên câu lạc bộ vào ban chuyên môn" },
  "department.member.remove": { label: "Gỡ thành viên khỏi ban", description: "Đưa thành viên ra khỏi ban chuyên môn" },

  // Tài liệu
  "document.view": { label: "Xem & tải xuống tài liệu", description: "Xem danh sách và tải xuống tài liệu lưu trữ của câu lạc bộ" },
  "document.upload": { label: "Tải lên tài liệu & phiên bản mới", description: "Đăng tải tài liệu mới hoặc cập nhật phiên bản tệp tin" },
  "document.update": { label: "Chỉnh sửa thông tin tài liệu", description: "Đổi tên hiển thị và phân loại của tài liệu" },
  "document.delete": { label: "Chuyển tài liệu vào thùng rác", description: "Xoá mềm tài liệu khỏi danh sách đang sử dụng" },
  "document.restore": { label: "Khôi phục tài liệu đã xoá", description: "Xem thùng rác và khôi phục tài liệu đã xoá mềm" },

  // Sự kiện & Lịch
  "event.view": { label: "Xem sự kiện & lịch sinh hoạt", description: "Xem danh sách sự kiện, lịch sinh hoạt và người đăng ký tham gia" },
  "event.create": { label: "Tạo sự kiện & lịch sinh hoạt", description: "Lên lịch sự kiện, buổi sinh hoạt hoặc hoạt động mới cho CLB / Ban" },
  "event.update": { label: "Cập nhật thông tin & trạng thái sự kiện", description: "Chỉnh sửa nội dung, thời gian và mở/đóng đăng ký sự kiện" },
  "event.attendance": { label: "Điểm danh người tham gia sự kiện", description: "Ghi nhận trạng thái có mặt, đi muộn hoặc vắng mặt tại sự kiện" },
  "event.attendance_edit": { label: "Hiệu chỉnh kết quả điểm danh", description: "Chỉnh sửa bản ghi điểm danh đã lưu kèm lý do cập nhật bắt buộc" },

  // Thành viên CLB
  "member.view": { label: "Xem danh sách thành viên CLB", description: "Xem danh sách các thành viên đang tham gia câu lạc bộ" },
  "member.view_detail": { label: "Xem hồ sơ chi tiết thành viên", description: "Xem thông tin chi tiết, ngày tham gia và trạng thái thành viên" },
  "member.add": { label: "Thêm thành viên trực tiếp", description: "Kết nạp trực tiếp tài khoản người dùng vào câu lạc bộ" },
  "member.update": { label: "Cập nhật trạng thái thành viên", description: "Kích hoạt lại, tạm đình chỉ hoặc chuyển trạng thái rời CLB" },
  "member.remove": { label: "Xoá thành viên khỏi câu lạc bộ", description: "Gỡ bỏ thành viên khỏi danh sách câu lạc bộ" },

  // Thông báo
  "notification.send": { label: "Gửi thông báo hàng loạt", description: "Phát thông báo chung tới toàn bộ câu lạc bộ hoặc từng ban chuyên môn" },

  // Phân quyền
  "permission.view": { label: "Xem vai trò & quyền được gán", description: "Xem danh sách vai trò và phạm vi quyền hạn của từng tài khoản" },
  "permission.assign": { label: "Gán vai trò cho tài khoản", description: "Bổ nhiệm vai trò cho người dùng theo toàn hệ thống, CLB hoặc ban" },
  "permission.revoke": { label: "Thu hồi vai trò đã gán", description: "Gỡ bỏ vai trò hiện có của người dùng" },

  // Vai trò
  "role.view": { label: "Xem bảng vai trò & phân quyền", description: "Xem danh sách vai trò và bảng ma trận phân quyền hệ thống" },
  "role.manage": { label: "Quản lý vai trò & phân quyền", description: "Tạo vai trò mới và thay đổi các ô tích quyền của từng vai trò" },

  // Cài đặt hệ thống
  "setting.view": { label: "Xem cài đặt hệ thống", description: "Xem các thông số cấu hình vận hành chung của hệ thống" },
  "setting.update": { label: "Cập nhật cài đặt hệ thống", description: "Thay đổi giới hạn tệp, quy tắc vận hành và cấu hình toàn hệ thống" },

  // Công việc
  "task.view": { label: "Xem danh sách công việc", description: "Theo dõi danh sách công việc và tiến độ thực hiện trong CLB / Ban" },
  "task.create": { label: "Tạo & giao công việc", description: "Tạo đầu việc mới, đặt hạn hoàn thành và phân công cho thành viên" },
  "task.update": { label: "Chỉnh sửa & điều phối lại công việc", description: "Cập nhật người phụ trách, hạn hoàn thành, mức ưu tiên hoặc huỷ công việc" },
  "task.verify": { label: "Nghiệm thu công việc hoàn thành", description: "Kiểm tra và xác nhận hoàn thành đối với công việc đã báo cáo xong" },

  // Tài khoản
  "user.view": { label: "Xem danh sách tài khoản", description: "Tra cứu danh sách và hồ sơ tài khoản người dùng trên hệ thống" },
  "user.create": { label: "Tạo tài khoản mới", description: "Tạo tài khoản người dùng mới và gán vai trò ban đầu" },
  "user.update": { label: "Cập nhật thông tin tài khoản", description: "Chỉnh sửa họ tên, mã sinh viên và số điện thoại của người dùng" },
  "user.reset_password": { label: "Đặt lại mật khẩu tài khoản", description: "Cấp lại mật khẩu mới cho tài khoản người dùng" },
  "user.active": { label: "Mở khoá tài khoản", description: "Kích hoạt lại tài khoản người dùng đang bị khoá" },
  "user.inactive": { label: "Khoá tài khoản", description: "Vô hiệu hoá tài khoản và đăng xuất mọi phiên đăng nhập" },
  "user.delete": { label: "Xoá tài khoản", description: "Xoá tài khoản người dùng khỏi hệ thống" },
};

const ACTION_FALLBACK: Record<string, string> = {
  view: "Xem danh sách",
  view_detail: "Xem chi tiết",
  create: "Tạo mới",
  update: "Cập nhật",
  delete: "Xoá",
  active: "Kích hoạt",
  activate: "Kích hoạt",
  inactive: "Ngừng hoạt động",
  approve: "Phê duyệt",
  reject: "Từ chối",
  review: "Xét duyệt",
  assign: "Gán quyền",
  revoke: "Thu hồi",
  manage: "Quản lý",
  send: "Gửi",
  upload: "Tải lên",
  restore: "Khôi phục",
  verify: "Nghiệm thu",
  attendance: "Điểm danh",
  summarize: "Tóm tắt AI",
};

export function moduleLabel(moduleKey: string): string {
  const raw = MODULE_LABELS[moduleKey] ?? moduleKey;
  return translateUiText(raw, getPresentationLocale());
}

export function permissionTitle(permission: PermissionItem) {
  const locale = getPresentationLocale();
  const known = PERMISSION_META[permission.permissionKey];
  if (known) return translateUiText(known.label, locale);
  const mod = moduleLabel(permission.module);
  const act = translateUiText(ACTION_FALLBACK[permission.action] ?? permission.action, locale);
  return `${act} ${mod.toLowerCase()}`;
}

export function permissionDesc(permission: PermissionItem) {
  const locale = getPresentationLocale();
  const known = PERMISSION_META[permission.permissionKey]?.description;
  if (known) return translateUiText(known, locale);
  return translateUiText(`Phạm vi áp dụng: ${scopeLabel(permission.scope)}`, locale);
}

export const fitsRole = (permission: PermissionItem, role: Pick<Role, "scope">) =>
  BREADTH[role.scope] >= BREADTH[permission.scope];

export function codeFromName(name: string) {
  const code = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return /^[A-Z]/.test(code) ? code : code ? `ROLE_${code}` : "";
}
