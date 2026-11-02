import test from "node:test";
import assert from "node:assert/strict";
import { ApiError, apiModel } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import {
  CLUB_WORKSPACE_KEYS,
  clubIdsWith,
  departmentIdsWith,
  hasClubPermission,
  hasClubWidePermission,
  hasDepartmentPermission,
} from "@/hooks/useSession";

test("errorMessage maps Sprint 2 domain error codes to clear Vietnamese guidance", () => {
  assert.match(errorMessage(new ApiError("Locked", 403, "ACCOUNT_LOCKED")), /tạm khoá/i);
  assert.match(errorMessage(new ApiError("Suspended", 409, "MEMBERSHIP_NOT_ACTIVE")), /tạm đình chỉ/i);
  assert.match(errorMessage(new ApiError("Invalid", 409, "INVALID_MEMBERSHIP_STATUS_TRANSITION")), /trạng thái thành viên/i);
  assert.match(errorMessage(new ApiError("Bypass", 409, "APPLICATION_STATUS_TRANSITION_NOT_ALLOWED")), /Duyệt, Từ chối hoặc Huỷ/i);
  assert.match(errorMessage(new ApiError("Missing", 404, "NOTIFICATION_NOT_FOUND")), /thông báo/i);
  assert.match(errorMessage(new ApiError("Cooldown", 409, "APPLICATION_REAPPLY_TOO_SOON")), /từ chối đơn/i);
  assert.match(errorMessage(new ApiError("Limit", 409, "APPLICATION_PENDING_LIMIT")), /đơn chờ duyệt/i);
  assert.match(errorMessage(new ApiError("ClubLimit", 409, "MEMBERSHIP_LIMIT_REACHED")), /câu lạc bộ tối đa/i);
  assert.match(errorMessage(new TypeError("Failed to fetch")), /Không kết nối được máy chủ/i);
});

test("permission scope helpers respect GLOBAL, CLUB, and DEPARTMENT boundaries", () => {
  const clubA = "11111111-1111-1111-1111-111111111111";
  const clubB = "22222222-2222-2222-2222-222222222222";
  const deptA1 = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
  const deptA2 = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

  const deptHeadPerms = [
    { permissionKey: "department.member.add", scope: "DEPARTMENT" as const, clubId: clubA, departmentId: deptA1, source: "ROLE" },
    { permissionKey: "department.member.remove", scope: "DEPARTMENT" as const, clubId: clubA, departmentId: deptA1, source: "ROLE" },
  ];

  assert.equal(hasClubPermission(deptHeadPerms, "department.member.add", clubA), true);
  assert.equal(hasClubWidePermission(deptHeadPerms, "department.member.add", clubA), false);
  assert.equal(hasDepartmentPermission(deptHeadPerms, "department.member.add", clubA, deptA1), true);
  assert.equal(hasDepartmentPermission(deptHeadPerms, "department.member.add", clubA, deptA2), false);
  assert.equal(hasDepartmentPermission(deptHeadPerms, "department.member.add", clubB, deptA1), false);

  const deptMap = departmentIdsWith(deptHeadPerms, ["department.member.add"], clubA);
  assert.equal(deptMap.all, false);
  assert.deepEqual([...deptMap.ids], [deptA1]);

  const clubMap = clubIdsWith(deptHeadPerms, CLUB_WORKSPACE_KEYS);
  assert.equal(clubMap.global, false);
  assert.deepEqual([...clubMap.ids], [clubA]);
  assert.equal(CLUB_WORKSPACE_KEYS.includes("application.create"), true);
  assert.equal(CLUB_WORKSPACE_KEYS.includes("application.delete"), false);
});

test("apiModel builds exact Sprint 2 endpoints, query strings, payloads, and retries CSRF_INVALID once", async () => {
  const calls: Array<{ url: string; method: string; body?: string; headers: Record<string, string> }> = [];
  const originalFetch = globalThis.fetch;

  let failFirstCsrf = false;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || "GET").toUpperCase();
    const headers = (init?.headers as Record<string, string>) || {};
    const body = typeof init?.body === "string" ? init.body : undefined;
    calls.push({ url, method, body, headers });

    if (failFirstCsrf && method !== "GET" && !url.endsWith("/auth/csrf")) {
      failFirstCsrf = false;
      return new Response(JSON.stringify({ code: "CSRF_INVALID", detail: "Invalid CSRF" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (url.endsWith("/public/clubs/categories")) {
      return new Response(JSON.stringify(["Công nghệ", "Học thuật"]), { status: 200 });
    }
    if (method === "DELETE") {
      return new Response(null, { status: 204 });
    }
    return new Response(JSON.stringify({ ok: true, items: [], total: 0, offset: 0, limit: 20 }), { status: 200 });
  }) as typeof fetch;

  try {
    const categories = await apiModel.publicClubCategories();
    assert.deepEqual(categories, ["Công nghệ", "Học thuật"]);
    assert.match(calls.at(-1)!.url, /\/api\/v1\/public\/clubs\/categories$/);

    await apiModel.publicClubs("robot", "Công nghệ", 20, 12);
    const publicUrl = new URL(calls.at(-1)!.url);
    assert.equal(publicUrl.pathname, "/api/v1/public/clubs");
    assert.equal(publicUrl.searchParams.get("query"), "robot");
    assert.equal(publicUrl.searchParams.get("category"), "Công nghệ");
    assert.equal(publicUrl.searchParams.get("offset"), "20");
    assert.equal(publicUrl.searchParams.get("limit"), "12");

    await apiModel.myApplications({ status: "PENDING", clubId: "club-1", offset: 15, limit: 15 });
    const myAppsUrl = new URL(calls.at(-1)!.url);
    assert.equal(myAppsUrl.pathname, "/api/v1/users/me/applications");
    assert.equal(myAppsUrl.searchParams.get("status"), "PENDING");
    assert.equal(myAppsUrl.searchParams.get("clubId"), "club-1");
    assert.equal(myAppsUrl.searchParams.get("offset"), "15");

    await apiModel.clubApplications("club-1", {
      status: "REJECTED",
      search: "Nguyen",
      createdFrom: "2026-01-01T00:00:00Z",
      createdTo: "2026-01-31T23:59:59Z",
      offset: 20,
      limit: 20,
    });
    const clubAppsUrl = new URL(calls.at(-1)!.url);
    assert.equal(clubAppsUrl.pathname, "/api/v1/clubs/club-1/applications");
    assert.equal(clubAppsUrl.searchParams.get("status"), "REJECTED");
    assert.equal(clubAppsUrl.searchParams.get("search"), "Nguyen");
    assert.equal(clubAppsUrl.searchParams.get("createdFrom"), "2026-01-01T00:00:00Z");
    assert.equal(clubAppsUrl.searchParams.get("createdTo"), "2026-01-31T23:59:59Z");

    await apiModel.approve("club-1", "app-1", {
      reviewNote: "Chào mừng bạn",
      internalNote: "Điểm phỏng vấn cao",
      skipDepartmentAssignment: true,
    });
    const approveCall = calls.at(-1)!;
    assert.match(approveCall.url, /\/api\/v1\/clubs\/club-1\/applications\/app-1\/approve$/);
    assert.deepEqual(JSON.parse(approveCall.body!), {
      reviewNote: "Chào mừng bạn",
      internalNote: "Điểm phỏng vấn cao",
      skipDepartmentAssignment: true,
    });

    failFirstCsrf = true;
    const beforeMove = calls.length;
    await apiModel.moveDepartmentMember("dept-old", "mem-1", "dept-new");
    const moveCalls = calls.slice(beforeMove);
    assert.ok(moveCalls.length >= 4);
    assert.match(moveCalls[0].url, /\/api\/v1\/auth\/csrf$/);
    assert.match(moveCalls[1].url, /\/api\/v1\/departments\/dept-old\/members\/mem-1$/);
    assert.ok(moveCalls.slice(2, -1).every((c) => /\/api\/v1\/auth\/csrf$/.test(c.url)));
    assert.match(moveCalls.at(-1)!.url, /\/api\/v1\/departments\/dept-old\/members\/mem-1$/);
    assert.equal(moveCalls.at(-1)!.method, "PATCH");
    assert.deepEqual(JSON.parse(moveCalls.at(-1)!.body!), { targetDepartmentId: "dept-new" });

    await apiModel.notificationDetail("notif-1");
    assert.match(calls.at(-1)!.url, /\/api\/v1\/users\/me\/notifications\/notif-1$/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
