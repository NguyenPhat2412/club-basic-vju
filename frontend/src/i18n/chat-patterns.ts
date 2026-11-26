import type { SupportedLocale } from '@/types';

export interface PatternRule {
  pattern: RegExp;
  en: (...matches: string[]) => string;
  ja: (...matches: string[]) => string;
}

export function createChatDynamicPatterns(
  translate: (text: string, locale: SupportedLocale) => string,
): PatternRule[] {
  return [
    {
      pattern: /^Đã xem\s*\((\d+)\)$/i,
      en: (_, count) => `Seen (${count})`,
      ja: (_, count) => `既読 (${count})`,
    },
    {
      pattern: /^Đã xem\s*·\s*(.+)$/i,
      en: (_, name) => `Seen · ${name}`,
      ja: (_, name) => `既読 · ${name}`,
    },
    {
      pattern: /^Gửi lỗi:\s*(.+)$/i,
      en: (_, err) => `Failed: ${translate(err, 'en')}`,
      ja: (_, err) => `送信失敗: ${translate(err, 'ja')}`,
    },
    {
      pattern: /^Đã gửi lên máy chủ lúc\s+(.+)$/i,
      en: (_, when) => `Sent to server at ${when}`,
      ja: (_, when) => `サーバー送信日時: ${when}`,
    },
    {
      pattern: /^Đã nhận lúc\s+(.+)$/i,
      en: (_, when) => `Delivered at ${when}`,
      ja: (_, when) => `受信日時: ${when}`,
    },
    {
      pattern: /^Đã xem bởi\s+(.+?)(?:\s+lúc\s+(.+))?$/i,
      en: (_, who, when) => (when ? `Seen by ${who} at ${when}` : `Seen by ${who}`),
      ja: (_, who, when) => (when ? `${who} が既読 (${when})` : `${who} が既読`),
    },
    {
      pattern: /^Đã thả\s+(\S+):\s*(.+)$/i,
      en: (_, emoji, who) => `Reacted ${emoji}: ${who}`,
      ja: (_, emoji, who) => `${emoji} でリアクション: ${who}`,
    },
    {
      pattern: /^(\d+)\s+mới$/i,
      en: (_, count) => `${count} new`,
      ja: (_, count) => `${count}件の新着`,
    },
    {
      pattern: /^(\d+)\s+tin$/i,
      en: (_, count) => `${count} msgs`,
      ja: (_, count) => `${count}件`,
    },
    {
      pattern: /^(.+?)\s+đang nhập…$/i,
      en: (_, names) => `${names} is typing…`,
      ja: (_, names) => `${names} が入力中…`,
    },
    {
      pattern: /^Hôm nay\s*·\s*(.+)$/i,
      en: (_, time) => `Today · ${time}`,
      ja: (_, time) => `今日 · ${time}`,
    },
    {
      pattern: /^Hôm qua\s*·\s*(.+)$/i,
      en: (_, time) => `Yesterday · ${time}`,
      ja: (_, time) => `昨日 · ${time}`,
    },
    {
      pattern: /^Khung chat\s+(.+)$/i,
      en: (_, name) => `Chat window ${name}`,
      ja: (_, name) => `チャット枠 ${name}`,
    },
    {
      pattern: /^Mở lại đoạn chat\s+(.+)$/i,
      en: (_, name) => `Reopen chat ${name}`,
      ja: (_, name) => `チャット ${name} を再表示`,
    },
    {
      pattern: /^Đóng bong bóng\s+(.+)$/i,
      en: (_, name) => `Close bubble ${name}`,
      ja: (_, name) => `バブル ${name} を閉じる`,
    },
    {
      pattern: /^Tin nhắn đã ghim\s*\((\d+)\)$/i,
      en: (_, count) => `Pinned messages (${count})`,
      ja: (_, count) => `ピン留めメッセージ (${count})`,
    },
    {
      pattern: /^\+(\d+)\s+ghim$/i,
      en: (_, count) => `+${count} pinned`,
      ja: (_, count) => `他 ${count} 件ピン留め`,
    },
    {
      pattern: /^Xem\s+(.+)$/i,
      en: (_, name) => `View ${name}`,
      ja: (_, name) => `${name} を表示`,
    },
    {
      pattern: /^Thả\s+(\S+)$/i,
      en: (_, emoji) => `React ${emoji}`,
      ja: (_, emoji) => `${emoji} でリアクション`,
    },
    {
      pattern: /^(\d+)\/(\d+)\s+kết quả$/i,
      en: (_, current, total) => `${current}/${total} results`,
      ja: (_, current, total) => `${current}/${total}件`,
    },
  ];
}
