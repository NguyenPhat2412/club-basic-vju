"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { LayoutTemplate, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { apiModel, Club } from "@/lib/api";
import type {
  ClubCustomMetric,
  ClubHighlightItem,
  ClubOverviewBlockKey,
  ClubPresetKey,
} from "@/types/club/club.types";
import {
  buildPresetStarterConfig,
  CLUB_OVERVIEW_BLOCK_OPTIONS,
  CLUB_PRESET_META,
  normalizeClubOverviewConfig,
} from "@/forms/club/club-overview-config";
import { describeError } from "@/components/shared/ListPage";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea } from "@/components/ui/input";

const PRESET_KEYS = Object.keys(CLUB_PRESET_META) as ClubPresetKey[];

export function ClubOverviewCustomizer({
  club,
  onSaved,
  onNotice,
  onError,
}: {
  club: Club;
  onSaved: () => void;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const initial = normalizeClubOverviewConfig(club.overviewConfig);

  const [preset, setPreset] = useState<ClubPresetKey | null>(initial.preset);
  const [slogan, setSlogan] = useState(initial.slogan);
  const [campusLocation, setCampusLocation] = useState(initial.campusLocation);
  const [operatingSchedule, setOperatingSchedule] = useState(initial.operatingSchedule);
  const [enabledBlocks, setEnabledBlocks] = useState<ClubOverviewBlockKey[]>(initial.enabledBlocks);
  const [customMetrics, setCustomMetrics] = useState<ClubCustomMetric[]>(initial.customMetrics);
  const [highlights, setHighlights] = useState<ClubHighlightItem[]>(initial.highlights);

  const toggleBlock = (key: ClubOverviewBlockKey) => {
    setEnabledBlocks((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    );
  };

  const applyStarterPreset = (targetPreset: ClubPresetKey) => {
    const starter = buildPresetStarterConfig(targetPreset);
    setPreset(targetPreset);
    if (!slogan.trim()) setSlogan(starter.slogan);
    if (!campusLocation.trim()) setCampusLocation(starter.campusLocation);
    if (!operatingSchedule.trim()) setOperatingSchedule(starter.operatingSchedule);
    if (customMetrics.length === 0) setCustomMetrics(starter.customMetrics);
    if (highlights.length === 0) setHighlights(starter.highlights);
  };

  const updateMetric = (idx: number, patch: Partial<ClubCustomMetric>) => {
    setCustomMetrics((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  };

  const updateHighlight = (idx: number, patch: Partial<ClubHighlightItem>) => {
    setHighlights((prev) => prev.map((h, i) => (i === idx ? { ...h, ...patch } : h)));
  };

  const saveConfig = useMutation({
    mutationFn: () =>
      apiModel.updateClub(club.id, {
        overviewConfig: {
          preset,
          slogan: slogan.trim() || null,
          campusLocation: campusLocation.trim() || null,
          operatingSchedule: operatingSchedule.trim() || null,
          enabledBlocks,
          customMetrics: customMetrics
            .filter((m) => m.label.trim() && m.value.trim())
            .slice(0, 4)
            .map((m) => ({
              label: m.label.trim(),
              value: m.value.trim(),
              sub: m.sub?.trim() || null,
            })),
          highlights: highlights
            .filter((h) => h.title.trim())
            .slice(0, 4)
            .map((h) => ({
              title: h.title.trim(),
              tag: h.tag?.trim() || null,
              description: h.description?.trim() || null,
            })),
        },
      }),
    onSuccess: (updated) => {
      onNotice(`Đã lưu giao diện Tổng quan tùy biến cho câu lạc bộ "${updated.name}".`);
      onError("");
      onSaved();
    },
    onError: (e) => onError(describeError(e)),
  });

  return (
    <section
      id="club-overview-customizer"
      className="min-w-0 divide-y divide-border/60 rounded-xl border border-border/60 bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <LayoutTemplate size={15} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">Trang giới thiệu CLB</h3>
        </div>
        <div className="flex items-center gap-2">
          {preset && (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => {
                const starter = buildPresetStarterConfig(preset);
                setSlogan(starter.slogan);
                setCampusLocation(starter.campusLocation);
                setOperatingSchedule(starter.operatingSchedule);
                setCustomMetrics(starter.customMetrics);
                setHighlights(starter.highlights);
              }}
            >
              <Sparkles size={13} /> Nạp gợi ý mẫu
            </Button>
          )}
          <Button size="sm" className="h-8" disabled={saveConfig.isPending} onClick={() => saveConfig.mutate()}>
            <Save size={14} /> {saveConfig.isPending ? "Đang lưu…" : "Lưu giao diện"}
          </Button>
        </div>
      </div>

      {/* Section 1: Archetype preset + basic info (flat, minimal borders) */}
      <div className="space-y-3.5 px-4 py-4 sm:px-5">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            1. Nhóm đặc thù câu lạc bộ
          </p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_KEYS.map((key) => {
              const meta = CLUB_PRESET_META[key];
              const active = preset === key;
              return (
                <button
                  key={key}
                  type="button"
                  title={meta.shortDesc}
                  onClick={() => applyStarterPreset(key)}
                  className={`inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/35"
                      : "bg-muted/50 text-foreground/80 hover:bg-muted"
                  }`}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <FormField label="Khẩu hiệu / Slogan">
            <Input
              value={slogan}
              maxLength={240}
              onChange={(e) => setSlogan(e.target.value)}
              placeholder="VD: Cháy hết mình trên sân cỏ…"
            />
          </FormField>
          <FormField label="Địa điểm sinh hoạt">
            <Input
              value={campusLocation}
              maxLength={200}
              onChange={(e) => setCampusLocation(e.target.value)}
              placeholder="VD: Cơ sở Hòa Lạc / Mỹ Đình"
            />
          </FormField>
          <FormField label="Lịch sinh hoạt định kỳ">
            <Input
              value={operatingSchedule}
              maxLength={200}
              onChange={(e) => setOperatingSchedule(e.target.value)}
              placeholder="VD: Thứ 3 & Thứ 6 · 17:30 – 19:30"
            />
          </FormField>
        </div>
      </div>

      {/* Section 2: Compact inline toggle chips (no heavy nested cards or paragraphs) */}
      <div className="space-y-2 px-4 py-3.5 sm:px-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          2. Khối hiển thị trên trang giới thiệu
        </p>
        <div className="flex flex-wrap gap-2">
          {CLUB_OVERVIEW_BLOCK_OPTIONS.map((b) => {
            const checked = enabledBlocks.includes(b.key);
            return (
              <label
                key={b.key}
                title={b.hint}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  checked
                    ? "bg-primary/8 text-foreground ring-1 ring-inset ring-primary/25"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted/70"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleBlock(b.key)}
                  className="size-3.5 accent-primary"
                />
                <span>{b.label}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Section 3 & 4: Clean 2-column flat layout with spacious inputs */}
      <div className="grid divide-y divide-border/60 xl:grid-cols-2 xl:divide-x xl:divide-y-0">
        <div className="space-y-3 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              3. Chỉ số đặc thù ({customMetrics.length}/4)
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7.5 px-2.5 text-xs"
              disabled={customMetrics.length >= 4}
              onClick={() =>
                setCustomMetrics((prev) => [...prev, { label: "", value: "", sub: "" }])
              }
            >
              <Plus size={13} /> Thêm chỉ số
            </Button>
          </div>

          {customMetrics.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Chưa có chỉ số tùy biến.
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {customMetrics.map((m, idx) => (
                <div key={idx} className="grid items-end gap-2.5 py-2.5 first:pt-0 last:pb-0 sm:grid-cols-[1fr_140px_auto]">
                  <FormField label="Tên chỉ số" required>
                    <Input value={m.label} maxLength={80} placeholder="VD: Giải đấu/năm" onChange={(e) => updateMetric(idx, { label: e.target.value })} />
                  </FormField>
                  <FormField label="Giá trị" required>
                    <Input value={m.value} maxLength={40} placeholder="VD: 04 giải" onChange={(e) => updateMetric(idx, { value: e.target.value })} />
                  </FormField>
                  <Button size="sm" variant="ghost" aria-label="Xóa chỉ số" onClick={() => setCustomMetrics((prev) => prev.filter((_, i) => i !== idx))} className="justify-self-end text-destructive hover:bg-destructive/10">
                    <Trash2 size={14} />
                  </Button>
                  <div className="sm:col-span-3">
                    <FormField label="Ghi chú phụ">
                      <Input value={m.sub ?? ""} maxLength={140} placeholder="VD: VJU Champions Cup" onChange={(e) => updateMetric(idx, { sub: e.target.value })} />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 px-4 py-4 sm:px-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              4. Chương trình &amp; Thành tựu tiêu biểu ({highlights.length}/4)
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-7.5 px-2.5 text-xs"
              disabled={highlights.length >= 4}
              onClick={() =>
                setHighlights((prev) => [...prev, { title: "", tag: "", description: "" }])
              }
            >
              <Plus size={13} /> Thêm dấu ấn
            </Button>
          </div>

          {highlights.length === 0 ? (
            <p className="py-4 text-center text-xs text-muted-foreground">
              Chưa có dấu ấn tiêu biểu.
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {highlights.map((h, idx) => (
                <div key={idx} className="space-y-2 py-2.5 first:pt-0 last:pb-0">
                  <div className="grid items-end gap-2.5 sm:grid-cols-[1fr_160px_auto]">
                    <FormField label="Tên chương trình / giải thưởng" required>
                      <Input value={h.title} maxLength={120} placeholder="Tên chương trình" onChange={(e) => updateHighlight(idx, { title: e.target.value })} />
                    </FormField>
                    <FormField label="Nhãn phân loại">
                      <Input value={h.tag ?? ""} maxLength={50} placeholder="VD: Thường niên" onChange={(e) => updateHighlight(idx, { tag: e.target.value })} />
                    </FormField>
                    <Button size="sm" variant="ghost" aria-label="Xóa dấu ấn" onClick={() => setHighlights((prev) => prev.filter((_, i) => i !== idx))} className="justify-self-end text-destructive hover:bg-destructive/10">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <FormField label="Mô tả ngắn">
                    <Textarea rows={2} className="min-h-16 py-2" value={h.description ?? ""} maxLength={360} placeholder="Mô tả ngắn gọn…" onChange={(e) => updateHighlight(idx, { description: e.target.value })} />
                  </FormField>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
