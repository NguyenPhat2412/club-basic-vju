"use client";

import { useState } from "react";
import { resolveMediaUrl } from "@/lib/media";
import { cn } from "@/lib/utils";

type UserAvatarSize = "sm" | "md";

const SIZE_CLASSES: Record<UserAvatarSize, string> = {
  sm: "size-8 text-xs",
  md: "size-9 text-xs",
};

export function UserAvatar({
  avatarUrl,
  name,
  email,
  size = "sm",
  rounded = "lg",
  className,
}: {
  avatarUrl?: string | null;
  name?: string | null;
  email?: string | null;
  size?: UserAvatarSize;
  rounded?: "lg" | "full";
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const src = resolveMediaUrl(avatarUrl);
  const label = (name?.trim() || email?.trim() || "?").trim();
  const initial = label.slice(0, 1).toUpperCase();
  const radius = rounded === "full" ? "rounded-full" : "rounded-lg";

  if (src && failedSrc !== src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={label}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailedSrc(src)}
        className={cn(
          "shrink-0 border border-border/60 bg-muted/30 object-cover",
          SIZE_CLASSES[size],
          radius,
          className,
        )}
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center bg-primary/10 font-extrabold text-primary",
        SIZE_CLASSES[size],
        radius,
        className,
      )}
    >
      {initial}
    </span>
  );
}
