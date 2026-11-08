import { API_BASE } from "@/lib/api/client";

/**
 * Helpers for resolving and serializing club & campus media URLs
 * while preserving Backend @URL(regexp = "^(https?://.+)?$") validation.
 */

export type ClubMediaItem = {
  slug: string;
  logo: string | null;
  cover: string | null;
  gallery: string[];
};

export type ClubMediaCatalog = {
  clubs: Record<string, ClubMediaItem>;
  intro: string[];
};

export function clubSlugFromCode(code?: string | null): string {
  if (!code) return "";
  return code
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

/**
 * Resolves a stored media URL (`http://localhost:3000/images/...`, `/images/...`, or external `https://...`)
 * into a browser-renderable src. Local `/images/...` paths are extracted from any host/port so images
 * always render reliably across dev/staging/prod origins.
 */
export function resolveMediaUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  const apiOrigin = API_BASE.replace(/\/api\/v1\/?$/, "");
  if (trimmed.startsWith("/api/v1/public/clubs/")) {
    return `${apiOrigin}${trimmed}`;
  }
  if (trimmed.startsWith("/images/")) {
    return trimmed;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.pathname.startsWith("/api/v1/public/clubs/")) {
        return `${apiOrigin}${parsed.pathname}${parsed.search}`;
      }
      if (parsed.pathname.startsWith("/images/")) {
        return parsed.pathname;
      }
      return trimmed;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Converts a user-entered or picker-selected media path (`/images/...` or `https://...`)
 * into an API-compatible URL matching `^(https?://.+)?$`.
 * Returns `""` when cleared so PATCH requests can clear an existing URL.
 */
export function toApiMediaUrl(value?: string | null, originFallback = "http://localhost:3000"): string {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.startsWith("/")) {
    const origin =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : originFallback;
    return `${origin.replace(/\/$/, "")}${trimmed}`;
  }
  return trimmed;
}
