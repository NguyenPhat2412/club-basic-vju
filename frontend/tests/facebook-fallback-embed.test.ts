import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildFacebookPagePluginSrc,
  getSafeFacebookPageUrl,
} from "@/components/club/ClubPublicFacebookFeed";

test("getSafeFacebookPageUrl accepts valid HTTPS Facebook and fb.com URLs", () => {
  assert.equal(
    getSafeFacebookPageUrl("  https://www.facebook.com/vju.art.club  "),
    "https://www.facebook.com/vju.art.club",
  );
  assert.equal(
    getSafeFacebookPageUrl("https://facebook.com/VJU.Club"),
    "https://facebook.com/VJU.Club",
  );
  assert.equal(
    getSafeFacebookPageUrl("https://m.facebook.com/profile.php?id=1000123456"),
    "https://m.facebook.com/profile.php?id=1000123456",
  );
  assert.equal(
    getSafeFacebookPageUrl("https://fb.com/vju.club"),
    "https://fb.com/vju.club",
  );
  assert.equal(
    getSafeFacebookPageUrl("HTTPS://WWW.FACEBOOK.COM/vju.club"),
    "https://www.facebook.com/vju.club",
  );
});

test("getSafeFacebookPageUrl rejects insecure schemes, userInfo, custom ports, root paths, and non-Facebook hosts", () => {
  const rejected: Array<string | null | undefined> = [
    null,
    undefined,
    "",
    "   ",
    "http://www.facebook.com/vju",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "https://evil.com/facebook.com/vju",
    "https://facebook.com@evil.com/vju",
    "https://facebook.com.evil.com/vju",
    "https://www.facebook.com:8443/vju",
    "https://www.facebook.com/",
    "https://facebook.com",
    `https://www.facebook.com/${"a".repeat(480)}`,
  ];

  for (const input of rejected) {
    assert.equal(getSafeFacebookPageUrl(input), null, `Expected rejection for ${String(input)}`);
    assert.equal(buildFacebookPagePluginSrc(input), null, `Expected null plugin src for ${String(input)}`);
  }
});

test("buildFacebookPagePluginSrc constructs sanitized Facebook Page Plugin embed URL", () => {
  const src = buildFacebookPagePluginSrc("https://www.facebook.com/vju.art.club?locale=vi_VN");
  assert.ok(src, "Expected non-null plugin URL");
  const parsed = new URL(src);
  assert.equal(parsed.origin, "https://www.facebook.com");
  assert.equal(parsed.pathname, "/plugins/page.php");
  assert.equal(parsed.searchParams.get("href"), "https://www.facebook.com/vju.art.club?locale=vi_VN");
  assert.equal(parsed.searchParams.get("tabs"), "timeline");
  assert.equal(parsed.searchParams.get("adapt_container_width"), "true");
});

test("M4 frontend files obey <400 line limit, 60/30/10 palette, zero (PB-XX) tags, and ClubRecruitmentDrawer removal", () => {
  const m4Files = [
    "src/components/club/ClubPortfolioView.tsx",
    "src/components/club/ClubApplyView.tsx",
    "src/components/club/ClubPublicFacebookFeed.tsx",
    "src/components/club/ClubsDiscoveryView.tsx",
    "src/components/club/ClubDiscoveryCard.tsx",
    "src/components/club/ClubsDiscoveryTable.tsx",
    "src/components/management/ClubFacebookSettingsCard.tsx",
    "src/components/layout/AppShell.tsx",
  ];
  const offPaletteRe =
    /\b(?:bg|text|border|from|via|to|ring)-(?:emerald|green|lime|purple|blue|sky|teal|indigo|violet|fuchsia|pink|cyan|orange|amber)(?:-[0-9]{2,3})?(?:\/[0-9]+)?\b/;
  const hexRe = /#[0-9a-fA-F]{3,8}\b/;
  const pbTagRe = /\(PB-\d+\)/;

  for (const rel of m4Files) {
    const abs = path.join(process.cwd(), rel);
    const content = fs.readFileSync(abs, "utf8");
    const lines = content.split("\n").length;
    assert.ok(lines < 400, `Expected ${rel} to be < 400 lines, got ${lines}`);
    assert.equal(offPaletteRe.test(content), false, `Unexpected off-palette class in ${rel}`);
    assert.equal(hexRe.test(content), false, `Unexpected hardcoded hex color in ${rel}`);
    assert.equal(pbTagRe.test(content), false, `Unexpected (PB-XX) tag in ${rel}`);
  }

  assert.equal(
    fs.existsSync(path.join(process.cwd(), "src/components/club/ClubRecruitmentDrawer.tsx")),
    false,
    "ClubRecruitmentDrawer.tsx must be deleted",
  );

  const srcFiles = (dir: string): string[] => {
    const out: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) out.push(...srcFiles(full));
      else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) out.push(full);
    }
    return out;
  };

  for (const abs of srcFiles(path.join(process.cwd(), "src"))) {
    const content = fs.readFileSync(abs, "utf8");
    assert.equal(
      content.includes("ClubRecruitmentDrawer"),
      false,
      `Found stale ClubRecruitmentDrawer reference in ${path.relative(process.cwd(), abs)}`,
    );
  }

  const appShell = fs.readFileSync(path.join(process.cwd(), "src/components/layout/AppShell.tsx"), "utf8");
  assert.ok(appShell.includes('pathname.startsWith("/clubs/")'), "AppShell must allow /clubs/[clubId] public routes");

  const portfolio = fs.readFileSync(path.join(process.cwd(), "src/components/club/ClubPortfolioView.tsx"), "utf8");
  assert.ok(portfolio.includes("/apply"), "ClubPortfolioView must link to /clubs/[clubId]/apply");
  assert.ok(portfolio.includes('session.canInClub("department.view", clubId)'), "ClubPortfolioView must gate clubPositions");

  const nextConfig = fs.readFileSync(path.join(process.cwd(), "next.config.ts"), "utf8");
  const frameSrcMatch = nextConfig.match(/"frame-src[^"]+"/);
  assert.ok(frameSrcMatch, "next.config.ts must define frame-src CSP directive");
  assert.ok(
    frameSrcMatch[0].includes("https://www.facebook.com"),
    "next.config.ts frame-src CSP directive must allow https://www.facebook.com for Facebook Page Plugin fallback",
  );
});
