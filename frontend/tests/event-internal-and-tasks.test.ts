import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  EMPTY_EVENT_FORM,
  isEventSubmissionLocked,
  toCreateEventPayload,
} from "@/forms/event/event-form";
import { API_ROUTES } from "@/lib/api/routes";
import { eventsApi } from "@/api/event/events.api";
import { tasksApi } from "@/api/task/tasks.api";

test("toCreateEventPayload maps internal scope (allowCtv=false) and requiresSubmission cleanly", () => {
  const payload = toCreateEventPayload({
    ...EMPTY_EVENT_FORM,
    title: "Họp chiến lược nội bộ",
    startTime: "2026-12-01T14:00",
    endTime: "2026-12-01T16:00",
    registrationDeadline: "2026-12-01T12:00",
    allowCtv: false,
    requiresSubmission: true,
  });

  assert.equal(payload.allowCtv, false);
  assert.equal(payload.requiresSubmission, true);
  assert.equal(payload.title, "Họp chiến lược nội bộ");
});

test("isEventSubmissionLocked unlocks before deadline and auto-locks past deadline or non-open status", () => {
  const now = new Date("2026-12-01T10:00:00.000Z").getTime();

  // Open + future deadline -> unlocked
  assert.equal(isEventSubmissionLocked("OPEN_REGISTRATION", "2026-12-01T12:00:00.000Z", now), false);

  // Open + past deadline -> automatically locked
  assert.equal(isEventSubmissionLocked("OPEN_REGISTRATION", "2026-12-01T09:59:59.000Z", now), true);

  // Closed / Completed / Cancelled / Draft -> locked even if deadline is future
  assert.equal(isEventSubmissionLocked("CLOSED_REGISTRATION", "2026-12-01T12:00:00.000Z", now), true);
  assert.equal(isEventSubmissionLocked("COMPLETED", "2026-12-01T12:00:00.000Z", now), true);
  assert.equal(isEventSubmissionLocked("CANCELLED", "2026-12-01T12:00:00.000Z", now), true);
  assert.equal(isEventSubmissionLocked("DRAFT", "2026-12-01T12:00:00.000Z", now), true);
});

test("eventsApi & tasksApi expose PB-88 AC01–AC03 endpoints and wire clubWideOnly query params", async () => {
  assert.equal(API_ROUTES.events.discover, "/events/discover");
  assert.equal(API_ROUTES.events.mySubmission("ev-1"), "/events/ev-1/registrations/me/submission");
  assert.equal(
    API_ROUTES.events.submissionDownload("ev-1", "reg-9"),
    "/events/ev-1/registrations/reg-9/submission"
  );
  assert.equal(typeof eventsApi.discoverEvents, "function");
  assert.equal(typeof eventsApi.uploadEventSubmission, "function");
  assert.equal(typeof eventsApi.downloadEventSubmission, "function");

  const capturedUrls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    capturedUrls.push(String(input));
    return new Response(JSON.stringify({ items: [], total: 0, offset: 0, limit: 50 }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as typeof fetch;

  try {
    await eventsApi.discoverEvents(0, 25);
    await tasksApi.clubTasks("club-1", { clubWideOnly: true, departmentId: "ignored-dept" });
    await tasksApi.clubTaskSummary("club-1", { clubWideOnly: true });
  } finally {
    globalThis.fetch = originalFetch;
  }

  assert.ok(capturedUrls[0].includes("/api/v1/events/discover?offset=0&limit=25"));
  assert.ok(capturedUrls[1].includes("/api/v1/clubs/club-1/tasks?"));
  assert.ok(capturedUrls[1].includes("clubWideOnly=true"));
  assert.equal(capturedUrls[1].includes("departmentId="), false);
  assert.ok(capturedUrls[2].includes("/api/v1/clubs/club-1/tasks/summary?clubWideOnly=true"));
});

test("PB-88 UI modules wire discoverEvents, submission lock, and club-wide task scope cleanly", () => {
  const srcRoot = path.join(process.cwd(), "src");
  const portalSrc = fs.readFileSync(path.join(srcRoot, "components/event/EventsPortalView.tsx"), "utf8");
  const tasksTabSrc = fs.readFileSync(path.join(srcRoot, "components/task/TasksTab.tsx"), "utf8");
  const taskModalsSrc = fs.readFileSync(path.join(srcRoot, "components/task/TaskFormModals.tsx"), "utf8");
  const eventModalsSrc = fs.readFileSync(path.join(srcRoot, "components/event/EventManagementModals.tsx"), "utf8");

  assert.ok(portalSrc.includes("apiModel.discoverEvents"));
  assert.ok(portalSrc.includes("apiModel.publicEvents"));
  assert.ok(tasksTabSrc.includes("clubWideOnly"));
  assert.ok(taskModalsSrc.includes("Công việc chung toàn CLB"));
  assert.ok(eventModalsSrc.includes("Yêu cầu nộp tệp hồ sơ xét tuyển (tự khóa khi hết hạn)"));
  assert.ok(eventModalsSrc.includes("Công khai toàn trường — Mở cho SV & CTV"));
  assert.ok(eventModalsSrc.includes("Nội bộ thành viên CLB"));
});
