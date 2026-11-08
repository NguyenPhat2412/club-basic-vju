import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, apiModel } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { CLUB_WORKSPACE_KEYS } from "@/hooks/useSession";

test("errorMessage maps Phase 3 and Phase 4 domain error codes to clear Vietnamese guidance", () => {
  assert.match(errorMessage(new ApiError("Expired", 409, "ATTENDANCE_EDIT_WINDOW_EXPIRED")), /thời hạn/i);
  assert.match(errorMessage(new ApiError("Reason", 400, "ATTENDANCE_EDIT_REASON_REQUIRED")), /lý do điều chỉnh/i);
  assert.match(errorMessage(new ApiError("Version", 409, "ATTENDANCE_VERSION_CONFLICT")), /vừa được người khác cập nhật/i);
  assert.match(errorMessage(new ApiError("Lock", 409, "OPTIMISTIC_LOCK_CONFLICT")), /cập nhật đồng thời/i);
  assert.match(errorMessage(new ApiError("Subtasks", 409, "SUBTASKS_INCOMPLETE")), /công việc con/i);
  assert.match(errorMessage(new ApiError("Deadline", 400, "SUBTASK_DEADLINE_EXCEEDS_PARENT")), /công việc cha/i);
  assert.match(errorMessage(new ApiError("Hierarchy", 400, "TASK_INVALID_HIERARCHY")), /công việc cha – con/i);
  assert.match(errorMessage(new ApiError("CTV", 409, "ASSIGNEE_NOT_ELIGIBLE_FOR_EVENT_TASK")), /cộng tác viên/i);
  assert.match(errorMessage(new ApiError("Window", 400, "TASK_DEADLINE_OUTSIDE_EVENT_WINDOW")), /7 ngày/i);
  assert.match(errorMessage(new ApiError("Anon", 403, "ACCOUNT_ANONYMIZED")), /ẩn danh/i);
  assert.match(errorMessage(new ApiError("Self", 409, "CANNOT_DELETE_SELF")), /chính mình/i);
});

test("CLUB_WORKSPACE_KEYS includes Phase 3 and Phase 4 operational permissions", () => {
  assert.equal(CLUB_WORKSPACE_KEYS.includes("event.attendance_edit"), true);
  assert.equal(CLUB_WORKSPACE_KEYS.includes("task.update"), true);
});

test("apiModel builds exact Phase 3 & Phase 4 endpoints, query params, and payloads", async () => {
  const calls: Array<{ url: string; method: string; body?: string }> = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || "GET").toUpperCase();
    const body = typeof init?.body === "string" ? init.body : undefined;
    calls.push({ url, method, body });

    if (method === "DELETE") {
      return new Response(null, { status: 204 });
    }
    return new Response(JSON.stringify({ items: [], total: 0, offset: 0, limit: 20, recipientCount: 3 }), {
      status: 200,
    });
  }) as typeof fetch;

  try {
    await apiModel.myEventRegistrations({ status: "REGISTERED", participantType: "CTV", offset: 0, limit: 20 });
    const myRegUrl = new URL(calls.at(-1)!.url);
    assert.equal(myRegUrl.pathname, "/api/v1/users/me/event-registrations");
    assert.equal(myRegUrl.searchParams.get("status"), "REGISTERED");
    assert.equal(myRegUrl.searchParams.get("participantType"), "CTV");

    await apiModel.updateEventRegistration("ev-1", "reg-1", {
      eventRole: "Ban Hậu cần",
      status: "REGISTERED",
    });
    const patchReg = calls.at(-1)!;
    assert.match(patchReg.url, /\/api\/v1\/events\/ev-1\/registrations\/reg-1$/);
    assert.equal(patchReg.method, "PATCH");
    assert.deepEqual(JSON.parse(patchReg.body!), { eventRole: "Ban Hậu cần", status: "REGISTERED" });

    await apiModel.recordAttendance(
      "ev-1",
      [{ userId: "u-1", status: "EXCUSED", expectedVersion: 2 }],
      "Có đơn xin phép hợp lệ"
    );
    const putAtt = calls.at(-1)!;
    assert.match(putAtt.url, /\/api\/v1\/events\/ev-1\/attendances$/);
    assert.equal(putAtt.method, "PUT");
    assert.deepEqual(JSON.parse(putAtt.body!), {
      items: [{ userId: "u-1", status: "EXCUSED", expectedVersion: 2 }],
      reason: "Có đơn xin phép hợp lệ",
    });

    await apiModel.clubTaskSummary("club-1", { departmentId: "dept-1", status: "IN_PROGRESS", overdue: true });
    const summaryUrl = new URL(calls.at(-1)!.url);
    assert.equal(summaryUrl.pathname, "/api/v1/clubs/club-1/tasks/summary");
    assert.equal(summaryUrl.searchParams.get("departmentId"), "dept-1");
    assert.equal(summaryUrl.searchParams.get("status"), "IN_PROGRESS");
    assert.equal(summaryUrl.searchParams.get("overdue"), "true");

    await apiModel.updateTask("task-1", { status: "IN_PROGRESS", priority: "HIGH" });
    const patchTask = calls.at(-1)!;
    assert.match(patchTask.url, /\/api\/v1\/tasks\/task-1$/);
    assert.equal(patchTask.method, "PATCH");
    assert.deepEqual(JSON.parse(patchTask.body!), { status: "IN_PROGRESS", priority: "HIGH" });

    await apiModel.notifyEventParticipants("ev-1", {
      title: "Nhắc lịch",
      message: "Tập trung 8h00",
      idempotencyKey: "k-1",
    });
    assert.match(calls.at(-1)!.url, /\/api\/v1\/events\/ev-1\/notifications$/);
    assert.equal(calls.at(-1)!.method, "POST");

    await apiModel.notifyTaskAssignees("task-1", {
      title: "Nhắc hạn",
      message: "Nộp link báo cáo",
      includeSubtasks: true,
      idempotencyKey: "k-2",
    });
    assert.match(calls.at(-1)!.url, /\/api\/v1\/tasks\/task-1\/notifications$/);
    assert.equal(calls.at(-1)!.method, "POST");

    await apiModel.systemStatistics();
    assert.match(calls.at(-1)!.url, /\/api\/v1\/statistics\/system$/);

    await apiModel.clubStatistics("club-1", { from: "2026-01-01T00:00:00Z", to: "2026-12-31T23:59:59Z" });
    const clubStatsUrl = new URL(calls.at(-1)!.url);
    assert.equal(clubStatsUrl.pathname, "/api/v1/clubs/club-1/statistics");
    assert.equal(clubStatsUrl.searchParams.get("from"), "2026-01-01T00:00:00Z");

    await apiModel.deleteUser("user-99", true);
    const delUrl = new URL(calls.at(-1)!.url);
    assert.equal(delUrl.pathname, "/api/v1/users/user-99");
    assert.equal(delUrl.searchParams.get("anonymize"), "true");
    assert.equal(calls.at(-1)!.method, "DELETE");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
