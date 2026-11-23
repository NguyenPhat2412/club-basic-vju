"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Palette, RotateCcw, Sparkles, X } from "lucide-react";
import {
  CHAT_PRESET_IMAGES,
  CHAT_WALLPAPER_CLASS,
  compressChatWallpaperFile,
  type ChatAppearanceConfig,
  type ChatBubbleStyleKey,
  type ChatDensityKey,
  type ChatFontSizeKey,
  type ChatWallpaperKey,
} from "@/forms/chat/chat-appearance";
import { cn } from "@/lib/utils";

const WALLPAPER_OPTIONS: { key: ChatWallpaperKey; label: string }[] = [
  { key: "dots", label: "Chấm bi" },
  { key: "diagonal", label: "Kẻ chéo" },
  { key: "aurora", label: "Ánh đỏ" },
  { key: "plain", label: "Phẳng" },
];

const BUBBLE_OPTIONS: { key: ChatBubbleStyleKey; label: string }[] = [
  { key: "solid", label: "Đậm" },
  { key: "soft", label: "Nhẹ nhàng" },
  { key: "minimal", label: "Tối giản" },
];

const FONT_OPTIONS: { key: ChatFontSizeKey; label: string }[] = [
  { key: "sm", label: "Nhỏ" },
  { key: "md", label: "Vừa" },
  { key: "lg", label: "Lớn" },
];

const DENSITY_OPTIONS: { key: ChatDensityKey; label: string }[] = [
  { key: "compact", label: "Gọn" },
  { key: "comfortable", label: "Thoáng" },
];

export function ChatAppearancePopover({
  config,
  onUpdate,
  onReset,
}: {
  config: ChatAppearanceConfig;
  onUpdate: (patch: Partial<ChatAppearanceConfig>) => void;
  onReset: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleFileChange = async (file: File | undefined) => {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const dataUrl = await compressChatWallpaperFile(file);
      onUpdate({ backgroundImage: dataUrl });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Không thể tải ảnh nền.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        title="Tuỳ chỉnh giao diện chat"
        aria-label="Tuỳ chỉnh giao diện chat"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px] font-semibold transition-colors",
          open
            ? "border-primary/35 bg-primary/10 text-primary"
            : "border-border/70 bg-background text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Palette size={12.5} className={open ? "text-primary" : undefined} />
        <span className="hidden sm:inline">Giao diện</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Tuỳ chỉnh giao diện chat"
          className="tg-pop-in absolute top-full right-0 z-50 mt-1.5 max-h-[min(520px,calc(100vh-140px))] w-[292px] space-y-3 overflow-y-auto rounded-2xl border border-border bg-card/98 p-3.5 text-xs shadow-xl backdrop-blur-xs"
        >
          <div className="flex items-center justify-between border-b border-border/60 pb-2">
            <span className="font-bold text-foreground">Tuỳ chỉnh giao diện</span>
            <button
              type="button"
              onClick={() => { setUploadError(""); onReset(); }}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-primary"
            >
              <RotateCcw size={11} /> Mặc định
            </button>
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground">Hoạ tiết nền</p>
            <div className="grid grid-cols-4 gap-1.5">
              {WALLPAPER_OPTIONS.map((opt) => {
                const active = !config.backgroundImage && config.wallpaper === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => onUpdate({ wallpaper: opt.key, backgroundImage: null })}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-1.5 text-[10.5px] font-medium transition-all",
                      active
                        ? "border-primary bg-primary/8 text-primary ring-1 ring-primary/25"
                        : "border-border/70 text-muted-foreground hover:border-primary/35 hover:text-foreground"
                    )}
                  >
                    <span className={cn("h-6 w-full rounded border border-border/60", CHAT_WALLPAPER_CLASS[opt.key])} />
                    <span className="truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold text-muted-foreground">Hình nền ảnh</p>
              <div className="flex items-center gap-1.5">
                {config.backgroundImage && (
                  <button
                    type="button"
                    onClick={() => onUpdate({ backgroundImage: null })}
                    className="inline-flex items-center gap-0.5 text-[10.5px] font-medium text-muted-foreground hover:text-destructive"
                  >
                    <X size={11} /> Bỏ ảnh
                  </button>
                )}
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[10.5px] font-semibold text-foreground hover:border-primary/40 hover:text-primary disabled:opacity-60"
                >
                  <ImagePlus size={11} /> {uploading ? "Đang xử lý…" : "Tải ảnh lên"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  aria-label="Tải hình nền chat từ máy"
                  onChange={(e) => void handleFileChange(e.target.files?.[0])}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {CHAT_PRESET_IMAGES.map((preset) => {
                const active = config.backgroundImage === preset.src;
                return (
                  <button
                    key={preset.key}
                    type="button"
                    onClick={() => onUpdate({ backgroundImage: preset.src })}
                    className={cn(
                      "flex flex-col items-center gap-1 rounded-lg border p-1 text-[10px] font-medium transition-all",
                      active
                        ? "border-primary bg-primary/8 text-primary ring-1 ring-primary/25"
                        : "border-border/70 text-muted-foreground hover:border-primary/35 hover:text-foreground"
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={preset.src}
                      alt={preset.label}
                      className="h-8 w-full rounded object-cover"
                    />
                    <span className="w-full truncate text-center">{preset.label}</span>
                  </button>
                );
              })}
            </div>

            {uploadError && <p className="text-[11px] font-medium text-destructive">{uploadError}</p>}

            {config.backgroundImage && (
              <label className="block space-y-1 rounded-lg border border-border/70 bg-muted/20 px-2.5 py-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-medium text-muted-foreground">Độ làm dịu nền</span>
                  <span className="font-mono font-semibold text-foreground">{config.backgroundDim}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={85}
                  step={5}
                  value={config.backgroundDim}
                  aria-label="Độ làm dịu hình nền"
                  onChange={(e) => onUpdate({ backgroundDim: Number(e.target.value) })}
                  className="h-1.5 w-full cursor-pointer accent-primary"
                />
              </label>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground">Kiểu bong bóng</p>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-border/70 bg-muted/40 p-0.5">
              {BUBBLE_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => onUpdate({ bubbleStyle: opt.key })}
                  className={cn(
                    "rounded-md px-2 py-1 text-[11px] font-semibold transition-all",
                    config.bubbleStyle === opt.key ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground">Cỡ chữ</p>
              <div className="grid grid-cols-3 gap-0.5 rounded-lg border border-border/70 bg-muted/40 p-0.5">
                {FONT_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => onUpdate({ fontSize: opt.key })}
                    className={cn(
                      "rounded-md py-1 text-[11px] font-semibold transition-all",
                      config.fontSize === opt.key ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground">Mật độ</p>
              <div className="grid grid-cols-2 gap-0.5 rounded-lg border border-border/70 bg-muted/40 p-0.5">
                {DENSITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => onUpdate({ density: opt.key })}
                    className={cn(
                      "rounded-md py-1 text-[11px] font-semibold transition-all",
                      config.density === opt.key ? "bg-card text-primary shadow-2xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-2 rounded-lg border border-border/70 bg-muted/25 px-2.5 py-2">
            <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
              <Sparkles size={13} className="text-primary" /> Hiệu ứng chuyển động
            </span>
            <input
              type="checkbox"
              checked={config.animations}
              onChange={(e) => onUpdate({ animations: e.target.checked })}
              className="size-4 cursor-pointer accent-primary"
            />
          </label>
        </div>
      )}
    </div>
  );
}
