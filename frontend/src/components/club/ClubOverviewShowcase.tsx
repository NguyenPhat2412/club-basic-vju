"use client";

import {
  Award,
  Clock,
  Cpu,
  HeartHandshake,
  MapPin,
  Palette,
  SlidersHorizontal,
  Sparkles,
  Trophy,
  Video,
} from "lucide-react";
import type { Club, ClubPresetKey } from "@/types/club/club.types";
import {
  CLUB_PRESET_META,
  hasCustomClubOverview,
  normalizeClubOverviewConfig,
} from "@/forms/club/club-overview-config";
import { Button } from "@/components/ui/button";

function PresetIcon({ preset, size = 15 }: { preset: ClubPresetKey | null; size?: number }) {
  switch (preset) {
    case "SPORTS":
      return <Trophy size={size} />;
    case "ACADEMIC_TECH":
      return <Cpu size={size} />;
    case "CULTURE_ARTS":
      return <Palette size={size} />;
    case "VOLUNTEER":
      return <HeartHandshake size={size} />;
    case "MEDIA_LIFESTYLE":
      return <Video size={size} />;
    default:
      return <Sparkles size={size} />;
  }
}

export function ClubOverviewShowcase({
  club,
  variant = "workspace",
  canCustomize = false,
  onCustomize,
}: {
  club: Club;
  variant?: "workspace" | "drawer";
  canCustomize?: boolean;
  onCustomize?: () => void;
}) {
  const cfg = normalizeClubOverviewConfig(club.overviewConfig);
  const presetMeta = cfg.preset ? CLUB_PRESET_META[cfg.preset] : null;
  const hasCustom = hasCustomClubOverview(club.overviewConfig);

  const showSchedule =
    cfg.enabledBlocks.includes("schedule") && Boolean(cfg.campusLocation || cfg.operatingSchedule);
  const showMetrics = cfg.enabledBlocks.includes("metrics") && cfg.customMetrics.length > 0;
  const showHighlights = cfg.enabledBlocks.includes("highlights") && cfg.highlights.length > 0;

  if (!hasCustom && !canCustomize) {
    return null;
  }

  const surfaceTone = presetMeta
    ? presetMeta.surfaceClass
    : "from-primary/8 via-background to-background border-border";
  const metricAccent = presetMeta ? presetMeta.metricAccentClass : "text-primary";

  if (variant === "drawer") {
    return (
      <div className="mt-4 space-y-3.5">
        {(presetMeta || cfg.slogan || showSchedule) && (
          <div className={`rounded-xl border bg-gradient-to-br p-3.5 ${surfaceTone}`}>
            <div className="flex flex-wrap items-center gap-2">
              {presetMeta && (
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${presetMeta.badgeClass}`}
                >
                  <PresetIcon preset={cfg.preset} size={13} />
                  {presetMeta.label}
                </span>
              )}
              {club.activityField && (
                <span className="text-[11px] font-medium text-muted-foreground">
                  · {club.activityField}
                </span>
              )}
            </div>

            {cfg.slogan && (
              <p className="mt-2 text-sm font-bold leading-snug text-foreground">
                “{cfg.slogan}”
              </p>
            )}

            {showSchedule && (
              <div className="mt-2.5 grid gap-1.5 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                {cfg.campusLocation && (
                  <div className="flex items-start gap-2">
                    <MapPin size={13} className="mt-0.5 shrink-0 text-primary" />
                    <span className="min-w-0 break-words">{cfg.campusLocation}</span>
                  </div>
                )}
                {cfg.operatingSchedule && (
                  <div className="flex items-start gap-2">
                    <Clock size={13} className="mt-0.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 break-words">{cfg.operatingSchedule}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {showMetrics && (
          <div className="grid grid-cols-2 gap-2.5">
            {cfg.customMetrics.map((m, idx) => (
              <div
                key={`${m.label}-${idx}`}
                className="min-w-0 rounded-xl border border-border/80 bg-card px-3 py-2.5 shadow-2xs"
              >
                <p className="truncate text-[11px] font-semibold text-muted-foreground">{m.label}</p>
                <p className={`mt-0.5 font-mono text-base font-extrabold tabular-nums ${metricAccent}`}>
                  {m.value}
                </p>
                {m.sub && (
                  <p className="mt-0.5 line-clamp-2 text-[10.5px] leading-4 text-muted-foreground">
                    {m.sub}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {showHighlights && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-foreground">
              <Award size={14} className="text-primary" />
              <span>Dấu ấn & Hoạt động đặc trưng</span>
            </div>
            <div className="grid gap-2">
              {cfg.highlights.map((h, idx) => (
                <div
                  key={`${h.title}-${idx}`}
                  className="rounded-xl border border-border/75 bg-muted/30 px-3.5 py-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <p className="text-xs font-bold text-foreground">{h.title}</p>
                    {h.tag && (
                      <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                        {h.tag}
                      </span>
                    )}
                  </div>
                  {h.description && (
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">{h.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className={`rounded-xl border bg-gradient-to-br p-4 sm:p-5 ${surfaceTone}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            {presetMeta ? (
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${presetMeta.badgeClass}`}
              >
                <PresetIcon preset={cfg.preset} size={13} />
                {presetMeta.label}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                <Sparkles size={13} className="text-primary" />
                Không gian Tổng quan CLB
              </span>
            )}
            <span className="font-mono text-xs font-bold text-muted-foreground">{club.code}</span>
            {club.activityField && (
              <span className="text-xs text-muted-foreground">· {club.activityField}</span>
            )}
          </div>

          <h2 className="text-base font-extrabold tracking-tight text-foreground sm:text-lg">
            {club.name}
          </h2>

          {cfg.slogan ? (
            <p className="text-xs font-semibold text-foreground/85 sm:text-sm">“{cfg.slogan}”</p>
          ) : (
            club.description && (
              <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                {club.description}
              </p>
            )
          )}
        </div>

        {canCustomize && onCustomize && (
          <Button size="sm" variant="outline" onClick={onCustomize} className="bg-background/90">
            <SlidersHorizontal size={14} /> Tùy biến trang Tổng quan
          </Button>
        )}
      </div>

      {showSchedule && (
        <div className="mt-3.5 grid gap-2 rounded-lg border border-border/70 bg-background/80 px-3.5 py-2.5 text-xs sm:grid-cols-2">
          {cfg.campusLocation && (
            <div className="flex min-w-0 items-start gap-2">
              <MapPin size={14} className="mt-0.5 shrink-0 text-primary" />
              <div className="min-w-0">
                <span className="font-semibold text-foreground">Địa điểm hoạt động: </span>
                <span className="text-muted-foreground">{cfg.campusLocation}</span>
              </div>
            </div>
          )}
          {cfg.operatingSchedule && (
            <div className="flex min-w-0 items-start gap-2">
              <Clock size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <span className="font-semibold text-foreground">Lịch sinh hoạt định kỳ: </span>
                <span className="text-muted-foreground">{cfg.operatingSchedule}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {showMetrics && (
        <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {cfg.customMetrics.map((m, idx) => (
            <div
              key={`${m.label}-${idx}`}
              className="min-w-0 rounded-xl border border-border/80 bg-card/95 px-3.5 py-3 shadow-2xs"
            >
              <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {m.label}
              </p>
              <p className={`mt-1 font-mono text-xl font-extrabold tabular-nums ${metricAccent}`}>
                {m.value}
              </p>
              {m.sub && (
                <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{m.sub}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {showHighlights && (
        <div className="mt-3.5 grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {cfg.highlights.map((h, idx) => (
            <div
              key={`${h.title}-${idx}`}
              className="flex min-w-0 items-start gap-3 rounded-xl border border-border/75 bg-background/85 px-3.5 py-3"
            >
              <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Award size={14} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-bold text-foreground">{h.title}</p>
                  {h.tag && (
                    <span className="rounded-md border border-border bg-secondary px-2 py-0.5 text-[10px] font-semibold text-secondary-foreground">
                      {h.tag}
                    </span>
                  )}
                </div>
                {h.description && (
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{h.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
