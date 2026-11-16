import assert from "node:assert/strict";
import test from "node:test";
import { apiModel } from "@/lib/api";
import {
  notificationReferenceMeta,
  targetHrefForNotification,
} from "@/forms/notification/notification-links";

test("targetHrefForNotification deep-links CHAT, CLUB_APPLICATION_REVIEW, DOCUMENT, and DEPARTMENT accurately", () => {
  const chatLink = targetHrefForNotification({
    id: "n-1",
    title: "Nguyễn Văn A đã trả lời bạn",
    message: "Mình đã chuẩn bị xong slide",
    read: false,
    referenceType: "CHAT",
    referenceId: "ch-123",
    clubId: "club-456",
    createdAt: "2026-11-16T08:00:00Z",
  });
  assert.deepEqual(chatLink, {
    href: "/management?tab=chat&clubId=club-456&channelId=ch-123",
    label: "Mở kênh thảo luận",
  });
  assert.equal(notificationReferenceMeta("CHAT").group, "chat");

  const appReviewLink = targetHrefForNotification({
    id: "n-2",
    title: "Đơn ứng tuyển mới",
    message: "Sinh viên vừa nộp đơn",
    read: false,
    referenceType: "CLUB_APPLICATION_REVIEW",
    referenceId: "club-456",
    createdAt: "2026-11-16T08:00:00Z",
  });
  assert.deepEqual(appReviewLink, {
    href: "/management?tab=applications&clubId=club-456",
    label: "Duyệt đơn ứng tuyển",
  });

  const docLink = targetHrefForNotification({
    id: "n-3",
    title: "Tài liệu mới",
    message: "Quy chế hoạt động",
    read: false,
    referenceType: "DOCUMENT",
    referenceId: "club-456",
    createdAt: "2026-11-16T08:00:00Z",
  });
  assert.deepEqual(docLink, {
    href: "/documents?tier=club&clubId=club-456",
    label: "Mở kho tài liệu",
  });
});

test("apiModel.unreadNotificationSummary calls GET /api/v1/users/me/notifications/unread-summary", async () => {
  let calledUrl = "";
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL) => {
    calledUrl = String(input);
    return new Response(
      JSON.stringify({
        unreadNotifications: 3,
        unreadChatMessages: 5,
        latestUnreadClubId: "club-1",
        latestUnreadChannelId: "ch-9",
      }),
      { status: 200 }
    );
  }) as typeof fetch;

  try {
    const res = await apiModel.unreadNotificationSummary();
    const url = new URL(calledUrl);
    assert.equal(url.pathname, "/api/v1/users/me/notifications/unread-summary");
    assert.equal(res.unreadNotifications, 3);
    assert.equal(res.unreadChatMessages, 5);
    assert.equal(res.latestUnreadChannelId, "ch-9");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
