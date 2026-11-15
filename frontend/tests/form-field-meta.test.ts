import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { resolveFormFieldIndicator, sanitizeFormLabel } from "@/forms/form-field-meta";
import { translateUiText } from "@/i18n/translator";

function walkTsxFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsxFiles(full, out);
    } else if (entry.isFile() && /\.(tsx|ts)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

test("sanitizeFormLabel strips duplicate optional suffixes while preserving technical parentheticals", () => {
  assert.equal(sanitizeFormLabel("Điểm GPA (tuỳ chọn)"), "Điểm GPA");
  assert.equal(sanitizeFormLabel("Ban phụ trách (tùy chọn)"), "Ban phụ trách");
  assert.equal(sanitizeFormLabel("Thuộc công việc cha (Subtask - tuỳ chọn)"), "Thuộc công việc cha (Subtask)");
  assert.equal(sanitizeFormLabel("Mật khẩu (8+ ký tự)"), "Mật khẩu (8+ ký tự)");
  assert.equal(sanitizeFormLabel("Mã định danh người dùng (UUID)"), "Mã định danh người dùng (UUID)");
});

test("resolveFormFieldIndicator distinguishes required (*), optional ((Tuỳ chọn)), disabled/readOnly, and filter fields", () => {
  assert.equal(resolveFormFieldIndicator({ required: true }), "required");
  assert.equal(resolveFormFieldIndicator({ required: false }), "optional");
  assert.equal(resolveFormFieldIndicator({}), "optional");
  assert.equal(resolveFormFieldIndicator({ isReadOnlyChild: true }), "none");
  assert.equal(resolveFormFieldIndicator({ isReadOnlyChild: true, optional: true }), "optional");
  assert.equal(resolveFormFieldIndicator({ isReadOnlyChild: true, required: true }), "required");
  assert.equal(resolveFormFieldIndicator({ hideIndicator: true, required: true }), "none");
  assert.equal(resolveFormFieldIndicator({ hideIndicator: true }), "none");
});

test("i18n translates (Tuỳ chọn) and newly standardized form labels cleanly into EN and JA", () => {
  assert.equal(translateUiText("(Tuỳ chọn)", "en"), "(Optional)");
  assert.equal(translateUiText("(Tuỳ chọn)", "ja"), "（任意）");
  assert.equal(translateUiText("Tệp phiên bản mới (.pdf)", "en"), "New Version File (.pdf)");
  assert.equal(translateUiText("Tệp phiên bản mới (.pdf)", "ja"), "新バージョンファイル (.pdf)");
});

test("no FormField label across frontend/src hardcodes duplicate (tuỳ chọn) text", () => {
  const srcRoot = path.join(process.cwd(), "src");
  const files = walkTsxFiles(srcRoot);
  for (const file of files) {
    const content = fs.readFileSync(file, "utf8");
    const matches = content.match(/<FormField[^>]*label="[^"]*(?:tuỳ chọn|tùy chọn)[^"]*"/gi);
    assert.equal(
      matches,
      null,
      `Found hardcoded optional suffix inside FormField label in ${path.relative(process.cwd(), file)}: ${matches?.[0]}`
    );
  }
});
