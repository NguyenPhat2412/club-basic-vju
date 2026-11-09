"use client";

import { Building2, CheckCircle2, Clock3, Images, Mail } from "lucide-react";
import { ClubMediaItem } from "@/lib/media";
import { ClubAvatar, ClubCoverBanner } from "@/components/shared/ClubMedia";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ApplicationSummary, ClubItem, Membership } from "@/types";

export interface ClubDiscoveryCardProps {
  club: ClubItem;
  memberRecord?: Membership;
  pendingApp?: ApplicationSummary;
  canReapply: boolean;
  clubMedia?: ClubMediaItem;
  isAuthenticated: boolean;
  canManage?: boolean;
  onOpenDetail: (club: ClubItem) => void;
  onNavigateLogin: () => void;
  onNavigateManage?: () => void;
  onNavigateMemberships: () => void;
  onNavigatePendingApp: (appId: string) => void;
}

export function ClubDiscoveryCard({
  club,
  memberRecord,
  pendingApp,
  canReapply,
  clubMedia,
  isAuthenticated,
  canManage = false,
  onOpenDetail,
  onNavigateLogin,
  onNavigateManage,
  onNavigateMemberships,
  onNavigatePendingApp,
}: ClubDiscoveryCardProps) {
  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs transition-all hover:border-primary/40 hover:shadow-md">
      <div className="cursor-pointer" onClick={() => onOpenDetail(club)}>
        <ClubCoverBanner
          name={club.name}
          code={club.code}
          coverUrl={club.coverUrl}
          fallbackUrl={clubMedia?.cover}
          className="h-40 w-full cursor-pointer"
        >
          <div className="absolute left-3.5 top-3 flex flex-wrap items-center gap-1.5">
            {club.activityField && (
              <span className="rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary shadow-xs">
                {club.activityField}
              </span>
            )}
          </div>
          <div className="absolute right-3 top-3">
            <StatusBadge status={club.status} />
          </div>
          {clubMedia && clubMedia.gallery.length > 0 && (
            <span className="absolute bottom-2.5 right-3 inline-flex items-center gap-1 rounded-full bg-slate-950/65 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-xs">
              <Images size={11} /> {clubMedia.gallery.length} ảnh
            </span>
          )}
        </ClubCoverBanner>

        <div className="px-5 pt-4">
          <div className="flex items-start gap-3.5">
            <ClubAvatar
              name={club.name}
              code={club.code}
              logoUrl={club.logoUrl}
              fallbackUrl={clubMedia?.logo}
              size="md"
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <span className="inline-block rounded-md bg-primary/10 px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider text-primary">
                {club.code}
              </span>
              <h2 className="mt-1 line-clamp-2 text-[17px] font-bold leading-snug tracking-tight text-slate-900 group-hover:text-primary">
                {club.name}
              </h2>
            </div>
          </div>

          {(memberRecord || pendingApp) && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {memberRecord && (
                <Badge tone={memberRecord.status === "SUSPENDED" ? "pending" : "primary"} dot={false}>
                  <CheckCircle2 size={11} />{" "}
                  {memberRecord.status === "SUSPENDED" ? "Thành viên (Tạm đình chỉ)" : "Đã là thành viên"}
                </Badge>
              )}
              {!memberRecord && pendingApp && (
                <Badge tone="pending" dot={false}>
                  <Clock3 size={11} /> Đang chờ duyệt
                </Badge>
              )}
            </div>
          )}

          <p className="mt-3.5 line-clamp-3 text-sm leading-6 text-slate-700">
            {club.description || "CLB đang cập nhật mô tả hoạt động."}
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 px-5 pb-5 pt-3">
        <div className="space-y-1.5 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Building2 size={13} className="shrink-0 text-primary" />
            <span className="truncate">{club.activityField || "Lĩnh vực chung"}</span>
          </div>
          {club.contactEmail && (
            <div className="flex items-center gap-2">
              <Mail size={13} className="shrink-0 text-primary" />
              <span className="truncate">{club.contactEmail}</span>
            </div>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onOpenDetail(club)}>
            Xem chi tiết
          </Button>
          {!isAuthenticated ? (
            <Button size="sm" className="flex-1" onClick={onNavigateLogin}>
              Đăng nhập
            </Button>
          ) : canManage && onNavigateManage ? (
            <Button size="sm" className="flex-1" onClick={onNavigateManage}>
              Quản lý CLB
            </Button>
          ) : memberRecord ? (
            <Button variant="outline" size="sm" className="flex-1" onClick={onNavigateMemberships}>
              Đã là thành viên
            </Button>
          ) : pendingApp ? (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => onNavigatePendingApp(pendingApp.id)}
            >
              Xem đơn chờ duyệt
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onOpenDetail(club)}
              disabled={club.status !== "ACTIVE"}
            >
              {canReapply ? "Nộp lại đơn" : "Đăng ký gia nhập"}
            </Button>
          )}
        </div>
      </div>
    </article>
  );
}
