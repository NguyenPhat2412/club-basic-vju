"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { Compass, FilterX, LayoutGrid, Table2 } from "lucide-react";
import { apiModel, ApplicationSummary, Club, Membership } from "@/lib/api";
import { ClubMediaItem, clubSlugFromCode } from "@/lib/media";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { Pagination } from "@/components/shared/Pagination";
import { EmptyState, LoadingRows } from "@/components/shared/States";
import { describeError } from "@/components/shared/ListPage";
import { CountBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { cn, validateApplicationFile } from "@/lib/utils";
import { buildApplicationSubmitPayload, ClubApplicationDraft, EMPTY_APPLICATION_DRAFT, inferApplicantCategory } from "@/forms/application/application-form";
import { ClubDiscoveryCard } from "./ClubDiscoveryCard";
import { ClubDiscoveryGuestBanner, ClubsDiscoveryTable } from "./ClubsDiscoveryTable";
import { ClubRecruitmentDrawer, PendingAttachment } from "./ClubRecruitmentDrawer";

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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [relationFilter, setRelationFilter] = useState<"" | "OPEN" | "MEMBER" | "PENDING">("");
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [selected, setSelected] = useState<Club | null>(null);
  const [closedDeepLinkId, setClosedDeepLinkId] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [draft, setDraft] = useState<ClubApplicationDraft>(EMPTY_APPLICATION_DRAFT);
  const [customAnswers, setCustomAnswers] = useState<Record<string, unknown>>({});
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [notice, setNotice] = useState("");
  const [now] = useState(() => Date.now());

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

  const deepLinkedClub = useQuery({
    queryKey: qk.publicClubDetail(requestedClubId),
    queryFn: () => apiModel.publicClub(requestedClubId!),
    enabled: !!requestedClubId && closedDeepLinkId !== requestedClubId,
  });

  const activeSelected: Club | null =
    selected ??
    (requestedClubId && closedDeepLinkId !== requestedClubId ? (deepLinkedClub.data ?? null) : null);

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

  const activeForm = useQuery({
    queryKey: qk.clubApplicationForm(activeSelected?.id),
    queryFn: () => apiModel.clubApplicationForm(activeSelected!.id),
    enabled: !!activeSelected && !!session.user,
  });

  const closeDrawer = () => {
    setSelected(null);
    if (requestedClubId) setClosedDeepLinkId(requestedClubId);
    setLightboxIdx(null);
  };

  const apply = useMutation({
    mutationFn: async () => {
      const formData = activeForm.data;
      if (!draft.applicantPhone.trim() || !draft.facultyMajor.trim() || !draft.academicYear.trim()) {
        throw new Error("Vui lòng điền đầy đủ Số điện thoại liên hệ, Khoa / Ngành học và Khóa / Năm học.");
      }
      if (formData?.requireAttachment && attachments.length === 0) {
        throw new Error("Biểu mẫu của CLB này yêu cầu đính kèm ít nhất 1 tệp hồ sơ (.docx, .pdf hoặc hình ảnh).");
      }
      const created = await apiModel.apply(
        activeSelected!.id,
        buildApplicationSubmitPayload(draft, customAnswers, formData?.id),
      );
      for (const item of attachments) {
        await apiModel.uploadApplicationFile(created.id, item.file, item.category);
      }
      return created;
    },
    onSuccess: () => {
      setNotice(`Đã gửi đơn đăng ký vào ${activeSelected!.name}${attachments.length ? ` kèm ${attachments.length} tệp đính kèm` : ""}. Theo dõi hoặc chỉnh sửa tại "Đơn đăng ký của tôi".`);
      setDraft(EMPTY_APPLICATION_DRAFT);
      setCustomAnswers({});
      setAttachments([]);
      closeDrawer();
      queryClient.invalidateQueries({ queryKey: qk.myApplications() });
      queryClient.invalidateQueries({ queryKey: qk.dashboard("my-applications") });
    },
  });

  const open = (club: Club) => {
    setSelected(club);
    setLightboxIdx(null);
    setDraft({
      ...EMPTY_APPLICATION_DRAFT,
      applicantPhone: session.user?.phone || "",
    });
    setCustomAnswers({});
    setAttachments([]);
    apply.reset();
  };

  const items = useMemo(() => {
    const rawItems = clubs.data?.items ?? [];
    if (!relationFilter) return rawItems;
    return rawItems.filter((c) => {
      if (relationFilter === "MEMBER") return currentMembershipByClub.has(c.id);
      if (relationFilter === "PENDING") return pendingAppByClub.has(c.id);
      return !currentMembershipByClub.has(c.id) && !pendingAppByClub.has(c.id);
    });
  }, [clubs.data?.items, relationFilter, currentMembershipByClub, pendingAppByClub]);
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

  const selectedMedia = mediaForClub(activeSelected);
  const selectedGallery = selectedMedia?.gallery ?? [];

  const handleSearchChange = (value: string) => { setSearch(value); setOffset(0); };
  const handleCategoryChange = (value: string) => { setCategory(value); setOffset(0); };
  const clearFilters = () => { setSearch(""); setCategory(""); setRelationFilter(""); setOffset(0); };

  const onDraftChange = <K extends keyof ClubApplicationDraft>(key: K, value: ClubApplicationDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const maxCount = activeForm.data?.maxAttachments ?? 5;
    const valid = files.filter((file) => { const err = validateApplicationFile(file); if (err) toast.error(err); return !err; });
    if (!valid.length) return;
    setAttachments((prev) => [...prev, ...valid.slice(0, Math.max(0, maxCount - prev.length)).map((file) => ({ file, category: inferApplicantCategory(file.name) }))]);
  };

  const selectedMembership = activeSelected ? currentMembershipByClub.get(activeSelected.id) : undefined;
  const selectedPendingApp = activeSelected ? pendingAppByClub.get(activeSelected.id) : undefined;

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <BreadcrumbToolbar
        crumbs={[
          { label: "Tổng quan", href: "/dashboard" },
          { label: "Cổng cá nhân" },
          { label: "Khám phá câu lạc bộ" },
        ]}
        titleBadge={<CountBadge>{clubs.data?.total ?? items.length} CLB</CountBadge>}
        search={{ value: search, onChange: handleSearchChange, placeholder: "Tìm tên, mã CLB, lĩnh vực…" }}
        extraActions={
          <>
            <Select aria-label="Lọc theo lĩnh vực hoạt động" value={category} onChange={(e) => handleCategoryChange(e.target.value)} className="h-9 w-full text-xs sm:w-48">
              <option value="">Tất cả lĩnh vực</option>
              {(categoriesQuery.data ?? []).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </Select>
            {session.user && (
              <Select aria-label="Lọc theo tư cách tham gia" value={relationFilter} onChange={(e) => { setRelationFilter(e.target.value as typeof relationFilter); setOffset(0); }} className="h-9 w-full text-xs sm:w-44">
                <option value="">Mọi tư cách</option>
                <option value="OPEN">Mở ứng tuyển</option>
                <option value="MEMBER">Đã là thành viên</option>
                <option value="PENDING">Đang chờ duyệt đơn</option>
              </Select>
            )}
            {hasActiveFilter && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <FilterX size={14} /> Xoá bộ lọc
              </Button>
            )}
            <div className="inline-flex h-9 items-center rounded-lg border border-border bg-muted/40 p-0.5" role="group" aria-label="Chế độ hiển thị">
              <button type="button" onClick={() => setViewMode("table")} className={cn("inline-flex h-full items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-colors", viewMode === "table" ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground")}><Table2 size={13} /> Bảng</button>
              <button type="button" onClick={() => setViewMode("cards")} className={cn("inline-flex h-full items-center gap-1 rounded-md px-2.5 text-xs font-semibold transition-colors", viewMode === "cards" ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground")}><LayoutGrid size={13} /> Thẻ</button>
            </div>
          </>
        }
        onRefresh={() => {
          clubs.refetch();
          categoriesQuery.refetch();
          mediaCatalog.refetch();
          if (session.user) {
            myMemberships.refetch();
            myApplications.refetch();
          }
        }}
      />
      <div className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-4 py-5 sm:px-6">

        {notice && <div role="status" className="rounded-lg border border-primary/20 bg-primary/8 px-4 py-3 text-xs font-medium text-primary">{notice}</div>}

        {session.settled && !session.user && (
          <ClubDiscoveryGuestBanner
            onLogin={() => router.push("/clubs?auth=login")}
            onRegister={() => router.push("/clubs?auth=register")}
          />
        )}

        {clubs.isPending ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white" />
            ))}
          </div>
        ) : clubs.isError ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
            {describeError(clubs.error)}
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white">
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
        ) : viewMode === "table" ? (
          <ClubsDiscoveryTable
            items={items}
            offset={offset}
            currentMembershipByClub={currentMembershipByClub}
            pendingAppByClub={pendingAppByClub}
            mediaForClub={mediaForClub}
            canManageClub={canManageClub}
            onOpenDetail={open}
            onNavigateManage={(club) => router.push(`/management?clubId=${club.id}`)}
            onNavigateMemberships={() => router.push("/memberships")}
            onNavigatePendingApp={(appId) => router.push(`/applications?applicationId=${appId}`)}
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {items.map((club) => (
              <ClubDiscoveryCard
                key={club.id}
                club={club}
                memberRecord={currentMembershipByClub.get(club.id)}
                pendingApp={pendingAppByClub.get(club.id)}
                canReapply={leftClubIds.has(club.id) || pastAppClubIds.has(club.id)}
                clubMedia={mediaForClub(club)}
                isAuthenticated={!!session.user || !session.settled}
                canManage={canManageClub(club)}
                onOpenDetail={open}
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

      <ClubRecruitmentDrawer
        activeSelected={activeSelected}
        closeDrawer={closeDrawer}
        selectedMedia={selectedMedia}
        selectedGallery={selectedGallery}
        lightboxIdx={lightboxIdx}
        setLightboxIdx={setLightboxIdx}
        user={session.user}
        selectedMembership={selectedMembership}
        selectedPendingApp={selectedPendingApp}
        formInfo={activeForm.data}
        now={now}
        draft={draft}
        onDraftChange={onDraftChange}
        customAnswers={customAnswers}
        setCustomAnswers={setCustomAnswers}
        attachments={attachments}
        setAttachments={setAttachments}
        handleSelectFiles={handleSelectFiles}
        applyPending={apply.isPending}
        applyError={apply.isError ? apply.error : null}
        onApply={() => apply.mutate()}
      />
    </div>
  );
}
