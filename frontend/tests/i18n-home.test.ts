import assert from "node:assert/strict";
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
