import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const FRONTEND_ROOT = process.cwd();
const REPO_ROOT = path.resolve(FRONTEND_ROOT, "..");

const OFF_PALETTE_TAILWIND_RE =
  /\b(?:bg|text|border|from|via|to|ring)-(?:emerald|green|lime|purple|blue|sky|teal|indigo|violet|fuchsia|pink|cyan|orange)(?:-[0-9]{2,3})?(?:\/[0-9]+)?\b/g;
const HEX_COLOR_RE = /#[0-9a-fA-F]{3,8}\b/g;

test("deploy/compose.prod.yml preserves Redis/Facebook vars and defines overridable FRONTEND_BASE_URL, APP_QR_SECRET, and RATE_LIMIT_*", () => {
  const composePath = path.join(REPO_ROOT, "deploy/compose.prod.yml");
  const compose = fs.readFileSync(composePath, "utf8");

  const requiredEntries = [
    "REDIS_HOST: redis",
    "REDIS_PORT: 6379",
    "CACHE_TYPE: redis",
    "FACEBOOK_APP_ID: ${FACEBOOK_APP_ID:-}",
    "FACEBOOK_APP_SECRET: ${FACEBOOK_APP_SECRET:-}",
    "FACEBOOK_GRAPH_VERSION: ${FACEBOOK_GRAPH_VERSION:-v22.0}",
    "FACEBOOK_TOKEN_ENCRYPTION_KEY: ${FACEBOOK_TOKEN_ENCRYPTION_KEY:-}",
    "FACEBOOK_OAUTH_REDIRECT_URI: ${FACEBOOK_OAUTH_REDIRECT_URI:-https://${API_HOST}/api/v1/integrations/facebook/oauth/callback}",
    "FRONTEND_BASE_URL: ${FRONTEND_BASE_URL:-https://${FRONTEND_HOST}}",
    "APP_QR_SECRET: ${APP_QR_SECRET:-}",
    "RATE_LIMIT_MAX_REQUESTS: ${RATE_LIMIT_MAX_REQUESTS:-15}",
    "RATE_LIMIT_WRITE_MAX_REQUESTS: ${RATE_LIMIT_WRITE_MAX_REQUESTS:-60}",
    "RATE_LIMIT_CHAT_UPLOAD_MAX_REQUESTS: ${RATE_LIMIT_CHAT_UPLOAD_MAX_REQUESTS:-15}",
  ];

  for (const entry of requiredEntries) {
    assert.ok(compose.includes(entry), `Expected deploy/compose.prod.yml to contain "${entry}"`);
  }
});

test("deploy/.env.production.example documents Facebook, FRONTEND_BASE_URL, APP_QR_SECRET (>= 16 chars), and RATE_LIMIT_* defaults", () => {
  const envExamplePath = path.join(REPO_ROOT, "deploy/.env.production.example");
  const envExample = fs.readFileSync(envExamplePath, "utf8");

  const requiredKeys = [
    "FACEBOOK_TOKEN_ENCRYPTION_KEY=",
    "FACEBOOK_APP_ID=",
    "FACEBOOK_APP_SECRET=",
    "FACEBOOK_GRAPH_VERSION=v22.0",
    "FACEBOOK_OAUTH_REDIRECT_URI=",
    "FRONTEND_BASE_URL=https://vju-club.all1.vn",
    "APP_QR_SECRET=",
    "RATE_LIMIT_MAX_REQUESTS=15",
    "RATE_LIMIT_WRITE_MAX_REQUESTS=60",
    "RATE_LIMIT_CHAT_UPLOAD_MAX_REQUESTS=15",
  ];

  for (const key of requiredKeys) {
    assert.ok(envExample.includes(key), `Expected deploy/.env.production.example to contain "${key}"`);
  }

  assert.match(envExample, /APP_QR_SECRET[^\n]*\n|#[^\n]*>= 16/);
  assert.ok(
    envExample.includes(">= 16"),
    "Expected deploy/.env.production.example to document >= 16 characters requirement for APP_QR_SECRET"
  );
});

test("public /privacy and /data-deletion pages exist, cover required policy terms, stay < 400 lines, and obey 60/30/10 palette", () => {
  const privacyPath = path.join(FRONTEND_ROOT, "src/app/privacy/page.tsx");
  const deletionPath = path.join(FRONTEND_ROOT, "src/app/data-deletion/page.tsx");

  assert.ok(fs.existsSync(privacyPath), "Expected src/app/privacy/page.tsx to exist");
  assert.ok(fs.existsSync(deletionPath), "Expected src/app/data-deletion/page.tsx to exist");

  const privacySrc = fs.readFileSync(privacyPath, "utf8");
  const deletionSrc = fs.readFileSync(deletionPath, "utf8");

  const privacyLines = privacySrc.split("\n").length;
  const deletionLines = deletionSrc.split("\n").length;
  assert.ok(privacyLines < 400, `Expected privacy/page.tsx < 400 lines (got ${privacyLines})`);
  assert.ok(deletionLines < 400, `Expected data-deletion/page.tsx < 400 lines (got ${deletionLines})`);

  for (const [label, src] of [
    ["privacy/page.tsx", privacySrc],
    ["data-deletion/page.tsx", deletionSrc],
  ] as const) {
    assert.equal(src.match(HEX_COLOR_RE), null, `Expected zero hardcoded hex colors in ${label}`);
    assert.equal(src.match(OFF_PALETTE_TAILWIND_RE), null, `Expected zero off-palette Tailwind classes in ${label}`);
    assert.equal(/\btr\s*\(/.test(src), false, `Expected ${label} not to wrap static Vietnamese prose in tr(...)`);
  }

  for (const term of [
    "VJU ClubHub",
    "@st.vju.ac.vn",
    "AES-256-GCM",
    "HttpOnly",
    "Fanpage",
    "Đoàn Thanh niên",
    "CTSV",
    "Mỹ Đình",
    "Hòa Lạc",
    'href="/data-deletion"',
    'href="/home"',
  ]) {
    assert.ok(privacySrc.includes(term), `Expected privacy/page.tsx to include "${term}"`);
  }

  for (const term of [
    "VJU ClubHub",
    "@st.vju.ac.vn",
    "AES-256-GCM",
    "Fanpage",
    "Đoàn Thanh niên",
    "CTSV",
    "Apps and Websites",
    'href="/privacy"',
    'href="/home"',
  ]) {
    assert.ok(deletionSrc.includes(term), `Expected data-deletion/page.tsx to include "${term}"`);
  }
});

test("HomeOnboardingFooter links to /privacy and /data-deletion and stays < 400 lines", () => {
  const footerPath = path.join(FRONTEND_ROOT, "src/components/home/HomeOnboardingFooter.tsx");
  const footerSrc = fs.readFileSync(footerPath, "utf8");
  const footerLines = footerSrc.split("\n").length;

  assert.ok(footerLines < 400, `Expected HomeOnboardingFooter.tsx < 400 lines (got ${footerLines})`);
  assert.ok(footerSrc.includes('href="/privacy"'), "Expected HomeOnboardingFooter.tsx to link to /privacy");
  assert.ok(footerSrc.includes('href="/data-deletion"'), "Expected HomeOnboardingFooter.tsx to link to /data-deletion");
});
