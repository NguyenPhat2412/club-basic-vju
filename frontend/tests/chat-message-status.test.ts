import assert from "node:assert/strict";
import test from "node:test";
import {
  applyChannelDeliveredReceipt,
  applyChannelReadReceipt,
  normalizeMessageDeliveryStatus,
  resolveChatMessageStatusMeta,
} from "@/forms/chat/chat-status-meta";
import {
  getTelegramJumbomojiCount,
  insertTextAtCursor,
  toggleOptimisticMessageReaction,
} from "@/forms/chat/chat-emojis";
import { translateUiText } from "@/i18n/translator";
import { reconcileIncomingChatMessage } from "@/lib/chat-message-cache";
import type { ChatMessage } from "@/types/chat/chat.types";

function makeMsg(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "m-1",
    channelId: "ch-1",
    senderId: "u-me",
    senderType: "USER",
    content: "Xin chào CLB!",
    createdAt: "2026-11-16T10:00:00Z",
    ...overrides,
  };
}

test("resolveChatMessageStatusMeta covers all 6 message lifecycle states (uploading, sending, sent, delivered, seen, failed)", () => {
  const uploading = resolveChatMessageStatusMeta(
    makeMsg({ optimistic: true, deliveryStatus: "uploading" })
  );
  assert.equal(uploading.status, "uploading");
  assert.equal(uploading.detailLabel, "Đang tải tệp…");

  const sending = resolveChatMessageStatusMeta(
    makeMsg({ optimistic: true, deliveryStatus: "sending" })
  );
  assert.equal(sending.status, "sending");
  assert.equal(sending.detailLabel, "Đang gửi…");

  const sent = resolveChatMessageStatusMeta(makeMsg({ deliveryStatus: "SENT" }));
  assert.equal(sent.status, "sent");
  assert.equal(sent.detailLabel, "Đã gửi");

  const delivered = resolveChatMessageStatusMeta(
    makeMsg({ deliveryStatus: "DELIVERED", deliveredAt: "2026-11-16T10:00:02Z" })
  );
  assert.equal(delivered.status, "delivered");
  assert.equal(delivered.detailLabel, "Đã nhận");

  const seenSingle = resolveChatMessageStatusMeta(
    makeMsg({
      deliveryStatus: "SEEN",
      seenCount: 1,
      seenByNames: ["Nguyễn Văn A"],
      lastSeenAt: "2026-11-16T10:01:00Z",
    })
  );
  assert.equal(seenSingle.status, "seen");
  assert.equal(seenSingle.detailLabel, "Đã xem · Nguyễn Văn A");

  const seenMany = resolveChatMessageStatusMeta(
    makeMsg({
      deliveryStatus: "SEEN",
      seenCount: 3,
      seenByNames: ["Nguyễn Văn A", "Trần Thị B"],
    })
  );
  assert.equal(seenMany.detailLabel, "Đã xem (3)");

  const failed = resolveChatMessageStatusMeta(
    makeMsg({ optimistic: true, deliveryStatus: "failed", deliveryError: "Mất kết nối mạng" })
  );
  assert.equal(failed.status, "failed");
  assert.equal(failed.detailLabel, "Gửi lỗi: Mất kết nối mạng");
});

test("realtime CHANNEL_DELIVERED, CHANNEL_READ, and out-of-order HTTP responses preserve highest delivery state", () => {
  const initial = [makeMsg({ id: "m-1", deliveryStatus: "SENT" })];

  const afterDelivered = applyChannelDeliveredReceipt(
    initial,
    "u-bob",
    "u-me",
    "2026-11-16T10:00:05Z"
  );
  assert.equal(normalizeMessageDeliveryStatus(afterDelivered[0]!), "delivered");

  const afterRead = applyChannelReadReceipt(
    afterDelivered,
    "u-bob",
    "Phạm Minh B",
    "u-me",
    "2026-11-16T10:00:10Z"
  );
  assert.equal(normalizeMessageDeliveryStatus(afterRead[0]!), "seen");
  assert.equal(afterRead[0]!.seenCount, 1);
  assert.deepEqual(afterRead[0]!.seenByNames, ["Phạm Minh B"]);

  // Late HTTP response arriving with SENT does not downgrade SEEN
  const lateHttp = reconcileIncomingChatMessage(
    { items: afterRead, total: 1, offset: 0, limit: 50 },
    makeMsg({ id: "m-1", deliveryStatus: "SENT" })
  );
  assert.equal(normalizeMessageDeliveryStatus(lateHttp.page.items[0]!), "seen");
  assert.equal(lateHttp.page.items[0]!.seenCount, 1);
});

test("i18n translates all 6 chat message status labels, tooltips, and dynamic seen/failed patterns into EN and JA", () => {
  assert.equal(translateUiText("Đang tải tệp…", "en"), "Uploading files…");
  assert.equal(translateUiText("Đã nhận", "en"), "Delivered");
  assert.equal(translateUiText("Đã xem · Nguyễn Văn A", "en"), "Seen · Nguyễn Văn A");
  assert.equal(translateUiText("Đã xem (4)", "ja"), "既読 (4)");
  assert.equal(translateUiText("Gửi lỗi: Không thể kết nối tới máy chủ", "en"), "Failed: Unable to connect to server");
  assert.equal(translateUiText("Đã gửi lên máy chủ lúc 17:27:31", "en"), "Sent to server at 17:27:31");
  assert.equal(translateUiText("Đã nhận lúc 17:28:00", "ja"), "受信日時: 17:28:00");
  assert.equal(translateUiText("Đã xem bởi Nguyễn Văn A lúc 17:29:00", "en"), "Seen by Nguyễn Văn A at 17:29:00");
  assert.equal(translateUiText("Đã thả ❤️: Nguyễn Văn A", "en"), "Reacted ❤️: Nguyễn Văn A");
  assert.equal(translateUiText("Thả cảm xúc", "ja"), "リアクションを追加");
});

test("Telegram reactions toggle, cap at 3 per user, insert emojis at cursor, and detect 1-3 Jumbomojis", () => {
  let msg = makeMsg({ id: "m-tg" });
  msg = toggleOptimisticMessageReaction(msg, "❤️", "u-me", "Local Admin");
  msg = toggleOptimisticMessageReaction(msg, "🔥", "u-me", "Local Admin");
  msg = toggleOptimisticMessageReaction(msg, "🎉", "u-me", "Local Admin");
  assert.deepEqual(
    msg.reactions?.map((r) => r.emoji),
    ["❤️", "🔥", "🎉"]
  );

  // 4th distinct reaction replaces oldest ("❤️") just like Telegram
  msg = toggleOptimisticMessageReaction(msg, "👏", "u-me", "Local Admin");
  assert.deepEqual(
    msg.reactions?.map((r) => r.emoji),
    ["🔥", "🎉", "👏"]
  );

  // Clicking existing reaction toggles it off
  msg = toggleOptimisticMessageReaction(msg, "🎉", "u-me", "Local Admin");
  assert.deepEqual(
    msg.reactions?.map((r) => r.emoji),
    ["🔥", "👏"]
  );

  const inserted = insertTextAtCursor("Chào CLB!", " 🔥", 4, 4);
  assert.equal(inserted.nextValue, "Chào 🔥 CLB!");
  assert.equal(inserted.nextCursor, 7);

  assert.equal(getTelegramJumbomojiCount("❤️", false), 1);
  assert.equal(getTelegramJumbomojiCount("🔥 🎉", false), 2);
  assert.equal(getTelegramJumbomojiCount("👍 ❤️ 🚀", false), 3);
  assert.equal(getTelegramJumbomojiCount("👍 ❤️ 🚀 💯", false), 0);
  assert.equal(getTelegramJumbomojiCount("Chào ❤️", false), 0);
  assert.equal(getTelegramJumbomojiCount("❤️", true), 0);
});
