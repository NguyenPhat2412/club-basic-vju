import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { EVENT_TYPE_LABELS } from "@/forms/event/event-form";
import { hasVietnameseDiacritics } from "@/i18n/auto-translate";
import { HOME_MESSAGES } from "@/i18n/home-messages";
import { translateUiText } from "@/i18n/translator";

function collectStrings(value: unknown, bucket: string[] = []): string[] {
  if (typeof value === "string") {
    bucket.push(value);
  } else if (typeof value === "function") {
    bucket.push(String((value as (...args: unknown[]) => unknown)(12, 24)));
  } else if (Array.isArray(value)) {
    for (const item of value) collectStrings(item, bucket);
  } else if (value && typeof value === "object") {
    for (const v of Object.values(value)) collectStrings(v, bucket);
  }
  return bucket;
}

test("HOME_MESSAGES provides complete vi, en, and ja landing copy with zero Vietnamese leakage in en/ja", () => {
  for (const locale of ["vi", "en", "ja"] as const) {
    const m = HOME_MESSAGES[locale];
    assert.equal(m.hero.slides.length, 6);
    assert.equal(m.onboarding.steps.length, 4);
    assert.equal(m.galleryFaq.photos.length, 7);
    assert.equal(m.galleryFaq.faqs.length, 5);
    assert.equal(m.footer.pillars.length, 3);
  }

  for (const locale of ["en", "ja"] as const) {
    const strings = collectStrings(HOME_MESSAGES[locale]);
    for (const str of strings) {
      assert.equal(
        hasVietnameseDiacritics(str),
        false,
        `Unexpected Vietnamese diacritics in HOME_MESSAGES.${locale}: "${str}"`
      );
    }
  }
});

test("translateUiText translates all EVENT_TYPE_LABELS, VJUA DB description, and Phase 3 event patterns in en and ja", () => {
  const samples = [
    ...Object.values(EVENT_TYPE_LABELS),
    "Câu lạc bộ Nghệ thuật và Âm nhạc Trường Đại học Việt Nhật (Vietnam Japan University Artist) — nơi quy tụ sinh viên đam mê ca hát, nhạc cụ, vũ đạo và biểu diễn sân khấu tại các sự kiện lớn của VJU.",
    "Đêm nhạc Acoustic & Giao lưu Nghệ thuật Sinh viên VJU",
    "Giải Bóng rổ Sinh viên 3×3 VJU Basketball Showdown",
    "Hội trường tầng 2 — Cơ sở Hòa Lạc",
    "Hội trường lớn VJU — Cơ sở Hòa Lạc",
    "Khuôn viên Hồ trung tâm ĐHQGHN Hòa Lạc",
    "Tổng duyệt & Chốt danh sách Nhân sự Sự kiện ARC",
    "[Đã huỷ] Giao lưu Ngoài trời (Dời lịch do thời tiết) VJUA",
  ];

  for (const text of samples) {
    for (const locale of ["en", "ja"] as const) {
      const out = translateUiText(text, locale);
      assert.notEqual(out, text, `Expected "${text}" to be translated for locale=${locale}`);
      assert.equal(
        hasVietnameseDiacritics(out),
        false,
        `Unexpected Vietnamese diacritics in ${locale} translation of "${text}": "${out}"`
      );
    }
  }
});

function walkSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkSourceFiles(full));
    else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
  }
  return out;
}

test("every tr('...') string literal across frontend/src and Sprint 4 workspace/chat/vault patterns translates cleanly into en and ja", () => {
  const trRegex = /\btr\(\s*(["'])((?:\\.|(?!\1)[^\n\\])+)\1\s*\)/g;
  const literals = new Set<string>();

  for (const abs of walkSourceFiles(path.join(process.cwd(), "src"))) {
    const content = fs.readFileSync(abs, "utf8");
    for (const match of content.matchAll(trRegex)) {
      const s = match[2] ?? "";
      if (hasVietnameseDiacritics(s)) literals.add(s);
    }
  }

  const sprint4Samples = [
    ...literals,
    "Ảnh bìa CLB Nghệ thuật VJU (VJUA)",
    "Ảnh bìa câu lạc bộ Sun Pinkey",
    "+3 ghim",
    "Tin nhắn đã ghim (4)",
    "61 quyền hạn",
    "28 thành viên chính thức",
    "2 hồ sơ mới",
    "Tùy biến Trang Tổng quan & Bản sắc riêng của CLB (VJUA)",
    "Kho tài liệu CLB & Ban",
    "Tùy biến trang Tổng quan",
    "KÊNH TRÒ CHUYỆN",
    "Nhập tin nhắn (gõ / để chèn nhanh)…",
  ];

  assert.ok(literals.size >= 20, `Expected at least 20 tr(...) literals, found ${literals.size}`);

  for (const text of sprint4Samples) {
    for (const locale of ["en", "ja"] as const) {
      const out = translateUiText(text, locale);
      assert.notEqual(out, text, `Expected "${text}" to be translated for locale=${locale}`);
      assert.equal(
        hasVietnameseDiacritics(out),
        false,
        `Unexpected Vietnamese leakage in ${locale} translation of "${text}": "${out}"`
      );
    }
  }

  const i18nFiles = [
    "src/i18n/phrases-en-sprint4.ts",
    "src/i18n/phrases-ja-sprint4.ts",
    "src/i18n/translator.ts",
    "src/providers/I18nContext.tsx",
  ];
  for (const rel of i18nFiles) {
    const lines = fs.readFileSync(path.join(process.cwd(), rel), "utf8").split("\n").length;
    assert.ok(lines < 400, `Expected ${rel} to stay < 400 lines, got ${lines}`);
  }
});
