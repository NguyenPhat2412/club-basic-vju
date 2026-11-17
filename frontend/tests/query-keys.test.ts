import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { qk } from "@/lib/api/query-keys";

const SRC_ROOT = path.join(process.cwd(), "src");
const ALLOWED = new Set([
  "lib/api/query-keys.ts",
]);
// A key literal whose first element is a string, in queryKey: [...] or (set|get)QueryData(<T>)?([...]).
const LITERAL_KEY = /(queryKey:\s*|QueryData(?:<[^(]*>)?\(\s*)\[\s*["'`]/;

function collect(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const full = path.join(dir, e.name);
    return e.isDirectory() ? collect(full) : /\.tsx?$/.test(e.name) ? [full] : [];
  });
}

test("all TanStack Query keys go through qk (no string-literal key tuples in src/)", () => {
  const offenders = collect(SRC_ROOT)
    .map((f) => path.relative(SRC_ROOT, f).split(path.sep).join("/"))
    .filter((rel) => !ALLOWED.has(rel) && LITERAL_KEY.test(fs.readFileSync(path.join(SRC_ROOT, rel), "utf8")));
  assert.deepEqual(offenders, [], `use qk.* from @/lib/api/query-keys instead of literal keys in: ${offenders.join(", ")}`);
});

test("qk factories keep the exact key shape and support root-prefix keys", () => {
  assert.deepEqual(qk.departmentMembers(), ["department-members"]);
  assert.deepEqual(qk.departmentMembers("d1"), ["department-members", "d1"]);
  assert.deepEqual(qk.me("permissions", null), ["me", "permissions", null]);
  assert.deepEqual(qk.unreadSummary(), ["notifications", "unread-summary"]);
});
