"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, Image as ImageIcon, Newspaper, Pin, PinOff, Send, Trash2 } from "lucide-react";
import { apiModel, type Club, type ClubPost } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { describeError } from "@/components/shared/ListPage";
import { EmptyState, LoadingRows } from "@/components/shared/States";
import { UserAvatar } from "@/components/user/UserAvatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatPostDate(iso: string) {
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

export function ClubPostsPanel({
  club,
  onNotice,
  onError,
}: {
  club: Club;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [pinned, setPinned] = useState(false);

  const postsQuery = useQuery({
    queryKey: qk.publicClubPosts(club.id, 0, 20),
    queryFn: () => apiModel.publicClubPosts(club.id, 0, 20),
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: qk.publicClubPosts(club.id) });
  };

  const createMut = useMutation({
    mutationFn: () =>
      apiModel.createClubPost(club.id, {
        title: title.trim() || null,
        content: content.trim(),
        imageUrl: imageUrl.trim() || null,
        pinned,
      }),
    onSuccess: () => {
      setTitle("");
      setContent("");
      setImageUrl("");
      setPinned(false);
      onNotice("Đã đăng bài viết mới lên bảng tin CLB.");
      onError("");
      invalidate();
    },
    onError: (e) => onError(describeError(e)),
  });

  const togglePinMut = useMutation({
    mutationFn: (post: ClubPost) =>
      apiModel.updateClubPost(club.id, post.id, { pinned: !post.pinned }),
    onSuccess: (updated) => {
      onNotice(updated.pinned ? "Đã ghim bài viết lên đầu trang CLB." : "Đã bỏ ghim bài viết.");
      onError("");
      invalidate();
    },
    onError: (e) => onError(describeError(e)),
  });

  const deleteMut = useMutation({
    mutationFn: (postId: string) => apiModel.deleteClubPost(club.id, postId),
    onSuccess: () => {
      onNotice("Đã xoá bài viết khỏi bảng tin CLB.");
      onError("");
      invalidate();
    },
    onError: (e) => onError(describeError(e)),
  });

  const posts = postsQuery.data?.items ?? [];

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
      {/* Left: Compact Facebook-style Post Composer */}
      <section className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Newspaper size={15} className="text-primary" />
            <h3 className="text-sm font-bold text-foreground">Đăng bài viết lên Trang CLB</h3>
          </div>
          <Badge tone="primary" dot={false}>Công khai</Badge>
        </div>

        <div className="mt-3.5 space-y-3">
          <Input
            aria-label="Tiêu đề bài viết"
            maxLength={160}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Tiêu đề nổi bật (không bắt buộc)…"
          />

          <Textarea
            aria-label="Nội dung bài viết"
            rows={4}
            maxLength={4000}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Chia sẻ tin tức, lịch sinh hoạt, hình ảnh sự kiện hoặc thông báo tuyển quân của câu lạc bộ…"
            className="min-h-28 py-2.5"
          />

          <div className="relative">
            <ImageIcon size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              aria-label="Liên kết ảnh minh họa"
              maxLength={500}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="URL ảnh minh họa (/api/v1/public/... hoặc https://...)"
              className="pl-8.5"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setPinned((v) => !v)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
                pinned
                  ? "border-primary/35 bg-primary/10 text-primary"
                  : "border-border bg-background text-muted-foreground hover:text-foreground",
              )}
            >
              <Pin size={13} />
              <span>{pinned ? "Đang ghim đầu trang" : "Ghim đầu trang"}</span>
            </button>

            <Button
              type="button"
              size="sm"
              className="h-8"
              disabled={!content.trim() || createMut.isPending}
              onClick={() => createMut.mutate()}
            >
              <Send size={13} />
              <span>{createMut.isPending ? "Đang đăng…" : "Đăng bài viết"}</span>
            </Button>
          </div>
        </div>
      </section>

      {/* Right: Published Feed List */}
      <section className="rounded-xl border border-border/60 bg-card p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <h3 className="text-sm font-bold text-foreground">Bảng tin đã đăng</h3>
          <Badge tone="neutral" dot={false}>{posts.length} bài viết</Badge>
        </div>

        <div className="mt-3.5 space-y-3">
          {postsQuery.isPending ? (
            <LoadingRows rows={3} />
          ) : posts.length === 0 ? (
            <EmptyState
              icon={<Newspaper />}
              title="Chưa có bài viết nào"
              description="Đăng bài viết đầu tiên để sinh viên theo dõi hoạt động nổi bật ngay trên trang công khai của CLB."
            />
          ) : (
            posts.map((post) => (
              <article
                key={post.id}
                className={cn(
                  "rounded-xl border p-3.5 transition-colors",
                  post.pinned ? "border-primary/30 bg-rose-50/35" : "border-border/70 bg-background",
                )}
              >
                <div className="flex items-start justify-between gap-2">
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
                      <p className="text-[11px] text-muted-foreground">{formatPostDate(post.createdAt)}</p>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px]"
                      disabled={togglePinMut.isPending}
                      onClick={() => togglePinMut.mutate(post)}
                      title={post.pinned ? "Bỏ ghim" : "Ghim đầu trang"}
                    >
                      {post.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                      <span className="hidden sm:inline">{post.pinned ? "Bỏ ghim" : "Ghim"}</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-[11px] text-destructive hover:border-destructive/40"
                      disabled={deleteMut.isPending}
                      onClick={() => confirm("Xoá bài viết này khỏi bảng tin CLB?") && deleteMut.mutate(post.id)}
                      title="Xoá bài viết"
                    >
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>

                {post.title && (
                  <h4 className="mt-2.5 text-sm font-bold text-foreground" data-no-i18n="true">
                    {post.title}
                  </h4>
                )}
                <p className="mt-1.5 whitespace-pre-line text-xs leading-5 text-slate-700" data-no-i18n="true">
                  {post.content}
                </p>

                {post.imageUrl && (
                  <div className="mt-2.5 overflow-hidden rounded-lg border border-border/60 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.imageUrl}
                      alt={post.title || club.name}
                      loading="lazy"
                      className="max-h-56 w-full object-cover"
                    />
                  </div>
                )}

                <div className="mt-2.5 flex items-center gap-1.5 border-t border-border/50 pt-2 text-[11px] font-semibold text-muted-foreground">
                  <Heart size={12} className={post.likesCount > 0 ? "fill-primary text-primary" : "text-muted-foreground"} />
                  <span>{post.likesCount} lượt thích</span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
