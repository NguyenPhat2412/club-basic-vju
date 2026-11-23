import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CLUB_CATEGORY_PRESETS,
  collectDocumentCategoryOptions,
  DOCUMENT_CATEGORY_LABELS,
  formatDocumentCategoryLabel,
} from "@/forms/document/document-filter-meta";
import {
  buildVjuAdminFormHtml,
  VJU_ADMIN_FORM_TEMPLATES,
  type VjuAdminFormInput,
} from "@/utils/export/vju-admin-forms";

const SAMPLE_INPUT: VjuAdminFormInput = {
  clubName: "Câu lạc bộ Công nghệ Thông tin VJU",
  clubCode: "VJU-IT",
  eventTitle: "Workshop Xây dựng Hệ thống Cloud VJU 2026",
  departmentName: "Ban Chuyên môn Kỹ thuật",
  startTime: "2026-12-05T08:30:00+07:00",
  endTime: "2026-12-05T11:30:00+07:00",
  location: "Hội trường 401 - Cơ sở Mỹ Đình",
  expectedParticipants: 85,
  description: "Chia sẻ kinh nghiệm triển khai ứng dụng thực tế cho sinh viên toàn trường.",
  requesterName: "Nguyễn Minh Quân",
  requesterStudentCode: "23110042",
  requesterEmail: "23110042@st.vju.ac.vn",
  issuedDate: "2026-11-22T09:00:00+07:00",
};

test("VJU_ADMIN_FORM_TEMPLATES provides all 3 official templates and pre-fills event fields with formal VJU signatures", () => {
  assert.equal(VJU_ADMIN_FORM_TEMPLATES.length, 3);
  assert.deepEqual(
    VJU_ADMIN_FORM_TEMPLATES.map((t) => t.key),
    ["ROOM_FACILITY_REQUEST", "EVENT_APPROVAL_REQUEST", "EVENT_OPERATION_PLAN"]
  );
  assert.equal(VJU_ADMIN_FORM_TEMPLATES[0].title, "Đơn xin mượn phòng học & cơ sở vật chất VJU");
  assert.equal(VJU_ADMIN_FORM_TEMPLATES[1].title, "Đơn xin phép tổ chức sự kiện CLB VJU");
  assert.equal(VJU_ADMIN_FORM_TEMPLATES[2].title, "Kế hoạch tổ chức hoạt động / sự kiện CLB");

  for (const tpl of VJU_ADMIN_FORM_TEMPLATES) {
    const html = buildVjuAdminFormHtml(tpl.key, SAMPLE_INPUT);
    assert.ok(html.includes("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"), `${tpl.key} missing Quốc hiệu`);
    assert.ok(html.includes("TRƯỜNG ĐẠI HỌC VIỆT NHẬT"), `${tpl.key} missing VJU header`);
    assert.ok(html.includes(SAMPLE_INPUT.clubName), `${tpl.key} missing clubName`);
    assert.ok(html.includes(SAMPLE_INPUT.clubCode!), `${tpl.key} missing clubCode`);
    assert.ok(html.includes(SAMPLE_INPUT.eventTitle), `${tpl.key} missing eventTitle`);
    assert.ok(html.includes(SAMPLE_INPUT.departmentName!), `${tpl.key} missing departmentName`);
    assert.ok(html.includes(SAMPLE_INPUT.location!), `${tpl.key} missing location`);
    assert.ok(html.includes("85 sinh viên / người tham dự"), `${tpl.key} missing expectedParticipants`);
    assert.ok(html.includes(SAMPLE_INPUT.requesterName!), `${tpl.key} missing requesterName`);
    assert.ok(html.includes(SAMPLE_INPUT.requesterStudentCode!), `${tpl.key} missing requesterStudentCode`);
    assert.ok(html.includes(SAMPLE_INPUT.requesterEmail!), `${tpl.key} missing requesterEmail`);
    assert.ok(html.includes("05/12/2026"), `${tpl.key} missing formatted event date`);
    assert.ok(html.includes("Chủ nhiệm CLB"), `${tpl.key} missing Chủ nhiệm CLB signature`);
    assert.ok(html.includes("Đoàn Thanh niên VJU"), `${tpl.key} missing Đoàn Thanh niên VJU signature`);
    assert.ok(html.includes("Phòng CTSV / Hành chính"), `${tpl.key} missing Phòng CTSV signature`);
  }
});

test("buildVjuAdminFormHtml strictly HTML-escapes XSS payloads in all interpolated fields", () => {
  const xssInput: VjuAdminFormInput = {
    clubName: `CLB <script>alert("club")</script>`,
    clubCode: `CODE"><svg onload=alert(1)>`,
    eventTitle: `Workshop <img src=x onerror=alert('xss')>`,
    departmentName: `Ban <b>"Hậu cần"</b>`,
    startTime: "2026-12-05T08:30:00+07:00",
    endTime: "2026-12-05T11:30:00+07:00",
    location: `Phòng 401 <iframe src="javascript:alert(1)"></iframe>`,
    expectedParticipants: `50 <script>evil()</script>`,
    description: `Mô tả 'nhạy cảm' & <img src=x onerror=fetch('//evil.test')>`,
    requesterName: `Trần <script>steal()</script>`,
    requesterStudentCode: `2311<bad>`,
    requesterEmail: `a"b@vju.ac.vn`,
  };

  for (const tpl of VJU_ADMIN_FORM_TEMPLATES) {
    const html = buildVjuAdminFormHtml(tpl.key, xssInput);
    assert.equal(html.includes("<script>"), false, `${tpl.key} leaked raw <script> tag`);
    assert.equal(html.includes("<img "), false, `${tpl.key} leaked raw <img> tag`);
    assert.equal(html.includes("<iframe"), false, `${tpl.key} leaked raw <iframe> tag`);
    assert.equal(html.includes("<svg"), false, `${tpl.key} leaked raw <svg> tag`);
    assert.ok(html.includes("&lt;script&gt;alert(&quot;club&quot;)&lt;/script&gt;"));
    assert.ok(html.includes("&lt;img src=x onerror=alert(&#39;xss&#39;)&gt;"));
    assert.ok(html.includes("&lt;iframe src=&quot;javascript:alert(1)&quot;&gt;&lt;/iframe&gt;"));
  }
});

test("PB-77 BCN fund category and unmistakable OFFICERS security classification labels are wired", () => {
  assert.equal(DOCUMENT_CATEGORY_LABELS["finance.fund"], "Sổ quỹ & Kinh phí (BCN)");
  assert.equal(formatDocumentCategoryLabel("finance.fund"), "Sổ quỹ & Kinh phí (BCN)");
  assert.ok(CLUB_CATEGORY_PRESETS.some((p) => p.value === "finance.fund" && p.label === "Sổ quỹ & Kinh phí (BCN)"));

  const clubOptions = collectDocumentCategoryOptions([], "", false);
  assert.ok(clubOptions.some((o) => o.value === "finance.fund" && o.label === "Sổ quỹ & Kinh phí (BCN)"));

  const uploadSrc = fs.readFileSync(path.join(process.cwd(), "src/components/document/DocumentUploadModal.tsx"), "utf8");
  const filterSrc = fs.readFileSync(path.join(process.cwd(), "src/components/document/DocumentFilterBar.tsx"), "utf8");
  const drawerSrc = fs.readFileSync(path.join(process.cwd(), "src/components/document/DocumentDetailDrawer.tsx"), "utf8");
  const tableSrc = fs.readFileSync(path.join(process.cwd(), "src/components/document/DocumentTable.tsx"), "utf8");

  assert.ok(uploadSrc.includes("Bảo mật riêng Ban Chủ nhiệm (Sổ Quỹ / BCN)"));
  assert.ok(drawerSrc.includes("Bảo mật riêng Ban Chủ nhiệm (Sổ Quỹ / BCN)"));
  assert.ok(filterSrc.includes("Bảo mật BCN (Sổ Quỹ)"));
  assert.ok(drawerSrc.includes("<Lock size={11}") && drawerSrc.includes("Bảo mật BCN"));
  assert.ok(tableSrc.includes("DocumentVisibilityBadge"));
});

test("all PB-77 and PB-78 files stay strictly < 400 lines and respect the 60/30/10 palette", () => {
  const files = [
    "src/utils/export/vju-admin-forms.ts",
    "src/components/document/VjuAdminFormsCard.tsx",
    "src/components/event/EventAdminFormButton.tsx",
    "src/components/document/DocumentsView.tsx",
    "src/components/document/DocumentUploadModal.tsx",
    "src/components/document/DocumentFilterBar.tsx",
    "src/components/document/DocumentTable.tsx",
    "src/components/document/DocumentDetailDrawer.tsx",
    "src/forms/document/document-filter-meta.ts",
  ];
  const offPaletteRe =
    /\b(?:bg|text|border|from|via|to|ring)-(?:emerald|green|lime|purple|blue|sky|teal|indigo|violet|fuchsia|pink|cyan|orange)(?:-[0-9]{2,3})?(?:\/[0-9]+)?\b/;
  const hexRe = /#[0-9a-fA-F]{3,8}\b/;

  for (const rel of files) {
    const content = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
    const lineCount = content.split("\n").length;
    assert.ok(lineCount < 400, `${rel} has ${lineCount} lines (must be < 400)`);
    assert.equal(offPaletteRe.test(content), false, `${rel} contains off-palette Tailwind color class`);
    assert.equal(hexRe.test(content), false, `${rel} contains hardcoded hex color`);
  }
});
