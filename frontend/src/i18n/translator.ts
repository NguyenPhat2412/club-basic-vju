import type {
  LocaleInput,
  MessageDictionary,
  SupportedLocale,
  TranslationParams,
} from '@/types';
import { getCachedAutoTranslation } from './auto-translate';
import { defaultLocale, normalizeLocale } from './config';
import { CORE_MESSAGES } from './messages-core';
import { PHRASES_EN_CORE } from './phrases-en';
import { PHRASES_EN_ADMIN } from './phrases-en-admin';
import { PHRASES_EN_CONTENT } from './phrases-en-content';
import { PHRASES_EN_PERMISSIONS } from './phrases-en-permissions';
import { PHRASES_EN_WORKSPACE } from './phrases-en-workspace';
import { PHRASES_JA_CORE } from './phrases-ja';
import { PHRASES_JA_ADMIN } from './phrases-ja-admin';
import { PHRASES_JA_CONTENT } from './phrases-ja-content';
import { PHRASES_JA_PERMISSIONS } from './phrases-ja-permissions';
import { PHRASES_JA_WORKSPACE } from './phrases-ja-workspace';

const EN_DICTIONARY: Record<string, string> = {
  ...PHRASES_EN_CORE,
  ...PHRASES_EN_CONTENT,
  ...PHRASES_EN_ADMIN,
  ...PHRASES_EN_PERMISSIONS,
  ...PHRASES_EN_WORKSPACE,
};

const JA_DICTIONARY: Record<string, string> = {
  ...PHRASES_JA_CORE,
  ...PHRASES_JA_CONTENT,
  ...PHRASES_JA_ADMIN,
  ...PHRASES_JA_PERMISSIONS,
  ...PHRASES_JA_WORKSPACE,
};

function resolveNestedMessage(
  dictionary: MessageDictionary,
  keyPath: string,
): string | undefined {
  const segments = keyPath.split('.');
  let current: string | MessageDictionary | undefined = dictionary;
  for (const segment of segments) {
    if (!current || typeof current === 'string') {
      return undefined;
    }
    current = current[segment];
  }
  return typeof current === 'string' ? current : undefined;
}

export function interpolateMessage(
  template: string,
  params?: TranslationParams,
): string {
  if (!params) return template;
  return Object.entries(params).reduce(
    (result, [paramKey, paramValue]) =>
      result.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue)),
    template,
  );
}

export function translateKey(
  localeInput: LocaleInput,
  key: string,
  params?: TranslationParams,
  fallback?: string,
): string {
  const locale = normalizeLocale(localeInput);
  const localized =
    resolveNestedMessage(CORE_MESSAGES[locale], key) ??
    resolveNestedMessage(CORE_MESSAGES[defaultLocale], key) ??
    fallback ??
    key;
  return interpolateMessage(localized, params);
}

interface PatternRule {
  pattern: RegExp;
  en: (...matches: string[]) => string;
  ja: (...matches: string[]) => string;
}

const DYNAMIC_PATTERNS: PatternRule[] = [
  {
    pattern: /^Tất cả\s*\((\d+)\)$/i,
    en: (_, count) => `All (${count})`,
    ja: (_, count) => `すべて (${count})`,
  },
  {
    pattern: /^Tất cả phân hệ\s*\((\d+)\)$/i,
    en: (_, count) => `All modules (${count})`,
    ja: (_, count) => `すべてのモジュール (${count})`,
  },
  {
    pattern: /^Toàn bộ câu lạc bộ\s*\((\d+)\)$/i,
    en: (_, count) => `All Clubs (${count})`,
    ja: (_, count) => `全クラブ (${count})`,
  },
  {
    pattern: /^Lưu thay đổi\s*\((\d+)\)$/i,
    en: (_, count) => `Save changes (${count})`,
    ja: (_, count) => `変更を保存 (${count})`,
  },
  {
    pattern: /^Quyền chức năng\s*\((\d+)\s+đã tích chọn\)$/i,
    en: (_, count) => `Functional permissions (${count} selected)`,
    ja: (_, count) => `機能権限（${count} 件選択中）`,
  },
  {
    pattern: /^XEM TẤT CẢ CÂU LẠC BỘ(?:\s*\((\d+)\))?$/i,
    en: (_, count) => (count ? `VIEW ALL CLUBS (${count})` : 'VIEW ALL CLUBS'),
    ja: (_, count) => (count ? `すべてのクラブを見る (${count})` : 'すべてのクラブを見る'),
  },
  {
    pattern: /^(\d+)\s+câu lạc bộ đang hoạt động tại VJU$/i,
    en: (_, count) => `${count} active student clubs at VJU`,
    ja: (_, count) => `VJUで現在活動中のクラブ ${count} 団体`,
  },
  {
    pattern: /^(\d+)\/(\d+)\s+CLB đang hoạt động$/i,
    en: (_, active, total) => `${active}/${total} active clubs`,
    ja: (_, active, total) => `活動中のクラブ ${active}/${total} 団体`,
  },
  {
    pattern: /^(\d+)\/(\d+)\s+vị trí$/i,
    en: (_, current, max) => `${current}/${max} slots`,
    ja: (_, current, max) => `${current}/${max} 枠`,
  },
  {
    pattern: /^BƯỚC\s+(\d+)$/i,
    en: (_, step) => `STEP ${step}`,
    ja: (_, step) => `ステップ ${step}`,
  },
  {
    pattern: /^Ảnh\s+(\d+)$/i,
    en: (_, index) => `Slide ${index}`,
    ja: (_, index) => `スライド ${index}`,
  },
  {
    pattern: /^Xin chào,\s*(.+)$/i,
    en: (_, name) => `Hello, ${name}`,
    ja: (_, name) => `こんにちは、${name} さん`,
  },
  {
    pattern: /^Tổng kết hoạt động tháng\s*&\s*Tập huấn kỹ năng\s+(.+)$/i,
    en: (_, club) => `Monthly Activity Review & Skills Training — ${club}`,
    ja: (_, club) => `月次活動総括＆スキルアップ研修 — ${club}`,
  },
  {
    pattern: /^Sinh hoạt định kỳ\s*&\s*Điểm danh Ban chuyên môn\s+(.+)$/i,
    en: (_, club) => `Regular Meeting & Department Attendance — ${club}`,
    ja: (_, club) => `定例ミーティング＆専門部署出席確認 — ${club}`,
  },
  {
    pattern: /^Không thể tải danh sách câu lạc bộ:\s*(.+)$/i,
    en: (_, err) => `Unable to load clubs list: ${err}`,
    ja: (_, err) => `クラブ一覧を読み込めませんでした: ${err}`,
  },
  {
    pattern: /^(\d+)\s+vai trò$/i,
    en: (_, count) => `${count} roles`,
    ja: (_, count) => `ロール ${count} 件`,
  },
  {
    pattern: /^(\d+)\s+bản ghi$/i,
    en: (_, count) => `${count} records`,
    ja: (_, count) => `${count} 件の記録`,
  },
  {
    pattern: /^(\d+)\s+người giữ chức vụ$/i,
    en: (_, count) => `${count} role holders`,
    ja: (_, count) => `役職保持者 ${count} 名`,
  },
  {
    pattern: /^(\d+)\s+tài khoản đã ẩn danh PII$/i,
    en: (_, count) => `${count} PII-anonymized accounts`,
    ja: (_, count) => `PII匿名化済み ${count} 件`,
  },
  {
    pattern: /^(\d+)\s+thông báo chưa đọc$/i,
    en: (_, count) => `${count} unread notifications`,
    ja: (_, count) => `未読通知 ${count} 件`,
  },
  {
    pattern: /^(\d+)\s+thành viên$/i,
    en: (_, count) => `${count} members`,
    ja: (_, count) => `部員 ${count} 名`,
  },
  {
    pattern: /^(\d+)\s+sự kiện$/i,
    en: (_, count) => `${count} events`,
    ja: (_, count) => `イベント ${count} 件`,
  },
  {
    pattern: /^(\d+)\s+CLB$/i,
    en: (_, count) => `${count} clubs`,
    ja: (_, count) => `クラブ ${count} 団体`,
  },
  {
    pattern: /^(\d+)\s+đơn$/i,
    en: (_, count) => `${count} applications`,
    ja: (_, count) => `応募 ${count} 件`,
  },
  {
    pattern: /^(\d+)\s+tài khoản$/i,
    en: (_, count) => `${count} accounts`,
    ja: (_, count) => `アカウント ${count} 件`,
  },
  {
    pattern: /^(\d+)\s+quyền$/i,
    en: (_, count) => `${count} permissions`,
    ja: (_, count) => `権限 ${count} 件`,
  },
  {
    pattern: /^(\d+)\s+mục$/i,
    en: (_, count) => `${count} items`,
    ja: (_, count) => `${count} 件`,
  },
  {
    pattern: /^(\d+)\s+chờ duyệt$/i,
    en: (_, count) => `${count} pending`,
    ja: (_, count) => `審査待ち ${count} 件`,
  },
  {
    pattern: /^(.+?)\s*·\s*đã sửa$/i,
    en: (_, scope) => `${translateUiText(scope, 'en')} · modified`,
    ja: (_, scope) => `${translateUiText(scope, 'ja')} · 変更あり`,
  },
  {
    pattern: /^Vai trò:\s*(.+)$/i,
    en: (_, code) => `Role: ${code}`,
    ja: (_, code) => `ロール: ${code}`,
  },
  {
    pattern: /^Phạm vi áp dụng:\s*(.+)$/i,
    en: (_, scope) => `Applicable scope: ${translateUiText(scope, 'en')}`,
    ja: (_, scope) => `適用範囲: ${translateUiText(scope, 'ja')}`,
  },
  {
    pattern: /^Trang\s+(\d+)\s*\/\s*(\d+)$/i,
    en: (_, page, total) => `Page ${page} / ${total}`,
    ja: (_, page, total) => `ページ ${page} / ${total}`,
  },
  {
    pattern: /^Thông báo\s*\((\d+)\s+chưa đọc\)$/i,
    en: (_, count) => `Notifications (${count} unread)`,
    ja: (_, count) => `通知（未読 ${count} 件）`,
  },
];

export function translateUiText(
  rawText: string,
  localeInput?: LocaleInput | null,
): string {
  const locale: SupportedLocale = normalizeLocale(localeInput);
  if (locale === 'vi' || !rawText) {
    return rawText;
  }

  const normalizedSource = rawText.replace(/\u00a0/g, ' ');
  const leadingMatch = normalizedSource.match(/^\s*/);
  const trailingMatch = normalizedSource.match(/\s*$/);
  const leading = leadingMatch ? leadingMatch[0] : '';
  const trailing = trailingMatch ? trailingMatch[0] : '';
  const trimmed = normalizedSource.replace(/\s+/g, ' ').trim();

  if (!trimmed) {
    return rawText;
  }

  const dictionary = locale === 'en' ? EN_DICTIONARY : JA_DICTIONARY;
  const directHit = dictionary[trimmed];
  if (directHit) {
    return `${leading}${directHit}${trailing}`;
  }

  // Handle JSX split text nodes with surrounding punctuation like "Tất cả (" or "Phòng ban:"
  const punctMatch = trimmed.match(/^([(\[•·:–—\-*]*\s*)(.+?)(\s*[(\])•·:–—\-*]+)$/);
  if (punctMatch) {
    const prefix = punctMatch[1] ?? '';
    const coreText = punctMatch[2]?.trim() ?? '';
    const suffix = punctMatch[3] ?? '';
    if (coreText && dictionary[coreText]) {
      return `${leading}${prefix}${dictionary[coreText]}${suffix}${trailing}`;
    }
  }

  for (const rule of DYNAMIC_PATTERNS) {
    const match = trimmed.match(rule.pattern);
    if (match) {
      const translated = locale === 'en' ? rule.en(...match) : rule.ja(...match);
      return `${leading}${translated}${trailing}`;
    }
  }

  const cachedAuto = getCachedAutoTranslation(trimmed, locale);
  if (cachedAuto) {
    return `${leading}${cachedAuto}${trailing}`;
  }

  return rawText;
}
