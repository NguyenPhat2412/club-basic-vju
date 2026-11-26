"use client";

import { useQuery } from "@tanstack/react-query";
import { Bus, ExternalLink, Images, Layers, Map as MapIcon, MapPin, Share2, Store } from "lucide-react";
import { apiModel, type PublicEvent } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { resolveMediaUrl } from "@/lib/media";
import { safeExternalHref } from "@/lib/utils";
import { Section } from "@/components/shared/Overlays";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getEventScopeLabel } from "@/forms/event/event-form";

export function EventFestivalDetailSection({
  event,
  onSelectBooth,
}: {
  event: PublicEvent;
  onSelectBooth: (booth: PublicEvent) => void;
}) {
  const venueMapSrc = resolveMediaUrl(event.venueMapUrl) || safeExternalHref(event.venueMapUrl);
  const fbHref = safeExternalHref(event.facebookPostUrl);
  const recapHref = safeExternalHref(event.recapAlbumUrl);
  const coHosts = event.coHosts ?? [];
  const hasBooths = (event.childBoothCount ?? 0) > 0;

  const boothsQuery = useQuery({
    queryKey: qk.publicEventBooths(event.id),
    queryFn: () => apiModel.publicEventBooths(event.id),
    enabled: hasBooths,
    staleTime: 30_000,
  });

  const booths = boothsQuery.data ?? [];
  const hasCampaignMeta = Boolean(
    event.parentEventTitle ||
      event.boothCode ||
      coHosts.length > 0 ||
      event.allowShuttleBus ||
      fbHref ||
      recapHref ||
      venueMapSrc ||
      hasBooths,
  );

  if (!hasCampaignMeta) return null;

  return (
    <div className="space-y-3">
      {(event.parentEventTitle || event.boothCode || coHosts.length > 0 || event.allowShuttleBus || fbHref || recapHref) && (
        <Section title="Thông tin Lễ hội & Truyền thông" icon={<Layers />}>
          <div className="space-y-2.5 text-xs">
            {(event.parentEventTitle || event.boothCode || event.allowShuttleBus) && (
              <div className="flex flex-wrap items-center gap-1.5">
                {event.parentEventTitle && (
                  <Badge tone="primary" dot={false}>
                    Thuộc lễ hội: {event.parentEventTitle}
                  </Badge>
                )}
                {event.boothCode && (
                  <Badge tone="neutral" dot={false}>
                    Gian hàng / Khu vực: {event.boothCode}
                  </Badge>
                )}
                {event.allowShuttleBus && (
                  <Badge tone="pending" dot={false}>
                    <Bus size={11} /> Có xe bus Mỹ Đình ↔ Hòa Lạc
                  </Badge>
                )}
              </div>
            )}

            {coHosts.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-semibold text-muted-foreground">Đơn vị đồng tổ chức:</p>
                <div className="flex flex-wrap gap-1.5">
                  {coHosts.map((ch) => (
                    <Badge key={ch.clubId} tone="neutral" dot={false}>
                      {ch.clubCode} · {ch.clubName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {(fbHref || recapHref) && (
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                {fbHref && (
                  <a
                    href={fbHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-2.5 py-1.5 font-semibold text-primary hover:bg-primary/10"
                  >
                    <Share2 size={12} /> Xem bài trên Fanpage Facebook <ExternalLink size={11} />
                  </a>
                )}
                {recapHref && (
                  <a
                    href={recapHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 py-1.5 font-semibold text-foreground hover:bg-muted"
                  >
                    <Images size={12} /> Xem Album ảnh Recap <ExternalLink size={11} />
                  </a>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

      {venueMapSrc && (
        <Section title="Bản đồ chơi / Sơ đồ gian hàng" icon={<MapIcon />}>
          <div className="space-y-2">
            <div className="overflow-hidden rounded-xl border border-border bg-muted/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={venueMapSrc} alt={`Sơ đồ ${event.title}`} className="max-h-64 w-full object-contain" />
            </div>
            <a
              href={venueMapSrc}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
            >
              Mở ảnh sơ đồ kích thước đầy đủ <ExternalLink size={11} />
            </a>
          </div>
        </Section>
      )}

      {hasBooths && (
        <Section title={`Danh sách Gian hàng & Hoạt động các CLB (${booths.length || event.childBoothCount})`} icon={<Store />}>
          {boothsQuery.isPending ? (
            <p className="text-xs text-muted-foreground">Đang tải danh sách gian hàng…</p>
          ) : booths.length === 0 ? (
            <p className="text-xs text-muted-foreground">Chưa có gian hàng công khai nào được mở.</p>
          ) : (
            <ul className="divide-y divide-border/60 rounded-xl border border-border bg-card">
              {booths.map((booth) => (
                <li key={booth.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-xs">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {booth.boothCode && (
                        <Badge tone="primary" dot={false}>
                          Gian {booth.boothCode}
                        </Badge>
                      )}
                      <span className="font-bold text-foreground">{booth.title}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {booth.clubName} · {getEventScopeLabel(booth)}
                      {booth.location ? (
                        <span className="ml-1.5 inline-flex items-center gap-0.5">
                          <MapPin size={10} /> {booth.location}
                        </span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <StatusBadge status={booth.status} />
                    <Button type="button" size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => onSelectBooth(booth)}>
                      Xem gian hàng
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      )}
    </div>
  );
}
