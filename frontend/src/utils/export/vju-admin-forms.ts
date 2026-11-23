import { escapeHtml } from "@/utils/export/tabular-export";

export type VjuAdminFormTemplateKey =
  | "ROOM_FACILITY_REQUEST"
  | "EVENT_APPROVAL_REQUEST"
  | "EVENT_OPERATION_PLAN";

export interface VjuAdminFormTemplate {
  key: VjuAdminFormTemplateKey;
  code: string;
  title: string;
  shortLabel: string;
  recipient: string;
  summary: string;
}

export interface VjuAdminFormInput {
  clubName: string;
  clubCode?: string;
  eventTitle: string;
  departmentName?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  expectedParticipants?: number | string;
  description?: string;
  requesterName?: string;
  requesterStudentCode?: string;
  requesterEmail?: string;
  issuedDate?: Date | string;
}

export const VJU_ADMIN_FORM_TEMPLATES: readonly VjuAdminFormTemplate[] = [
  {
    key: "ROOM_FACILITY_REQUEST",
    code: "BM-VJU-01",
    title: "Đơn xin mượn phòng học & cơ sở vật chất VJU",
    shortLabel: "Đơn mượn phòng / CSVC",
    recipient: "Phòng Công tác Sinh viên & Quản trị Cơ sở vật chất — Trường Đại học Việt Nhật",
    summary: "Đăng ký sử dụng phòng học, hội trường, máy chiếu và trang thiết bị tại cơ sở Mỹ Đình / Hòa Lạc.",
  },
  {
    key: "EVENT_APPROVAL_REQUEST",
    code: "BM-VJU-02",
    title: "Đơn xin phép tổ chức sự kiện CLB VJU",
    shortLabel: "Đơn xin phép sự kiện",
    recipient: "Ban Giám hiệu, Đoàn Thanh niên & Phòng Công tác Sinh viên — Trường Đại học Việt Nhật",
    summary: "Trình phê duyệt chủ trương, thời gian, quy mô và cam kết an toàn tổ chức hoạt động CLB.",
  },
  {
    key: "EVENT_OPERATION_PLAN",
    code: "BM-VJU-03",
    title: "Kế hoạch tổ chức hoạt động / sự kiện CLB",
    shortLabel: "Kế hoạch tổ chức",
    recipient: "Đoàn Thanh niên & Phòng Công tác Sinh viên — Trường Đại học Việt Nhật",
    summary: "Bản kế hoạch chi tiết mục tiêu, nội dung chương trình, quy mô nhân sự và phân công điều phối.",
  },
] as const;

export function getVjuAdminFormTemplate(key: VjuAdminFormTemplateKey): VjuAdminFormTemplate {
  return VJU_ADMIN_FORM_TEMPLATES.find((t) => t.key === key) ?? VJU_ADMIN_FORM_TEMPLATES[0];
}

function formatViDateTime(raw?: string): string {
  if (!raw?.trim()) return "Chưa xác định";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw.trim();
  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  const hh = String(parsed.getHours()).padStart(2, "0");
  const min = String(parsed.getMinutes()).padStart(2, "0");
  return `${hh}:${min}, ngày ${dd}/${mm}/${yyyy}`;
}

function formatIssuedDateLine(issuedDate?: Date | string): string {
  const date = issuedDate instanceof Date ? issuedDate : issuedDate ? new Date(issuedDate) : new Date();
  const valid = Number.isNaN(date.getTime()) ? new Date() : date;
  const dd = String(valid.getDate()).padStart(2, "0");
  const mm = String(valid.getMonth() + 1).padStart(2, "0");
  const yyyy = valid.getFullYear();
  return `Hà Nội, ngày ${dd} tháng ${mm} năm ${yyyy}`;
}

function formatParticipants(value?: number | string): string {
  if (value === undefined || value === null || String(value).trim() === "") {
    return "Chưa cập nhật";
  }
  return typeof value === "number" ? `${value} sinh viên / người tham dự` : String(value).trim();
}

function renderTemplateSpecificBody(
  templateKey: VjuAdminFormTemplateKey,
  safe: {
    clubDisplay: string;
    eventTitle: string;
    departmentName: string;
    timeRange: string;
    location: string;
    participants: string;
    description: string;
  }
): string {
  if (templateKey === "ROOM_FACILITY_REQUEST") {
    return `
      <section class="block">
        <h2>II. Đề xuất phòng học &amp; cơ sở vật chất</h2>
        <table>
          <thead>
            <tr>
              <th style="width: 34%">Hạng mục đăng ký</th>
              <th>Thông tin chi tiết (tự động điền từ sự kiện)</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Tên hoạt động / sự kiện</strong></td><td>${safe.eventTitle}</td></tr>
            <tr><td><strong>Địa điểm / Phòng đề xuất</strong></td><td>${safe.location}</td></tr>
            <tr><td><strong>Thời gian sử dụng</strong></td><td>${safe.timeRange}</td></tr>
            <tr><td><strong>Số lượng người tham dự dự kiến</strong></td><td>${safe.participants}</td></tr>
            <tr><td><strong>Trang thiết bị đi kèm</strong></td><td>Hệ thống âm thanh, micro, máy chiếu / màn hình trình chiếu, bàn ghế check-in và nguồn điện tiêu chuẩn.</td></tr>
          </tbody>
        </table>
        <p class="commitment">
          Ban Chủ nhiệm ${safe.clubDisplay} cam kết sử dụng phòng học và trang thiết bị đúng mục đích, giữ gìn vệ sinh,
          tuân thủ quy định an toàn phòng cháy chữa cháy và bàn giao nguyên trạng cơ sở vật chất cho Nhà trường sau khi kết thúc.
        </p>
      </section>`;
  }

  if (templateKey === "EVENT_APPROVAL_REQUEST") {
    return `
      <section class="block">
        <h2>II. Nội dung đề nghị phê duyệt tổ chức sự kiện</h2>
        <table>
          <tbody>
            <tr><td style="width: 34%"><strong>Tên sự kiện</strong></td><td>${safe.eventTitle}</td></tr>
            <tr><td><strong>Đơn vị chủ trì / phụ trách</strong></td><td>${safe.clubDisplay} · ${safe.departmentName}</td></tr>
            <tr><td><strong>Thời gian tổ chức</strong></td><td>${safe.timeRange}</td></tr>
            <tr><td><strong>Địa điểm dự kiến</strong></td><td>${safe.location}</td></tr>
            <tr><td><strong>Quy mô dự kiến</strong></td><td>${safe.participants}</td></tr>
            <tr><td><strong>Mục đích &amp; mô tả nội dung</strong></td><td>${safe.description}</td></tr>
          </tbody>
        </table>
        <p class="commitment">
          Câu lạc bộ cam kết tổ chức hoạt động đúng nội dung đã đăng ký, đảm bảo an ninh trật tự, nếp sống văn minh học đường
          và gửi báo cáo tổng kết kèm danh sách điểm danh cho Phòng Công tác Sinh viên ngay sau khi sự kiện kết thúc.
        </p>
      </section>`;
  }

  return `
    <section class="block">
      <h2>II. Kế hoạch triển khai chi tiết</h2>
      <table>
        <tbody>
          <tr><td style="width: 34%"><strong>Tên hoạt động / sự kiện</strong></td><td>${safe.eventTitle}</td></tr>
          <tr><td><strong>Ban / Tiểu ban phụ trách</strong></td><td>${safe.departmentName} (${safe.clubDisplay})</td></tr>
          <tr><td><strong>Thời gian thực hiện</strong></td><td>${safe.timeRange}</td></tr>
          <tr><td><strong>Địa điểm triển khai</strong></td><td>${safe.location}</td></tr>
          <tr><td><strong>Quy mô tham dự dự kiến</strong></td><td>${safe.participants}</td></tr>
          <tr><td><strong>Mục tiêu &amp; nội dung chính</strong></td><td>${safe.description}</td></tr>
        </tbody>
      </table>
      <h2>III. Tiến độ chuẩn bị &amp; phân công điều phối</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 10%">STT</th>
            <th style="width: 32%">Giai đoạn</th>
            <th>Nội dung công việc chính</th>
            <th style="width: 24%">Đơn vị phụ trách</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>1</td><td>Chuẩn bị hồ sơ &amp; địa điểm</td><td>Hoàn thiện đơn xin phép, đăng ký phòng học/CSVC và duyệt kịch bản chương trình.</td><td>Ban Chủ nhiệm CLB</td></tr>
          <tr><td>2</td><td>Truyền thông &amp; đăng ký</td><td>Mở đăng ký trên VJU ClubHub, tổng hợp danh sách sinh viên tham gia và phân công nhân sự.</td><td>${safe.departmentName}</td></tr>
          <tr><td>3</td><td>Tổ chức &amp; điểm danh</td><td>Điều phối chương trình, điểm danh người tham dự bằng QR/VJU ClubHub, đảm bảo an toàn.</td><td>Ban Tổ chức sự kiện</td></tr>
          <tr><td>4</td><td>Tổng kết &amp; lưu trữ</td><td>Xuất báo cáo điểm danh, quyết toán kinh phí (nếu có) và lưu hồ sơ vào Kho lưu trữ CLB.</td><td>Ban Chủ nhiệm CLB</td></tr>
        </tbody>
      </table>
    </section>`;
}

export function buildVjuAdminFormHtml(
  templateKey: VjuAdminFormTemplateKey,
  input: VjuAdminFormInput
): string {
  const template = getVjuAdminFormTemplate(templateKey);
  const clubName = input.clubName.trim() || "Câu lạc bộ sinh viên VJU";
  const clubCode = input.clubCode?.trim() || "";
  const clubDisplayRaw = clubCode ? `${clubName} (${clubCode})` : clubName;
  const startLabel = formatViDateTime(input.startTime);
  const endLabel = formatViDateTime(input.endTime);
  const timeRangeRaw = input.endTime ? `Từ ${startLabel} đến ${endLabel}` : startLabel;

  const safe = {
    templateCode: escapeHtml(template.code),
    templateTitle: escapeHtml(template.title),
    templateTitleUpper: escapeHtml(template.title.toUpperCase()),
    recipient: escapeHtml(template.recipient),
    issuedDateLine: escapeHtml(formatIssuedDateLine(input.issuedDate)),
    clubName: escapeHtml(clubName),
    clubCode: escapeHtml(clubCode || "—"),
    clubDisplay: escapeHtml(clubDisplayRaw),
    eventTitle: escapeHtml(input.eventTitle.trim() || "Sự kiện CLB"),
    departmentName: escapeHtml(input.departmentName?.trim() || "Ban Chủ nhiệm CLB"),
    timeRange: escapeHtml(timeRangeRaw),
    location: escapeHtml(input.location?.trim() || "Cơ sở Trường Đại học Việt Nhật"),
    participants: escapeHtml(formatParticipants(input.expectedParticipants)),
    description: escapeHtml(input.description?.trim() || "Theo chương trình hoạt động học kỳ đã được Ban Chủ nhiệm CLB thông qua."),
    requesterName: escapeHtml(input.requesterName?.trim() || "................................................"),
    requesterStudentCode: escapeHtml(input.requesterStudentCode?.trim() || "...................."),
    requesterEmail: escapeHtml(input.requesterEmail?.trim() || "...................."),
  };

  const specificBody = renderTemplateSpecificBody(template.key, safe);

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${safe.templateTitle} - ${safe.eventTitle}</title>
  <style>
    @page { size: A4 portrait; margin: 16mm 16mm 18mm 18mm; }
    * { box-sizing: border-box; }
    body { font-family: "Times New Roman", Georgia, serif; color: rgb(15, 23, 42); margin: 0; padding: 18px; font-size: 13px; line-height: 1.5; background: rgb(255, 255, 255); }
    .national-header { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 14px; border-bottom: 1.5px solid rgb(153, 27, 27); padding-bottom: 10px; }
    .header-col { width: 48%; text-align: center; }
    .org-top { font-size: 11px; text-transform: uppercase; letter-spacing: 0.03em; color: rgb(51, 65, 85); }
    .org-main { font-size: 12px; font-weight: 700; text-transform: uppercase; color: rgb(153, 27, 27); margin-top: 2px; }
    .org-club { font-size: 11.5px; font-weight: 700; margin-top: 3px; color: rgb(15, 23, 42); }
    .motto { font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .sub-motto { font-size: 12px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; margin-top: 2px; }
    .date-line { font-size: 11.5px; font-style: italic; margin-top: 6px; color: rgb(51, 65, 85); }
    .form-code { text-align: right; font-size: 10.5px; color: rgb(100, 116, 139); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; margin-bottom: 4px; }
    h1 { text-align: center; font-size: 16px; font-weight: 700; margin: 8px 0 6px; color: rgb(15, 23, 42); letter-spacing: 0.02em; }
    .recipient { text-align: center; font-size: 12.5px; margin: 0 0 14px; }
    .block { margin-bottom: 14px; }
    h2 { font-size: 13px; font-weight: 700; color: rgb(153, 27, 27); margin: 12px 0 6px; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th, td { border: 1px solid rgb(148, 163, 184); padding: 6px 8px; text-align: left; vertical-align: top; word-break: break-word; }
    th { background: rgb(248, 250, 252); font-weight: 700; font-size: 12px; }
    .commitment { margin: 10px 0 0; text-align: justify; }
    .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 24px; page-break-inside: avoid; }
    .sig-box { text-align: center; }
    .sig-title { font-weight: 700; font-size: 12px; text-transform: uppercase; }
    .sig-sub { font-size: 11px; font-style: italic; color: rgb(71, 85, 105); margin-top: 2px; margin-bottom: 58px; }
    .sig-name { font-size: 12px; font-weight: 700; }
    .footer-note { margin-top: 18px; border-top: 1px dashed rgb(203, 213, 225); padding-top: 6px; font-size: 10.5px; color: rgb(100, 116, 139); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; display: flex; justify-content: space-between; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="form-code">Mã biểu mẫu: ${safe.templateCode} · Khởi tạo từ hệ thống VJU ClubHub</div>
  <div class="national-header">
    <div class="header-col">
      <div class="org-top">ĐẠI HỌC QUỐC GIA HÀ NỘI</div>
      <div class="org-main">TRƯỜNG ĐẠI HỌC VIỆT NHẬT</div>
      <div class="org-club">${safe.clubDisplay}</div>
    </div>
    <div class="header-col">
      <div class="motto">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="sub-motto">Độc lập - Tự do - Hạnh phúc</div>
      <div class="date-line">${safe.issuedDateLine}</div>
    </div>
  </div>

  <h1>${safe.templateTitleUpper}</h1>
  <p class="recipient"><strong>Kính gửi:</strong> ${safe.recipient}</p>

  <section class="block">
    <h2>I. Thông tin đơn vị &amp; người đại diện đề xuất</h2>
    <table>
      <tbody>
        <tr><td style="width: 34%"><strong>Câu lạc bộ / Đơn vị</strong></td><td>${safe.clubName} (Mã CLB: ${safe.clubCode})</td></tr>
        <tr><td><strong>Ban chuyên môn phụ trách</strong></td><td>${safe.departmentName}</td></tr>
        <tr><td><strong>Họ và tên người đại diện</strong></td><td>${safe.requesterName}</td></tr>
        <tr><td><strong>Mã sinh viên / Liên hệ</strong></td><td>MSV: ${safe.requesterStudentCode} · Email: ${safe.requesterEmail}</td></tr>
      </tbody>
    </table>
  </section>

  ${specificBody}

  <div class="signatures">
    <div class="sig-box">
      <div class="sig-title">Chủ nhiệm CLB</div>
      <div class="sig-sub">(Ký, ghi rõ họ tên)</div>
      <div class="sig-name">${safe.requesterName}</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Đoàn Thanh niên VJU</div>
      <div class="sig-sub">(Xác nhận, ký và ghi rõ họ tên)</div>
      <div class="sig-name">&nbsp;</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Phòng CTSV / Hành chính</div>
      <div class="sig-sub">(Phê duyệt, ký tên và đóng dấu)</div>
      <div class="sig-name">&nbsp;</div>
    </div>
  </div>

  <div class="footer-note">
    <span>Trường Đại học Việt Nhật — ĐHQGHN (VJU ClubHub)</span>
    <span>Biểu mẫu chuẩn hành chính · ${safe.templateCode}</span>
  </div>
</body>
</html>`;
}

export function openPrintableVjuAdminForm(
  templateKey: VjuAdminFormTemplateKey,
  input: VjuAdminFormInput
): boolean {
  if (typeof window === "undefined") return false;
  const popup = window.open("", "_blank", "noopener,noreferrer,width=920,height=780");
  if (!popup) return false;
  popup.document.open();
  popup.document.write(buildVjuAdminFormHtml(templateKey, input));
  popup.document.close();
  popup.focus();
  setTimeout(() => {
    try {
      popup.print();
    } catch {
      // User can trigger print manually inside the opened A4 preview tab
    }
  }, 250);
  return true;
}
