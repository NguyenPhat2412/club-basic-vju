import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  isYouthUnion,
  isYouthUnionCode,
  participantRoleLabel,
  unitApplyCtaLabel,
} from "@/lib/club/youth-union";
import type { EventCertificate } from "@/types/certificate/certificate.types";
import {
  buildCertificateVerifyUrl,
  buildEventCertificateHtml,
  certificateTitleForParticipant,
} from "@/utils/export/certificate-print";

const BASE_CERT: EventCertificate = {
  id: "cert-1",
  certificateCode: "VJU-CERT-2026-0001",
  eventId: "ev-1",
  clubId: "club-1",
  userId: "user-1",
  participantType: "CTV",
  eventRole: "Hậu cần & Check-in",
  academicTerm: "2026-1",
  recipientName: "Nguyễn Minh Anh",
  studentCode: "22010099",
  clubCode: "DOANVJU",
  clubName: "Đoàn Thanh niên Trường Đại học Việt Nhật",
  eventTitle: "Ngày hội Chào Tân Sinh viên VJU 2026",
  eventStartTime: "2026-10-15T08:00:00Z",
  status: "ISSUED",
  verificationSha256: "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90",
  issuedBy: "officer-1",
  issuedAt: "2026-10-16T09:00:00Z",
};

test("buildEventCertificateHtml escapes XSS payloads across recipientName, eventTitle, clubName, eventRole, and revocationReason", () => {
  const xssCert: EventCertificate = {
    ...BASE_CERT,
    clubCode: "VJUTEC",
    clubName: `VJU Tech <script>alert("club")</script>`,
    recipientName: `<script>alert("name")</script>Trần Văn A`,
    eventTitle: `Workshop <img src=x onerror=alert(1)> & <script>evil()</script>`,
    eventRole: `<b>MC</b> <script>steal()</script>`,
    status: "REVOKED",
    revocationReason: `<script>alert("revoke")</script>Sai thông tin`,
  };

  const verifyUrl = buildCertificateVerifyUrl(xssCert.certificateCode, "https://vju-club.all1.vn");
  const html = buildEventCertificateHtml(xssCert, verifyUrl, "javascript:alert(1)");

  assert.equal(html.includes("<script>"), false, "Must escape all <script> tags");
  assert.equal(html.includes("<img src=x"), false, "Must escape untrusted HTML tags in eventTitle");
  assert.equal(html.includes("javascript:alert"), false, "Must reject non-data-image QR URLs");
  assert.ok(html.includes("&lt;script&gt;alert(&quot;name&quot;)&lt;/script&gt;"));
  assert.ok(html.includes("&lt;script&gt;alert(&quot;club&quot;)&lt;/script&gt;"));
  assert.ok(html.includes("&lt;script&gt;steal()&lt;/script&gt;"));
  assert.ok(html.includes("&lt;script&gt;alert(&quot;revoke&quot;)&lt;/script&gt;"));
  assert.ok(html.includes("REVOKED"), "Must render REVOKED watermark/banner for revoked certificates");
});

test("buildEventCertificateHtml renders Youth Union header and role-specific titles", () => {
  const verifyUrl = buildCertificateVerifyUrl(BASE_CERT.certificateCode, "https://vju-club.all1.vn");
  const html = buildEventCertificateHtml(BASE_CERT, verifyUrl);

  assert.ok(html.includes("ĐẠI HỌC QUỐC GIA HÀ NỘI · TRƯỜNG ĐẠI HỌC VIỆT NHẬT (VJU)"));
  assert.ok(html.includes("ĐOÀN THANH NIÊN TRƯỜNG ĐH VIỆT NHẬT"));
  assert.ok(html.includes("GIẤY CHỨNG NHẬN CỘNG TÁC VIÊN"));
  assert.ok(html.includes(BASE_CERT.certificateCode));
  assert.ok(html.includes(BASE_CERT.verificationSha256.slice(0, 24)));
  assert.ok(html.includes("/verify/VJU-CERT-2026-0001"));
  assert.equal(html.includes('class="revoked-watermark"'), false);
  assert.equal(html.includes('class="revoked-banner"'), false);

  assert.equal(certificateTitleForParticipant("ORGANIZER"), "GIẤY CHỨNG NHẬN BAN TỔ CHỨC");
  assert.equal(certificateTitleForParticipant("CTV"), "GIẤY CHỨNG NHẬN CỘNG TÁC VIÊN");
  assert.equal(certificateTitleForParticipant("ATTENDEE"), "GIẤY CHỨNG NHẬN THAM GIA SỰ KIỆN");
  assert.equal(certificateTitleForParticipant("MEMBER"), "GIẤY CHỨNG NHẬN THAM GIA SỰ KIỆN");
});

test("buildEventCertificateHtml embeds safe custom template image URLs and rejects unsafe schemes", () => {
  const verifyUrl = buildCertificateVerifyUrl(BASE_CERT.certificateCode, "https://vju-club.all1.vn");
  const withTemplate = buildEventCertificateHtml(
    { ...BASE_CERT, templateImageUrl: "https://api.vju-club.all1.vn/api/v1/public/certificates/templates/sample.png" },
    verifyUrl,
  );
  assert.ok(withTemplate.includes('class="sheet has-template"'));
  assert.ok(withTemplate.includes('class="template-bg"'));
  assert.ok(withTemplate.includes("/api/v1/public/certificates/templates/sample.png"));

  const withUnsafeTemplate = buildEventCertificateHtml(
    { ...BASE_CERT, templateImageUrl: "javascript:alert(1)" },
    verifyUrl,
  );
  assert.equal(withUnsafeTemplate.includes("javascript:alert"), false);
  assert.equal(withUnsafeTemplate.includes('class="template-bg"'), false);
});

test("youth-union helpers classify DOANVJU vs regular club and format all 4 participant roles", () => {
  assert.equal(isYouthUnionCode("DOANVJU"), true);
  assert.equal(isYouthUnionCode(" doanvju "), true);
  assert.equal(isYouthUnion({ code: "DOANVJU" }), true);
  assert.equal(isYouthUnion({ code: "VJUTEC" }), false);
  assert.equal(isYouthUnion(null), false);

  assert.equal(unitApplyCtaLabel("DOANVJU"), "Đăng ký Ban / CTV Đoàn Trường");
  assert.equal(unitApplyCtaLabel("VJUTEC"), "Ứng tuyển CLB");

  assert.equal(participantRoleLabel("MEMBER"), "Thành viên CLB");
  assert.equal(participantRoleLabel("ORGANIZER"), "Ban tổ chức");
  assert.equal(participantRoleLabel("CTV"), "Cộng tác viên");
  assert.equal(participantRoleLabel("ATTENDEE"), "Người tham dự");
});

test("all certificate feature files stay strictly under 400 lines and adhere to 60/30/10 palette", () => {
  const files = [
    "src/utils/export/certificate-print.ts",
    "src/components/event/EventCertificateTemplateBox.tsx",
    "src/components/event/EventCertificatesSection.tsx",
    "src/components/event/EventAttendanceDrawer.tsx",
    "src/components/profile/ProfileCertificatesCard.tsx",
    "src/components/profile/ProfileEventsCard.tsx",
    "src/components/management/ClubCertificatesOverviewSection.tsx",
    "src/components/certificate/CertificateVerifyView.tsx",
    "src/app/verify/[code]/page.tsx",
  ];

  const offPaletteRe =
    /\b(?:bg|text|border|from|via|to|ring)-(?:emerald|green|lime|purple|blue|sky|teal|indigo|violet|fuchsia|pink|cyan|orange)(?:-[0-9]{2,3})?(?:\/[0-9]+)?\b/;
  const hexRe = /#[0-9a-fA-F]{3,8}\b/;

  for (const rel of files) {
    const abs = path.join(process.cwd(), rel);
    const content = fs.readFileSync(abs, "utf8");
    const lineCount = content.split("\n").length;
    assert.ok(lineCount < 400, `Expected ${rel} to stay < 400 lines, got ${lineCount}`);
    assert.equal(offPaletteRe.test(content), false, `Found off-palette Tailwind class in ${rel}`);
    assert.equal(hexRe.test(content), false, `Found hardcoded hex color in ${rel}`);
  }
});
