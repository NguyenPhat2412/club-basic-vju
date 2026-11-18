import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { API_ROUTES } from "@/lib/api/routes";

test("chat moderation routes map cleanly to OpenAPI 3.1 endpoints", () => {
  assert.equal(API_ROUTES.clubs.channelItem("club-1", "ch-2"), "/clubs/club-1/channels/ch-2");
  assert.equal(API_ROUTES.channels.messageItem("ch-2", "msg-9"), "/channels/ch-2/messages/msg-9");
});

test("ChatMessageBubble and ChatChannelSidebar wire left/right-click context menus and stay < 400 lines", () => {
  const bubbleSrc = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/management/ChatMessageBubble.tsx"),
    "utf8"
  );
  const menuSrc = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/management/ChatMessageContextMenu.tsx"),
    "utf8"
  );
  const sidebarSrc = fs.readFileSync(
    path.resolve(process.cwd(), "src/components/management/ChatChannelSidebar.tsx"),
    "utf8"
  );

  assert.match(bubbleSrc, /onContextMenu=/, "Message bubble must support right-click context menu");
  assert.match(bubbleSrc, /onClick=/, "Message bubble must support left-click status/action menu");
  assert.match(menuSrc, /Xoá tin nhắn/, "Context menu must expose delete message action");
  assert.match(menuSrc, /Chỉnh sửa tin nhắn/, "Context menu must expose edit message action");
  assert.match(sidebarSrc, /Xoá kênh \/ nhóm chat/, "Channel sidebar must expose delete channel action");

  for (const [name, src] of [
    ["ChatMessageBubble.tsx", bubbleSrc],
    ["ChatMessageContextMenu.tsx", menuSrc],
    ["ChatChannelSidebar.tsx", sidebarSrc],
  ] as const) {
    assert.ok(src.split("\n").length < 400, `${name} must stay < 400 lines`);
  }
});
