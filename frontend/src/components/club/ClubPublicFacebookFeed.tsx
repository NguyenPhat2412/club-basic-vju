"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { ExternalLink, Heart, MessageCircle, Repeat2, Share2 } from "lucide-react";
import { apiModel } from "@/lib/api";
import { Section } from "@/components/shared/Overlays";
import { formatDateTime, safeExternalHref } from "@/lib/utils";

const ALLOWED_FACEBOOK_HOSTS = new Set([
  "facebook.com",
  "www.facebook.com",
  "m.facebook.com",
  "fb.com",
]);

export function getSafeFacebookPageUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed || trimmed.length > 500) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  if (parsed.username || parsed.password || parsed.port) return null;
  if (!ALLOWED_FACEBOOK_HOSTS.has(parsed.hostname.toLowerCase())) return null;
  if (parsed.pathname.length <= 1) return null;
  return parsed.toString();
}

export function buildFacebookPagePluginSrc(rawUrl?: string | null): string | null {
  const safeUrl = getSafeFacebookPageUrl(rawUrl);
  if (!safeUrl) return null;
  const params = new URLSearchParams({
    href: safeUrl,
    tabs: "timeline",
    width: "500",
    height: "500",
    small_header: "false",
    adapt_container_width: "true",
    hide_cover: "false",
    show_facepile: "true",
  });
  return `https://www.facebook.com/plugins/page.php?${params.toString()}`;
}

export function ClubPublicFacebookFeed({
  clubId,
  facebookUrl,
}: {
  clubId: string;
  facebookUrl?: string | null;
}) {
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const feed = useQuery({
    queryKey: qk.publicClubFacebook(clubId, 4),
    queryFn: () => apiModel.publicClubFacebookPosts(clubId, 4),
    enabled: !!clubId,
  });

  if (feed.data?.connected && feed.data.posts.length > 0) {
    const { pageName, pageLink, followersCount, posts } = feed.data;
    const pageHref = safeExternalHref(pageLink) ?? getSafeFacebookPageUrl(facebookUrl);

    return (
      <Section title={`Bài viết mới từ Fanpage (${followersCount.toLocaleString("vi-VN")} theo dõi)`} icon={<Share2 />}>
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{pageName}</span>
          {pageHref && (
            <a
              href={pageHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              Xem trang Facebook <ExternalLink size={12} />
            </a>
          )}
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          {posts.map((post) => {
            const postHref = safeExternalHref(post.permalinkUrl);
            const imgSrc = safeExternalHref(post.imageUrl);
            return (
              <article
                key={post.id}
                className="flex flex-col overflow-hidden rounded-xl border border-border/70 bg-card"
              >
                {imgSrc && !brokenImages[post.id] && (
                  <div className="aspect-16/9 w-full overflow-hidden border-b border-border/50 bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgSrc}
                      alt=""
                      loading="lazy"
                      onError={() => setBrokenImages((prev) => ({ ...prev, [post.id]: true }))}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col justify-between gap-2 p-3">
                  <div className="space-y-1">
                    <p className="text-[10.5px] text-muted-foreground">{formatDateTime(post.publishedAt)}</p>
                    <p className="line-clamp-3 whitespace-pre-line text-xs leading-relaxed text-foreground">
                      {post.message || "Cập nhật hình ảnh hoạt động trên Fanpage CLB."}
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
                    <div className="flex items-center gap-2.5 font-mono font-semibold">
                      <span className="inline-flex items-center gap-1 text-primary">
                        <Heart size={11} /> {post.reactionsCount}
                      </span>
                      <span className="inline-flex items-center gap-1 text-foreground">
                        <MessageCircle size={11} /> {post.commentsCount}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Repeat2 size={11} /> {post.sharesCount}
                      </span>
                    </div>
                    {postHref && (
                      <a
                        href={postHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                      >
                        Facebook <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </Section>
    );
  }

  const candidateUrl = facebookUrl ?? feed.data?.pageLink;
  const externalUrl = getSafeFacebookPageUrl(candidateUrl);
  const pluginSrc = buildFacebookPagePluginSrc(candidateUrl);

  if (!pluginSrc || !externalUrl) return null;

  return (
    <Section title="Bảng tin Fanpage Facebook" icon={<Share2 />}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Hiển thị trực tiếp qua Facebook Page Plugin chính thức</span>
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15"
        >
          Mở Fanpage Facebook <ExternalLink size={12} />
        </a>
      </div>
      <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
        <iframe
          title="Bảng tin Fanpage Facebook của CLB"
          src={pluginSrc}
          loading="lazy"
          sandbox="allow-scripts allow-same-origin allow-popups"
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-[500px] w-full border-0 bg-card"
        />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Nếu trình duyệt chặn nhúng bên thứ ba, vui lòng bấm &ldquo;Mở Fanpage Facebook&rdquo; để xem bài viết mới nhất.
      </p>
    </Section>
  );
}
