import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildPrintableVjuReportHtml,
  buildUtf8BomCsv,
  fetchAllFilteredPages,
  neutralizeSpreadsheetFormula,
  sanitizeReportFileName,
} from "@/utils/export/tabular-export";

test("buildUtf8BomCsv prepends UTF-8 BOM, quotes RFC-4180 cells, and neutralizes Excel formula injection", () => {
  assert.equal(neutralizeSpreadsheetFormula("=CMD|' /C calc'!A0"), "'=CMD|' /C calc'!A0");
  assert.equal(neutralizeSpreadsheetFormula("+SUM(A1:A5)"), "'+SUM(A1:A5)");
  assert.equal(neutralizeSpreadsheetFormula("@IMPORTXML(A1,B1)"), "'@IMPORTXML(A1,B1)");
  assert.equal(neutralizeSpreadsheetFormula("  -HYPERLINK(\"http://evil\")"), "'  -HYPERLINK(\"http://evil\")");
  assert.equal(neutralizeSpreadsheetFormula("-12.5"), "-12.5");
  assert.equal(neutralizeSpreadsheetFormula("Nguyễn Văn A"), "Nguyễn Văn A");

  const csv = buildUtf8BomCsv(
    ["STT", "Họ và tên", "Ghi chú"],
    [
      [1, "Trần Thị Minh, Ánh", '=HYPERLINK("https://evil.test")'],
      [2, "山田 太郎", 'Bản "chính thức"\ndòng 2'],
    ]
  );
  assert.ok(csv.startsWith("\uFEFFSTT,Họ và tên,Ghi chú\r\n"));
  assert.ok(csv.includes('1,"Trần Thị Minh, Ánh","\'=HYPERLINK(""https://evil.test"")"'));
  assert.ok(csv.includes('2,山田 太郎,"Bản ""chính thức""\ndòng 2"'));
});

test("buildPrintableVjuReportHtml escapes XSS payloads and renders VJU signature blocks", () => {
  const html = buildPrintableVjuReportHtml({
    title: "BẢNG ĐIỂM DANH <script>alert(1)</script>",
    clubLabel: "VJUA · CLB Công nghệ",
    summaryLine: "Có mặt: 15/18",
    headers: ["Họ tên", "Ghi chú"],
    rows: [["Nguyễn An", "<img src=x onerror=alert(1)>"]],
  });
  assert.ok(!html.includes("<script>alert(1)</script>"));
  assert.ok(!html.includes("<img src=x onerror=alert(1)>"));
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.ok(html.includes("&lt;img src=x onerror=alert(1)&gt;"));
  assert.ok(html.includes("Trường Đại học Việt Nhật — ĐHQGHN"));
  assert.ok(html.includes("Xác nhận Phòng Công tác Sinh viên"));
});

test("fetchAllFilteredPages paginates until total and sanitizeReportFileName normalizes Vietnamese diacritics", async () => {
  assert.equal(sanitizeReportFileName("Điểm danh: Sự kiện Đón Tân Sinh Viên!"), "Diem-danh-Su-kien-Don-Tan-Sinh-Vien");
  const pages = await fetchAllFilteredPages(async (offset, limit) => {
    const all = Array.from({ length: 235 }, (_, i) => i + 1);
    return {
      items: all.slice(offset, offset + limit),
      total: all.length,
      offset,
      limit,
    };
  });
  assert.equal(pages.length, 235);
  assert.equal(pages[0], 1);
  assert.equal(pages[234], 235);
});

test("all export modules and wired views stay under 400 lines", () => {
  const files = [
    "src/utils/export/tabular-export.ts",
    "src/utils/export/club-reports.ts",
    "src/components/shared/ExportReportMenu.tsx",
    "src/components/management/ClubMembersTab.tsx",
    "src/components/application/ClubApplicationsTab.tsx",
    "src/components/application/ApplicationDetailDrawer.tsx",
    "src/components/event/EventAttendanceDrawer.tsx",
  ];
  for (const rel of files) {
    const lines = fs.readFileSync(path.join(process.cwd(), rel), "utf8").split("\n").length;
    assert.ok(lines < 400, `${rel} has ${lines} lines (must be < 400)`);
  }
});
