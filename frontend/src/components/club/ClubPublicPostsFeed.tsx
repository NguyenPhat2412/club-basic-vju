"use client";

import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Newspaper, Pin, Plus, Share2 } from "lucide-react";
import { apiModel, type ClubPost } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { describeError } from "@/components/shared/ListPage";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ClubPublicPostsFeed({
  clubId,
  clubName,
  isAuthenticated,
  canManage,
}: {
  clubId: string;
  clubName: string;
  isAuthenticated: boolean;
  canManage: boolean;
}) {
  const queryClient = useQueryClient();
  const postsQuery = useQuery({
    queryKey: qk.publicClubPosts(clubId, 0, 10),
    queryFn: () => apiModel.publicClubPosts(clubId, 0, 10),
    enabled: Boolean(clubId),
  });

  const likeMut = useMutation({
    mutationFn: (postId: string) => apiModel.toggleClubPostLike(clubId, postId),
    onSuccess: (res) => {
      queryClient.setQueryData(
        qk.publicClubPosts(clubId, 0, 10),
        (prev: { items: ClubPost[]; total: number; offset: number; limit: number } | undefined) => {
          if (!prev) return prev;
          return {
            ...prev,
            items: prev.items.map((item) =>
              item.id === res.postId
                ? { ...item, likedByMe: res.liked, likesCount: res.likesCount }
                : item,
            ),
          };
        },
      );
    },
    onError: (err) => toast.error(describeError(err)),
  });

  const posts = postsQuery.data?.items ?? [];
  if (postsQuery.isPending) return null;
  if (posts.length === 0 && !canManage) return null;

  const handleLike = (postId: string) => {
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập để thả tim bài viết.");
      return;
    }
    likeMut.mutate(postId);
  };

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/clubs/${clubId}#club-posts`);
      toast.success("Đã sao chép liên kết bảng tin CLB.");
    } catch {
      toast.error("Không thể sao chép liên kết.");
    }
  };

  return (
    <section id="club-posts" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <Newspaper size={16} className="text-primary" />
          <h2 className="text-sm font-bold text-foreground">Bảng tin câu lạc bộ</h2>
          {posts.length > 0 && (
            <Badge tone="neutral" dot={false}>{posts.length} bài viết</Badge>
          )}
        </div>
        {canManage && (
          <Link
            href={`/management?tab=settings&section=posts&clubId=${clubId}`}
            className="inline-flex h-7.5 items-center gap-1 rounded-lg border border-primary/25 bg-rose-50/70 px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-rose-100/70"
          >
            <Plus size={13} /> Đăng bài mới
          </Link>
        )}
      </div>

      {posts.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Chưa có bài viết nào trên bảng tin. Ban Chủ nhiệm có thể đăng tin tức, lịch sinh hoạt hoặc thông báo tuyển quân ngay tại mục Quản lý CLB.
        </p>
      ) : (
        <div className="mt-4 space-y-3.5">
          {posts.map((post) => (
            <article
              key={post.id}
              className={cn(
                "rounded-xl border p-4",
                post.pinned ? "border-primary/30 bg-rose-50/30" : "border-border/70 bg-background",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <UserAvatar avatarUrl={post.authorAvatarUrl ?? undefined} name={post.authorName} rounded="full" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-xs font-bold text-foreground" data-no-i18n="true">
                        {post.authorName}
                      </p>
                      {post.pinned && (
                        <Badge tone="primary" dot={false}>
                          <Pin size={10} /> Đã ghim
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{formatDate(post.createdAt)}</p>
                  </div>
                </div>
              </div>

              {post.title && (
                <h3 className="mt-3 text-sm font-bold text-foreground" data-no-i18n="true">
                  {post.title}
                </h3>
              )}
              <p className="mt-1.5 whitespace-pre-line text-sm leading-6 text-slate-700" data-no-i18n="true">
                {post.content}
              </p>

              {post.imageUrl && (
                <div className="mt-3 overflow-hidden rounded-xl border border-border/60 bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={post.imageUrl}
                    alt={post.title || clubName}
                    loading="lazy"
                    className="max-h-80 w-full object-cover"
                  />
                </div>
              )}

              <div className="mt-3 flex items-center gap-2 border-t border-border/50 pt-2.5">
                <button
                  type="button"
                  disabled={likeMut.isPending}
                  onClick={() => handleLike(post.id)}
                  aria-pressed={post.likedByMe}
                  className={cn(
                    "inline-flex h-7.5 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
                    post.likedByMe
                      ? "border-primary/35 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/35 hover:text-primary",
                  )}
                >
                  <Heart size={13} className={post.likedByMe ? "fill-primary text-primary" : undefined} />
                  <span className="tabular-nums">{post.likesCount}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShare}
                  className="inline-flex h-7.5 items-center gap-1.5 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Share2 size={12} />
                  <span>Chia sẻ</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
