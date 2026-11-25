import { apiModel } from "@/lib/api";
import { formatDateTime, formatDay } from "@/lib/utils";
import type { Application } from "@/types/application/application.types";
import type { Membership } from "@/types/club/club.types";
import type { Department } from "@/types/department/department.types";
import type {
  AttendanceStatus,
  ClubEvent,
  EventAttendance,
  EventRegistration,
} from "@/types/event/event.types";
import type { User } from "@/types/user/user.types";
import {
  downloadExcelCsvFile,
  fetchAllFilteredPages,
  openPrintableVjuReport,
} from "@/utils/export/tabular-export";

const MEMBERSHIP_STATUS_VI: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  SUSPENDED: "Tạm đình chỉ",
  LEFT: "Đã rời CLB",
};

const APPLICATION_STATUS_VI: Record<string, string> = {
  PENDING: "Chờ xét duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  CANCELLED: "Đã rút đơn",
};

const ATTENDANCE_STATUS_VI: Record<AttendanceStatus, string> = {
  PRESENT: "Có mặt",
  LATE: "Đi muộn",
  EXCUSED: "Vắng có phép",
  ABSENT: "Vắng mặt",
};

export async function exportClubMembersReport({
  mode,
  clubId,
  statusFilter,
  deptFilter,
  search,
  departmentsByMember,
  lookupUser,
}: {
  mode: "csv" | "pdf";
  clubId: string;
  statusFilter: string;
  deptFilter: string;
  search: string;
  departmentsByMember: Record<string, Department[]>;
  lookupUser?: (userId: string) => User | undefined;
}): Promise<number> {
  const items: Membership[] = await fetchAllFilteredPages((offset, limit) =>
    apiModel.clubMemberships(clubId, statusFilter, offset, limit, {
      departmentId: deptFilter || undefined,
      search: search.trim() || undefined,
    })
  );
  const first = items[0];
  const clubLabel = first ? `${first.clubCode} · ${first.clubName}` : "Câu lạc bộ VJU";
  const headers = [
    "STT",
    "Họ và tên",
    "Mã sinh viên",
    "Email",
    "Ban chuyên môn",
    "Trạng thái",
    "Ngày tham gia",
  ];
  const rows = items.map((m, idx) => {
    const u = lookupUser?.(m.userId);
    const depts =
      departmentsByMember[m.id]?.map((d) => d.name) ??
      m.departments?.map((d) => d.name) ??
      [];
    return [
      idx + 1,
      m.userFullName || u?.fullName || "—",
      m.userStudentCode || u?.studentCode || "—",
      u?.email || "—",
      depts.length ? depts.join(", ") : "Chưa phân ban",
      MEMBERSHIP_STATUS_VI[m.status] ?? m.status,
      m.joinedAt ? formatDay(m.joinedAt) : "—",
    ];
  });

  if (mode === "csv") {
    downloadExcelCsvFile(`danh-sach-thanh-vien-${first?.clubCode ?? "clb"}`, headers, rows);
  } else {
    openPrintableVjuReport({
      title: "DANH SÁCH THÀNH VIÊN CÂU LẠC BỘ",
      clubLabel,
      subtitle: statusFilter ? `Lọc trạng thái: ${MEMBERSHIP_STATUS_VI[statusFilter] ?? statusFilter}` : "Toàn bộ thành viên theo bộ lọc hiện tại",
      headers,
      rows,
    });
  }
  return items.length;
}

export async function exportClubApplicationsReport({
  mode,
  clubId,
  clubName,
  statusFilter,
  search,
  createdFromIso,
  createdToIso,
  lookupUser,
}: {
  mode: "csv" | "pdf";
  clubId: string;
  clubName?: string;
  statusFilter: string;
  search: string;
  createdFromIso?: string;
  createdToIso?: string;
  lookupUser?: (userId: string) => User | undefined;
}): Promise<number> {
  const items: Application[] = await fetchAllFilteredPages((offset, limit) =>
    apiModel.clubApplications(clubId, {
      status: statusFilter || undefined,
      search: search.trim() || undefined,
      createdFrom: createdFromIso,
      createdTo: createdToIso,
      offset,
      limit,
    })
  );
  const first = items[0];
  const clubLabel = first ? `${first.clubCode} · ${first.clubName}` : clubName ?? "Câu lạc bộ VJU";
  const headers = [
    "STT",
    "Họ và tên ứng viên",
    "Mã sinh viên",
    "Email",
    "Số điện thoại",
    "Khoa / Ngành",
    "Khóa",
    "Nguyện vọng 1",
    "Nguyện vọng 2",
    "Trạng thái",
    "Ngày nộp",
    "Ghi chú xét duyệt",
  ];
  const rows = items.map((a, idx) => {
    const u = lookupUser?.(a.applicantId);
    return [
      idx + 1,
      a.applicantName || u?.fullName || "—",
      a.applicantStudentCode || u?.studentCode || "—",
      a.applicantEmail || u?.email || "—",
      a.applicantPhone || "—",
      a.facultyMajor || "—",
      a.academicYear || "—",
      a.preferredDepartmentName || "—",
      a.secondaryDepartmentName || "—",
      APPLICATION_STATUS_VI[a.status] ?? a.status,
      formatDay(a.createdAt),
      a.reviewNote || "—",
    ];
  });

  if (mode === "csv") {
    downloadExcelCsvFile(`don-ung-tuyen-${first?.clubCode ?? "clb"}`, headers, rows);
  } else {
    openPrintableVjuReport({
      title: "DANH SÁCH HỒ SƠ ĐĂNG KÝ GIA NHẬP CÂU LẠC BỘ",
      clubLabel,
      subtitle: statusFilter ? `Trạng thái lọc: ${APPLICATION_STATUS_VI[statusFilter] ?? statusFilter}` : "Tổng hợp đợt tuyển thành viên",
      headers,
      rows,
    });
  }
  return items.length;
}

export function exportEventAttendanceReport({
  mode,
  event,
  registrations,
  attendances,
}: {
  mode: "csv" | "pdf";
  event: ClubEvent;
  registrations: EventRegistration[];
  attendances: EventAttendance[];
}): number {
  const attendanceMap = new Map(attendances.map((a) => [a.userId, a]));
  const headers = [
    "STT",
    "Họ và tên",
    "Mã sinh viên",
    "Email",
    "Đối tượng",
    "Vai trò sự kiện",
    "Trạng thái ĐK",
    "Kết quả điểm danh",
    "Thời gian điểm danh",
    "Ghi chú",
  ];
  const rows = registrations.map((r, idx) => {
    const att = attendanceMap.get(r.userId);
    return [
      idx + 1,
      r.userFullName || "—",
      r.studentCode || "—",
      r.userEmail || "—",
      r.participantType === "COLLABORATOR" ? "Cộng tác viên (CTV)" : "Thành viên CLB",
      r.eventRole || "Tham gia",
      r.status === "CANCELLED" ? "Đã huỷ" : "Đã đăng ký",
      att ? ATTENDANCE_STATUS_VI[att.status] ?? att.status : "Chưa điểm danh",
      att?.checkedAt ? formatDateTime(att.checkedAt) : "—",
      att?.note || r.note || "—",
    ];
  });

  const presentCount = attendances.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
  const activeRegCount = registrations.filter((r) => r.status === "REGISTERED").length;
  const sha256 = event.attendanceSignatureSha256?.trim();
  const lockStamp = event.attendanceLockedAt ? formatDateTime(event.attendanceLockedAt) : "Đã chốt";
  const verificationFooter = sha256
    ? `Chữ ký xác thực điện tử SHA-256 (${lockStamp}): ${sha256}`
    : undefined;

  if (mode === "csv") {
    const csvRows = sha256
      ? [...rows, [], ["Chữ ký xác thực SHA-256", sha256, "Thời điểm chốt sổ", lockStamp]]
      : rows;
    downloadExcelCsvFile(`diem-danh-${event.title}`, headers, csvRows);
  } else {
    openPrintableVjuReport({
      title: `BẢNG ĐIỂM DANH SỰ KIỆN: ${event.title}`,
      clubLabel: event.clubName,
      subtitle: `Thời gian: ${formatDateTime(event.startTime)} – ${formatDateTime(event.endTime)}${event.location ? ` · Địa điểm: ${event.location}` : ""}`,
      summaryLine: `Có mặt / Đi muộn: ${presentCount} / ${activeRegCount} nhân sự đăng ký hiệu lực`,
      verificationFooter,
      headers,
      rows,
    });
  }
  return rows.length;
}
