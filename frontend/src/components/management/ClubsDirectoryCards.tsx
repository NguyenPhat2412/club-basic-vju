"use client";

import { Mail, Sparkles, Users } from "lucide-react";
import type { Club } from "@/lib/api";
import { isYouthUnion } from "@/lib/club/youth-union";
import { clubSlugFromCode, type ClubMediaItem } from "@/lib/media";
import { ClubAvatar, ClubCoverBanner } from "@/components/shared/ClubMedia";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClubManagementTabKey } from "@/forms/club/club-form";
import { cn } from "@/lib/utils";

export function ClubsDirectoryCards({
  clubs,
  activeClubId,
  mediaMap,
  onSelectClubAndTab,
}: {
  clubs: Club[];
  activeClubId: string;
  mediaMap?: Record<string, ClubMediaItem>;
  onSelectClubAndTab: (clubId: string, tab: ClubManagementTabKey) => void;
}) {
  return (
    <div className="grid gap-4 p-4 sm:px-6 md:grid-cols-2 xl:grid-cols-3">
      {clubs.map((club) => {
        const isSelected = club.id === activeClubId;
        const fallbackMedia = mediaMap?.[clubSlugFromCode(club.code)];
        return (
          <article
            key={club.id}
            className={cn(
              "flex flex-col justify-between overflow-hidden rounded-xl border bg-card transition-all",
              isSelected ? "border-primary ring-2 ring-primary/15" : "border-border/80 hover:border-primary/40"
            )}
          >
            <div>
              <ClubCoverBanner
                name={club.name}
                code={club.code}
                coverUrl={club.coverUrl}
                fallbackUrl={fallbackMedia?.cover}
                className="h-28 w-full"
              >
                <div className="absolute right-2.5 top-2.5 flex items-center gap-1.5 rounded-full bg-card/95 px-2 py-0.5 shadow-xs">
                  <StatusBadge status={club.status} />
                </div>
                <div className="absolute bottom-2.5 left-3 right-3 flex items-end gap-2.5">
                  <ClubAvatar name={club.name} code={club.code} logoUrl={club.logoUrl} fallbackUrl={fallbackMedia?.logo} size="md" />
                  <div className="min-w-0 flex-1 text-white drop-shadow-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-white/90">{club.code}</span>
                      {isYouthUnion(club) && <Badge tone="primary" dot={false}>ĐTN cấp Trường</Badge>}
                    </div>
                    <h3 className="truncate text-sm font-extrabold leading-tight">{club.name}</h3>
                  </div>
                </div>
              </ClubCoverBanner>
              <div className="space-y-1.5 p-3.5 text-xs">
                {club.contactEmail && (
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Mail size={11} /> {club.contactEmail}
                  </span>
                )}
                <p className="line-clamp-2 text-muted-foreground">{club.description || "Chưa có mô tả."}</p>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border/60 bg-muted/20 px-3.5 py-2">
              <Button size="sm" variant={isSelected ? "default" : "outline"} onClick={() => onSelectClubAndTab(club.id, "overview")}>
                <Sparkles size={12} /> Mở CLB
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onSelectClubAndTab(club.id, "members")}>
                <Users size={12} /> Thành viên
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
