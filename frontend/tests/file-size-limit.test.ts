import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const SRC_ROOT = path.join(process.cwd(), "src");

// src/i18n is intentionally not scanned: it holds pure translation data.
const SCANNED_DIRS = ["components", "hooks", "api", "forms", "lib"];

function listSourceFiles(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) return listSourceFiles(abs);
    return /\.tsx?$/.test(entry.name) ? [abs] : [];
  });
}

test("ADR-006: every module in components/hooks/api/forms/lib stays < 400 lines", () => {
  const files = SCANNED_DIRS.flatMap((dir) => listSourceFiles(path.join(SRC_ROOT, dir)));
  assert.ok(files.length > 0, "expected to scan at least one source file");

  const violations = files
    .map((abs) => ({ rel: path.relative(SRC_ROOT, abs), lines: fs.readFileSync(abs, "utf8").split("\n").length }))
    .filter(({ lines }) => lines >= 400)
    .map(({ rel, lines }) => `${rel} (${lines} lines)`);

  assert.deepEqual(violations, [], `Files must stay < 400 lines:\n${violations.join("\n")}`);
});
