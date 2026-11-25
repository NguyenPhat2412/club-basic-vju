"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  ExternalLink,
  Images,
  Mail,
  Send,
  Settings2,
  Share2,
  Users,
  X,
} from "lucide-react";
import { apiModel } from "@/lib/api";
import { isYouthUnion, unitApplyCtaLabel } from "@/lib/club/youth-union";
import { qk } from "@/lib/api/query-keys";
import { clubSlugFromCode } from "@/lib/media";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { ClubAvatar, ClubCoverBanner, useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { describeError } from "@/components/shared/ListPage";
import { Section } from "@/components/shared/Overlays";
import { EmptyState, LoadingRows } from "@/components/shared/States";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ClubOverviewShowcase } from "@/components/club/ClubOverviewShowcase";
import { ClubPublicFacebookFeed, getSafeFacebookPageUrl } from "@/components/club/ClubPublicFacebookFeed";
import { normalizeClubOverviewConfig } from "@/forms/club/club-overview-config";

export function ClubPortfolioView({ clubId }: { clubId: string }) {
  const session = useOptionalSession();
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const clubQuery = useQuery({
    queryKey: qk.publicClubDetail(clubId),
    queryFn: () => apiModel.publicClub(clubId),
    enabled: Boolean(clubId),
  });

  const mediaCatalog = useClubMediaCatalog(true);

  const myMemberships = useQuery({
    queryKey: qk.myMemberships("portfolio", clubId),
    queryFn: () => apiModel.myMemberships({ limit: 100 }),
    enabled: Boolean(session.user),
  });

  const myApplications = useQuery({
    queryKey: qk.myApplications("portfolio", clubId),
    queryFn: () => apiModel.myApplications({ limit: 100 }),
    enabled: Boolean(session.user),
  });

  const canViewPositions = Boolean(clubId && session.user && session.canInClub("department.view", clubId));
  const positionsQuery = useQuery({
    queryKey: qk.clubPositions(clubId),
    queryFn: () => apiModel.clubPositions(clubId),
    enabled: canViewPositions,
  });

  const fbFeed = useQuery({
    queryKey: qk.publicClubFacebook(clubId, 4),
    queryFn: () => apiModel.publicClubFacebookPosts(clubId, 4),
    enabled: Boolean(clubId),
  });

  if (clubQuery.isPending) {
    return (
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <LoadingRows />
      </div>
    );
  }

  if (clubQuery.isError || !clubQuery.data) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
        <div className="rounded-xl border border-border bg-card p-6">
          <EmptyState
            icon={<Building2 />}
            title="Không tìm thấy Câu lạc bộ"
            description={clubQuery.isError ? describeError(clubQuery.error) : "CLB không tồn tại hoặc đã tạm ngừng hiển thị công khai."}
          />
          <div className="mt-4 flex justify-center gap-2">
            <Link href={session.user ? "/dashboard" : "/clubs"} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3.5 text-xs font-semibold text-foreground hover:bg-muted">
              <ArrowLeft size={14} /> Quay lại Bảng điều khiển
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const club = clubQuery.data;
  const isDtn = isYouthUnion(club);
  const applyCta = unitApplyCtaLabel(club.code);
  const media = mediaCatalog.data?.clubs[clubSlugFromCode(club.code)];
  const gallery = media?.gallery ?? [];
  const overviewCfg = normalizeClubOverviewConfig(club.overviewConfig);
  const showGallery = gallery.length > 0 && overviewCfg.enabledBlocks.includes("gallery");

  const membership = (myMemberships.data?.items ?? []).find(
    (m) => m.clubId === club.id && (m.status === "ACTIVE" || m.status === "SUSPENDED"),
  );
  const pendingApp = (myApplications.data?.items ?? []).find(
    (a) => a.clubId === club.id && a.status === "PENDING",
  );
  const canManage =
    Boolean(session.user) &&
    (session.canInClub("club.update", club.id) ||
      session.canInClub("application.view", club.id) ||
      session.can("club.create"));

  const fbHref = getSafeFacebookPageUrl(club.facebookUrl ?? fbFeed.data?.pageLink);
  const boardHolders = (positionsQuery.data?.clubPositions ?? [])
    .filter((slot) => slot.roleCode !== "DEPARTMENT_HEAD")
    .flatMap((slot) =>
      slot.holders.map((h) => ({ ...h, roleName: slot.roleName, roleCode: slot.roleCode })),
    );

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={session.user ? "/dashboard" : "/clubs"}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <ArrowLeft size={14} /> Quay lại Bảng điều khiển
          </Link>
          <Link
            href="/clubs"
            className="inline-flex h-9 items-center rounded-lg border border-border/70 bg-background px-3 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Danh sách CLB
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && isDtn && (
            <Link
              href="/management?tab=events"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-rose-50 px-3 text-xs font-semibold text-primary hover:bg-rose-100/70"
            >
              <CalendarRange size={14} /> GANTT 13 đơn vị
            </Link>
          )}
          {canManage && (
            <Link
              href={`/management?clubId=${club.id}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <Settings2 size={14} /> {isDtn ? "Quản trị đơn vị" : "Quản lý CLB"}
            </Link>
          )}
          <Link
            href={`/clubs/${club.id}/apply`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground shadow-xs transition-opacity hover:opacity-95"
          >
            <Send size={14} /> {applyCta}
          </Link>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xs">
        <ClubCoverBanner
          name={club.name}
          code={club.code}
          coverUrl={club.coverUrl}
          fallbackUrl={media?.cover}
          className="h-44 w-full sm:h-52"
        >
          <div className="absolute right-3.5 top-3.5 flex items-center gap-2">
            {club.activityField && (
              <span className="rounded-full bg-card/95 px-3 py-0.5 text-[11px] font-bold text-primary shadow-xs">
                {club.activityField}
              </span>
            )}
            <StatusBadge status={club.status} />
          </div>
        </ClubCoverBanner>

        <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <ClubAvatar
              name={club.name}
              code={club.code}
              logoUrl={club.logoUrl}
              fallbackUrl={media?.logo}
              size="lg"
              className="relative z-10 -mt-10 border-4 border-card shadow-sm sm:-mt-12"
            />
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <code className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-extrabold text-primary">
                  {club.code}
                </code>
                {isDtn && (
                  <Badge tone="primary" dot={false}>
                    Đoàn Thanh niên Trường · Đơn vị điều phối cấp Trường
                  </Badge>
                )}
                {membership && (
                  <Badge tone={membership.status === "SUSPENDED" ? "pending" : "primary"} dot={false}>
                    <CheckCircle2 size={11} /> {isDtn ? "Thành viên / Ban ĐTN" : "Thành viên CLB"}
                  </Badge>
                )}
                {!membership && pendingApp && (
                  <Badge tone="pending" dot={false}>
                    <Clock3 size={11} /> Đang chờ duyệt đơn
                  </Badge>
                )}
              </div>
              <h1 className="text-lg font-extrabold tracking-tight text-foreground sm:text-2xl">{club.name}</h1>
              {overviewCfg.slogan && (
                <p className="text-xs font-medium text-muted-foreground sm:text-sm">“{overviewCfg.slogan}”</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {membership ? (
              <Link
                href="/memberships"
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-secondary px-4 text-xs font-bold text-secondary-foreground hover:bg-muted"
              >
                <CheckCircle2 size={14} /> Xem tư cách thành viên
              </Link>
            ) : pendingApp ? (
              <Link
                href={`/applications?applicationId=${pendingApp.id}`}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-primary/30 bg-accent px-4 text-xs font-bold text-accent-foreground"
              >
                <Clock3 size={14} /> Theo dõi đơn chờ duyệt
              </Link>
            ) : null}
            <Link
              href={`/clubs/${club.id}/apply`}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-5 text-xs font-extrabold text-primary-foreground shadow-sm transition-opacity hover:opacity-95"
            >
              <Send size={14} /> {applyCta}
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <ClubOverviewShowcase club={club} variant="workspace" />

          <section className="rounded-2xl border border-border bg-card p-5">
            <h2 className="text-sm font-bold text-foreground">{isDtn ? "Giới thiệu Đoàn Thanh niên Trường" : "Giới thiệu Câu lạc bộ"}</h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-muted-foreground">
              {club.description || (isDtn ? "Đoàn Trường đang cập nhật thông tin giới thiệu chi tiết." : "CLB đang cập nhật thông tin giới thiệu chi tiết.")}
            </p>

            {showGallery && (
              <Section title={`Khoảnh khắc hoạt động (${gallery.length})`} icon={<Images />}>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                  {gallery.slice(0, 6).map((imgSrc, idx) => (
                    <button
                      key={imgSrc}
                      type="button"
                      onClick={() => setLightboxIdx(idx)}
                      className="group relative aspect-4/3 overflow-hidden rounded-xl border border-border/70 bg-muted"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imgSrc} alt={`${club.name} ${idx + 1}`} loading="lazy" className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" />
                    </button>
                  ))}
                </div>
              </Section>
            )}

            <ClubPublicFacebookFeed clubId={club.id} facebookUrl={club.facebookUrl} />
          </section>
        </div>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <Users size={15} className="text-primary" />
              <h2 className="text-sm font-bold text-foreground">
                {isDtn ? "Đại diện Ban Chấp hành Đoàn Trường" : "Đại diện Ban Chủ nhiệm"}
              </h2>
            </div>
            {boardHolders.length > 0 ? (
              <ul className="mt-3 space-y-2.5">
                {boardHolders.map((h) => (
                  <li key={h.assignmentId} className="flex items-center gap-2.5 rounded-xl border border-border/60 bg-background p-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {(h.fullName || "B").slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">{h.fullName}</p>
                      <p className="truncate text-[11px] font-medium text-primary">{h.roleName}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">
                  {isDtn ? `Ban Chấp hành ${club.name}` : `Ban Chủ nhiệm ${club.name}`}
                </p>
                <p>Liên hệ trực tiếp qua email chính thức hoặc Fanpage của đơn vị để được giải đáp về lịch sinh hoạt và đợt tuyển.</p>
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
              <Share2 size={15} className="text-primary" />
              <h2 className="text-sm font-bold text-foreground">Liên kết chính thức & Mạng xã hội</h2>
            </div>
            <div className="mt-3 space-y-2 text-xs">
              {club.contactEmail ? (
                <a href={`mailto:${club.contactEmail}`} className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 font-medium text-foreground hover:border-primary/40 hover:text-primary">
                  <Mail size={14} className="shrink-0 text-primary" />
                  <span className="truncate">{club.contactEmail}</span>
                </a>
              ) : (
                <p className="text-muted-foreground">Email liên hệ đang cập nhật.</p>
              )}
              {fbHref ? (
                <a href={fbHref} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 rounded-lg border border-border/70 bg-background px-3 py-2 font-semibold text-primary hover:border-primary/40">
                  <span className="inline-flex items-center gap-2 truncate"><Share2 size={14} /> Fanpage Facebook chính thức</span>
                  <ExternalLink size={13} className="shrink-0" />
                </a>
              ) : (
                <p className="text-muted-foreground">Fanpage Facebook đang cập nhật.</p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-primary/25 bg-accent/50 p-4">
            <h2 className="text-sm font-bold text-foreground">Sẵn sàng đồng hành cùng {club.code}?</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Xem thông tin đợt tuyển, tải tệp JD các phân ban và nộp đơn trực tuyến tại trang đăng ký chính thức.
            </p>
            <Link
              href={`/clubs/${club.id}/apply`}
              className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-xs font-extrabold text-primary-foreground shadow-xs hover:opacity-95"
            >
              <Send size={14} /> {applyCta}
            </Link>
          </section>
        </aside>
      </div>

      {lightboxIdx !== null && gallery[lightboxIdx] && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Xem ảnh hoạt động câu lạc bộ"
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/85 p-4 backdrop-blur-xs"
          onClick={() => setLightboxIdx(null)}
        >
          <button type="button" aria-label="Đóng" onClick={() => setLightboxIdx(null)} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-card/20 text-card hover:bg-card/30">
            <X size={20} />
          </button>
          {gallery.length > 1 && (
            <>
              <button type="button" aria-label="Ảnh trước" onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx - 1 + gallery.length) % gallery.length); }} className="absolute left-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-card/20 text-card hover:bg-card/30">
                <ChevronLeft size={22} />
              </button>
              <button type="button" aria-label="Ảnh tiếp theo" onClick={(e) => { e.stopPropagation(); setLightboxIdx((lightboxIdx + 1) % gallery.length); }} className="absolute right-4 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-card/20 text-card hover:bg-card/30">
                <ChevronRight size={22} />
              </button>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={gallery[lightboxIdx]} alt={`${club.name} ${lightboxIdx + 1}`} onClick={(e) => e.stopPropagation()} className="max-h-[82vh] max-w-4xl rounded-xl object-contain shadow-2xl" />
        </div>
      )}
    </div>
  );
}
