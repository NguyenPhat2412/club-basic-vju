import type { ChatMessage, ChatReactionSummary } from "@/types/chat/chat.types";

export const TELEGRAM_QUICK_REACTIONS = ["❤️", "👍", "🔥", "🎉", "😂", "😮", "😢"] as const;

export const TELEGRAM_EXTRA_REACTIONS = [
  "🙏",
  "👏",
  "💯",
  "🥰",
  "🤔",
  "👀",
  "🚀",
  "✅",
  "💪",
  "🤝",
  "🫡",
] as const;

export const TELEGRAM_ALL_REACTIONS = [
  ...TELEGRAM_QUICK_REACTIONS,
  ...TELEGRAM_EXTRA_REACTIONS,
] as const;

export const MAX_REACTIONS_PER_USER_PER_MESSAGE = 3;
const RECENT_EMOJIS_KEY = "vju_chat_recent_emojis_v1";
const MAX_RECENT_EMOJIS = 16;

export type EmojiCategoryId = "recent" | "smileys" | "gestures" | "symbols" | "activities";

export type EmojiCatalogEntry = {
  emoji: string;
  keywords: string;
};

export const EMOJI_CATALOG: Record<Exclude<EmojiCategoryId, "recent">, EmojiCatalogEntry[]> = {
  smileys: [
    { emoji: "😀", keywords: "cuoi vui smile grin happy" },
    { emoji: "😄", keywords: "cuoi tuoi laugh happy" },
    { emoji: "😁", keywords: "rang cuoi grin" },
    { emoji: "😂", keywords: "cuoi ra nuoc mat lol joy" },
    { emoji: "🤣", keywords: "cuoi lan rofl" },
    { emoji: "😊", keywords: "mim cuoi de thuong blush" },
    { emoji: "🥰", keywords: "yeu thuong tha tim love" },
    { emoji: "😍", keywords: "me man heart eyes" },
    { emoji: "🤩", keywords: "tuyet voi ngoi sao star" },
    { emoji: "😘", keywords: "hon kiss" },
    { emoji: "😉", keywords: "nhay mat wink" },
    { emoji: "😎", keywords: "ngau cool kinh" },
    { emoji: "🤗", keywords: "om hug" },
    { emoji: "🤔", keywords: "suy nghi think hmm" },
    { emoji: "🫡", keywords: "chao ro salute tuan lenh" },
    { emoji: "🤫", keywords: "suyt im lang quiet" },
    { emoji: "😮", keywords: "ngac nhien wow oh" },
    { emoji: "🥺", keywords: "nan ni thuong plz" },
    { emoji: "😢", keywords: "buon khoc sad cry" },
    { emoji: "😭", keywords: "khoc to sob" },
    { emoji: "😤", keywords: "co gang quyet tam huff" },
    { emoji: "🥳", keywords: "tiec chuc mung party" },
    { emoji: "😴", keywords: "buon ngu sleep" },
    { emoji: "😅", keywords: "ngai mo hoi sweat" },
  ],
  gestures: [
    { emoji: "👍", keywords: "thich ok tot like thumb up" },
    { emoji: "👎", keywords: "khong thich dislike" },
    { emoji: "👏", keywords: "vo tay khen clap bravo" },
    { emoji: "🙌", keywords: "hoan ho tuyet hooray" },
    { emoji: "🤝", keywords: "bat tay hop tac deal handshake" },
    { emoji: "🙏", keywords: "cam on xin loi pray thanks" },
    { emoji: "💪", keywords: "manh me co len strong muscle" },
    { emoji: "✌️", keywords: "chien thang peace hi" },
    { emoji: "🤞", keywords: "may man luck" },
    { emoji: "👌", keywords: "chuan ok duoc" },
    { emoji: "👋", keywords: "xin chao tam biet wave hello bye" },
    { emoji: "🫶", keywords: "tim tay heart hands yeu" },
    { emoji: "👀", keywords: "xem nhin hong eyes" },
    { emoji: "✍️", keywords: "viet ghi chu write" },
    { emoji: "🙋", keywords: "ung tuyen gio tay hand" },
    { emoji: "🫂", keywords: "om dong doi people hug" },
  ],
  symbols: [
    { emoji: "❤️", keywords: "trai tim do yeu heart red love" },
    { emoji: "🧡", keywords: "tim cam heart" },
    { emoji: "💛", keywords: "tim vang heart" },
    { emoji: "💚", keywords: "tim xanh heart" },
    { emoji: "🤍", keywords: "tim trang heart" },
    { emoji: "🔥", keywords: "lua chay hot fire" },
    { emoji: "💯", keywords: "100 diem chuan tuyet doi" },
    { emoji: "✨", keywords: "lap lanh sang sparkles" },
    { emoji: "🎉", keywords: "chuc mung phao giay party tada" },
    { emoji: "🎊", keywords: "le hoi confetti" },
    { emoji: "✅", keywords: "xong hoan thanh duyet check done" },
    { emoji: "❌", keywords: "huy sai loi cross no" },
    { emoji: "⚠️", keywords: "canh bao chu y warning" },
    { emoji: "📌", keywords: "ghim quan trong pin" },
    { emoji: "💡", keywords: "y tuong sang kien idea bulb" },
    { emoji: "🚀", keywords: "tang toc phong ten lua rocket launch" },
  ],
  activities: [
    { emoji: "🏐", keywords: "bong chuyen sunpinkey volleyball" },
    { emoji: "⚽", keywords: "bong da the thao soccer" },
    { emoji: "🏀", keywords: "bong ro basketball" },
    { emoji: "🎸", keywords: "am nhac dan guitar music" },
    { emoji: "🎤", keywords: "hat su kien mc mic" },
    { emoji: "🎨", keywords: "my thuat thiet ke art design" },
    { emoji: "📸", keywords: "chup anh truyen thong media camera" },
    { emoji: "💻", keywords: "lap trinh cong nghe code laptop" },
    { emoji: "📚", keywords: "hoc thuat sach study book" },
    { emoji: "🎓", keywords: "sinh vien tot nghiep vju" },
    { emoji: "🏆", keywords: "giai thuong vo dich cup trophy" },
    { emoji: "🎯", keywords: "muc tieu kpi target" },
    { emoji: "📅", keywords: "lich su kien họp calendar" },
    { emoji: "📣", keywords: "thong bao loa announce" },
    { emoji: "🇻🇳", keywords: "viet nam vn flag" },
    { emoji: "🇯🇵", keywords: "nhat ban japan vju flag" },
  ],
};

export function getRecentEmojis(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_EMOJIS_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string" && item.length > 0).slice(0, MAX_RECENT_EMOJIS);
  } catch {
    return [];
  }
}

export function recordRecentEmoji(emoji: string): string[] {
  const clean = emoji.trim();
  if (!clean) return getRecentEmojis();
  const prev = getRecentEmojis().filter((item) => item !== clean);
  const next = [clean, ...prev].slice(0, MAX_RECENT_EMOJIS);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota restrictions
    }
  }
  return next;
}

export function insertTextAtCursor(
  currentValue: string,
  insertText: string,
  selectionStart?: number | null,
  selectionEnd?: number | null,
  maxLength = 4000
): { nextValue: string; nextCursor: number } {
  const start = Math.max(0, Math.min(selectionStart ?? currentValue.length, currentValue.length));
  const end = Math.max(start, Math.min(selectionEnd ?? start, currentValue.length));
  const combined = `${currentValue.slice(0, start)}${insertText}${currentValue.slice(end)}`;
  if (combined.length > maxLength) {
    return { nextValue: currentValue, nextCursor: start };
  }
  return { nextValue: combined, nextCursor: start + insertText.length };
}

export function toggleOptimisticMessageReaction(
  msg: ChatMessage,
  emoji: string,
  userId: string,
  userFullName?: string
): ChatMessage {
  const clean = emoji.trim();
  if (!clean || !userId) return msg;
  const displayName = userFullName?.trim() || "Bạn";
  const current: ChatReactionSummary[] = (msg.reactions ?? []).map((r) => ({
    emoji: r.emoji,
    count: r.count,
    reactorIds: [...(r.reactorIds ?? [])],
    reactorNames: [...(r.reactorNames ?? [])],
  }));

  const targetIdx = current.findIndex((r) => r.emoji === clean);
  const alreadyReacted = targetIdx >= 0 && current[targetIdx]!.reactorIds.includes(userId);

  if (alreadyReacted) {
    const entry = current[targetIdx]!;
    const nextIds = entry.reactorIds.filter((id) => id !== userId);
    const nextNames = entry.reactorNames.filter((name) => name !== displayName);
    if (nextIds.length === 0) {
      current.splice(targetIdx, 1);
    } else {
      current[targetIdx] = {
        emoji: entry.emoji,
        count: nextIds.length,
        reactorIds: nextIds,
        reactorNames: nextNames,
      };
    }
    return { ...msg, reactions: current };
  }

  // Enforce Telegram's 3-reactions-per-user-per-message cap by removing oldest mine first
  const myReactionIndices = current
    .map((r, idx) => (r.reactorIds.includes(userId) ? idx : -1))
    .filter((idx) => idx >= 0);

  if (myReactionIndices.length >= MAX_REACTIONS_PER_USER_PER_MESSAGE) {
    const oldestIdx = myReactionIndices[0]!;
    const oldest = current[oldestIdx]!;
    const filteredIds = oldest.reactorIds.filter((id) => id !== userId);
    const filteredNames = oldest.reactorNames.filter((name) => name !== displayName);
    if (filteredIds.length === 0) {
      current.splice(oldestIdx, 1);
    } else {
      current[oldestIdx] = {
        emoji: oldest.emoji,
        count: filteredIds.length,
        reactorIds: filteredIds,
        reactorNames: filteredNames,
      };
    }
  }

  const nextTargetIdx = current.findIndex((r) => r.emoji === clean);
  if (nextTargetIdx >= 0) {
    const existing = current[nextTargetIdx]!;
    const nextIds = [...existing.reactorIds, userId];
    const nextNames = existing.reactorNames.includes(displayName)
      ? existing.reactorNames
      : [...existing.reactorNames, displayName].slice(0, 6);
    current[nextTargetIdx] = {
      emoji: clean,
      count: nextIds.length,
      reactorIds: nextIds,
      reactorNames: nextNames,
    };
  } else {
    current.push({
      emoji: clean,
      count: 1,
      reactorIds: [userId],
      reactorNames: [displayName],
    });
  }

  return { ...msg, reactions: current };
}

const NON_EMOJI_TEXT_RE = /[\p{L}\p{N}\p{P}\p{S}]/u;
const EXTENDED_PICTO_RE = /\p{Extended_Pictographic}/u;

export function getTelegramJumbomojiCount(content: string, hasExtraPayload: boolean): 0 | 1 | 2 | 3 {
  if (hasExtraPayload) return 0;
  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 28) return 0;

  const segments =
    typeof Intl !== "undefined" && "Segmenter" in Intl
      ? Array.from(new Intl.Segmenter("vi", { granularity: "grapheme" }).segment(trimmed), (s) => s.segment)
      : Array.from(trimmed);

  const nonWhitespace = segments.filter((seg) => seg.trim().length > 0);
  if (nonWhitespace.length < 1 || nonWhitespace.length > 3) return 0;

  for (const seg of nonWhitespace) {
    const isEmoji = EXTENDED_PICTO_RE.test(seg) || /^[\u{1F1E6}-\u{1F1FF}]{2}$/u.test(seg);
    if (!isEmoji) {
      if (NON_EMOJI_TEXT_RE.test(seg) || /\w/.test(seg)) return 0;
      return 0;
    }
  }
  return nonWhitespace.length as 1 | 2 | 3;
}
