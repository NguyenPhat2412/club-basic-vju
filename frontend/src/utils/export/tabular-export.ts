import type { Page } from "@/types/common.types";

const FORMULA_TRIGGER_RE = /^[=+\-@\t\r]/;
const PLAIN_NEGATIVE_NUMBER_RE = /^-\d+(?:\.\d+)?$/;

export function escapeHtml(value: unknown): string {
  const str = value == null ? "" : String(value);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function neutralizeSpreadsheetFormula(raw: unknown): string {
  const str = raw == null ? "" : String(raw).replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const trimmed = str.trimStart();
  if (
    trimmed.length > 0 &&
    FORMULA_TRIGGER_RE.test(trimmed) &&
    !PLAIN_NEGATIVE_NUMBER_RE.test(trimmed)
  ) {
    return `'${str}`;
  }
  return str;
}

export function encodeCsvCell(raw: unknown): string {
  const safe = neutralizeSpreadsheetFormula(raw);
  if (/[",\n;]/.test(safe) || safe !== safe.trim()) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export function buildUtf8BomCsv(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(encodeCsvCell).join(",");
  const bodyLines = rows.map((row) => row.map(encodeCsvCell).join(","));
  return `\uFEFF${[headerLine, ...bodyLines].join("\r\n")}\r\n`;
}

export function sanitizeReportFileName(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, (m) => (m === "đ" ? "d" : "D"))
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || "vju-clubhub-report";
}

export function downloadExcelCsvFile(
  fileBaseName: string,
  headers: string[],
  rows: unknown[][]
): void {
  if (typeof window === "undefined") return;
  const csv = buildUtf8BomCsv(headers, rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `${sanitizeReportFileName(fileBaseName)}-${stamp}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 5_000);
}

export interface PrintableVjuReportSpec {
  title: string;
  clubLabel?: string;
  subtitle?: string;
  summaryLine?: string;
  headers: string[];
  rows: unknown[][];
}

export function buildPrintableVjuReportHtml(spec: PrintableVjuReportSpec): string {
  const exportedAt = new Date().toLocaleString("vi-VN");
  const thHtml = spec.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const trHtml = spec.rows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${escapeHtml(cell ?? "—")}</td>`).join("")}</tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(spec.title)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: rgb(15, 23, 42); margin: 0; padding: 16px; font-size: 12px; line-height: 1.45; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid rgb(153, 27, 27); padding-bottom: 10px; margin-bottom: 14px; }
    .org { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: rgb(71, 85, 105); font-weight: 700; }
    .club { font-size: 14px; font-weight: 700; color: rgb(153, 27, 27); margin-top: 2px; }
    .meta { text-align: right; font-size: 11px; color: rgb(71, 85, 105); }
    h1 { font-size: 18px; margin: 6px 0 4px; color: rgb(15, 23, 42); }
    .sub { font-size: 12px; color: rgb(71, 85, 105); margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th, td { border: 1px solid rgb(203, 213, 225); padding: 6px 8px; text-align: left; vertical-align: top; word-break: break-word; }
    th { background: rgb(248, 250, 252); font-weight: 700; font-size: 11px; text-transform: uppercase; color: rgb(51, 65, 85); }
    tr:nth-child(even) td { background: rgb(252, 252, 253); }
    .signatures { display: flex; justify-content: space-between; margin-top: 28px; padding: 0 24px; page-break-inside: avoid; }
    .sig-box { text-align: center; width: 220px; }
    .sig-title { font-weight: 700; font-size: 12px; }
    .sig-note { font-size: 11px; color: rgb(100, 116, 139); font-style: italic; margin-bottom: 52px; }
    @media print { .no-print { display: none; } body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="org">Trường Đại học Việt Nhật — ĐHQGHN · Hệ thống VJU ClubHub</div>
      ${spec.clubLabel ? `<div class="club">${escapeHtml(spec.clubLabel)}</div>` : ""}
    </div>
    <div class="meta">
      <div>Ngày xuất báo cáo: ${escapeHtml(exportedAt)}</div>
      <div>Tổng số dòng: <strong>${spec.rows.length}</strong></div>
    </div>
  </div>
  <h1>${escapeHtml(spec.title)}</h1>
  ${spec.subtitle ? `<div class="sub">${escapeHtml(spec.subtitle)}</div>` : ""}
  ${spec.summaryLine ? `<div class="sub"><strong>Tóm tắt:</strong> ${escapeHtml(spec.summaryLine)}</div>` : ""}
  <table>
    <thead><tr>${thHtml}</tr></thead>
    <tbody>${trHtml || `<tr><td colspan="${spec.headers.length}">Không có dữ liệu</td></tr>`}</tbody>
  </table>
  <div class="signatures">
    <div class="sig-box">
      <div class="sig-title">Người lập biểu / TM. Ban Chủ nhiệm CLB</div>
      <div class="sig-note">(Ký và ghi rõ họ tên)</div>
    </div>
    <div class="sig-box">
      <div class="sig-title">Xác nhận Phòng Công tác Sinh viên</div>
      <div class="sig-note">(Ký tên, đóng dấu)</div>
    </div>
  </div>
</body>
</html>`;
}

export function openPrintableVjuReport(spec: PrintableVjuReportSpec): boolean {
  if (typeof window === "undefined") return false;
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1080,height=760");
  if (!popup) return false;
  popup.document.open();
  popup.document.write(buildPrintableVjuReportHtml(spec));
  popup.document.close();
  popup.focus();
  setTimeout(() => {
    try {
      popup.print();
    } catch {
      // User can trigger print manually inside preview tab
    }
  }, 250);
  return true;
}

export async function fetchAllFilteredPages<T>(
  fetchPage: (offset: number, limit: number) => Promise<Page<T>>,
  maxItems = 2_000
): Promise<T[]> {
  const pageSize = 100;
  const collected: T[] = [];
  let offset = 0;
  while (offset < maxItems) {
    const page = await fetchPage(offset, pageSize);
    collected.push(...page.items);
    if (page.items.length < pageSize || collected.length >= page.total) {
      break;
    }
    offset += pageSize;
  }
  return collected.slice(0, maxItems);
}
