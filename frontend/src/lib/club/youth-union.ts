export const YOUTH_UNION_CODE = "DOANVJU";

export function isYouthUnionCode(code?: string | null): boolean {
  return (code ?? "").trim().toUpperCase() === YOUTH_UNION_CODE;
}

export function isYouthUnion(club?: { code?: string | null } | null): boolean {
  return isYouthUnionCode(club?.code);
}

export function unitBadgeLabel(code?: string | null): string {
  return isYouthUnionCode(code) ? "Đơn vị cấp Trường · ĐTN" : "Câu lạc bộ VJU";
}

export function unitApplyCtaLabel(code?: string | null): string {
  return isYouthUnionCode(code) ? "Đăng ký Ban / CTV Đoàn Trường" : "Ứng tuyển CLB";
}

export function participantRoleLabel(role?: string | null): string {
  switch ((role ?? "").toUpperCase()) {
    case "ORGANIZER":
      return "Ban tổ chức";
    case "CTV":
      return "Cộng tác viên";
    case "ATTENDEE":
      return "Người tham dự";
    case "MEMBER":
      return "Thành viên CLB";
    default:
      return role || "Người tham dự";
  }
}
