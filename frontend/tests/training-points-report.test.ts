import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { statisticsApi } from "@/api/statistics/statistics.api";
import type { TrainingPointReportResponse } from "@/types/statistics/statistics.types";
import {
  buildAcademicTermOptions,
  buildTrainingPointsCsv,
  buildTrainingPointsPrintableHtml,
  collectReportSignatures,
  computeGanttBarGeometry,
  computeGanttWindow,
  deriveAcademicTerm,
  shiftGanttAnchor,
} from "@/utils/export/training-points-report";

const SAMPLE_SIG = "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2";

function makeSampleReport(): TrainingPointReportResponse {
  return {
    generatedAt: "2026-11-25T10:00:00Z",
    clubId: "club-1",
    clubName: "CLB Công nghệ VJU",
    academicTerm: "2026-1",
    from: "2026-09-01T00:00:00Z",
    to: "2026-12-31T23:59:59Z",
    totalStudents: 2,
    totalPresentCheckIns: 3,
    items: [
      {
        userId: "u-1",
        fullName: "=CMD|' /C calc'!A0",
        studentCode: "23010001",
        email: "sv1@vju.ac.vn",
        activeClubs: ["CLB Công nghệ VJU", "Đoàn TN VJU"],
        presentEventCount: 2,
        attendedEventTitles: ["Hội thảo AI", "Workshop Git"],
        attendedEvents: [
          {
            eventId: "ev-1",
            title: "Hội thảo AI",
            academicTerm: "2026-1",
            attendanceStatus: "PRESENT",
            attendanceLocked: true,
            attendanceSignatureSha256: SAMPLE_SIG,
          },
          {
            eventId: "ev-2",
            title: "Workshop Git",
            academicTerm: "2026-1",
            attendanceStatus: "LATE",
            attendanceLocked: false,
            attendanceSignatureSha256: null,
          },
        ],
      },
      {
        userId: "u-2",
        fullName: "<script>alert(1)</script> Tran Binh",
        studentCode: "-12.5",
        email: "sv2@vju.ac.vn",
        activeClubs: [],
        presentEventCount: 1,
        attendedEventTitles: ["+SUM(1,2)"],
        attendanceSignatures: [SAMPLE_SIG],
      },
      {
        userId: "u-3",
        fullName: "  -HYPERLINK(\"http://evil\")",
        studentCode: "23010003",
        email: "sv3@vju.ac.vn",
        activeClubs: [],
        presentEventCount: 1,
        attendedEventTitles: ["@IMPORTXML()"],
      },
    ],
  };
}

test("statisticsApi wires /reports/training-points and /events/timeline query params cleanly", async () => {
  const capturedUrls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    capturedUrls.push(String(input));
    return new Response(JSON.stringify({ items: [], units: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    await statisticsApi.trainingPointsReport({
      clubId: "c-1",
      academicTerm: "2026-1",
      search: "  23010001  ",
      from: "2026-09-01T00:00:00+07:00",
      to: "2026-12-31T23:59:59+07:00",
    });
    await statisticsApi.trainingPointsReport({});
    await statisticsApi.eventsTimeline({
      clubId: "c-2",
      academicTerm: "2026-2",
      from: "2027-01-01T00:00:00Z",
      to: "2027-05-31T23:59:59Z",
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.ok(capturedUrls[0].includes("/api/v1/reports/training-points?"));
  assert.ok(capturedUrls[0].includes("clubId=c-1"));
  assert.ok(capturedUrls[0].includes("academicTerm=2026-1"));
  assert.ok(capturedUrls[0].includes("search=23010001"));
  assert.ok(capturedUrls[0].includes("from="));
  assert.ok(capturedUrls[0].includes("to="));

  assert.ok(capturedUrls[1].endsWith("/api/v1/reports/training-points"));

  assert.ok(capturedUrls[2].includes("/api/v1/events/timeline?"));
  assert.ok(capturedUrls[2].includes("clubId=c-2"));
  assert.ok(capturedUrls[2].includes("academicTerm=2026-2"));
});

test("deriveAcademicTerm and buildAcademicTermOptions follow V44 VJU term conventions", () => {
  assert.equal(deriveAcademicTerm(new Date("2026-10-15T03:00:00Z")), "2026-1");
  assert.equal(deriveAcademicTerm(new Date("2027-02-15T03:00:00Z")), "2026-2");
  assert.equal(deriveAcademicTerm(new Date("2027-07-15T03:00:00Z")), "2026-3");

  const opts = buildAcademicTermOptions(new Date("2026-10-15T03:00:00Z"));
  assert.deepEqual(opts.slice(0, 6), ["2026-1", "2026-2", "2026-3", "2025-1", "2025-2", "2025-3"]);
});

test("buildTrainingPointsCsv emits UTF-8 BOM, CRLF, formula neutralization, and SHA-256 column", () => {
  const report = makeSampleReport();
  const csv = buildTrainingPointsCsv(report);

  assert.ok(csv.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM");
  assert.ok(csv.includes("\r\n"), "CSV must use CRLF line endings");
  assert.ok(csv.includes("Mã xác thực SHA-256"), "CSV header must include SHA-256 column");
  assert.ok(csv.includes(",'=CMD|' /C calc'!A0,"), "Formula injection starting with = must be neutralized");
  assert.ok(csv.includes(`"'+SUM(1,2)"`), "Formula injection starting with + must be neutralized");
  assert.ok(csv.includes(`"'  -HYPERLINK(""http://evil"")"`), "Leading-space formula injection must be neutralized");
  assert.ok(csv.includes(",'@IMPORTXML(),"), "Formula injection starting with @ must be neutralized");
  assert.ok(csv.includes(",-12.5,"), "Plain negative numbers must remain unprefixed");
  assert.ok(csv.includes(SAMPLE_SIG), "CSV must include SHA-256 sign-off hash");
  assert.ok(csv.includes("Hội thảo AI [2026-1]"), "CSV must include academicTerm on attended evidence");
});

test("buildTrainingPointsPrintableHtml escapes XSS payloads and embeds VJU header, term, and SHA-256 footer", () => {
  const report = makeSampleReport();
  const html = buildTrainingPointsPrintableHtml(report);

  assert.ok(html.includes("Trường Đại học Việt Nhật"));
  assert.ok(html.includes("Học kỳ: 2026-1"));
  assert.ok(html.includes("Chứng thực khoá sổ điện tử (SHA-256):"));
  assert.ok(html.includes(SAMPLE_SIG));
  assert.equal(html.includes("<script>alert(1)</script>"), false, "Script tag must be HTML-escaped");
  assert.ok(html.includes("&lt;script&gt;alert(1)&lt;/script&gt;"));
  assert.deepEqual(collectReportSignatures(report), [SAMPLE_SIG]);
});

test("M6A frontend files obey < 400 lines, 60/30/10 palette, zero (PB-XX), and strict permission gating", () => {
  const srcRoot = path.join(process.cwd(), "src");
  const m6aFiles = [
    "types/statistics/statistics.types.ts",
    "api/statistics/statistics.api.ts",
    "utils/export/training-points-report.ts",
    "components/event/TrainingPointsReportDialog.tsx",
    "components/event/EventsPortalToolbar.tsx",
    "components/event/EventsPortalView.tsx",
    "components/event/EventsGanttView.tsx",
    "components/event/EventsTab.tsx",
  ];

  const offPaletteRe =
    /\b(?:bg|text|border|from|via|to|ring)-(?:emerald|green|lime|purple|blue|sky|teal|indigo|violet|fuchsia|pink|cyan|orange)(?:-[0-9]{2,3})?(?:\/[0-9]+)?\b/;
  const hexRe = /#[0-9a-fA-F]{3,8}\b/;

  for (const rel of m6aFiles) {
    const content = fs.readFileSync(path.join(srcRoot, rel), "utf8");
    const lines = content.split("\n").length;
    assert.ok(lines < 400, `${rel} must stay < 400 lines (got ${lines})`);
    assert.equal(/\(\s*PB-\d+/i.test(content), false, `${rel} must not contain (PB-XX) labels`);
    assert.equal(offPaletteRe.test(content), false, `${rel} must not use off-palette Tailwind colors`);
    if (rel.startsWith("components/")) {
      assert.equal(hexRe.test(content), false, `${rel} must not contain hardcoded hex colors`);
    }
  }

  const portalSrc = fs.readFileSync(path.join(srcRoot, "components/event/EventsPortalView.tsx"), "utf8");
  assert.equal(
    /canViewTrainingPointsReport[\s\S]{0,160}(?:event\.view|club\.view)/.test(portalSrc),
    false,
    "Training points report button must NOT gate on event.view or club.view (Tier 4 CLUB_MEMBER holds them)"
  );
  assert.ok(portalSrc.includes("event.attendance"));

  const ganttSrc = fs.readFileSync(path.join(srcRoot, "components/event/EventsGanttView.tsx"), "utf8");
  assert.ok(ganttSrc.includes('qk.publicClubs("events-gantt-units")'));
  assert.ok(ganttSrc.includes("unitSelectOptions.map"));
});

test("shiftGanttAnchor steps deterministically across all 3 VJU academic terms without Term 2 deadlock", () => {
  const jan15 = new Date(2026, 0, 15);
  const jan15Next = shiftGanttAnchor(jan15, "term", 1);
  const jan15NextWin = computeGanttWindow(jan15Next, "term");
  assert.equal(jan15NextWin.start.getFullYear(), 2026);
  assert.equal(jan15NextWin.start.getMonth(), 5);
  assert.equal(jan15NextWin.end.getFullYear(), 2026);
  assert.equal(jan15NextWin.end.getMonth(), 8);

  const may31 = new Date(2026, 4, 31);
  const may31Prev = shiftGanttAnchor(may31, "term", -1);
  const may31PrevWin = computeGanttWindow(may31Prev, "term");
  assert.equal(may31PrevWin.start.getFullYear(), 2025);
  assert.equal(may31PrevWin.start.getMonth(), 8);
  assert.equal(may31PrevWin.end.getFullYear(), 2026);
  assert.equal(may31PrevWin.end.getMonth(), 0);

  const sep1 = new Date(2026, 8, 1);
  const fwd1 = shiftGanttAnchor(sep1, "term", 1);
  const fwd2 = shiftGanttAnchor(fwd1, "term", 1);
  const fwd3 = shiftGanttAnchor(fwd2, "term", 1);
  assert.deepEqual(
    [fwd1.getFullYear(), fwd1.getMonth()],
    [2027, 0]
  );
  assert.deepEqual(
    [fwd2.getFullYear(), fwd2.getMonth()],
    [2027, 5]
  );
  assert.deepEqual(
    [fwd3.getFullYear(), fwd3.getMonth()],
    [2027, 8]
  );

  const bwd1 = shiftGanttAnchor(sep1, "term", -1);
  const bwd2 = shiftGanttAnchor(bwd1, "term", -1);
  const bwd3 = shiftGanttAnchor(bwd2, "term", -1);
  assert.deepEqual(
    [bwd1.getFullYear(), bwd1.getMonth()],
    [2026, 5]
  );
  assert.deepEqual(
    [bwd2.getFullYear(), bwd2.getMonth()],
    [2026, 0]
  );
  assert.deepEqual(
    [bwd3.getFullYear(), bwd3.getMonth()],
    [2025, 8]
  );

  const jan31 = new Date(2026, 0, 31);
  const feb = shiftGanttAnchor(jan31, "month", 1);
  assert.equal(feb.getMonth(), 1);
});

test("computeGanttBarGeometry guarantees 0 <= leftPct, widthPct >= 6, and leftPct + widthPct <= 100", () => {
  const winStart = new Date(2026, 3, 1); // Apr 1
  const winEnd = new Date(2026, 4, 1); // May 1 (30 days)
  const span = winEnd.getTime() - winStart.getTime();

  const cases: Array<[string, number, number]> = [
    ["last-day", winStart.getTime() + 0.98 * span, winEnd.getTime()],
    ["completely-after", winEnd.getTime() + 3_600_000, winEnd.getTime() + 7_200_000],
    ["completely-before", winStart.getTime() - 7_200_000, winStart.getTime() - 3_600_000],
    ["zero-duration-mid", winStart.getTime() + 0.5 * span, winStart.getTime() + 0.5 * span],
    ["zero-duration-edge", winStart.getTime() + 0.97 * span, winStart.getTime() + 0.97 * span],
    ["spanning-both-sides", winStart.getTime() - 86_400_000, winEnd.getTime() + 86_400_000],
  ];

  for (const [label, evStart, evEnd] of cases) {
    const { leftPct, widthPct } = computeGanttBarGeometry(winStart, winEnd, evStart, evEnd);
    assert.ok(leftPct >= 0, `${label}: leftPct >= 0 (got ${leftPct})`);
    assert.ok(widthPct >= 6, `${label}: widthPct >= 6 (got ${widthPct})`);
    assert.ok(leftPct + widthPct <= 100, `${label}: leftPct + widthPct <= 100 (got ${leftPct + widthPct})`);
  }

  const lastDay = computeGanttBarGeometry(winStart, winEnd, winStart.getTime() + 0.98 * span, winEnd.getTime());
  assert.equal(lastDay.leftPct, 94);
  assert.equal(lastDay.widthPct, 6);

  const spanning = computeGanttBarGeometry(winStart, winEnd, winStart.getTime() - 86_400_000, winEnd.getTime() + 86_400_000);
  assert.equal(spanning.leftPct, 0);
  assert.equal(spanning.widthPct, 100);
});
