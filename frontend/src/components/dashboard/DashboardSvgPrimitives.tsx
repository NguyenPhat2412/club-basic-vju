"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type DonutSegment = {
  key: string;
  label: string;
  value: number;
  strokeClass: string;
  dotClass: string;
};

export function SvgDonutChart({
  segments,
  centerValue,
  centerLabel,
  size = 152,
  strokeWidth = 22,
}: {
  segments: DonutSegment[];
  centerValue: string | number;
  centerLabel: string;
  size?: number;
  strokeWidth?: number;
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const total = segments.reduce((sum, s) => sum + Math.max(0, s.value), 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const activeSeg = hoveredKey ? segments.find((s) => s.key === hoveredKey) : null;

  const computed = segments.reduce<Array<DonutSegment & { length: number; offset: number; pct: number }>>(
    (acc, seg) => {
      const prevLength = acc.reduce((s, item) => s + item.length, 0);
      const ratio = total > 0 ? Math.max(0, seg.value) / total : 0;
      const length = ratio * circumference;
      acc.push({
        ...seg,
        length,
        offset: prevLength,
        pct: Math.round(ratio * 100),
      });
      return acc;
    },
    [],
  );

  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" role="img" aria-label={centerLabel}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-slate-100"
          />
          {total > 0 &&
            computed.map((seg) =>
              seg.length > 0 ? (
                <circle
                  key={seg.key}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  strokeWidth={hoveredKey === seg.key ? strokeWidth + 3 : strokeWidth}
                  strokeDasharray={`${Math.max(seg.length - 1.5, 1)} ${circumference}`}
                  strokeDashoffset={-seg.offset}
                  strokeLinecap="butt"
                  className={cn("cursor-pointer transition-all duration-200", seg.strokeClass)}
                  onMouseEnter={() => setHoveredKey(seg.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                >
                  <title>{`${seg.label}: ${seg.value} (${seg.pct}%)`}</title>
                </circle>
              ) : null,
            )}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
          <span className="font-mono text-xl font-extrabold tracking-tight text-foreground tabular-nums">
            {activeSeg ? activeSeg.value : centerValue}
          </span>
          <span className="mt-0.5 line-clamp-1 max-w-[96px] text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            {activeSeg ? activeSeg.label : centerLabel}
          </span>
        </div>
      </div>

      <div className="w-full min-w-0 flex-1 space-y-1.5">
        {computed.map((seg) => (
          <div
            key={seg.key}
            onMouseEnter={() => setHoveredKey(seg.key)}
            onMouseLeave={() => setHoveredKey(null)}
            className={cn(
              "flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-xs transition-colors",
              hoveredKey === seg.key ? "bg-slate-100/90" : "hover:bg-slate-50",
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className={cn("size-2.5 shrink-0 rounded-full", seg.dotClass)} />
              <span className="truncate font-medium text-foreground">{seg.label}</span>
            </span>
            <span className="shrink-0 font-mono text-[11px] font-bold text-foreground tabular-nums">
              {seg.value}
              <span className="ml-1 font-normal text-muted-foreground">({seg.pct}%)</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export type VerticalBarDatum = {
  key: string;
  label: string;
  subLabel?: string;
  primary: number;
  secondary?: number;
  badgeText?: string;
};

export function SvgGroupedColumnChart({
  data,
  primaryLabel,
  secondaryLabel,
  emptyText = "Chưa có dữ liệu biểu đồ.",
}: {
  data: VerticalBarDatum[];
  primaryLabel: string;
  secondaryLabel?: string;
  emptyText?: string;
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  if (data.length === 0) {
    return <p className="py-10 text-center text-xs text-muted-foreground">{emptyText}</p>;
  }

  const maxVal = Math.max(
    1,
    ...data.map((d) => Math.max(d.primary, d.secondary ?? 0)),
  );
  const active = hoveredKey ? data.find((d) => d.key === hoveredKey) : null;
  const chartHeight = 168;
  const topPad = 14;
  const bottomPad = 28;
  const plotHeight = chartHeight - topPad - bottomPad;
  const colWidth = 64;
  const svgWidth = Math.max(360, data.length * colWidth + 24);
  const gridSteps = [0, 0.25, 0.5, 0.75, 1];

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
        <div className="flex flex-wrap items-center gap-3">
          {secondaryLabel && (
            <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
              <span className="size-2.5 rounded-xs bg-slate-300" />
              {secondaryLabel}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
            <span className="size-2.5 rounded-xs bg-primary" />
            {primaryLabel}
          </span>
        </div>
        <span className="font-mono text-[11px] font-semibold text-primary tabular-nums">
          {active
            ? `${active.subLabel || active.label}: ${active.primary}${secondaryLabel && active.secondary !== undefined ? ` / ${active.secondary}` : ""}${active.badgeText ? ` · ${active.badgeText}` : ""}`
            : "Di chuột lên cột để xem chi tiết"}
        </span>
      </div>

      <div className="w-full overflow-x-auto pb-1">
        <svg
          viewBox={`0 0 ${svgWidth} ${chartHeight}`}
          className="h-44 w-full min-w-[360px]"
          role="img"
          aria-label={`${primaryLabel} biểu đồ cột`}
        >
          {gridSteps.map((ratio) => {
            const y = topPad + plotHeight * (1 - ratio);
            return (
              <line
                key={ratio}
                x1={8}
                x2={svgWidth - 8}
                y1={y}
                y2={y}
                strokeDasharray={ratio === 0 ? undefined : "3 3"}
                className={ratio === 0 ? "stroke-slate-200" : "stroke-slate-100"}
                strokeWidth={1}
              />
            );
          })}

          {data.map((d, idx) => {
            const groupX = 14 + idx * colWidth;
            const centerX = groupX + colWidth / 2;
            const hasSec = secondaryLabel !== undefined && d.secondary !== undefined;
            const barW = hasSec ? 16 : 24;
            const secH = hasSec ? Math.max(d.secondary! > 0 ? 4 : 0, (d.secondary! / maxVal) * plotHeight) : 0;
            const priH = Math.max(d.primary > 0 ? 4 : 0, (d.primary / maxVal) * plotHeight);
            const isHovered = hoveredKey === d.key;

            return (
              <g
                key={d.key}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredKey(d.key)}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <rect
                  x={groupX + 2}
                  y={topPad - 4}
                  width={colWidth - 4}
                  height={plotHeight + 8}
                  rx={6}
                  className={isHovered ? "fill-slate-100/80" : "fill-transparent"}
                />
                {hasSec && (
                  <rect
                    x={centerX - barW - 2}
                    y={topPad + plotHeight - secH}
                    width={barW}
                    height={secH}
                    rx={3}
                    className="fill-slate-300 transition-all duration-200"
                  >
                    <title>{`${d.subLabel || d.label} · ${secondaryLabel}: ${d.secondary}`}</title>
                  </rect>
                )}
                <rect
                  x={hasSec ? centerX + 2 : centerX - barW / 2}
                  y={topPad + plotHeight - priH}
                  width={barW}
                  height={priH}
                  rx={3}
                  className={cn(
                    "transition-all duration-200",
                    isHovered ? "fill-primary" : "fill-primary/85",
                  )}
                >
                  <title>{`${d.subLabel || d.label} · ${primaryLabel}: ${d.primary}${d.badgeText ? ` (${d.badgeText})` : ""}`}</title>
                </rect>
                {hasSec && d.secondary! > 0 && (
                  <text
                    x={centerX - barW / 2 - 2}
                    y={topPad + plotHeight - secH - 4}
                    textAnchor="middle"
                    className="fill-slate-400 font-mono text-[9px] font-semibold"
                  >
                    {d.secondary}
                  </text>
                )}
                {d.primary > 0 && (
                  <text
                    x={hasSec ? centerX + barW / 2 + 2 : centerX}
                    y={topPad + plotHeight - priH - 4}
                    textAnchor="middle"
                    className="fill-primary font-mono text-[9.5px] font-bold"
                  >
                    {d.primary}
                  </text>
                )}
                <text
                  x={centerX}
                  y={chartHeight - 8}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px] font-semibold",
                    isHovered ? "fill-primary" : "fill-slate-600",
                  )}
                >
                  {d.label.length > 9 ? `${d.label.slice(0, 8)}…` : d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
