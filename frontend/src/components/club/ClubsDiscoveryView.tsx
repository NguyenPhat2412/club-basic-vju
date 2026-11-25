"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { CheckCircle2, Clock3, Compass, FilterX, LayoutGrid, Search, Send, Settings2, ShieldCheck, Table2, X } from "lucide-react";
import { apiModel, ApplicationSummary, Club, Membership } from "@/lib/api";
import { isYouthUnion, unitApplyCtaLabel } from "@/lib/club/youth-union";
import { ClubMediaItem, clubSlugFromCode } from "@/lib/media";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { ClubAvatar, useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { FilterPopover } from "@/components/shared/FilterPopover";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { Badge, CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ClubDiscoveryCard } from "./ClubDiscoveryCard";
import { ClubDiscoveryGuestBanner, ClubsDiscoveryTable } from "./ClubsDiscoveryTable";

const DEFAULT_LIMIT = 20;

export function ClubsDiscoveryView() {
  return (
    <Suspense fallback={<LoadingRows />}>
      <ClubsDiscoveryContent />
    </Suspense>
  );
}

function ClubsDiscoveryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedClubId = searchParams.get("clubId");
  const session = useOptionalSession();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [relationFilter, setRelationFilter] = useState<"" | "OPEN" | "MEMBER" | "PENDING">("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);

  useEffect(() => {
    if (requestedClubId) {
      router.replace(`/clubs/${requestedClubId}`);
    }
  }, [requestedClubId, router]);

  const mediaCatalog = useClubMediaCatalog(true);

  const categoriesQuery = useQuery({
    queryKey: qk.publicClubCategories(),
    queryFn: apiModel.publicClubCategories,
    staleTime: 60_000,
  });

  const clubs = useQuery({
    queryKey: qk.clubs("public-discovery", search, category, offset, limit),
    queryFn: () => apiModel.publicClubs(search.trim(), category, offset, limit),
    placeholderData: keepPreviousData,
    enabled: session.settled,
  });

  const myMemberships = useQuery({
    queryKey: qk.myMemberships("discovery"),
    queryFn: () => apiModel.myMemberships({ limit: 100 }),
    enabled: !!session.user,
  });

  const myApplications = useQuery({
    queryKey: qk.myApplications("discovery"),
    queryFn: () => apiModel.myApplications({ limit: 100 }),
    enabled: !!session.user,
  });

  const currentMembershipByClub = useMemo(() => {
    const map = new Map<string, Membership>();
    for (const m of myMemberships.data?.items ?? []) {
      if (m.status === "ACTIVE" || m.status === "SUSPENDED") {
        map.set(m.clubId, m);
      }
    }
    return map;
  }, [myMemberships.data]);

  const leftClubIds = useMemo(() => {
    const set = new Set<string>();
    for (const m of myMemberships.data?.items ?? []) {
      if (m.status === "LEFT") set.add(m.clubId);
    }
    return set;
  }, [myMemberships.data]);

  const pendingAppByClub = useMemo(() => {
    const map = new Map<string, ApplicationSummary>();
    for (const a of myApplications.data?.items ?? []) {
      if (a.status === "PENDING") {
        map.set(a.clubId, a);
      }
    }
    return map;
  }, [myApplications.data]);

  const pastAppClubIds = useMemo(() => {
    const set = new Set<string>();
    for (const a of myApplications.data?.items ?? []) {
      if (a.status === "REJECTED" || a.status === "CANCELLED") {
        set.add(a.clubId);
      }
    }
    return set;
  }, [myApplications.data]);

  const items = useMemo(() => {
    const rawItems = clubs.data?.items ?? [];
    if (!relationFilter) return rawItems;
    return rawItems.filter((c) => {
      if (relationFilter === "MEMBER") return currentMembershipByClub.has(c.id);
      if (relationFilter === "PENDING") return pendingAppByClub.has(c.id);
      return !currentMembershipByClub.has(c.id) && !pendingAppByClub.has(c.id);
    });
  }, [clubs.data?.items, relationFilter, currentMembershipByClub, pendingAppByClub]);
  const youthUnion = useMemo(() => items.find((c) => isYouthUnion(c)) ?? null, [items]);
  const clubItems = useMemo(
    () => (youthUnion ? items.filter((c) => c.id !== youthUnion.id) : items),
    [items, youthUnion]
  );
  const youthUnionMember = youthUnion ? currentMembershipByClub.get(youthUnion.id) : undefined;
  const youthUnionPending = youthUnion ? pendingAppByClub.get(youthUnion.id) : undefined;
  const hasActiveFilter = search.trim() !== "" || category !== "" || relationFilter !== "";

  const mediaForClub = (club?: Club | null): ClubMediaItem | undefined => {
    if (!club) return undefined;
    return mediaCatalog.data?.clubs[clubSlugFromCode(club.code)];
  };

  const canManageClub = (club: Club) =>
    !!session.user &&
    (session.canInClub("club.update", club.id) ||
      session.canInClub("application.view", club.id) ||
      session.can("club.create"));

  const handleSearchChange = (value: string) => { setSearch(value); setOffset(0); };
  const handleCategoryChange = (value: string) => { setCategory(value); setOffset(0); };
  const clearFilters = () => { setSearch(""); setCategory(""); setRelationFilter(""); setOffset(0); };

  if (requestedClubId) {
    return <LoadingRows />;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-border bg-white px-3 py-1.5 sm:px-4">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:w-auto sm:flex-1">
          <div className="relative w-full min-w-0 sm:min-w-[160px] sm:max-w-[230px] sm:flex-1">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => handleSearchChange(e.target.value)} placeholder="Tìm tên, mã CLB, lĩnh vực…" className="h-8 pl-8 pr-7 text-xs" />
            {search && (
              <button type="button" aria-label="Xoá tìm kiếm" onClick={() => handleSearchChange("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X size={13} />
              </button>
            )}
          </div>
          <FilterPopover activeCount={[category, relationFilter].filter(Boolean).length} onClear={clearFilters} title="Lọc câu lạc bộ">
            <FormField label="Lĩnh vực hoạt động" hideIndicator>
              <Select aria-label="Lọc theo lĩnh vực hoạt động" value={category} onChange={(e) => handleCategoryChange(e.target.value)} className="h-8 text-xs">
                <option value="">Tất cả lĩnh vực</option>
                {(categoriesQuery.data ?? []).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
              </Select>
            </FormField>
            {session.user && (
              <FormField label="Tư cách tham gia" hideIndicator>
                <Select aria-label="Lọc theo tư cách tham gia" value={relationFilter} onChange={(e) => { setRelationFilter(e.target.value as typeof relationFilter); setOffset(0); }} className="h-8 text-xs">
                  <option value="">Mọi tư cách</option>
                  <option value="OPEN">Mở ứng tuyển</option>
                  <option value="MEMBER">Đã là thành viên</option>
                  <option value="PENDING">Đang chờ duyệt đơn</option>
                </Select>
              </FormField>
            )}
          </FilterPopover>
          {hasActiveFilter && (
            <Button variant="outline" size="sm" className="h-8" onClick={clearFilters}>
              <FilterX size={13} /> Xoá lọc
            </Button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <CountBadge>
            {youthUnion ? `${clubItems.length} CLB · 1 ĐTN` : `${clubs.data?.total ?? items.length} CLB`}
          </CountBadge>
          <div className="inline-flex h-8 items-center rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Chế độ hiển thị">
            <button type="button" onClick={() => setViewMode("table")} className={cn("inline-flex h-full items-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors", viewMode === "table" ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground")}><Table2 size={13} /> Bảng</button>
            <button type="button" onClick={() => setViewMode("cards")} className={cn("inline-flex h-full items-center gap-1 rounded-md px-2 text-xs font-semibold transition-colors", viewMode === "cards" ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground")}><LayoutGrid size={13} /> Thẻ</button>
          </div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-4 py-5 sm:px-6">
        {session.settled && !session.user && (
          <ClubDiscoveryGuestBanner
            onLogin={() => router.push("/clubs?auth=login")}
            onRegister={() => router.push("/clubs?auth=register")}
          />
        )}

        {!clubs.isPending && !clubs.isError && youthUnion && (
          <section
            aria-label="Đoàn Thanh niên Trường Đại học Việt Nhật"
            className="overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-card via-card to-rose-50/70 p-4 shadow-2xs sm:p-5"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3.5 sm:items-center">
                <ClubAvatar
                  name={youthUnion.name}
                  code={youthUnion.code}
                  logoUrl={youthUnion.logoUrl}
                  fallbackUrl={mediaForClub(youthUnion)?.logo}
                  size="lg"
                />
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="primary" dot={false}>
                      <ShieldCheck size={11} /> Đơn vị điều phối cấp Trường · ĐTN
                    </Badge>
                    <code className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                      {youthUnion.code}
                    </code>
                    {youthUnionMember && (
                      <Badge tone={youthUnionMember.status === "SUSPENDED" ? "pending" : "success"} dot={false}>
                        <CheckCircle2 size={11} /> {youthUnionMember.status === "SUSPENDED" ? "Tạm đình chỉ" : "Thành viên / Ban ĐTN"}
                      </Badge>
                    )}
                    {!youthUnionMember && youthUnionPending && (
                      <Badge tone="pending" dot={false}>
                        <Clock3 size={11} /> Đang chờ duyệt đơn
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-base font-extrabold tracking-tight text-slate-900 sm:text-lg">
                    Đoàn Thanh niên Trường Đại học Việt Nhật
                  </h2>
                  <p className="line-clamp-2 max-w-2xl text-xs leading-relaxed text-slate-600">
                    {youthUnion.description ||
                      "Đơn vị điều phối công tác thanh niên, phong trào sinh viên và 12 Câu lạc bộ trực thuộc Trường Đại học Việt Nhật (VJU)."}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push(`/clubs/${youthUnion.id}`)} className="border-slate-300 bg-white font-semibold">
                  Trang Đoàn Trường
                </Button>
                {canManageClub(youthUnion) && (
                  <Button variant="outline" size="sm" onClick={() => router.push(`/management?clubId=${youthUnion.id}`)} className="border-slate-300 bg-white font-semibold">
                    <Settings2 size={13} /> Quản trị ĐTN
                  </Button>
                )}
                {youthUnionMember ? (
                  <Button variant="outline" size="sm" onClick={() => router.push("/memberships")}>
                    <CheckCircle2 size={13} /> Tư cách thành viên
                  </Button>
                ) : youthUnionPending ? (
                  <Button variant="outline" size="sm" onClick={() => router.push(`/applications?applicationId=${youthUnionPending.id}`)}>
                    <Clock3 size={13} /> Theo dõi đơn ĐTN
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => router.push(`/clubs/${youthUnion.id}/apply`)} disabled={youthUnion.status !== "ACTIVE"} className="font-bold">
                    <Send size={13} /> {unitApplyCtaLabel(youthUnion.code)}
                  </Button>
                )}
              </div>
            </div>
          </section>
        )}

        {clubs.isPending ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : clubs.isError ? (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
            {describeError(clubs.error)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card">
            <EmptyState
              icon={<Compass />}
              title={hasActiveFilter ? "Không tìm thấy câu lạc bộ phù hợp" : "Hiện chưa có câu lạc bộ đang hoạt động"}
              description={
                hasActiveFilter
                  ? "Hãy thử từ khoá khác hoặc xoá bộ lọc lĩnh vực để xem toàn bộ danh sách câu lạc bộ."
                  : "Các câu lạc bộ đang hoạt động sẽ xuất hiện tại đây."
              }
              actionLabel={hasActiveFilter ? "Xoá bộ lọc" : undefined}
              onAction={hasActiveFilter ? clearFilters : undefined}
            />
          </div>
        ) : clubItems.length === 0 ? null : viewMode === "table" ? (
          <ClubsDiscoveryTable
            items={clubItems}
            offset={offset}
            currentMembershipByClub={currentMembershipByClub}
            pendingAppByClub={pendingAppByClub}
            mediaForClub={mediaForClub}
            canManageClub={canManageClub}
            onOpenDetail={(club) => router.push(`/clubs/${club.id}`)}
            onApply={(club) => router.push(`/clubs/${club.id}/apply`)}
            onNavigateManage={(club) => router.push(`/management?clubId=${club.id}`)}
            onNavigateMemberships={() => router.push("/memberships")}
            onNavigatePendingApp={(appId) => router.push(`/applications?applicationId=${appId}`)}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {clubItems.map((club) => (
              <ClubDiscoveryCard
                key={club.id}
                club={club}
                memberRecord={currentMembershipByClub.get(club.id)}
                pendingApp={pendingAppByClub.get(club.id)}
                canReapply={leftClubIds.has(club.id) || pastAppClubIds.has(club.id)}
                clubMedia={mediaForClub(club)}
                isAuthenticated={!!session.user || !session.settled}
                canManage={canManageClub(club)}
                onOpenDetail={(c) => router.push(`/clubs/${c.id}`)}
                onApply={(c) => router.push(`/clubs/${c.id}/apply`)}
                onNavigateLogin={() => router.push("/clubs?auth=login")}
                onNavigateManage={() => router.push(`/management?clubId=${club.id}`)}
                onNavigateMemberships={() => router.push("/memberships")}
                onNavigatePendingApp={(appId) => router.push(`/applications?applicationId=${appId}`)}
              />
            ))}
          </div>
        )}
      </div>

      {clubs.data && clubs.data.total > 0 && (
        <Pagination offset={offset} limit={limit} total={clubs.data.total} onOffset={setOffset} onLimit={setLimit} />
      )}
    </div>
  );
}
