import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { translateUiText } from "@/i18n/translator";
import { parseMutedChannelIds } from "@/forms/chat/chat-mute";
import {
  applyMentionReplacement,
  extractActiveMention,
} from "@/components/chat/FloatingChatMentionMenu";

const FLOATING_CHAT_FILES = [
  "src/providers/ChatDockProvider.tsx",
  "src/forms/chat/chat-mute.ts",
  "src/components/chat/TopbarChatMenu.tsx",
  "src/components/chat/FloatingChatDock.tsx",
  "src/components/chat/FloatingChatWindow.tsx",
  "src/components/chat/FloatingChatHeader.tsx",
  "src/components/chat/FloatingChatSearchBar.tsx",
  "src/components/chat/FloatingChatMessageList.tsx",
  "src/components/chat/FloatingChatMessageItem.tsx",
  "src/components/chat/FloatingChatMessageActions.tsx",
  "src/components/chat/FloatingChatComposer.tsx",
  "src/components/chat/FloatingChatComposerAttachments.tsx",
  "src/components/chat/FloatingChatMentionMenu.tsx",
  "src/components/chat/FloatingChatDocPicker.tsx",
  "src/components/chat/FloatingChatAiPopover.tsx",
];

test("all floating Messenger dock files stay strictly < 400 lines and wire P1 features", () => {
  for (const rel of FLOATING_CHAT_FILES) {
    const abs = path.join(process.cwd(), rel);
    const src = fs.readFileSync(abs, "utf8");
    const lines = src.split("\n").length;
    assert.ok(lines < 400, `${rel} must stay < 400 lines, got ${lines}`);
  }

  const winSrc = fs.readFileSync(path.join(process.cwd(), "src/components/chat/FloatingChatWindow.tsx"), "utf8");
  const listSrc = fs.readFileSync(path.join(process.cwd(), "src/components/chat/FloatingChatMessageList.tsx"), "utf8");
  assert.ok(winSrc.includes("FloatingChatHeader"), "floating window must wire FloatingChatHeader");
  assert.ok(winSrc.includes("FloatingChatSearchBar"), "floating window must wire FloatingChatSearchBar");
  assert.ok(winSrc.includes("useChatChannelMuted"), "floating window must wire per-channel mute");
  assert.ok(listSrc.includes("Tải tin cũ hơn"), "floating message list must support loading older messages");
  assert.ok(winSrc.includes("channelMessages(channel.id, 0, OLDER_PAGE_SIZE, oldest.id)"), "older pagination must pass cursor oldest.id");

  const msgSrc = fs.readFileSync(path.join(process.cwd(), "src/components/chat/FloatingChatMessageItem.tsx"), "utf8");
  const actSrc = fs.readFileSync(path.join(process.cwd(), "src/components/chat/FloatingChatMessageActions.tsx"), "utf8");
  assert.ok(msgSrc.includes("FloatingChatMessageActions"), "floating message must wire actions bar");
  assert.ok(actSrc.includes("ChatReactionTrigger"), "hover reactions must be wired");
  assert.ok(msgSrc.includes("ChatReactionPills"), "reaction pills must be rendered");
  assert.ok(msgSrc.includes("ChatMediaCollage"), "authenticated media collage must be rendered");
  assert.ok(msgSrc.includes('data-no-i18n="true"'), "user message content must be shielded from DOM i18n");

  const aiSrc = fs.readFileSync(path.join(process.cwd(), "src/components/chat/FloatingChatAiPopover.tsx"), "utf8");
  assert.ok(aiSrc.includes("summarizeChannel"), "floating AI popover must invoke summarizeChannel");

  const composerSrc = fs.readFileSync(path.join(process.cwd(), "src/components/chat/FloatingChatComposer.tsx"), "utf8");
  assert.ok(composerSrc.includes("/ai"), "composer must support /ai quick trigger");
  assert.ok(composerSrc.includes("onPaste"), "composer must support clipboard image paste");
  assert.ok(composerSrc.includes("FloatingChatMentionMenu"), "composer must wire @mention autocomplete");
  assert.ok(composerSrc.includes("FloatingChatDocPicker"), "composer must wire Document Vault picker");
  assert.ok(composerSrc.includes("attachedDoc"), "composer must render removable attached document chip");

  const notifSrc = fs.readFileSync(
    path.join(process.cwd(), "src/hooks/notification/useGlobalRealtimeNotifications.ts"),
    "utf8",
  );
  assert.ok(notifSrc.includes("isChatChannelMuted"), "global realtime notifications must respect per-channel mute");

  const topbarSrc = fs.readFileSync(path.join(process.cwd(), "src/components/chat/TopbarChatMenu.tsx"), "utf8");
  assert.ok(topbarSrc.includes("useMutedChatChannels"), "topbar chat menu must indicate muted channels");
});

test("mute parser and @mention helpers work cleanly", () => {
  assert.deepEqual(parseMutedChannelIds(null), []);
  assert.deepEqual(parseMutedChannelIds("not-json"), []);
  assert.deepEqual(parseMutedChannelIds('["ch-1","ch-2","ch-1","",123]'), ["ch-1", "ch-2"]);

  const span = extractActiveMention("Chào @nguy", 10);
  assert.deepEqual(span, { query: "nguy", start: 5, end: 10 });
  assert.equal(extractActiveMention("user@vju.ac.vn", 14), null);
  assert.equal(extractActiveMention("Xin chào @", 10)?.query, "");

  const replaced = applyMentionReplacement("Chào @nguy nhé", span!, "Nguyễn Minh Anh");
  assert.equal(replaced.nextValue, "Chào @Nguyễn Minh Anh  nhé");
  assert.equal(replaced.nextCursor, 22);
});

test("floating Messenger, search, mute, mention, doc picker, and AI labels translate cleanly to EN and JA", () => {
  const staticPhrases = [
    "Đoạn chat CLB",
    "Tìm kênh chat, tên CLB…",
    "Chưa đọc",
    "Mở toàn màn hình",
    "Thu gọn thành bong bóng",
    "Đóng khung chat",
    "Trợ lý AI CLB",
    "Phạm vi phân tích",
    "Đăng kết quả vào kênh chat",
    "Gọi AI tóm tắt kênh",
    "Bản tóm tắt gần nhất",
    "Quyết định chính",
    "Công việc đề xuất",
    "Sự kiện đề xuất",
    "Tuỳ chỉnh giao diện chat",
    "Kích thước khung chat",
    "Hoạ tiết nền",
    "Hình nền ảnh",
    "Độ làm dịu nền",
    "Kiểu bong bóng",
    "Cỡ chữ",
    "Mật độ",
    "Hiệu ứng chuyển động",
    "Tuỳ chọn tin nhắn",
    "Trả lời",
    "Sao chép văn bản",
    "Ghim tin nhắn",
    "Bỏ ghim",
    "Chỉnh sửa tin nhắn",
    "Xoá tin nhắn",
    "Nhắn tin hoặc gõ /ai…",
    "Aa · Nhắn tin, @nhắc tên hoặc /ai…",
    "Mở Trợ lý AI tóm tắt kênh này",
    "Gửi ảnh hoặc video",
    "Đính kèm tệp",
    "Chèn biểu cảm",
    "Tải tin cũ hơn",
    "Đang tải tin cũ…",
    "Tìm trong đoạn chat",
    "Tìm tin nhắn trong kênh…",
    "Tìm tin nhắn trong kênh",
    "Không có kết quả",
    "Kết quả trước",
    "Kết quả tiếp theo",
    "Đóng tìm kiếm",
    "Tắt thông báo kênh",
    "Bật thông báo kênh",
    "Đã tắt thông báo kênh",
    "Đã bật thông báo kênh",
    "Gợi ý nhắc tên thành viên",
    "Nhắc tên thành viên CLB",
    "Đang tải danh sách thành viên…",
    "Đính kèm từ Kho tài liệu",
    "Đóng kho tài liệu",
    "Bỏ đính kèm tài liệu",
    "Kho CLB",
    "Văn bản Hệ thống",
    "Tìm tên tài liệu…",
    "Tìm tên tài liệu",
    "Đang tải tài liệu…",
    "Không tìm thấy tài liệu phù hợp.",
  ];

  for (const vi of staticPhrases) {
    const en = translateUiText(vi, "en");
    const ja = translateUiText(vi, "ja");
    assert.notEqual(en, vi, `Missing EN translation for "${vi}"`);
    assert.notEqual(ja, vi, `Missing JA translation for "${vi}"`);
  }

  assert.equal(translateUiText("12 mới", "en"), "12 new");
  assert.equal(translateUiText("12 mới", "ja"), "12件の新着");
  assert.equal(translateUiText("50 tin", "en"), "50 msgs");
  assert.equal(translateUiText("50 tin", "ja"), "50件");
  assert.equal(translateUiText("1/3 kết quả", "en"), "1/3 results");
  assert.equal(translateUiText("1/3 kết quả", "ja"), "1/3件");
  assert.equal(translateUiText("Hôm nay · 21:36", "en"), "Today · 21:36");
  assert.equal(translateUiText("Hôm nay · 21:36", "ja"), "今日 · 21:36");
  assert.equal(translateUiText("Minh đang nhập…", "en"), "Minh is typing…");
  assert.equal(translateUiText("Minh đang nhập…", "ja"), "Minh が入力中…");
  assert.equal(translateUiText("Tin nhắn đã ghim (3)", "en"), "Pinned messages (3)");
  assert.equal(translateUiText("Tin nhắn đã ghim (3)", "ja"), "ピン留めメッセージ (3)");
  assert.equal(translateUiText("Gửi nhanh 👍", "en"), "Quick send 👍");
  assert.equal(translateUiText("Gửi nhanh 👍", "ja"), "クイック送信 👍");
  assert.equal(translateUiText("Đã đạt giới hạn 4.000 ký tự", "en"), "4,000-character limit reached");
  assert.equal(translateUiText("Đã đạt giới hạn 4.000 ký tự", "ja"), "最大4,000文字に達しました");
});
