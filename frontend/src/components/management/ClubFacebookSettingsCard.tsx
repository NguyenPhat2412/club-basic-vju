"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import {
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Globe,
  Link2,
  RefreshCw,
  Save,
  Share2,
  Unlink,
} from "lucide-react";
import { apiModel, Club } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { formatDateTime, safeExternalHref } from "@/lib/utils";

const DEPLOY_GUIDE_STEPS = [
  {
    step: "01",
    title: "Kiểm tra quyền quản trị Fanpage",
    body: "Tài khoản Facebook dùng để đăng nhập cần có quyền Quản trị viên (Toàn quyền kiểm soát) trên Fanpage chính thức của CLB.",
  },
  {
    step: "02",
    title: "Đăng nhập & chọn Fanpage CLB",
    body: "Bấm nút Đăng nhập bằng Facebook ở khung trên, xác nhận cấp quyền đọc bài viết công khai rồi chọn đúng Fanpage muốn gắn.",
  },
  {
    step: "03",
    title: "Tự động đồng bộ bài viết & số liệu",
    body: "Bài viết mới và số lượt theo dõi sẽ tự cập nhật lên trang giới thiệu CLB và Thống kê CLB. Hệ thống lưu kết nối an toàn, không cần thao tác kỹ thuật.",
  },
] as const;

export function ClubFacebookSettingsCard({
  club,
  onNotice,
  onError,
}: {
  club: Club;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const fbSelectToken = searchParams.get("fbSelect") ?? "";
  const fbErrorParam = searchParams.get("fbError") ?? "";

  const [fbUrlDraft, setFbUrlDraft] = useState<string | null>(null);
  const fbUrlValue = fbUrlDraft ?? club.facebookUrl ?? "";
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [brokenAvatars, setBrokenAvatars] = useState<Record<string, boolean>>({});

  const overview = useQuery({
    queryKey: qk.clubFacebook(club.id, 6),
    queryFn: () => apiModel.clubFacebook(club.id, 6),
    enabled: !!club.id,
  });

  const pendingPages = useQuery({
    queryKey: qk.clubFacebookOAuthPages(club.id, fbSelectToken),
    queryFn: () => apiModel.clubFacebookOAuthPages(club.id, fbSelectToken),
    enabled: !!club.id && !!fbSelectToken,
    retry: false,
  });

  const invalidateFacebook = () => {
    queryClient.invalidateQueries({ queryKey: qk.clubFacebook(club.id) });
    queryClient.invalidateQueries({ queryKey: qk.publicClubFacebook(club.id) });
  };

  const clearOAuthQueryParams = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("fbSelect");
    next.delete("fbError");
    router.replace(`/management?${next.toString()}`, { scroll: false });
  };

  const saveFacebookUrl = useMutation({
    mutationFn: () => apiModel.updateClub(club.id, { facebookUrl: fbUrlValue.trim() }),
    onSuccess: (updated) => {
      setFbUrlDraft(null);
      onNotice(
        updated.facebookUrl
          ? "Đã lưu đường dẫn Fanpage Facebook công khai."
          : "Đã xoá đường dẫn Fanpage Facebook công khai.",
      );
      onError("");
      queryClient.invalidateQueries({ queryKey: qk.clubs() });
      queryClient.invalidateQueries({ queryKey: qk.publicClubs() });
      queryClient.invalidateQueries({ queryKey: qk.publicClubDetail(club.id) });
      queryClient.invalidateQueries({ queryKey: qk.home("public-clubs") });
      queryClient.invalidateQueries({ queryKey: qk.dashboard("public-clubs") });
    },
    onError: (e) => onError(describeError(e)),
  });

  const syncNow = useMutation({
    mutationFn: () => apiModel.syncClubFacebook(club.id),
    onSuccess: (res) => {
      onNotice(
        `Đã đồng bộ ${res.summary.postsCount} bài viết · ${res.summary.followersCount.toLocaleString("vi-VN")} theo dõi.`,
      );
      onError("");
      invalidateFacebook();
    },
    onError: (e) => onError(describeError(e)),
  });

  const disconnect = useMutation({
    mutationFn: () => apiModel.disconnectClubFacebook(club.id),
    onSuccess: () => {
      setConfirmDisconnect(false);
      onNotice("Đã ngắt kết nối Fanpage Facebook.");
      onError("");
      invalidateFacebook();
    },
    onError: (e) => onError(describeError(e)),
  });

  const startOAuth = useMutation({
    mutationFn: () => apiModel.startClubFacebookOAuth(club.id),
    onSuccess: (res) => {
      const safe = safeExternalHref(res.authorizationUrl);
      if (safe) window.location.assign(safe);
    },
    onError: (e) => onError(describeError(e)),
  });

  const selectOAuthPage = useMutation({
    mutationFn: (pageId: string) => apiModel.selectClubFacebookOAuthPage(club.id, fbSelectToken, pageId),
    onSuccess: (res) => {
      clearOAuthQueryParams();
      onNotice(`Đã gắn Fanpage "${res.page?.pageName ?? "Facebook"}" (${res.summary.postsCount} bài viết).`);
      onError("");
      invalidateFacebook();
    },
    onError: (e) => onError(describeError(e)),
  });

  const data = overview.data;
  const page = data?.page;
  const pageHref = safeExternalHref(page?.pageLink);
  const oauthReady = Boolean(data?.oauthConfigured);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-border/70 bg-card shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            <Share2 size={16} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">Liên kết Fanpage Facebook</h3>
          </div>
          <Badge tone={data?.connected ? "primary" : "neutral"} dot={false}>
            {data?.connected ? "Đã kết nối" : "Chưa kết nối"}
          </Badge>
        </div>

        <div className="space-y-4 p-4 sm:p-6">
          {fbErrorParam && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
              <span>{fbErrorParam}</span>
              <Button size="sm" variant="outline" onClick={clearOAuthQueryParams}>Đóng</Button>
            </div>
          )}

          {fbSelectToken && (
            <div className="space-y-2.5 rounded-xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-bold text-foreground">Chọn Fanpage gắn cho {club.name}</p>
                <Button size="sm" variant="outline" onClick={clearOAuthQueryParams}>Huỷ</Button>
              </div>
              {pendingPages.isPending ? (
                <p className="text-xs text-muted-foreground">Đang tải danh sách Fanpage…</p>
              ) : pendingPages.isError ? (
                <p className="text-xs text-rose-700">{describeError(pendingPages.error)}</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {(pendingPages.data ?? []).map((opt) => (
                    <div key={opt.pageId} className="flex items-center justify-between gap-2.5 rounded-lg border border-border bg-card p-2.5">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {opt.avatarUrl && !brokenAvatars[opt.pageId] ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={opt.avatarUrl} alt={opt.pageName} onError={() => setBrokenAvatars((prev) => ({ ...prev, [opt.pageId]: true }))} className="size-9 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Globe size={15} /></span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-foreground">{opt.pageName}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{opt.followersCount.toLocaleString("vi-VN")} theo dõi</p>
                        </div>
                      </div>
                      <Button size="sm" disabled={selectOAuthPage.isPending} onClick={() => selectOAuthPage.mutate(opt.pageId)}>Chọn</Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {data?.connected && page ? (
            <div className="flex flex-col items-center gap-4 rounded-xl border border-primary/20 bg-primary/5 px-5 py-6 text-center">
              {page.avatarUrl && !brokenAvatars.connected ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={page.avatarUrl} alt={page.pageName} onError={() => setBrokenAvatars((prev) => ({ ...prev, connected: true }))} className="size-16 rounded-2xl border-2 border-card object-cover shadow-sm" />
              ) : (
                <span className="grid size-16 place-items-center rounded-2xl bg-primary/15 text-primary"><Share2 size={26} /></span>
              )}
              <div className="space-y-1">
                <div className="flex items-center justify-center gap-1.5">
                  <h4 className="text-base font-bold text-foreground">{page.pageName}</h4>
                  <CheckCircle2 size={15} className="text-primary" />
                </div>
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">{data.summary.followersCount.toLocaleString("vi-VN")}</strong> người theo dõi ·{" "}
                  <strong className="text-foreground">{data.summary.postsCount}</strong> bài viết
                  {page.lastSyncedAt ? ` · Đồng bộ ${formatDateTime(page.lastSyncedAt)}` : ""}
                </p>
                {page.lastSyncError && <p className="text-[11px] text-rose-700">{page.lastSyncError}</p>}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {pageHref && (
                  <a href={pageHref} target="_blank" rel="noopener noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary">
                    <ExternalLink size={13} /> Mở Fanpage
                  </a>
                )}
                <Button size="sm" variant="outline" disabled={syncNow.isPending} onClick={() => syncNow.mutate()}>
                  <RefreshCw size={13} className={syncNow.isPending ? "animate-spin" : undefined} />
                  {syncNow.isPending ? "Đang đồng bộ…" : "Đồng bộ ngay"}
                </Button>
                {oauthReady && (
                  <Button size="sm" variant="outline" disabled={startOAuth.isPending} onClick={() => startOAuth.mutate()}>
                    <Share2 size={13} /> Đổi Fanpage
                  </Button>
                )}
                {confirmDisconnect ? (
                  <>
                    <Button size="sm" variant="destructive" disabled={disconnect.isPending} onClick={() => disconnect.mutate()}>
                      <Unlink size={13} /> {disconnect.isPending ? "Đang ngắt…" : "Xác nhận ngắt"}
                    </Button>
                    <Button size="sm" variant="outline" disabled={disconnect.isPending} onClick={() => setConfirmDisconnect(false)}>Huỷ</Button>
                  </>
                ) : (
                  <Button size="sm" variant="outline" className="text-rose-700 hover:border-rose-300" disabled={disconnect.isPending} onClick={() => setConfirmDisconnect(true)}>
                    <Unlink size={13} /> Ngắt kết nối
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3.5 rounded-xl border border-border/80 bg-muted/20 px-5 py-8 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                <Share2 size={26} />
              </span>
              <div className="max-w-md space-y-1">
                <h4 className="text-base font-bold text-foreground">Đăng nhập Facebook để liên kết Fanpage</h4>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  Kết nối trực tiếp bằng tài khoản quản trị Fanpage của CLB để tự động đồng bộ bài viết và số lượt theo dõi.
                </p>
              </div>
              <Button
                type="button"
                size="default"
                className="h-10 min-w-[220px] px-6 text-sm font-bold"
                disabled={!oauthReady || startOAuth.isPending}
                onClick={() => startOAuth.mutate()}
              >
                <Share2 size={16} />
                {startOAuth.isPending ? "Đang chuyển tới Facebook…" : "Đăng nhập bằng Facebook"}
              </Button>
              {!oauthReady && !overview.isPending && (
                <p className="max-w-md text-[11px] text-muted-foreground">
                  Cổng Đăng nhập Facebook đang chờ Quản trị viên hệ thống bật trong <strong>Cài đặt hệ thống</strong>. Trong lúc chờ, CLB có thể dán đường dẫn Fanpage công khai bên dưới để hiển thị ngay.
                </p>
              )}
            </div>
          )}

          {/* Optional clean public Fanpage URL fallback (no token jargon) */}
          <div className="rounded-xl border border-border/70 bg-muted/15 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Link2 size={14} className="text-primary" />
                <span>Đường dẫn Fanpage công khai (hiển thị dự phòng)</span>
              </div>
              {club.facebookUrl && <Badge tone="primary" dot={false}>Đã lưu</Badge>}
            </div>
            <div className="mt-2.5 flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <FormField label="Liên kết Fanpage">
                  <Input
                    type="url"
                    maxLength={500}
                    value={fbUrlValue}
                    onChange={(e) => setFbUrlDraft(e.target.value)}
                    placeholder="https://www.facebook.com/ten-fanpage-clb"
                    className="h-8 text-xs"
                  />
                </FormField>
              </div>
              <Button
                size="sm"
                className="h-8"
                disabled={saveFacebookUrl.isPending || fbUrlValue.trim() === (club.facebookUrl ?? "")}
                onClick={() => saveFacebookUrl.mutate()}
              >
                <Save size={13} /> {saveFacebookUrl.isPending ? "Đang lưu…" : "Lưu đường dẫn"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Step-by-step deployment & connection guide right underneath */}
      <section className="rounded-xl border border-border/70 bg-card p-4 sm:p-5">
        <div className="flex items-center gap-2 border-b border-border/60 pb-2.5">
          <BookOpen size={15} className="text-primary" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
            Hướng dẫn triển khai &amp; kết nối Fanpage
          </h4>
        </div>
        <div className="mt-3.5 grid gap-3 md:grid-cols-3">
          {DEPLOY_GUIDE_STEPS.map((item) => (
            <div key={item.step} className="rounded-lg border border-border/70 bg-muted/20 p-3.5">
              <span className="inline-flex rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
                Bước {item.step}
              </span>
              <p className="mt-2 text-xs font-bold text-foreground">{item.title}</p>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted-foreground">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
