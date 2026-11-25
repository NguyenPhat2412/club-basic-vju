import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ApiError, apiModel } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import { VAULT_MAX_BYTES, validateVaultFile } from "@/lib/utils";
import { resolveWsBrokerUrl } from "@/hooks/chat/useChatRealtime";

test("resolveWsBrokerUrl derives ws:// and wss:// STOMP endpoints accurately", () => {
  assert.equal(resolveWsBrokerUrl("http://localhost:8080"), "ws://localhost:8080/api/v1/ws");
  assert.equal(resolveWsBrokerUrl("http://localhost:8080///"), "ws://localhost:8080/api/v1/ws");
  assert.equal(resolveWsBrokerUrl("https://club.vju.ac.vn"), "wss://club.vju.ac.vn/api/v1/ws");
});

test("errorMessage maps realtime chat, centralized vault, and validation codes to Vietnamese guidance", () => {
  assert.match(errorMessage(new ApiError("Not previewable", 415, "DOCUMENT_NOT_PREVIEWABLE")), /trình duyệt|Tải xuống/i);
  assert.match(errorMessage(new ApiError("Mismatch", 400, "DOCUMENT_CLUB_MISMATCH")), /Hệ thống/i);
  assert.match(errorMessage(new ApiError("Channel scope", 400, "DOCUMENT_CHANNEL_SCOPE_MISMATCH")), /kênh này/i);
  assert.match(errorMessage(new ApiError("No channel", 404, "CHANNEL_NOT_FOUND")), /kênh trao đổi/i);
  assert.match(errorMessage(new ApiError("No msg", 404, "MESSAGE_NOT_FOUND")), /phản hồi/i);
  assert.match(errorMessage(new ApiError("Empty", 400, "EMPTY_CHANNEL")), /chưa có tin nhắn/i);
  assert.match(errorMessage(new ApiError("Limit", 409, "POSITION_LIMIT_REACHED")), /tối đa/i);
  assert.equal(
    errorMessage(new ApiError("Thiếu trường bắt buộc: Lý do ứng tuyển", 400, "MISSING_REQUIRED_FORM_FIELD")),
    "Thiếu trường bắt buộc: Lý do ứng tuyển"
  );
});

test("validateVaultFile enforces empty, 20MB, extension allowlist, and version extension matching", () => {
  assert.match(validateVaultFile({ name: "empty.pdf", size: 0 }) ?? "", /rỗng/i);
  assert.match(validateVaultFile({ name: "huge.pdf", size: VAULT_MAX_BYTES + 1 }) ?? "", /20 MB/i);
  assert.match(validateVaultFile({ name: "malware.exe", size: 128 }) ?? "", /\.exe/);
  assert.match(validateVaultFile({ name: "update.docx", size: 512 }, "pdf") ?? "", /\.pdf/);
  assert.equal(validateVaultFile({ name: "valid-plan.pdf", size: 4096 }, "pdf"), null);
});

test("apiModel builds exact 3-tier Document Vault and Realtime Chat endpoints & payloads", async () => {
  const calls: Array<{ url: string; method: string; body?: string | FormData }> = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || "GET").toUpperCase();
    const body = init?.body as string | FormData | undefined;
    calls.push({ url, method, body });

    if (url.includes("/read")) {
      return new Response(null, { status: 204 });
    }
    if (url.includes("/preview")) {
      return new Response("%PDF-1.7", { status: 200, headers: { "Content-Type": "application/pdf" } });
    }
    return new Response(JSON.stringify({ items: [], total: 0, offset: 0, limit: 20 }), { status: 200 });
  }) as typeof fetch;

  try {
    await apiModel.systemDocuments({ name: "Quy chế", visibility: "PUBLIC_INTERNAL", offset: 0, limit: 20 });
    const sysUrl = new URL(calls.at(-1)!.url);
    assert.equal(sysUrl.pathname, "/api/v1/system/documents");
    assert.equal(sysUrl.searchParams.get("name"), "Quy chế");
    assert.equal(sysUrl.searchParams.get("visibility"), "PUBLIC_INTERNAL");

    const sysFile = new File(["%PDF-1.7"], "template.pdf", { type: "application/pdf" });
    await apiModel.uploadSystemDocument(sysFile, {
      name: "Mẫu kế hoạch.pdf",
      appDetailKey: "system.template",
      visibility: "OFFICERS",
    });
    const sysUpload = calls.at(-1)!;
    assert.equal(new URL(sysUpload.url).pathname, "/api/v1/system/documents");
    assert.equal(sysUpload.method, "POST");
    assert.equal((sysUpload.body as FormData).get("visibility"), "OFFICERS");
    assert.equal((sysUpload.body as FormData).get("name"), "Mẫu kế hoạch.pdf");

    await apiModel.documents("club-1", {
      departmentId: "dept-9",
      visibility: "DEPARTMENT_ONLY",
      name: "Biên bản",
    });
    const clubDocUrl = new URL(calls.at(-1)!.url);
    assert.equal(clubDocUrl.pathname, "/api/v1/clubs/club-1/documents");
    assert.equal(clubDocUrl.searchParams.get("departmentId"), "dept-9");
    assert.equal(clubDocUrl.searchParams.get("visibility"), "DEPARTMENT_ONLY");

    await apiModel.uploadDocument("club-1", sysFile, "Nội bộ.pdf", "dept.plan", {
      departmentId: "dept-9",
      visibility: "DEPARTMENT_ONLY",
    });
    const clubUpload = calls.at(-1)!;
    assert.equal((clubUpload.body as FormData).get("departmentId"), "dept-9");
    assert.equal((clubUpload.body as FormData).get("visibility"), "DEPARTMENT_ONLY");

    await apiModel.updateDocument("doc-1", { name: "Đổi tên.pdf", visibility: "OFFICERS" });
    const patchDoc = calls.at(-1)!;
    assert.equal(new URL(patchDoc.url).pathname, "/api/v1/documents/doc-1");
    assert.equal(patchDoc.method, "PATCH");
    assert.deepEqual(JSON.parse(patchDoc.body as string), { name: "Đổi tên.pdf", visibility: "OFFICERS" });

    const blob = await apiModel.previewDocument("doc-1", 2);
    assert.equal(new URL(calls.at(-1)!.url).pathname, "/api/v1/documents/doc-1/preview");
    assert.equal(new URL(calls.at(-1)!.url).searchParams.get("version"), "2");
    assert.equal(await blob.text(), "%PDF-1.7");

    await apiModel.channelMessages("ch-1", 0, 30, "msg-cursor-9");
    const msgUrl = new URL(calls.at(-1)!.url);
    assert.equal(msgUrl.pathname, "/api/v1/channels/ch-1/messages");
    assert.equal(msgUrl.searchParams.get("beforeId"), "msg-cursor-9");
    assert.equal(msgUrl.searchParams.get("limit"), "30");

    await apiModel.sendMessage("ch-1", {
      content: "Đính kèm biên bản",
      replyToId: "msg-1",
      documentId: "doc-1",
    });
    const postMsg = calls.at(-1)!;
    assert.equal(new URL(postMsg.url).pathname, "/api/v1/channels/ch-1/messages");
    assert.deepEqual(JSON.parse(postMsg.body as string), {
      content: "Đính kèm biên bản",
      replyToId: "msg-1",
      documentId: "doc-1",
    });

    await apiModel.markChannelRead("ch-1", "msg-2");
    const readCall = calls.at(-1)!;
    assert.equal(new URL(readCall.url).pathname, "/api/v1/channels/ch-1/read");
    assert.equal(readCall.method, "POST");
    assert.deepEqual(JSON.parse(readCall.body as string), { lastReadMessageId: "msg-2" });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("all Realtime Chat & Centralized Vault modules strictly obey the < 400 lines limit", () => {
  const repoRoot = path.resolve(process.cwd(), "..");
  const files = [
    "frontend/src/hooks/chat/useChatRealtime.ts",
    "frontend/src/hooks/chat/useClubChat.ts",
    "frontend/src/hooks/chat/useChatMessageSender.ts",
    "frontend/src/hooks/chat/useChatMessageActions.ts",
    "frontend/src/lib/chat-message-cache.ts",
    "frontend/src/forms/chat/chat-emojis.ts",
    "frontend/src/forms/chat/chat-status-meta.ts",
    "frontend/src/components/management/ChatTab.tsx",
    "frontend/src/components/management/ChatMessagePane.tsx",
    "frontend/src/components/management/ChatMessageBubble.tsx",
    "frontend/src/components/management/ChatMessageReactions.tsx",
    "frontend/src/components/management/ChatEmojiPopover.tsx",
    "frontend/src/components/management/ChatPinnedBar.tsx",
    "frontend/src/components/management/ChatComposerBar.tsx",
    "frontend/src/components/management/ChatMediaCollage.tsx",
    "frontend/src/components/management/ChatQuickReplyPopover.tsx",
    "frontend/src/components/management/ChatDocumentPickerModal.tsx",
    "frontend/src/components/document/DocumentsView.tsx",
    "frontend/src/components/document/DocumentFilterBar.tsx",
    "frontend/src/components/document/DocumentTable.tsx",
    "frontend/src/forms/document/document-filter-meta.ts",
    "frontend/src/components/document/DocumentDetailDrawer.tsx",
    "frontend/src/components/document/DocumentUploadModal.tsx",
    "frontend/src/components/document/DocumentPreviewModal.tsx",
    "frontend/src/components/management/ClubMemberAccessSection.tsx",
    "frontend/src/components/management/ClubMemberModals.tsx",
    "frontend/src/components/management/ClubManagementView.tsx",
    "frontend/src/config/navigation.tsx",
    "frontend/src/api/chat/chat.api.ts",
    "frontend/src/api/document/documents.api.ts",
    "backend/springboot/src/main/java/com/vju/club/storage/impl/GoogleDriveDocumentStorage.java",
    "backend/springboot/src/main/java/com/vju/club/storage/impl/GoogleDriveTokenProvider.java",
    "backend/springboot/src/main/java/com/vju/club/service/impl/DocumentServiceImpl.java",
    "backend/springboot/src/main/java/com/vju/club/service/impl/DocumentAccessPolicy.java",
    "backend/springboot/src/main/java/com/vju/club/service/impl/DocumentVaultWriter.java",
    "backend/springboot/src/main/java/com/vju/club/controller/DocumentController.java",
    "backend/springboot/src/main/java/com/vju/club/service/impl/ChatServiceImpl.java",
    "backend/springboot/src/main/java/com/vju/club/service/impl/ChatPinService.java",
    "backend/springboot/src/main/java/com/vju/club/service/impl/ChatReactionService.java",
    "backend/springboot/src/main/java/com/vju/club/service/impl/ChatDeliveryReceiptService.java",
    "backend/springboot/src/main/java/com/vju/club/service/impl/ChatMediaService.java",
    "backend/springboot/src/main/java/com/vju/club/service/impl/ChatQuickReplyService.java",
    "backend/springboot/src/main/java/com/vju/club/controller/ChatMediaController.java",
    "backend/springboot/src/main/java/com/vju/club/service/impl/PermissionServiceImpl.java",
    "backend/springboot/src/main/java/com/vju/club/service/impl/ChatSummaryServiceImpl.java",
    "backend/springboot/src/main/java/com/vju/club/service/impl/ChatRealtimeBroker.java",
    "backend/springboot/src/main/java/com/vju/club/security/websocket/ChatStompChannelInterceptor.java",
    "backend/springboot/src/main/java/com/vju/club/security/websocket/SessionHandshakeInterceptor.java",
    "backend/springboot/src/main/java/com/vju/club/security/websocket/WebSocketSessionTracker.java",
    "backend/springboot/src/main/java/com/vju/club/config/WebSocketConfig.java",
  ];

  for (const rel of files) {
    const abs = path.join(repoRoot, rel);
    const lines = fs.readFileSync(abs, "utf8").split("\n").length;
    assert.ok(lines < 400, `Expected ${rel} to be < 400 lines, got ${lines}`);
  }
});

test("PB-87 restructured 5-group officer/admin sidebar and preserved student document vault navigation", async () => {
  const { buildNavigationSections, isNavItemActive, resolveActiveNavMeta } = await import("@/config/navigation");
  const { computeVisibleClubTabs } = await import("@/forms/club/club-form");
  const { CLUB_MANAGEMENT_KEYS, CLUB_WORKSPACE_KEYS } = await import("@/hooks/useSession");

  for (const key of ["document.upload", "document.restore", "permission.view", "permission.assign", "permission.revoke"]) {
    assert.ok(CLUB_MANAGEMENT_KEYS.includes(key), `Expected ${key} in CLUB_MANAGEMENT_KEYS`);
    assert.ok(CLUB_WORKSPACE_KEYS.includes(key), `Expected ${key} in CLUB_WORKSPACE_KEYS`);
  }

  const officerPerms = new Set([
    "club.view",
    "club.update",
    "member.view",
    "department.view",
    "application.view",
    "application.manage_form",
    "event.view",
    "task.view",
    "document.view",
    "document.upload",
    "chat.view",
    "permission.view",
    "permission.assign",
    "role.view",
  ]);
  const officerNav = buildNavigationSections({
    authenticated: true,
    mustChangePassword: false,
    can: (k) => officerPerms.has(k),
    hasGlobal: () => false,
  });
  const officerGroups = officerNav.flatMap((s) => s.groups);
  assert.deepEqual(
    officerGroups.map((g) => g.id),
    ["grp-club", "grp-members", "grp-activities", "grp-personal"],
    "Club Officer without global admin perms should see 4 groups with Cá nhân at the bottom"
  );
  assert.equal(officerGroups.some((g) => g.id === "grp-documents"), false, "Officer nav must omit standalone grp-documents");
  assert.equal(officerGroups.some((g) => g.id === "grp-sys"), false, "Club-only role.view should not expose System Admin group");

  const personalGroup = officerGroups.find((g) => g.id === "grp-personal")!;
  assert.deepEqual(
    personalGroup.items.map((i) => i.href),
    ["/profile", "/clubs", "/applications", "/schedule", "/notifications"],
    "Club Officer Group 1 (Cá nhân) includes /clubs without duplicating inside Câu lạc bộ"
  );

  const clubGroup = officerGroups.find((g) => g.id === "grp-club")!;
  assert.deepEqual(
    clubGroup.items.map((i) => ({ href: i.href, label: i.label })),
    [
      { href: "/management?tab=clubs", label: "Danh sách CLB" },
      { href: "/management?tab=overview", label: "Thống kê CLB" },
      { href: "/management?tab=settings", label: "Cài đặt CLB" },
    ]
  );

  const membersGroup = officerGroups.find((g) => g.id === "grp-members")!;
  assert.deepEqual(
    membersGroup.items.map((i) => ({ tab: i.tab, label: i.label })),
    [
      { tab: "members", label: "Thành viên" },
      { tab: "departments", label: "Các ban hoạt động" },
      { tab: "applications", label: "Đơn ứng tuyển" },
    ]
  );

  const actGroup = officerGroups.find((g) => g.id === "grp-activities")!;
  assert.deepEqual(
    actGroup.items.map((i) => ({ tab: i.tab, label: i.label })),
    [
      { tab: "events", label: "Sự kiện" },
      { tab: "certificates", label: "Chứng nhận" },
      { tab: "tasks", label: "Công việc" },
      { tab: "documents", label: "Tài liệu CLB & Biểu mẫu" },
      { tab: "chat", label: "Chat & AI" },
    ]
  );
  const docsItem = actGroup.items.find((i) => i.tab === "documents")!;
  assert.equal(isNavItemActive(docsItem, "/management", "documents"), true);
  assert.equal(isNavItemActive(docsItem, "/management", "forms"), true);
  assert.equal(isNavItemActive(docsItem, "/management", "events"), false);

  assert.equal(resolveActiveNavMeta(officerNav, "/management", "departments").pageTitle, "Các ban hoạt động");
  assert.equal(resolveActiveNavMeta(officerNav, "/management", "documents").pageTitle, "Tài liệu CLB & Biểu mẫu");

  const adminNav = buildNavigationSections({
    authenticated: true,
    mustChangePassword: false,
    can: () => true,
    hasGlobal: () => true,
  });
  const adminGroups = adminNav.flatMap((s) => s.groups);
  assert.deepEqual(
    adminGroups.map((g) => g.id),
    ["grp-club", "grp-members", "grp-activities", "grp-sys", "grp-personal"],
    "System Admin sidebar must have exactly 5 clean groups with Cá nhân at the bottom"
  );
  const adminAllHrefs = adminGroups.flatMap((g) => g.items.map((i) => i.href));
  assert.equal(
    adminAllHrefs.includes("/clubs"),
    false,
    "System Admin sidebar must omit redundant /clubs since Danh sách CLB already lists all clubs"
  );

  const studentPerms = new Set(["club.view", "event.view", "document.view"]);
  const studentNav = buildNavigationSections({
    authenticated: true,
    mustChangePassword: false,
    can: (k) => studentPerms.has(k),
    hasGlobal: () => false,
  });
  const studentGroups = studentNav.flatMap((s) => s.groups);
  assert.deepEqual(
    studentGroups.map((g) => g.id),
    ["grp-student-clubs", "grp-student-activities", "grp-student-personal"],
    "Student sidebar must be consolidated into 3 clean groups without duplicate document entries"
  );
  const studentActGroup = studentGroups.find((g) => g.id === "grp-student-activities")!;
  const studentDocItem = studentActGroup.items.find((i) => i.href === "/documents");
  assert.ok(studentDocItem, "Student sidebar must have 1 unified Tài liệu & Quy chế entry");
  assert.equal(isNavItemActive(studentDocItem!, "/documents", null, "club"), true);
  assert.equal(isNavItemActive(studentDocItem!, "/documents", null, "system"), true);

  const { STARTER_PRIORITY, resolveTabId } = await import("@/components/layout/WorkspaceTabSpecs");
  assert.deepEqual(STARTER_PRIORITY, ["route:/dashboard"], "WorkspaceTabBar must only pre-open Tổng quan by default");
  assert.equal(resolveTabId("/documents", null, "club"), "route:/documents");
  assert.equal(resolveTabId("/documents", null, "system"), "route:/documents");

  const visibleTabs = computeVisibleClubTabs("club-1", (k) => officerPerms.has(k));
  assert.ok(visibleTabs.some((t) => t.value === "documents"), "Expected documents tab in computeVisibleClubTabs");
  assert.ok(visibleTabs.some((t) => t.value === "members"), "Expected members tab when holding permission.assign");
});

test("PB-87 /home nav anchors match exact 5-section order with zero #tin-tuc and deduplicated /clubs CTAs", () => {
  const homeDir = path.join(process.cwd(), "src/components/home");
  const headerSrc = fs.readFileSync(path.join(homeDir, "HomeSiteHeader.tsx"), "utf8");
  const landingSrc = fs.readFileSync(path.join(homeDir, "HomeLandingView.tsx"), "utf8");
  const clubsEventsSrc = fs.readFileSync(path.join(homeDir, "HomeClubsEventsSections.tsx"), "utf8");
  const eventsSrc = fs.readFileSync(path.join(homeDir, "HomeEventsSection.tsx"), "utf8");
  const workspaceSrc = fs.readFileSync(path.join(homeDir, "HomeWorkspaceShowcase.tsx"), "utf8");
  const campusSrc = fs.readFileSync(path.join(homeDir, "HomeCampusLifeSection.tsx"), "utf8");
  const footerSrc = fs.readFileSync(path.join(homeDir, "HomeOnboardingFooter.tsx"), "utf8");

  const expectedAnchors = ["#top", "#cau-lac-bo", "#su-kien-ctv", "#khong-gian-so", "#lich-su-kien"];
  let prevIdx = -1;
  for (const anchor of expectedAnchors) {
    const idx = headerSrc.indexOf(`href="${anchor}"`);
    assert.ok(idx > prevIdx, `Expected HomeSiteHeader desktop nav to contain ${anchor} in order`);
    prevIdx = idx;
  }
  assert.equal(headerSrc.includes("#tin-tuc"), false, "HomeSiteHeader must not contain broken #tin-tuc anchor");
  assert.equal(eventsSrc.includes('id="su-kien-ctv"'), true, "HomeEventsSection must expose id=su-kien-ctv");
  assert.equal(eventsSrc.includes('id="tin-tuc"'), false, "HomeEventsSection must not use legacy id=tin-tuc");
  assert.equal(landingSrc.includes('id="top"'), true, "HomeLandingView must expose id=top");
  assert.equal(campusSrc.includes('id="lich-su-kien"'), true, "HomeCampusLifeSection must expose id=lich-su-kien");

  assert.equal(clubsEventsSrc.includes("HomeCampusLifeSection"), false, "HomeCampusLifeSection must not split Clubs and Events");
  assert.ok(
    landingSrc.indexOf("<HomeClubsEventsSections") < landingSrc.indexOf("<HomeWorkspaceShowcase") &&
      landingSrc.indexOf("<HomeWorkspaceShowcase") < landingSrc.indexOf("<HomeCampusLifeSection") &&
      landingSrc.indexOf("<HomeCampusLifeSection") < landingSrc.indexOf("<HomeOnboardingFooter"),
    "HomeLandingView must compose sections in exact 5-tab sequence"
  );

  assert.equal(workspaceSrc.includes("viewDirectoryCta"), false, "Workspace showcase must omit duplicate /clubs CTA");
  assert.equal(campusSrc.includes("exploreClubsCta"), false, "Campus life section must omit duplicate /clubs CTA");
  assert.equal(footerSrc.includes("galleryCta"), false, "Gallery header must omit duplicate /clubs CTA");
  assert.equal(footerSrc.includes("clubsCta"), false, "Closing CTA banner must omit duplicate /clubs CTA");
});

test("document-filter-meta classifies file formats, maps VJU category labels, filters Club-only vs Dept, and sorts", async () => {
  const {
    classifyDocumentFormat,
    collectDocumentCategoryOptions,
    filterAndSortDocuments,
    formatDocumentCategoryLabel,
  } = await import("@/forms/document/document-filter-meta");
  const { fileExtension } = await import("@/lib/utils");

  assert.equal(formatDocumentCategoryLabel("semester_plan"), "Kế hoạch học kỳ");
  assert.equal(formatDocumentCategoryLabel("club.plan"), "Kế hoạch CLB");
  assert.equal(formatDocumentCategoryLabel("club_charter"), "Quy chế hoạt động");
  assert.equal(formatDocumentCategoryLabel("custom.tag"), "custom.tag");
  assert.equal(classifyDocumentFormat({ name: "Plan.pdf", contentType: "application/pdf" }), "pdf");
  assert.equal(classifyDocumentFormat({ name: "Quy chế CLB v1.0", contentType: "application/pdf" }), "pdf");
  assert.equal(
    classifyDocumentFormat({
      name: "Dự trù kinh phí Gen 3",
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    "sheet"
  );
  assert.equal(
    classifyDocumentFormat({
      name: "Biên bản họp",
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    "word"
  );
  assert.equal(
    classifyDocumentFormat({
      name: "Slide thuyết trình",
      contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }),
    "slide"
  );
  assert.equal(classifyDocumentFormat({ name: "Budget.xlsx", contentType: "application/octet-stream" }), "sheet");
  assert.equal(fileExtension("malware.exe"), "exe");
  assert.equal(fileExtension("Quy chế v1.0", "application/pdf"), "pdf");
  assert.equal(
    fileExtension("Kế hoạch năm", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
    "docx"
  );

  const catOpts = collectDocumentCategoryOptions([], "", false);
  assert.equal(catOpts.find((o) => o.value === "semester_plan")?.label, "Kế hoạch học kỳ");

  const sample = [
    {
      id: "d-1",
      ownerId: "u-1",
      name: "B-Quy-che.pdf",
      path: "/a",
      version: 1,
      contentType: "application/pdf",
      sizeBytes: 500,
      checksumSha256: "x",
      appDetailKey: "club_charter",
      deleted: false,
      createdAt: "2026-11-10T00:00:00Z",
      updatedAt: "2026-11-10T00:00:00Z",
    },
    {
      id: "d-2",
      ownerId: "u-1",
      departmentId: "dep-1",
      name: "A-Ngan-sach.xlsx",
      path: "/b",
      version: 2,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: 2048,
      checksumSha256: "y",
      appDetailKey: "budget.report",
      deleted: false,
      createdAt: "2026-11-12T00:00:00Z",
      updatedAt: "2026-11-12T00:00:00Z",
    },
  ];

  const clubOnly = filterAndSortDocuments(sample, {
    scopeFilter: "__CLUB_ONLY__",
    formatFilter: "",
    sortBy: "newest",
  });
  assert.deepEqual(clubOnly.map((d) => d.id), ["d-1"]);

  const sortedByName = filterAndSortDocuments(sample, {
    scopeFilter: "",
    formatFilter: "",
    sortBy: "name_asc",
  });
  assert.deepEqual(sortedByName.map((d) => d.id), ["d-2", "d-1"]);

  const sheetsOnly = filterAndSortDocuments(sample, {
    scopeFilter: "",
    formatFilter: "sheet",
    sortBy: "size_desc",
  });
  assert.deepEqual(sheetsOnly.map((d) => d.id), ["d-2"]);
});
