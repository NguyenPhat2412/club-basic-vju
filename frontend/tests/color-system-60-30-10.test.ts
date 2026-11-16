import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { CLUB_PRESET_META } from "@/forms/club/club-overview-config";

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

const SRC_ROOT = path.join(process.cwd(), "src");

test("globals.css defines the complete 60/30/10 VJU ClubHub color token contract", () => {
  const css = fs.readFileSync(path.join(SRC_ROOT, "styles/globals.css"), "utf8");
  const requiredTokens = [
    // 60% Dominant Neutral Surfaces
    "--background:",
    "--card:",
    "--sidebar:",
    // 30% Secondary Structural Slate
    "--secondary:",
    "--muted:",
    "--border:",
    "--foreground:",
    "--secondary-foreground:",
    "--muted-foreground:",
    // 10% VJU Crimson Brand Accent
    "--primary:",
    "--primary-hover:",
    "--primary-active:",
    "--primary-on-dark:",
    "--accent:",
    "--accent-foreground:",
    "--color-primary-hover:",
    "--color-primary-active:",
    "--color-primary-on-dark:",
  ];

  for (const token of requiredTokens) {
    assert.ok(css.includes(token), `Expected globals.css to declare ${token}`);
  }
});

test("frontend source contains zero off-palette Tailwind color classes (purple, blue, sky, teal, indigo, violet, fuchsia, pink, cyan, orange)", () => {
  const files = collectSourceFiles(SRC_ROOT, [".ts", ".tsx", ".css"]);
  const offPaletteRe =
    /\b(?:bg|text|border|from|via|to|ring)-(?:purple|blue|sky|teal|indigo|violet|fuchsia|pink|cyan|orange)(?:-[0-9]{2,3})?(?:\/[0-9]+)?\b/g;

  const violations: string[] = [];
  for (const abs of files) {
    const rel = path.relative(process.cwd(), abs);
    const lines = fs.readFileSync(abs, "utf8").split("\n");
    lines.forEach((line, idx) => {
      const matches = line.match(offPaletteRe);
      if (matches) {
        violations.push(`${rel}:${idx + 1} -> ${matches.join(", ")}`);
      }
    });
  }

  assert.deepEqual(
    violations,
    [],
    `Found off-palette Tailwind classes breaking 60/30/10:\n${violations.join("\n")}`
  );
});

test("components and form configs contain zero hardcoded hex colors (except SVG national flags in LanguageSwitcher.tsx)", () => {
  const scanDirs = [path.join(SRC_ROOT, "components"), path.join(SRC_ROOT, "forms")];
  const files = scanDirs.flatMap((d) => collectSourceFiles(d, [".ts", ".tsx"]));
  const hexRe = /#[0-9a-fA-F]{3,8}\b/g;

  const violations: string[] = [];
  for (const abs of files) {
    const rel = path.relative(process.cwd(), abs).replace(/\\/g, "/");
    if (rel === "src/components/shared/LanguageSwitcher.tsx") continue;

    const lines = fs.readFileSync(abs, "utf8").split("\n");
    lines.forEach((line, idx) => {
      const matches = line.match(hexRe);
      if (matches) {
        violations.push(`${rel}:${idx + 1} -> ${matches.join(", ")}`);
      }
    });
  }

  assert.deepEqual(
    violations,
    [],
    `Found hardcoded hex colors in UI components/forms instead of 60/30/10 CSS tokens:\n${violations.join("\n")}`
  );
});

test("HOME landing components do not use yellow amber-100 highlighters and CLUB_PRESET_META adheres to 60/30/10 tokens", () => {
  const homeFiles = collectSourceFiles(path.join(SRC_ROOT, "components/home"), [".tsx"]);
  for (const abs of homeFiles) {
    const rel = path.relative(process.cwd(), abs);
    const content = fs.readFileSync(abs, "utf8");
    assert.equal(
      /\bbg-amber-(?:50|100)\b/.test(content),
      false,
      `Expected ${rel} not to use decorative yellow/amber backgrounds`
    );
  }

  for (const [key, meta] of Object.entries(CLUB_PRESET_META)) {
    const combined = `${meta.badgeClass} ${meta.surfaceClass} ${meta.metricAccentClass}`;
    assert.equal(
      /\b(?:emerald|sky|amber|rose|teal)-/.test(combined),
      false,
      `Expected CLUB_PRESET_META.${key} to use 60/30/10 tokens instead of rainbow palette: ${combined}`
    );
  }
});
