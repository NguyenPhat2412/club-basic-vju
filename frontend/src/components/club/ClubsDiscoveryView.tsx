"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Compass, FilterX, LogIn, Send, Sparkles, UserPlus } from "lucide-react";
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
import {
  buildApplicationSubmitPayload,
  ClubApplicationDraft,
  EMPTY_APPLICATION_DRAFT,
  inferApplicantCategory,
} from "@/forms/application/application-form";
import { ClubDiscoveryCard } from "./ClubDiscoveryCard";
import { ClubRecruitmentDrawer, PendingAttachment } from "./ClubRecruitmentDrawer";

const LIMIT = 12;

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
  const [offset, setOffset] = useState(0);
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
    queryKey: ["public-club-categories"],
    queryFn: apiModel.publicClubCategories,
    staleTime: 60_000,
  });

  const clubs = useQuery({
    queryKey: ["clubs", "public-discovery", search, category, offset],
    queryFn: () => apiModel.publicClubs(search.trim(), category, offset, LIMIT),
    placeholderData: keepPreviousData,
    enabled: session.settled,
  });

  const deepLinkedClub = useQuery({
    queryKey: ["public-club-detail", requestedClubId],
    queryFn: () => apiModel.publicClub(requestedClubId!),
    enabled: !!requestedClubId && closedDeepLinkId !== requestedClubId,
  });

  const activeSelected: Club | null =
    selected ??
    (requestedClubId && closedDeepLinkId !== requestedClubId ? (deepLinkedClub.data ?? null) : null);

  const myMemberships = useQuery({
    queryKey: ["my-memberships", "discovery"],
    queryFn: () => apiModel.myMemberships({ limit: 100 }),
    enabled: !!session.user,
  });

  const myApplications = useQuery({
    queryKey: ["my-applications", "discovery"],
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
    queryKey: ["club-application-form", activeSelected?.id],
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
      queryClient.invalidateQueries({ queryKey: ["my-applications"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "my-applications"] });
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

  const items = clubs.data?.items ?? [];
  const hasActiveFilter = search.trim() !== "" || category !== "";

  const mediaForClub = (club?: Club | null): ClubMediaItem | undefined => {
    if (!club) return undefined;
    return mediaCatalog.data?.clubs[clubSlugFromCode(club.code)];
  };

  const selectedMedia = mediaForClub(activeSelected);
  const selectedGallery = selectedMedia?.gallery ?? [];

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setOffset(0);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setOffset(0);
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setOffset(0);
  };

  const onDraftChange = <K extends keyof ClubApplicationDraft>(key: K, value: ClubApplicationDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const maxCount = activeForm.data?.maxAttachments ?? 5;
    setAttachments((prev) => {
      const next = [...prev];
      for (const file of files) {
        if (next.length >= maxCount) break;
        next.push({ file, category: inferApplicantCategory(file.name) });
      }
      return next;
    });
    e.target.value = "";
  };

  const selectedMembership = activeSelected ? currentMembershipByClub.get(activeSelected.id) : undefined;
  const selectedPendingApp = activeSelected ? pendingAppByClub.get(activeSelected.id) : undefined;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
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
            <Select aria-label="Lọc theo lĩnh vực hoạt động" value={category} onChange={(e) => handleCategoryChange(e.target.value)} className="h-9 w-full text-xs sm:w-52">
              <option value="">Tất cả lĩnh vực</option>
              {(categoriesQuery.data ?? []).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
            </Select>
            {hasActiveFilter && (
              <Button variant="outline" size="sm" onClick={clearFilters}>
                <FilterX size={14} /> Xoá bộ lọc
              </Button>
            )}
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
        <p className="text-sm text-slate-600">
          Khám phá hình ảnh hoạt động thực tế của các câu lạc bộ tại Trường Đại học Việt Nhật và nộp đơn ứng tuyển trực tuyến.
        </p>

        {notice && <div role="status" className="rounded-lg border border-primary/20 bg-primary/8 px-4 py-3 text-xs font-medium text-primary">{notice}</div>}

        {session.settled && !session.user && (
          <section aria-label="Hướng dẫn 3 bước gia nhập Câu lạc bộ" className="overflow-hidden rounded-2xl border border-rose-200/80 bg-gradient-to-br from-white via-rose-50/40 to-amber-50/30 p-4 shadow-2xs sm:p-5">
            <div className="flex flex-col justify-between gap-3 border-b border-rose-100/80 pb-4 lg:flex-row lg:items-center">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-primary">
                  <Sparkles size={13} /> Cổng tuyển thành viên trực tuyến · VJU ClubHub
                </p>
                <h2 className="mt-1 text-sm font-extrabold tracking-tight text-slate-900 sm:text-base">
                  Gia nhập Câu lạc bộ yêu thích chỉ với 3 bước đơn giản
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => router.push("/clubs?auth=login")} className="flex-1 border-slate-300 bg-white font-bold text-slate-800 hover:border-primary/40 hover:text-primary sm:flex-initial">
                  <LogIn size={14} /> Đăng nhập ngay
                </Button>
                <Button size="sm" onClick={() => router.push("/clubs?auth=register")} className="flex-1 font-bold shadow-xs sm:flex-initial">
                  <UserPlus size={14} /> Gia nhập CLB
                </Button>
              </div>
            </div>

            <div className="mt-3.5 grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-3">
              <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/90 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-xs font-extrabold text-primary-foreground">01</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900">1. Đăng nhập / Tạo tài khoản</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">Dùng tài khoản SV VJU hoặc bấm Google 1 chạm để mở hồ sơ cá nhân.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/90 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/12 text-xs font-extrabold text-primary">02</span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-xs font-bold text-slate-900">2. Chọn CLB & Ban nguyện vọng</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">Bấm <b>Xem chi tiết</b> trên thẻ CLB để xem ảnh hoạt động và các ban chuyên môn.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/90 p-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-600/12 text-xs font-extrabold text-emerald-700"><Send size={13} /></span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1 text-xs font-bold text-slate-900">3. Nộp đơn trực tuyến <CheckCircle2 size={12} className="text-emerald-600" /></p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">Điền form ứng tuyển (kèm CV/minh chứng nếu có) và nhận thông báo duyệt đơn.</p>
                </div>
              </div>
            </div>
          </section>
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
                canManage={
                  !!session.user &&
                  (session.canInClub("club.update", club.id) ||
                    session.canInClub("application.view", club.id) ||
                    session.can("club.create"))
                }
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
        <Pagination offset={offset} limit={LIMIT} total={clubs.data.total} onOffset={setOffset} />
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
