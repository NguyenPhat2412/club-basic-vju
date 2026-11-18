import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("buildStudentUpcomingEvents excludes past events, merges personal + public events, and preserves status & clubId", async () => {
  const { buildStudentUpcomingEvents } = await import("@/forms/dashboard/dashboard-events");
  const now = Date.parse("2026-11-18T12:00:00Z");

  const calendarItems = [
    {
      id: "ev-past",
      itemType: "EVENT" as const,
      title: "Past Event",
      clubId: "c-1",
      clubName: "CLB ARC",
      startTime: "2026-11-10T08:00:00Z",
      endTime: "2026-11-10T10:00:00Z",
      status: "COMPLETED",
    },
    {
      id: "ev-shared",
      itemType: "EVENT" as const,
      title: "Upcoming Workshop",
      clubId: "c-2",
      clubName: "CLB NEB",
      startTime: "2026-11-20T09:00:00Z",
      endTime: "2026-11-20T11:00:00Z",
      status: "PUBLISHED",
    },
  ];

  const publicEvents = [
    {
      id: "ev-past-pub",
      clubId: "c-1",
      clubName: "CLB ARC",
      title: "Old Public Event",
      startTime: "2026-11-05T08:00:00Z",
      endTime: "2026-11-05T11:00:00Z",
      status: "COMPLETED",
      allowCtv: true,
      registeredCount: 10,
    },
    {
      id: "ev-shared",
      clubId: "c-2",
      clubName: "CLB NEB",
      title: "Upcoming Workshop",
      location: "Hội trường Mỹ Đình",
      startTime: "2026-11-20T09:00:00Z",
      endTime: "2026-11-20T11:00:00Z",
      status: "PUBLISHED",
      allowCtv: true,
      registeredCount: 25,
    },
    {
      id: "ev-sooner",
      clubId: "c-3",
      clubName: "CLB VAC",
      title: "Art Exhibition",
      location: "Sảnh tầng 1",
      startTime: "2026-11-19T14:00:00Z",
      endTime: "2026-11-19T17:00:00Z",
      status: "PUBLISHED",
      allowCtv: false,
      registeredCount: 18,
    },
  ];

  const merged = buildStudentUpcomingEvents(calendarItems as never, publicEvents as never, now);
  assert.equal(merged.length, 2);
  assert.equal(merged[0]?.id, "ev-sooner");
  assert.equal(merged[0]?.mine, false);
  assert.equal(merged[0]?.status, "PUBLISHED");
  assert.equal(merged[1]?.id, "ev-shared");
  assert.equal(merged[1]?.mine, true);
  assert.equal(merged[1]?.location, "Hội trường Mỹ Đình");
});

test("audit-meta localizes technical action codes, resource types, and role scopes cleanly", async () => {
  const { formatAuditAction, formatRoleScopeLabel, resourceLabel } = await import("@/utils/audit/audit-meta");

  assert.equal(formatAuditAction("USER_LOGIN"), "Đăng nhập");
  assert.equal(formatAuditAction("CLUB_UPDATED"), "Cập nhật");
  assert.equal(formatAuditAction("USER_ANONYMIZED"), "Ẩn danh tài khoản");
  assert.equal(resourceLabel("CLUB"), "Câu lạc bộ");
  assert.equal(resourceLabel("PERMISSION_GRANT"), "Phân quyền");
  assert.equal(formatRoleScopeLabel("CLUB"), "Phạm vi Câu lạc bộ");
  assert.equal(formatRoleScopeLabel("DEPARTMENT"), "Phạm vi Ban chuyên môn");
});

test("dashboard modules wire unread-summary, club-scoped application links, side-by-side audit layout, and stay < 400 lines", () => {
  const dashboardFiles = [
    "frontend/src/components/dashboard/DashboardView.tsx",
    "frontend/src/components/dashboard/StudentDashboard.tsx",
    "frontend/src/components/dashboard/StudentDashboardSidebar.tsx",
    "frontend/src/components/dashboard/DashboardActivitySection.tsx",
    "frontend/src/components/dashboard/DashboardAnalyticsCards.tsx",
    "frontend/src/components/dashboard/DashboardSystemAuditSection.tsx",
  ];

  for (const rel of dashboardFiles) {
    const src = fs.readFileSync(path.join(repoRoot, rel), "utf8");
    const lineCount = src.split("\n").length;
    assert.ok(lineCount < 400, `Expected ${rel} to be < 400 lines, got ${lineCount}`);
  }

  const adminSrc = fs.readFileSync(path.join(repoRoot, "frontend/src/components/dashboard/DashboardView.tsx"), "utf8");
  assert.ok(adminSrc.includes("useUnreadNotificationSummary"), "Expected DashboardView to sync unread notifications with unreadSummary");
  assert.ok(!adminSrc.includes("system-users-count"), "Expected redundant system-users-count query to be removed");

  const actSrc = fs.readFileSync(path.join(repoRoot, "frontend/src/components/dashboard/DashboardActivitySection.tsx"), "utf8");
  assert.ok(actSrc.includes("/management?clubId=${app.clubId}&tab=applications"), "Expected application Xem button to pass clubId");

  const auditSrc = fs.readFileSync(path.join(repoRoot, "frontend/src/components/dashboard/DashboardSystemAuditSection.tsx"), "utf8");
  assert.ok(auditSrc.includes("formatAuditAction"), "Expected localized audit actions");
  assert.ok(auditSrc.includes("@4xl:grid-cols-2"), "Expected side-by-side 2-column layout for roles and audit logs");
});
