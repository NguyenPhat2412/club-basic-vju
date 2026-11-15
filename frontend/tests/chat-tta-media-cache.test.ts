import test from "node:test";
import assert from "node:assert/strict";
import { apiModel } from "@/lib/api";
import {
  CHAT_MAX_IMAGE_OR_FILE_BYTES,
  CHAT_MAX_VIDEO_BYTES,
  areMessagesInSameDisplayGroup,
  canApplyActiveChannelMessage,
  chunkAlbumRows,
  filterChannelMessages,
  getAlbumRows,
  getCachedChatAttachmentUrl,
  getCachedPinnedMessages,
  isComposerImeComposing,
  readRealtimeChatMessage,
  reconcileIncomingChatMessage,
  reconcilePinnedChatMessage,
  saveCachedPinnedMessages,
  seedChatAttachmentPreviewUrl,
  setMessageWindowCacheEntry,
  shouldIgnoreTrailingComposerImeText,
  validateChatMediaFile,
} from "@/lib/chat-message-cache";
import type { ChatMessage } from "@/types/chat/chat.types";

test("setMessageWindowCacheEntry enforces LRU cap while protecting active channel", () => {
  const cache = new Map<string, number>();
  setMessageWindowCacheEntry(cache, "ch-active", 1, 2, "ch-active");
  setMessageWindowCacheEntry(cache, "ch-2", 2, 2, "ch-active");
  setMessageWindowCacheEntry(cache, "ch-3", 3, 2, "ch-active");

  assert.equal(cache.has("ch-active"), true);
  assert.equal(cache.has("ch-2"), false);
  assert.equal(cache.has("ch-3"), true);
});

test("reconcileIncomingChatMessage swaps optimistic clientTempId in-place and preserves seeded blob URLs", () => {
  const optimistic: ChatMessage = {
    id: "temp-123",
    clientTempId: "temp-123",
    optimistic: true,
    channelId: "ch-1",
    senderId: "u-1",
    senderType: "USER",
    content: "Ảnh sự kiện Hòa Lạc",
    attachments: [
      {
        id: "local-1",
        channelId: "ch-1",
        fileName: "stage.png",
        contentType: "image/png",
        mediaKind: "IMAGE",
        sizeBytes: 2048,
        checksumSha256: "",
        sortOrder: 0,
        localPreviewUrl: "blob:http://localhost:3000/stage-local",
      },
    ],
    createdAt: "2026-11-15T15:00:00Z",
  };

  const page0 = { items: [optimistic], total: 1, offset: 0, limit: 50 };
  const confirmed: ChatMessage = {
    id: "msg-server-999",
    clientTempId: "temp-123",
    channelId: "ch-1",
    senderId: "u-1",
    senderType: "USER",
    content: "Ảnh sự kiện Hòa Lạc",
    attachments: [
      {
        id: "att-server-777",
        channelId: "ch-1",
        messageId: "msg-server-999",
        fileName: "stage.png",
        contentType: "image/png",
        mediaKind: "IMAGE",
        sizeBytes: 2048,
        checksumSha256: "abc",
        sortOrder: 0,
      },
    ],
    createdAt: "2026-11-15T15:00:01Z",
  };

  const step1 = reconcileIncomingChatMessage(page0, confirmed);
  assert.equal(step1.insertedNew, false);
  assert.equal(step1.page.items.length, 1);
  assert.equal(step1.page.items[0]?.id, "msg-server-999");
  assert.equal(step1.page.items[0]?.optimistic, false);
  assert.equal(
    step1.page.items[0]?.attachments?.[0]?.localPreviewUrl,
    "blob:http://localhost:3000/stage-local"
  );
  assert.equal(getCachedChatAttachmentUrl("att-server-777"), "blob:http://localhost:3000/stage-local");

  // Duplicate WS/HTTP delivery does not duplicate the message
  const step2 = reconcileIncomingChatMessage(step1.page, confirmed);
  assert.equal(step2.insertedNew, false);
  assert.equal(step2.page.items.length, 1);
  assert.equal(step2.page.total, 1);

  // Guard helpers validate channel identity cleanly
  assert.equal(
    canApplyActiveChannelMessage({ activeChannelId: "ch-1", channelId: "ch-1", message: confirmed }),
    true
  );
  assert.equal(
    canApplyActiveChannelMessage({ activeChannelId: "ch-2", channelId: "ch-1", message: confirmed }),
    false
  );
  assert.ok(readRealtimeChatMessage(confirmed, "ch-1"));
  assert.equal(readRealtimeChatMessage(confirmed, "ch-other"), null);
});

test("validateChatMediaFile & IME guard support images, 50MB videos, documents, and Vietnamese Telex", () => {
  seedChatAttachmentPreviewUrl("att-manual", "blob:http://localhost:3000/manual");
  assert.equal(getCachedChatAttachmentUrl("att-manual"), "blob:http://localhost:3000/manual");

  assert.deepEqual(validateChatMediaFile({ name: "photo.webp", size: 4096, type: "image/webp" }), {
    kind: "IMAGE",
    error: null,
  });
  assert.deepEqual(validateChatMediaFile({ name: "rehearsal.mp4", size: 35 * 1024 * 1024, type: "video/mp4" }), {
    kind: "VIDEO",
    error: null,
  });
  assert.match(
    validateChatMediaFile({ name: "too-big.mp4", size: CHAT_MAX_VIDEO_BYTES + 1, type: "video/mp4" }).error ?? "",
    /50 MB/
  );
  assert.match(
    validateChatMediaFile({ name: "too-big.png", size: CHAT_MAX_IMAGE_OR_FILE_BYTES + 1, type: "image/png" }).error ?? "",
    /20 MB/
  );
  assert.match(validateChatMediaFile({ name: "script.exe", size: 256, type: "application/octet-stream" }).error ?? "", /\.exe/);

  assert.equal(isComposerImeComposing({ nativeEvent: { isComposing: true } }), true);
  assert.equal(isComposerImeComposing({ keyCode: 229 }), true);
  assert.equal(isComposerImeComposing({ key: "Enter" }), false);

  const now = Date.now();
  assert.equal(
    shouldIgnoreTrailingComposerImeText(
      { hasUserTypedSinceSend: false, sentAt: now - 50, sentBody: "Xin chào Việt Nhật" },
      "Nhật",
      now
    ),
    true
  );
});

test("apiModel builds exact Chat Media & Quick Replies HTTP endpoints", async () => {
  const calls: Array<{ url: string; method: string; body?: string | FormData }> = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method || "GET").toUpperCase();
    calls.push({ url, method, body: init?.body as string | FormData | undefined });
    if (method === "DELETE") return new Response(null, { status: 204 });
    return new Response(JSON.stringify([]), { status: 200 });
  }) as typeof fetch;

  try {
    const videoFile = new File(["ftypisom"], "highlight.mp4", { type: "video/mp4" });
    await apiModel.uploadChatAttachment("ch-99", videoFile);
    assert.equal(new URL(calls.at(-1)!.url).pathname, "/api/v1/channels/ch-99/attachments");
    assert.equal(calls.at(-1)!.method, "POST");

    await apiModel.sendMessage("ch-99", {
      content: "",
      attachmentIds: ["att-1", "att-2"],
      clientTempId: "temp-abc",
    });
    assert.deepEqual(JSON.parse(calls.at(-1)!.body as string), {
      content: "",
      attachmentIds: ["att-1", "att-2"],
      clientTempId: "temp-abc",
    });

    await apiModel.clubQuickReplies("club-12");
    assert.equal(new URL(calls.at(-1)!.url).pathname, "/api/v1/clubs/club-12/quick-replies");

    await apiModel.createQuickReply("club-12", {
      shortcut: "/hop",
      title: "Họp CLB",
      content: "Nhắc lịch họp tối nay!",
    });
    assert.equal(calls.at(-1)!.method, "POST");
    assert.equal(new URL(calls.at(-1)!.url).pathname, "/api/v1/clubs/club-12/quick-replies");

    await apiModel.pinnedMessages("ch-99");
    assert.equal(new URL(calls.at(-1)!.url).pathname, "/api/v1/channels/ch-99/pinned-messages");
    assert.equal(calls.at(-1)!.method, "GET");

    await apiModel.pinMessage("ch-99", "msg-55");
    assert.equal(new URL(calls.at(-1)!.url).pathname, "/api/v1/channels/ch-99/messages/msg-55/pin");
    assert.equal(calls.at(-1)!.method, "POST");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("filterChannelMessages and Messenger pinned cache prevent cross-channel bleed on rapid switches", () => {
  const mixed: ChatMessage[] = [
    { id: "m-a1", channelId: "ch-A", senderType: "USER", content: "Kênh A", createdAt: "2026-11-15T15:00:00Z" },
    { id: "m-b1", channelId: "ch-B", senderType: "USER", content: "Kênh B", createdAt: "2026-11-15T15:00:01Z" },
  ];
  assert.deepEqual(filterChannelMessages(mixed, "ch-A").map((m) => m.id), ["m-a1"]);
  assert.deepEqual(filterChannelMessages(mixed, "ch-B").map((m) => m.id), ["m-b1"]);

  const pinnedAfterPin = reconcilePinnedChatMessage([], mixed[0]!, true);
  assert.equal(pinnedAfterPin.length, 1);
  assert.equal(pinnedAfterPin[0]?.pinned, true);
  saveCachedPinnedMessages("ch-A", pinnedAfterPin, "user-1", "ch-A");
  assert.equal(getCachedPinnedMessages("ch-A", "user-1")?.items.length, 1);

  const pinnedAfterUnpin = reconcilePinnedChatMessage(pinnedAfterPin, mixed[0]!, false);
  assert.equal(pinnedAfterUnpin.length, 0);
});

test("Chat-TTA album rows and 5-minute sender grouping stay compact and accurate", () => {
  assert.deepEqual(getAlbumRows(1), [1]);
  assert.deepEqual(getAlbumRows(2), [2]);
  assert.deepEqual(getAlbumRows(3), [3]);
  assert.deepEqual(getAlbumRows(4), [2, 2]);
  assert.deepEqual(getAlbumRows(5), [2, 3]);
  assert.deepEqual(getAlbumRows(7), [2, 2, 3]);
  assert.equal(chunkAlbumRows(["a", "b", "c", "d", "e"]).length, 2);

  const m1: ChatMessage = {
    id: "m1",
    channelId: "c1",
    senderId: "u1",
    senderType: "USER",
    content: "Chào mọi người",
    createdAt: "2026-11-15T15:00:00Z",
  };
  const m2: ChatMessage = {
    id: "m2",
    channelId: "c1",
    senderId: "u1",
    senderType: "USER",
    content: "Tối nay họp lúc 20h nhé",
    createdAt: "2026-11-15T15:02:00Z",
  };
  const mReply: ChatMessage = { ...m2, id: "m3", replyToId: "m1" };
  assert.equal(areMessagesInSameDisplayGroup(m1, m2), true);
  assert.equal(areMessagesInSameDisplayGroup(m1, mReply), false);
});
