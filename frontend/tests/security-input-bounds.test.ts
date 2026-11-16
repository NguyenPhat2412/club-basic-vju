import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { resolveMediaUrl, toApiMediaUrl } from "@/lib/media";
import { safeExternalHref, validateApplicationFile, validateImageUploadFile } from "@/lib/utils";

function collectSourceFiles(dir: string, exts: string[]): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...collectSourceFiles(full, exts));
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

const FRONTEND_ROOT = process.cwd();
const SRC_ROOT = path.join(FRONTEND_ROOT, "src");

test("safeExternalHref permits only http/https and blocks XSS URI schemes", () => {
  assert.equal(safeExternalHref("https://vju.ac.vn/clubs"), "https://vju.ac.vn/clubs");
  assert.equal(safeExternalHref("  http://localhost:3000/docs  "), "http://localhost:3000/docs");
  assert.equal(safeExternalHref("javascript:alert(document.cookie)"), null);
  assert.equal(safeExternalHref("JAVASCRIPT:alert(1)"), null);
  assert.equal(safeExternalHref("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(safeExternalHref("vbscript:msgbox(1)"), null);
  assert.equal(safeExternalHref("file:///etc/passwd"), null);
  assert.equal(safeExternalHref(""), null);
  assert.equal(safeExternalHref(null), null);
  assert.equal(safeExternalHref("https://example.com/" + "a".repeat(2050)), null);
});

test("validateApplicationFile and validateImageUploadFile enforce size and extension allowlists", () => {
  assert.equal(validateApplicationFile({ name: "cv.pdf", size: 1024 }), null);
  assert.equal(validateApplicationFile({ name: "don-ung-tuyen.docx", size: 50_000 }), null);
  assert.match(validateApplicationFile({ name: "empty.pdf", size: 0 }) ?? "", /0 B/);
  assert.match(validateApplicationFile({ name: "huge.pdf", size: 25 * 1024 * 1024 }) ?? "", /20 MB/);
  assert.match(validateApplicationFile({ name: "xss.html", size: 200 }) ?? "", /không được phép/);
  assert.match(validateApplicationFile({ name: "payload.svg", size: 200 }) ?? "", /không được phép/);
  assert.match(validateApplicationFile({ name: "trojan.exe", size: 200 }) ?? "", /không được phép/);

  assert.equal(validateImageUploadFile({ name: "avatar.webp", size: 500_000 }, 5), null);
  assert.match(validateImageUploadFile({ name: "avatar.png", size: 6 * 1024 * 1024 }, 5) ?? "", /5 MB/);
  assert.match(validateImageUploadFile({ name: "avatar.svg", size: 1024 }, 5) ?? "", /không được phép/);
});

test("media URL helpers block non-http schemes and support avatar/club public routes", () => {
  assert.equal(resolveMediaUrl("javascript:alert(1)"), null);
  assert.equal(resolveMediaUrl("data:image/svg+xml,<svg onload=alert(1)>"), null);
  assert.ok(resolveMediaUrl("/api/v1/public/avatars/abc.png")?.endsWith("/api/v1/public/avatars/abc.png"));
  assert.equal(toApiMediaUrl("javascript:alert(1)"), "");
  assert.equal(toApiMediaUrl("data:text/html,hi"), "");
  assert.equal(toApiMediaUrl("https://cdn.example.com/logo.png"), "https://cdn.example.com/logo.png");
});

test("every input primitive, raw <input>, security header, and supply-chain lockfile obeys hardening rules", () => {
  const inputUi = fs.readFileSync(path.join(SRC_ROOT, "components/ui/input.tsx"), "utf8");
  assert.ok(inputUi.includes("DEFAULT_MAX_LENGTH_BY_TYPE"), "ui/input.tsx must define DEFAULT_MAX_LENGTH_BY_TYPE");
  assert.ok(inputUi.includes("maxLength = 128"), "PasswordInput must default maxLength to 128");
  assert.ok(inputUi.includes("maxLength = 4000"), "Textarea must default maxLength to 4000");

  const files = collectSourceFiles(SRC_ROOT, [".ts", ".tsx"]);
  for (const file of files) {
    const rel = path.relative(FRONTEND_ROOT, file);
    const content = fs.readFileSync(file, "utf8");
    assert.ok(!/\beval\s*\(/.test(content), `${rel} must not call eval()`);
    assert.ok(!/\bnew\s+Function\s*\(/.test(content), `${rel} must not call new Function()`);
    assert.ok(!/\.(?:innerHTML|outerHTML)\s*=/.test(content), `${rel} must not assign innerHTML/outerHTML`);

    if (rel !== "src/components/ui/input.tsx" && rel.endsWith(".tsx")) {
      const rawInputs = content.match(/<input\b[\s\S]*?\/>/g) ?? [];
      for (const tag of rawInputs) {
        if (/type=["'](?:file|checkbox|radio|hidden)["']/.test(tag)) continue;
        assert.ok(
          /\b(?:maxLength|max)=/.test(tag),
          `${rel} contains raw <input> without maxLength or max bound:\n${tag}`,
        );
      }
    }
  }

  const nextConfig = fs.readFileSync(path.join(FRONTEND_ROOT, "next.config.ts"), "utf8");
  for (const header of [
    "poweredByHeader: false",
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Referrer-Policy",
    "Permissions-Policy",
  ]) {
    assert.ok(nextConfig.includes(header), `next.config.ts must configure ${header}`);
  }

  assert.equal(fs.existsSync(path.join(FRONTEND_ROOT, "pnpm-lock.yaml")), true);
  assert.equal(fs.existsSync(path.join(FRONTEND_ROOT, "package-lock.json")), false);

  const appShell = fs.readFileSync(path.join(SRC_ROOT, "components/layout/AppShell.tsx"), "utf8");
  const homeLanding = fs.readFileSync(path.join(SRC_ROOT, "components/home/HomeLandingView.tsx"), "utf8");
  assert.ok(appShell.includes("clearChatMessageCache"), "AppShell.tsx signOut must clear chat session cache");
  assert.ok(homeLanding.includes("clearChatMessageCache"), "HomeLandingView.tsx signOut must clear chat session cache");
});
