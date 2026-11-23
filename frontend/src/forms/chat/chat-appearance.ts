"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ChatWallpaperKey = "dots" | "diagonal" | "aurora" | "plain";
export type ChatBubbleStyleKey = "solid" | "soft" | "minimal";
export type ChatFontSizeKey = "sm" | "md" | "lg";
export type ChatDensityKey = "compact" | "comfortable";

export type ChatAppearanceConfig = {
  wallpaper: ChatWallpaperKey;
  backgroundImage: string | null;
  backgroundDim: number;
  bubbleStyle: ChatBubbleStyleKey;
  fontSize: ChatFontSizeKey;
  density: ChatDensityKey;
  animations: boolean;
};

export const DEFAULT_CHAT_APPEARANCE: ChatAppearanceConfig = {
  wallpaper: "dots",
  backgroundImage: null,
  backgroundDim: 55,
  bubbleStyle: "solid",
  fontSize: "md",
  density: "compact",
  animations: true,
};

export const CHAT_PRESET_IMAGES: { key: string; label: string; src: string }[] = [
  { key: "vju-hero", label: "Học xá VJU", src: "/images/vju-hero-cover.jpg" },
  { key: "vju-life", label: "Hoạt động", src: "/images/vju-campus-life.webp" },
  { key: "vju-vision", label: "Không gian", src: "/images/intro/campus-vision.webp" },
  { key: "vju-ceremony", label: "Sự kiện", src: "/images/intro/vju-ceremony.webp" },
];

const STORAGE_KEY = "vju.chat.appearance.v1";
const SYNC_EVENT = "vju-chat-appearance-sync";
const DEFAULT_JSON = JSON.stringify(DEFAULT_CHAT_APPEARANCE);

const VALID_WALLPAPERS = new Set<ChatWallpaperKey>(["dots", "diagonal", "aurora", "plain"]);
const VALID_BUBBLES = new Set<ChatBubbleStyleKey>(["solid", "soft", "minimal"]);
const VALID_FONTS = new Set<ChatFontSizeKey>(["sm", "md", "lg"]);
const VALID_DENSITIES = new Set<ChatDensityKey>(["compact", "comfortable"]);

export function sanitizeChatBackgroundImage(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 1_500_000) return null;
  if (trimmed.startsWith("/images/")) return trimmed;
  if (/^data:image\/(?:jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(trimmed)) return trimmed;
  return null;
}

export function parseChatAppearance(raw: string | null): ChatAppearanceConfig {
  if (!raw) return DEFAULT_CHAT_APPEARANCE;
  try {
    const parsed = JSON.parse(raw) as Partial<ChatAppearanceConfig>;
    const dim = typeof parsed.backgroundDim === "number" && Number.isFinite(parsed.backgroundDim)
      ? Math.min(85, Math.max(20, Math.round(parsed.backgroundDim)))
      : DEFAULT_CHAT_APPEARANCE.backgroundDim;
    return {
      wallpaper: VALID_WALLPAPERS.has(parsed.wallpaper as ChatWallpaperKey)
        ? (parsed.wallpaper as ChatWallpaperKey)
        : DEFAULT_CHAT_APPEARANCE.wallpaper,
      backgroundImage: sanitizeChatBackgroundImage(parsed.backgroundImage),
      backgroundDim: dim,
      bubbleStyle: VALID_BUBBLES.has(parsed.bubbleStyle as ChatBubbleStyleKey)
        ? (parsed.bubbleStyle as ChatBubbleStyleKey)
        : DEFAULT_CHAT_APPEARANCE.bubbleStyle,
      fontSize: VALID_FONTS.has(parsed.fontSize as ChatFontSizeKey)
        ? (parsed.fontSize as ChatFontSizeKey)
        : DEFAULT_CHAT_APPEARANCE.fontSize,
      density: VALID_DENSITIES.has(parsed.density as ChatDensityKey)
        ? (parsed.density as ChatDensityKey)
        : DEFAULT_CHAT_APPEARANCE.density,
      animations: typeof parsed.animations === "boolean" ? parsed.animations : DEFAULT_CHAT_APPEARANCE.animations,
    };
  } catch {
    return DEFAULT_CHAT_APPEARANCE;
  }
}

export async function compressChatWallpaperFile(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Vui lòng chọn tệp hình ảnh (JPG, PNG hoặc WEBP).");
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("Ảnh nền quá lớn (tối đa 10 MB).");
  }
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Không thể đọc ảnh đã chọn."));
      el.src = objectUrl;
    });
    const maxEdge = 1280;
    const scale = Math.min(1, maxEdge / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Trình duyệt không hỗ trợ xử lý ảnh nền.");
    ctx.drawImage(img, 0, 0, width, height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
    if (!sanitizeChatBackgroundImage(dataUrl)) {
      throw new Error("Ảnh nền sau nén vẫn vượt quá giới hạn bộ nhớ trình duyệt.");
    }
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function subscribeAppearance(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  window.addEventListener(SYNC_EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(SYNC_EVENT, cb);
  };
}

function readSnapshot(): string {
  try {
    return window.localStorage.getItem(STORAGE_KEY) || DEFAULT_JSON;
  } catch {
    return DEFAULT_JSON;
  }
}

export function useChatAppearance() {
  const raw = useSyncExternalStore(subscribeAppearance, readSnapshot, () => DEFAULT_JSON);
  const config = parseChatAppearance(raw);

  const update = useCallback((patch: Partial<ChatAppearanceConfig>) => {
    const next: ChatAppearanceConfig = { ...parseChatAppearance(readSnapshot()), ...patch };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(SYNC_EVENT));
    } catch {
      // ignore storage quota errors
    }
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event(SYNC_EVENT));
    } catch {
      // ignore storage errors
    }
  }, []);

  return { config, update, reset };
}

export const CHAT_WALLPAPER_CLASS: Record<ChatWallpaperKey, string> = {
  dots: "tg-bg-dots",
  diagonal: "tg-bg-diagonal",
  aurora: "tg-bg-aurora",
  plain: "tg-bg-plain",
};

export const CHAT_FONT_SIZE_CLASS: Record<ChatFontSizeKey, string> = {
  sm: "text-[12.5px] leading-[1.35]",
  md: "text-[13.5px] leading-[1.4]",
  lg: "text-[15px] leading-[1.45]",
};

export function telegramBubbleRadiusClass(isMine: boolean, groupedPrev: boolean, groupedNext: boolean): string {
  if (isMine) {
    if (groupedPrev && groupedNext) return "rounded-[18px] rounded-tr-[6px] rounded-br-[6px]";
    if (!groupedPrev && groupedNext) return "rounded-[18px] rounded-br-[6px]";
    if (groupedPrev && !groupedNext) return "rounded-[18px] rounded-tr-[6px] rounded-br-[4px]";
    return "rounded-[18px] rounded-br-[4px]";
  }
  if (groupedPrev && groupedNext) return "rounded-[18px] rounded-tl-[6px] rounded-bl-[6px]";
  if (!groupedPrev && groupedNext) return "rounded-[18px] rounded-bl-[6px]";
  if (groupedPrev && !groupedNext) return "rounded-[18px] rounded-tl-[6px] rounded-bl-[4px]";
  return "rounded-[18px] rounded-bl-[4px]";
}

export function formatChatDayDivider(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, now)) return "Hôm nay";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return "Hôm qua";
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function isDifferentCalendarDay(prevIso?: string, nextIso?: string): boolean {
  if (!nextIso) return false;
  if (!prevIso) return true;
  const a = new Date(prevIso);
  const b = new Date(nextIso);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return false;
  return a.getFullYear() !== b.getFullYear() || a.getMonth() !== b.getMonth() || a.getDate() !== b.getDate();
}
