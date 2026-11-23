"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import {
  ExternalLink,
  Heart,
  MessageCircle,
  RefreshCw,
  Repeat2,
  Settings,
  Share2,
  Users,
} from "lucide-react";
import { apiModel } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, safeExternalHref } from "@/lib/utils";

export function ClubFacebookInsightsCard({
  clubId,
  canManage = false,
  onOpenSettings,
}: {
  clubId: string;
  canManage?: boolean;
  onOpenSettings?: () => void;
}) {
  const queryClient = useQueryClient();
  const fbQuery = useQuery({
    queryKey: qk.clubFacebook(clubId, 9),
    queryFn: () => apiModel.clubFacebook(clubId, 9),
    enabled: !!clubId,
  });

  const syncMutation = useMutation({
    mutationFn: () => apiModel.syncClubFacebook(clubId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: qk.clubFacebook(clubId) });
      queryClient.invalidateQueries({ queryKey: qk.publicClubFacebook(clubId) });
    },
  });

  if (fbQuery.isPending || fbQuery.isError || !fbQuery.data) return null;

  const data = fbQuery.data;
  if (!data.connected || !data.page) {
    if (!canManage) return null;
    return (
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border bg-card px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Share2 size={16} />
          </span>
          <div>
            <p className="text-xs font-bold text-foreground">Chưa kết nối Fanpage Facebook của CLB</p>
            <p className="text-[11px] text-muted-foreground">
              Kết nối Fanpage để theo dõi người theo dõi, bài viết mới nhất và chỉ số thích / bình luận / chia sẻ ngay tại đây.
            </p>
          </div>
        </div>
        {onOpenSettings && (
          <Button size="sm" variant="outline" onClick={onOpenSettings}>
            <Settings size={13} /> Kết nối trong Cài đặt CLB
          </Button>
        )}
      </section>
    );
  }

  const { page, summary, posts } = data;
  const pageHref = safeExternalHref(page.pageLink);

  return (
    <section className="rounded-xl border border-border bg-card p-4 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          {page.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={page.avatarUrl} alt={page.pageName} className="size-9 shrink-0 rounded-lg border border-border object-cover" />
          ) : (
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
              <Share2 size={16} />
            </span>
          )}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-xs font-bold uppercase tracking-wider text-foreground">
                Truyền thông Fanpage · {page.pageName}
              </h3>
              <Badge tone="primary" dot={false}>
                TB {summary.avgEngagementPerPost} tương tác/bài
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Đồng bộ gần nhất: {page.lastSyncedAt ? formatDateTime(page.lastSyncedAt) : "Chưa có"}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {pageHref && (
            <a
              href={pageHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground hover:border-primary/40 hover:text-primary"
            >
              <ExternalLink size={12} /> Mở Fanpage
            </a>
          )}
          {canManage && (
            <Button size="sm" variant="outline" disabled={syncMutation.isPending} onClick={() => syncMutation.mutate()}>
              <RefreshCw size={13} className={syncMutation.isPending ? "animate-spin" : undefined} />
              {syncMutation.isPending ? "Đang đồng bộ…" : "Đồng bộ"}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        <FbKpiTile label="Người theo dõi" value={summary.followersCount} icon={<Users size={14} />} />
        <FbKpiTile label="Bài viết đã đồng bộ" value={summary.postsCount} icon={<Share2 size={14} />} />
        <FbKpiTile label="Tổng lượt cảm xúc" value={summary.totalReactions} icon={<Heart size={14} />} highlight />
        <FbKpiTile
          label="Bình luận & Chia sẻ"
          value={summary.totalComments + summary.totalShares}
          sub={`${summary.totalComments.toLocaleString("vi-VN")} bình luận · ${summary.totalShares.toLocaleString("vi-VN")} chia sẻ`}
          icon={<MessageCircle size={14} />}
        />
      </div>

      {posts.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => {
            const postHref = safeExternalHref(post.permalinkUrl);
            const imgSrc = safeExternalHref(post.imageUrl);
            return (
              <article
                key={post.id}
                className="flex flex-col overflow-hidden rounded-xl border border-border/70 bg-background/50 transition-colors hover:border-primary/35"
              >
                {imgSrc && (
                  <div className="aspect-16/9 w-full overflow-hidden border-b border-border/60 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgSrc} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </div>
                )}
                <div className="flex flex-1 flex-col justify-between gap-2.5 p-3">
                  <div className="space-y-1">
                    <p className="text-[10.5px] font-medium text-muted-foreground">{formatDateTime(post.publishedAt)}</p>
                    <p className="line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-foreground">
                      {post.message || "Bài viết hình ảnh / cập nhật trên Fanpage CLB."}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-border/50 pt-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-3 font-mono font-semibold">
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Heart size={12} /> {post.reactionsCount}
                      </span>
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <MessageCircle size={12} /> {post.commentsCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Repeat2 size={12} /> {post.sharesCount}
                      </span>
                    </div>
                    {postHref && (
                      <a
                        href={postHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        Xem bài <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

function FbKpiTile({
  label,
  value,
  sub,
  icon,
  highlight = false,
}: {
  label: string;
  value: number;
  sub?: string;
  icon: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/60 px-3 py-2.5">
      <div className="flex items-center justify-between gap-1 text-muted-foreground">
        <span className="truncate text-[11px] font-medium">{label}</span>
        <span className="shrink-0 text-primary">{icon}</span>
      </div>
      <p className={`mt-1 font-mono text-xl font-extrabold tabular-nums ${highlight ? "text-primary" : "text-foreground"}`}>
        {value.toLocaleString("vi-VN")}
      </p>
      {sub && <p className="mt-0.5 truncate text-[10.5px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
