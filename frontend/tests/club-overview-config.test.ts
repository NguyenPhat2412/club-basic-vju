import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  buildPresetStarterConfig,
  CLUB_PRESET_META,
  DEFAULT_OVERVIEW_BLOCKS,
  formatBytesCompact,
  hasCustomClubOverview,
  normalizeClubOverviewConfig,
} from "@/forms/club/club-overview-config";

test("normalizeClubOverviewConfig sanitizes presets, deduplicates blocks, and caps metrics/highlights at 4", () => {
  const empty = normalizeClubOverviewConfig(undefined);
  assert.equal(empty.preset, null);
  assert.deepEqual(empty.enabledBlocks, DEFAULT_OVERVIEW_BLOCKS);
  assert.equal(hasCustomClubOverview(undefined), false);

  const normalized = normalizeClubOverviewConfig({
    preset: "sports" as "SPORTS",
    slogan: "  Cháy hết mình trên sân cỏ Hòa Lạc & Mỹ Đình  ",
    campusLocation: "  Sân Hòa Lạc  ",
    operatingSchedule: "  Thứ 3 & Thứ 6  ",
    enabledBlocks: ["metrics", "schedule", "metrics"],
    customMetrics: [
      { label: " Giải đấu ", value: " 04 ", sub: " ĐHQGHN " },
      { label: "   ", value: "ignored" },
      { label: "M2", value: "2" },
      { label: "M3", value: "3" },
      { label: "M4", value: "4" },
      { label: "M5", value: "5" },
    ],
    highlights: [
      { title: " Champions Cup ", tag: " Thường niên ", description: " Giải toàn trường " },
      { title: "  " },
    ],
  });

  assert.equal(normalized.preset, "SPORTS");
  assert.equal(normalized.slogan, "Cháy hết mình trên sân cỏ Hòa Lạc & Mỹ Đình");
  assert.deepEqual(normalized.enabledBlocks, ["metrics", "schedule"]);
  assert.equal(normalized.customMetrics.length, 4);
  assert.equal(normalized.customMetrics[0]?.label, "Giải đấu");
  assert.equal(normalized.highlights.length, 1);
  assert.equal(normalized.highlights[0]?.title, "Champions Cup");
  assert.equal(hasCustomClubOverview(normalized), true);
});

test("buildPresetStarterConfig provides starter configs for all 5 club archetypes and formatBytesCompact formats sizes", () => {
  for (const key of Object.keys(CLUB_PRESET_META) as (keyof typeof CLUB_PRESET_META)[]) {
    const starter = buildPresetStarterConfig(key);
    assert.equal(starter.preset, key);
    assert.ok(starter.slogan.length > 0);
    assert.ok(starter.customMetrics.length >= 2);
    assert.ok(starter.highlights.length >= 1);
  }

  assert.equal(formatBytesCompact(0), "0 B");
  assert.equal(formatBytesCompact(512), "512 B");
  assert.equal(formatBytesCompact(2048), "2.0 KB");
  assert.equal(formatBytesCompact(5 * 1024 * 1024), "5.0 MB");
});

test("all custom overview and statistics frontend files stay concise (< 400 lines)", () => {
  const files = [
    "src/forms/club/club-overview-config.ts",
    "src/components/club/ClubOverviewShowcase.tsx",
    "src/components/management/ClubOverviewCustomizer.tsx",
    "src/components/management/OverviewDepartmentPanel.tsx",
    "src/components/management/OverviewTab.tsx",
    "src/components/management/ClubSettingsTab.tsx",
    "src/components/club/ClubRecruitmentDrawer.tsx",
  ];
  for (const rel of files) {
    const abs = path.join(process.cwd(), rel);
    const lines = fs.readFileSync(abs, "utf8").split("\n").length;
    assert.ok(lines < 400, `Expected ${rel} to stay < 400 lines, got ${lines}`);
  }
});
