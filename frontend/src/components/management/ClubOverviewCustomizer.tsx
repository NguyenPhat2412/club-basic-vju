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
      className="min-w-0 space-y-5 rounded-xl border border-border/60 bg-card p-4 sm:p-5 lg:col-span-2"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
            <LayoutTemplate size={17} />
          </span>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              Tùy biến Trang Tổng quan & Bản sắc riêng của CLB ({club.code})
            </h3>
            <p className="text-xs text-muted-foreground">
              Mỗi câu lạc bộ có thể chọn mô hình đặc thù, bật/tắt khối hiển thị và thiết lập các chỉ số, dấu ấn riêng trên cả trang quản trị lẫn hồ sơ công khai.
            </p>
          </div>
        </div>
        <Button size="sm" disabled={saveConfig.isPending} onClick={() => saveConfig.mutate()}>
          <Save size={14} /> {saveConfig.isPending ? "Đang lưu…" : "Lưu tùy biến Tổng quan"}
        </Button>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-foreground">
            1. Nhóm đặc thù câu lạc bộ (Archetype Preset)
          </p>
          {preset && (
            <button
              type="button"
              onClick={() => {
                const starter = buildPresetStarterConfig(preset);
                setSlogan(starter.slogan);
                setCampusLocation(starter.campusLocation);
                setOperatingSchedule(starter.operatingSchedule);
                setCustomMetrics(starter.customMetrics);
                setHighlights(starter.highlights);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              <Sparkles size={12} /> Nạp bộ gợi ý mẫu của nhóm này
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-5">
          {PRESET_KEYS.map((key) => {
            const meta = CLUB_PRESET_META[key];
            const active = preset === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => applyStarterPreset(key)}
                className={`min-w-0 rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-primary bg-primary/6 ring-1 ring-primary/40"
                    : "border-border/70 bg-background hover:border-border hover:bg-muted/40"
                }`}
              >
                <span
                  className={`inline-block rounded-full border px-2 py-0.5 text-[10.5px] font-bold ${meta.badgeClass}`}
                >
                  {meta.label}
                </span>
                <p className="mt-1.5 text-[11px] leading-4 text-muted-foreground">{meta.shortDesc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <FormField label="Khẩu hiệu / Slogan đặc trưng">
          <Input
            value={slogan}
            maxLength={240}
            onChange={(e) => setSlogan(e.target.value)}
            placeholder="Ví dụ: Tinh thần Monozukuri Nhật Bản — Từ bản vẽ đến thực tế"
          />
        </FormField>
        <FormField label="Địa điểm / Cơ sở sinh hoạt">
          <Input
            value={campusLocation}
            maxLength={200}
            onChange={(e) => setCampusLocation(e.target.value)}
            placeholder="Cơ sở Hòa Lạc & Cơ sở Mỹ Đình…"
          />
        </FormField>
        <FormField label="Lịch tập luyện / Sinh hoạt định kỳ">
          <Input
            value={operatingSchedule}
            maxLength={200}
            onChange={(e) => setOperatingSchedule(e.target.value)}
            placeholder="Thứ 3 & Thứ 6 · 17:30 – 19:30…"
          />
        </FormField>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-foreground">
          2. Bật / Tắt các khối hiển thị trên Trang Tổng quan & Hồ sơ CLB
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {CLUB_OVERVIEW_BLOCK_OPTIONS.map((b) => {
            const checked = enabledBlocks.includes(b.key);
            return (
              <label
                key={b.key}
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 text-xs transition ${
                  checked
                    ? "border-primary/50 bg-primary/5"
                    : "border-border/70 bg-background opacity-75 hover:opacity-100"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleBlock(b.key)}
                  className="mt-0.5 size-4 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block font-bold text-foreground">{b.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">{b.hint}</span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-foreground">
                3. Chỉ số đặc thù riêng của CLB ({customMetrics.length}/4)
              </p>
              <p className="text-[11px] text-muted-foreground">
                Ví dụ: Số giải đấu, Nguyên mẫu chế tạo, Giờ tình nguyện, Đêm nhạc, Kho ảnh…
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={customMetrics.length >= 4}
              onClick={() =>
                setCustomMetrics((prev) => [...prev, { label: "", value: "", sub: "" }])
              }
            >
              <Plus size={13} /> Thêm chỉ số
            </Button>
          </div>

          {customMetrics.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              Chưa có chỉ số tùy biến. Nhấn “Thêm chỉ số” để tạo KPI đặc trưng cho CLB.
            </p>
          ) : (
            <div className="space-y-2.5">
              {customMetrics.map((m, idx) => (
                <div key={idx} className="grid items-end gap-2 rounded-lg border border-border/80 bg-card p-2.5 sm:grid-cols-[1fr_135px_auto]">
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
                      <Input value={m.sub ?? ""} maxLength={140} placeholder="VD: VJU Champions Cup & Giao hữu ĐHQGHN" onChange={(e) => updateMetric(idx, { sub: e.target.value })} />
                    </FormField>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-foreground">
                4. Chương trình & Thành tựu tiêu biểu ({highlights.length}/4)
              </p>
              <p className="text-[11px] text-muted-foreground">
                Giới thiệu giải truyền thống, showcase kỹ thuật, lễ hội hoặc chiến dịch nổi bật của CLB.
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={highlights.length >= 4}
              onClick={() =>
                setHighlights((prev) => [...prev, { title: "", tag: "", description: "" }])
              }
            >
              <Plus size={13} /> Thêm dấu ấn
            </Button>
          </div>

          {highlights.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
              Chưa có dấu ấn tiêu biểu. Nhấn “Thêm dấu ấn” để giới thiệu hoạt động nổi bật.
            </p>
          ) : (
            <div className="space-y-2.5">
              {highlights.map((h, idx) => (
                <div key={idx} className="space-y-2 rounded-lg border border-border/80 bg-card p-2.5">
                  <div className="grid items-end gap-2 sm:grid-cols-[1fr_155px_auto]">
                    <FormField label="Tên chương trình / giải thưởng" required>
                      <Input value={h.title} maxLength={120} placeholder="Tên chương trình / giải thưởng" onChange={(e) => updateHighlight(idx, { title: e.target.value })} />
                    </FormField>
                    <FormField label="Nhãn phân loại">
                      <Input value={h.tag ?? ""} maxLength={50} placeholder="VD: Thường niên" onChange={(e) => updateHighlight(idx, { tag: e.target.value })} />
                    </FormField>
                    <Button size="sm" variant="ghost" aria-label="Xóa dấu ấn" onClick={() => setHighlights((prev) => prev.filter((_, i) => i !== idx))} className="justify-self-end text-destructive hover:bg-destructive/10">
                      <Trash2 size={14} />
                    </Button>
                  </div>
                  <FormField label="Mô tả ngắn">
                    <Textarea rows={2} value={h.description ?? ""} maxLength={360} placeholder="Mô tả ngắn gọn giá trị hoặc quy mô chương trình…" onChange={(e) => updateHighlight(idx, { description: e.target.value })} />
                  </FormField>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end border-t border-border/60 pt-3">
        <Button size="sm" disabled={saveConfig.isPending} onClick={() => saveConfig.mutate()}>
          <Save size={14} /> {saveConfig.isPending ? "Đang lưu…" : "Lưu tùy biến Tổng quan CLB"}
        </Button>
      </div>
    </section>
  );
}
