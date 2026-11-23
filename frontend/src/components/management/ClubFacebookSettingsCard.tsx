"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  KeyRound,
  Link2,
  RefreshCw,
  Share2,
  Unlink,
} from "lucide-react";
import { apiModel, Club } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { cn, formatDateTime, safeExternalHref } from "@/lib/utils";

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

  const [mode, setMode] = useState<"token" | "oauth">("token");
  const [pageToken, setPageToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [replacing, setReplacing] = useState(false);
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

  const connectToken = useMutation({
    mutationFn: () => apiModel.connectClubFacebookToken(club.id, pageToken.trim()),
    onSuccess: (res) => {
      setPageToken("");
      setReplacing(false);
      onNotice(`Đã kết nối "${res.page?.pageName ?? "Fanpage"}" (${res.summary.postsCount} bài viết).`);
      onError("");
      invalidateFacebook();
    },
    onError: (e) => onError(describeError(e)),
  });

  const syncNow = useMutation({
    mutationFn: () => apiModel.syncClubFacebook(club.id),
    onSuccess: (res) => {
      onNotice(`Đã đồng bộ ${res.summary.postsCount} bài viết · ${res.summary.followersCount.toLocaleString("vi-VN")} theo dõi.`);
      onError("");
      invalidateFacebook();
    },
    onError: (e) => onError(describeError(e)),
  });

  const disconnect = useMutation({
    mutationFn: () => apiModel.disconnectClubFacebook(club.id),
    onSuccess: () => {
      setReplacing(false);
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
      setReplacing(false);
      onNotice(`Đã gắn "${res.page?.pageName ?? "Fanpage"}" (${res.summary.postsCount} bài viết).`);
      onError("");
      invalidateFacebook();
    },
    onError: (e) => onError(describeError(e)),
  });

  const data = overview.data;
  const page = data?.page;
  const pageHref = safeExternalHref(page?.pageLink);
  const showConnectForm = !data?.connected || replacing;

  return (
    <section className="space-y-4 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Share2 size={16} className="text-primary" />
          <h3 className="text-sm font-bold text-foreground">Fanpage Facebook</h3>
        </div>
        <Badge tone={data?.connected ? "primary" : "neutral"} dot={false}>
          {data?.connected ? "Đã kết nối" : "Chưa kết nối"}
        </Badge>
      </div>

      {fbErrorParam && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span>{fbErrorParam}</span>
          <Button size="sm" variant="outline" onClick={clearOAuthQueryParams}>Đóng</Button>
        </div>
      )}

      {fbSelectToken && (
        <div className="space-y-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-foreground">Chọn Fanpage gắn cho CLB</p>
            <Button size="sm" variant="outline" onClick={clearOAuthQueryParams}>Huỷ</Button>
          </div>
          {pendingPages.isPending ? (
            <p className="text-xs text-muted-foreground">Đang tải danh sách Fanpage…</p>
          ) : pendingPages.isError ? (
            <p className="text-xs text-destructive">{describeError(pendingPages.error)}</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {(pendingPages.data ?? []).map((opt) => (
                <div key={opt.pageId} className="flex items-center justify-between gap-2.5 rounded-lg border border-border bg-card p-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {opt.avatarUrl && !brokenAvatars[opt.pageId] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={opt.avatarUrl}
                        alt={opt.pageName}
                        onError={() => setBrokenAvatars((prev) => ({ ...prev, [opt.pageId]: true }))}
                        className="size-9 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <Globe size={15} />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-foreground">{opt.pageName}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{opt.followersCount.toLocaleString("vi-VN")} theo dõi</p>
                    </div>
                  </div>
                  <Button size="sm" disabled={selectOAuthPage.isPending} onClick={() => selectOAuthPage.mutate(opt.pageId)}>
                    Chọn
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {data?.connected && page && (
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/20 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            {page.avatarUrl && !brokenAvatars.connected ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={page.avatarUrl}
                alt={page.pageName}
                onError={() => setBrokenAvatars((prev) => ({ ...prev, connected: true }))}
                className="size-11 shrink-0 rounded-xl border border-border object-cover"
              />
            ) : (
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <Share2 size={18} />
              </span>
            )}
            <div className="min-w-0 space-y-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <p className="truncate text-sm font-bold text-foreground">{page.pageName}</p>
                <CheckCircle2 size={14} className="shrink-0 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground">
                <b className="text-foreground">{data.summary.followersCount.toLocaleString("vi-VN")}</b> theo dõi ·{" "}
                <b className="text-foreground">{data.summary.postsCount}</b> bài viết
                {page.lastSyncedAt ? ` · Đồng bộ ${formatDateTime(page.lastSyncedAt)}` : ""}
              </p>
              {page.lastSyncError && <p className="text-[11px] text-destructive">{page.lastSyncError}</p>}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5">
            {pageHref && (
              <a
                href={pageHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-8 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary"
              >
                <ExternalLink size={12} /> Mở trang
              </a>
            )}
            <Button size="sm" variant="outline" disabled={syncNow.isPending} onClick={() => syncNow.mutate()}>
              <RefreshCw size={13} className={syncNow.isPending ? "animate-spin" : undefined} />
              {syncNow.isPending ? "Đang đồng bộ…" : "Đồng bộ"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setReplacing((v) => !v)}>
              <KeyRound size={13} /> {replacing ? "Đóng" : "Đổi token"}
            </Button>
            {confirmDisconnect ? (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={disconnect.isPending}
                  onClick={() => disconnect.mutate()}
                >
                  <Unlink size={13} /> {disconnect.isPending ? "Đang ngắt…" : "Xác nhận ngắt"}
                </Button>
                <Button size="sm" variant="outline" disabled={disconnect.isPending} onClick={() => setConfirmDisconnect(false)}>
                  Huỷ
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:border-destructive/40"
                disabled={disconnect.isPending}
                onClick={() => setConfirmDisconnect(true)}
              >
                <Unlink size={13} /> Ngắt
              </Button>
            )}
          </div>
        </div>
      )}

      {showConnectForm && (
        <div className="space-y-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setMode("token")}
                className={cn(
                  "rounded-md px-3 py-1 transition-colors",
                  mode === "token" ? "bg-card font-bold text-primary shadow-2xs" : "font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                Page Token
              </button>
              <button
                type="button"
                onClick={() => setMode("oauth")}
                className={cn(
                  "rounded-md px-3 py-1 transition-colors",
                  mode === "oauth" ? "bg-card font-bold text-primary shadow-2xs" : "font-medium text-muted-foreground hover:text-foreground"
                )}
              >
                Đăng nhập Facebook
              </button>
            </div>

            {mode === "token" && (
              <button
                type="button"
                onClick={() => setShowGuide((v) => !v)}
                className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary"
              >
                <HelpCircle size={13} />
                <span>Hướng dẫn lấy token</span>
                <ChevronDown size={13} className={cn("transition-transform", showGuide && "rotate-180")} />
              </button>
            )}
          </div>

          {mode === "token" ? (
            <div className="space-y-3">
              {showGuide && (
                <ol className="list-decimal space-y-1 rounded-lg border border-border/70 bg-muted/30 py-2.5 pl-7 pr-3 text-xs text-muted-foreground">
                  <li>Mở <b>Graph API Explorer</b> → chọn quyền <code className="font-mono">pages_show_list</code>, <code className="font-mono">pages_read_engagement</code>.</li>
                  <li>Đổi mục <b>Người dùng hoặc Trang</b> sang tên Fanpage CLB → copy ô <b>Access Token</b>.</li>
                  <li>Dán vào ô dưới và bấm <b>Kết nối Fanpage</b> (token tự mã hoá AES-256 ở máy chủ).</li>
                </ol>
              )}

              <FormField label="Page Access Token" required>
                <div className="relative">
                  <Input
                    type={showToken ? "text" : "password"}
                    value={pageToken}
                    maxLength={2000}
                    onChange={(e) => setPageToken(e.target.value)}
                    placeholder="Dán Page Access Token (EAA...) tại đây"
                    className="pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    aria-label={showToken ? "Ẩn token" : "Hiện token"}
                    onClick={() => setShowToken((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </FormField>

              <div className="flex justify-end">
                <Button size="sm" disabled={!pageToken.trim() || connectToken.isPending} onClick={() => connectToken.mutate()}>
                  <Link2 size={14} /> {connectToken.isPending ? "Đang kết nối…" : "Kết nối Fanpage"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 p-3.5">
              <p className="text-xs text-muted-foreground">
                {data?.oauthConfigured
                  ? "Đăng nhập Facebook của người quản trị Fanpage để chọn gắn trực tiếp cho CLB."
                  : "Tính năng Đăng nhập Facebook chưa được quản trị viên hệ thống kích hoạt. Bạn có thể kết nối ngay bằng Page Access Token."}
              </p>
              <Button size="sm" disabled={!data?.oauthConfigured || startOAuth.isPending} onClick={() => startOAuth.mutate()}>
                <Share2 size={14} /> {startOAuth.isPending ? "Đang mở…" : "Đăng nhập Facebook"}
              </Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
