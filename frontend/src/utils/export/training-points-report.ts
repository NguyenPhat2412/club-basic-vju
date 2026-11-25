import type {
  StudentTrainingPointItem,
  TrainingPointReportResponse,
} from "@/types/statistics/statistics.types";
import {
  buildPrintableVjuReportHtml,
  buildUtf8BomCsv,
  downloadExcelCsvFile,
  escapeHtml,
  type PrintableVjuReportSpec,
} from "@/utils/export/tabular-export";

function hanoiYearMonth(now: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "numeric",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value ?? now.getUTCFullYear());
  const month = Number(parts.find((p) => p.type === "month")?.value ?? now.getUTCMonth() + 1);
  return { year, month };
}

export function deriveAcademicTerm(now = new Date()): string {
  const { year, month } = hanoiYearMonth(now);
  if (month >= 9) return `${year}-1`;
  if (month <= 5) return `${year - 1}-2`;
  return `${year - 1}-3`;
}

export function buildAcademicTermOptions(now = new Date()): string[] {
  const { year, month } = hanoiYearMonth(now);
  const currentStartYear = month >= 9 ? year : year - 1;
  const options: string[] = [];
  for (let y = currentStartYear; y >= currentStartYear - 2; y -= 1) {
    options.push(`${y}-1`, `${y}-2`, `${y}-3`);
  }
  return options;
}

export type GanttTimeScale = "week" | "month" | "term";

export function computeGanttWindow(
  anchor: Date,
  scale: GanttTimeScale
): { start: Date; end: Date; ticks: Date[] } {
  const base = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate());
  if (scale === "week") {
    const start = new Date(base);
    start.setDate(base.getDate() - ((base.getDay() + 6) % 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    const ticks = Array.from(
      { length: 7 },
      (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    );
    return { start, end, ticks };
  }
  if (scale === "month") {
    const start = new Date(base.getFullYear(), base.getMonth(), 1);
    const end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
    const ticks: Date[] = [];
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 7)) ticks.push(new Date(d));
    return { start, end, ticks };
  }
  const month = base.getMonth() + 1;
  const termStartMonth = month >= 9 ? 8 : month <= 5 ? 0 : 5;
  const spanMonths = month >= 9 ? 4 : month <= 5 ? 5 : 3;
  const start = new Date(base.getFullYear(), termStartMonth, 1);
  const end = new Date(base.getFullYear(), termStartMonth + spanMonths, 1);
  const ticks = Array.from(
    { length: spanMonths },
    (_, i) => new Date(base.getFullYear(), termStartMonth + i, 1)
  );
  return { start, end, ticks };
}

export function shiftGanttAnchor(anchor: Date, scale: GanttTimeScale, dir: -1 | 1): Date {
  if (scale === "week") {
    const next = new Date(anchor);
    next.setDate(next.getDate() + dir * 7);
    return next;
  }
  if (scale === "month") {
    return new Date(anchor.getFullYear(), anchor.getMonth() + dir, 1);
  }
  const year = anchor.getFullYear();
  const month = anchor.getMonth() + 1;
  if (month >= 9) {
    return dir > 0 ? new Date(year + 1, 0, 1) : new Date(year, 5, 1);
  }
  if (month <= 5) {
    return dir > 0 ? new Date(year, 5, 1) : new Date(year - 1, 8, 1);
  }
  return dir > 0 ? new Date(year, 8, 1) : new Date(year, 0, 1);
}

export function computeGanttBarGeometry(
  windowStart: Date | number,
  windowEnd: Date | number,
  eventStart: string | Date | number,
  eventEnd: string | Date | number
): { leftPct: number; widthPct: number } {
  const winStartMs = typeof windowStart === "number" ? windowStart : windowStart.getTime();
  const winEndMs = typeof windowEnd === "number" ? windowEnd : windowEnd.getTime();
  const spanMs = Math.max(1, winEndMs - winStartMs);
  const rawEvStartMs = typeof eventStart === "number" ? eventStart : new Date(eventStart).getTime();
  const rawEvEndMs = typeof eventEnd === "number" ? eventEnd : new Date(eventEnd).getTime();

  const evStart = Math.min(winEndMs, Math.max(winStartMs, Number.isFinite(rawEvStartMs) ? rawEvStartMs : winStartMs));
  const evEnd = Math.min(winEndMs, Math.max(evStart, Number.isFinite(rawEvEndMs) ? rawEvEndMs : evStart));

  const rawLeft = ((evStart - winStartMs) / spanMs) * 100;
  const rawWidth = ((evEnd - evStart) / spanMs) * 100;

  const leftPct = Math.min(94, Math.max(0, rawLeft));
  const widthPct = Math.min(100 - leftPct, Math.max(6, rawWidth));
  return { leftPct, widthPct };
}

export function extractItemSignatures(item: StudentTrainingPointItem): string[] {
  const seen = new Set<string>();
  for (const sig of item.attendanceSignatures ?? []) {
    const trimmed = sig?.trim();
    if (trimmed) seen.add(trimmed);
  }
  for (const ev of item.attendedEvents ?? []) {
    const trimmed = ev.attendanceSignatureSha256?.trim();
    if (trimmed) seen.add(trimmed);
  }
  return Array.from(seen);
}

export function collectReportSignatures(report: TrainingPointReportResponse): string[] {
  const seen = new Set<string>();
  const topSig = report.attendanceSignatureSha256?.trim();
  if (topSig) seen.add(topSig);
  for (const item of report.items) {
    for (const sig of extractItemSignatures(item)) {
      seen.add(sig);
    }
  }
  return Array.from(seen);
}

function formatIsoDay(iso?: string | null): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso.slice(0, 10);
  return parsed.toLocaleDateString("sv-SE");
}

function formatAttendedEvidence(item: StudentTrainingPointItem): string {
  if (item.attendedEvents && item.attendedEvents.length > 0) {
    return item.attendedEvents
      .map((ev) => {
        const term = ev.academicTerm ? ` [${ev.academicTerm}]` : "";
        const status = ev.attendanceStatus === "LATE" ? " (Đi muộn)" : "";
        return `${ev.title}${term}${status}`;
      })
      .join("; ");
  }
  return item.attendedEventTitles.length ? item.attendedEventTitles.join("; ") : "—";
}

export function buildTrainingPointsReportSpec(
  report: TrainingPointReportResponse
): PrintableVjuReportSpec {
  const signatures = collectReportSignatures(report);
  const headers = [
    "STT",
    "Họ và tên",
    "Mã sinh viên",
    "Email",
    "CLB tham gia",
    "Số sự kiện có mặt",
    "Danh sách sự kiện minh chứng",
    "Mã xác thực SHA-256",
  ];
  const rows = report.items.map((item, idx) => {
    const itemSigs = extractItemSignatures(item);
    return [
      idx + 1,
      item.fullName,
      item.studentCode || "—",
      item.email,
      item.activeClubs.length ? item.activeClubs.join(", ") : "—",
      item.presentEventCount,
      formatAttendedEvidence(item),
      itemSigs.length ? itemSigs.join("; ") : "—",
    ];
  });

  const periodParts = [
    `Học kỳ: ${report.academicTerm || "Tất cả học kỳ"}`,
    report.from ? `Từ ngày: ${formatIsoDay(report.from)}` : "",
    report.to ? `Đến ngày: ${formatIsoDay(report.to)}` : "",
  ].filter(Boolean);

  const summaryParts = [
    `Tổng sinh viên: ${report.totalStudents}`,
    `Tổng lượt có mặt: ${report.totalPresentCheckIns}`,
    signatures.length ? `Chứng thực khoá sổ SHA-256: ${signatures.join(", ")}` : "",
  ].filter(Boolean);

  return {
    title: "BÁO CÁO TỔNG HỢP MINH CHỨNG ĐIỂM RÈN LUYỆN",
    clubLabel: report.clubName || "Tất cả CLB / Đơn vị",
    subtitle: periodParts.join(" · "),
    summaryLine: summaryParts.join(" · "),
    headers,
    rows,
  };
}

export function buildTrainingPointsCsv(report: TrainingPointReportResponse): string {
  const spec = buildTrainingPointsReportSpec(report);
  return buildUtf8BomCsv(spec.headers, spec.rows);
}

export function buildTrainingPointsPrintableHtml(report: TrainingPointReportResponse): string {
  const spec = buildTrainingPointsReportSpec(report);
  const baseHtml = buildPrintableVjuReportHtml(spec);
  const signatures = collectReportSignatures(report);
  if (!signatures.length) {
    return baseHtml;
  }
  const verificationFooter = `<div class="sub" style="margin-top:12px;"><strong>Chứng thực khoá sổ điện tử (SHA-256):</strong> <code>${escapeHtml(signatures.join(" · "))}</code></div>`;
  return baseHtml.replace("</body>", `  ${verificationFooter}\n</body>`);
}

export function exportTrainingPointsReport(
  mode: "csv" | "pdf",
  report: TrainingPointReportResponse
): number {
  const spec = buildTrainingPointsReportSpec(report);
  const termSlug = report.academicTerm ? `-${report.academicTerm}` : "";
  const fileBaseName = `bao-cao-diem-ren-luyen${termSlug}`;

  if (mode === "csv") {
    downloadExcelCsvFile(fileBaseName, spec.headers, spec.rows);
    return report.items.length;
  }

  if (typeof window === "undefined") return 0;
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1080,height=760");
  if (!popup) {
    throw new Error("Trình duyệt đang chặn cửa sổ bật lên. Vui lòng cho phép pop-up để in hoặc lưu PDF.");
  }
  popup.document.open();
  popup.document.write(buildTrainingPointsPrintableHtml(report));
  popup.document.close();
  popup.focus();
  setTimeout(() => {
    try {
      popup.print();
    } catch {
      // User can trigger print manually inside preview tab
    }
  }, 250);
  return report.items.length;
}
