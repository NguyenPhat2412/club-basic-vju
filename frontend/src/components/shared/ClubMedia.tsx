"use client";

import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { ImageIcon, Loader2, Sparkles, Upload, X } from "lucide-react";
import { apiModel, Club, describeError } from "@/lib/api";
import { ClubMediaCatalog, clubSlugFromCode, resolveMediaUrl } from "@/lib/media";
import { cn, validateImageUploadFile } from "@/lib/utils";
import { FormField } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function useClubMediaCatalog(enabled = true) {
  return useQuery<ClubMediaCatalog>({
    queryKey: qk.clubMediaCatalog(),
    queryFn: async () => {
      const res = await fetch("/api/club-media");
      if (!res.ok) throw new Error("Không thể tải thư viện hình ảnh CLB");
      return res.json() as Promise<ClubMediaCatalog>;
    },
    staleTime: 5 * 60_000,
    enabled,
  });
}

export function ClubAvatar({
  name,
  code,
  logoUrl,
  fallbackUrl,
  size = "md",
  className,
}: {
  name: string;
  code?: string;
  logoUrl?: string | null;
  fallbackUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const primary = resolveMediaUrl(logoUrl);
  const secondary = resolveMediaUrl(fallbackUrl);
  const src = primary && primary !== failedSrc ? primary : secondary && secondary !== failedSrc ? secondary : null;

  const sizeClass =
    size === "sm"
      ? "size-9 rounded-lg text-xs"
      : size === "lg"
        ? "size-14 rounded-xl text-lg"
        : "size-11 rounded-xl text-sm";

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`Logo ${name}`}
        loading="lazy"
        onError={() => setFailedSrc(src)}
        className={cn(
          sizeClass,
          "shrink-0 bg-white object-cover shadow-2xs ring-1 ring-slate-200/90",
          className
        )}
      />
    );
  }

  const label = (code || name || "C").trim().slice(0, 2).toUpperCase();
  return (
    <span
      className={cn(
        sizeClass,
        "flex shrink-0 items-center justify-center bg-primary/10 font-extrabold tracking-tight text-primary ring-1 ring-primary/15",
        className
      )}
    >
      {label}
    </span>
  );
}

export function ClubCoverBanner({
  name,
  code,
  coverUrl,
  fallbackUrl,
  className,
  children,
}: {
  name: string;
  code?: string;
  coverUrl?: string | null;
  fallbackUrl?: string | null;
  className?: string;
  children?: React.ReactNode;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const primary = resolveMediaUrl(coverUrl);
  const secondary = resolveMediaUrl(fallbackUrl);
  const src = primary && primary !== failedSrc ? primary : secondary && secondary !== failedSrc ? secondary : null;

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-linear-to-br from-primary via-primary-hover to-secondary-foreground",
        className
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={`Ảnh bìa ${name}`}
          loading="lazy"
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center px-4 text-center">
          <span className="font-mono text-xl font-extrabold tracking-widest text-white/25">
            {code || name}
          </span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-slate-950/65 via-slate-950/15 to-transparent" />
      {children}
    </div>
  );
}

export function ClubMediaPickerField({
  label,
  value,
  onChange,
  kind,
  clubCode,
  clubId,
  onUploaded,
  onPendingFileChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  kind: "logo" | "cover";
  clubCode?: string;
  clubId?: string;
  onUploaded?: (club: Club) => void;
  onPendingFileChange?: (file: File | null) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const queryClient = useQueryClient();
  const catalog = useClubMediaCatalog(pickerOpen);
  const previewSrc = resolveMediaUrl(value);
  const currentSlug = clubSlugFromCode(clubCode);

  const handleUploadFile = async (file: File) => {
    setUploadError(null);
    setUploadNotice(null);
    const fileErr = validateImageUploadFile(file, 10);
    if (fileErr) { setUploadError(fileErr); return; }
    if (!clubId) {
      onPendingFileChange?.(file);
      setPendingFileName(file.name);
      const localUrl = URL.createObjectURL(file);
      onChange(localUrl);
      setUploadNotice(`Đã chọn ảnh "${file.name}".`);
      return;
    }
    setUploading(true);
    try {
      const updated =
        kind === "logo"
          ? await apiModel.uploadClubLogo(clubId, file)
          : await apiModel.uploadClubCover(clubId, file);
      const nextUrl = (kind === "logo" ? updated.logoUrl : updated.coverUrl) || "";
      onChange(nextUrl);
      onUploaded?.(updated);
      if (!onUploaded) {
        setUploadNotice(kind === "logo" ? "Đã cập nhật logo câu lạc bộ." : "Đã cập nhật ảnh bìa câu lạc bộ.");
      }
      queryClient.invalidateQueries({ queryKey: qk.publicClubDetail(clubId) });
      queryClient.invalidateQueries({ queryKey: qk.clubs() });
      queryClient.invalidateQueries({ queryKey: qk.home("public-clubs") });
      queryClient.invalidateQueries({ queryKey: qk.dashboard("public-clubs") });
    } catch (err) {
      setUploadError(describeError(err));
    } finally {
      setUploading(false);
    }
  };

  const handlePickFromCatalog = async (src: string, tag: string) => {
    setPickerOpen(false);
    if (!clubId) {
      onChange(src);
      return;
    }
    setUploading(true);
    setUploadError(null);
    setUploadNotice(null);
    try {
      const resp = await fetch(src);
      if (!resp.ok) throw new Error("Không thể đọc file ảnh mẫu");
      const blob = await resp.blob();
      const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
      const file = new File([blob], `${tag.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${kind}.${ext}`, {
        type: blob.type || "image/jpeg",
      });
      await handleUploadFile(file);
    } catch {
      onChange(src);
    } finally {
      setUploading(false);
    }
  };

  const options = Object.values(catalog.data?.clubs ?? {}).flatMap((entry) => {
    if (kind === "logo") {
      return entry.logo ? [{ slug: entry.slug, src: entry.logo, tag: entry.slug.toUpperCase() }] : [];
    }
    const items: { slug: string; src: string; tag: string }[] = [];
    if (entry.cover) items.push({ slug: entry.slug, src: entry.cover, tag: `${entry.slug.toUpperCase()} · Bìa` });
    entry.gallery.slice(0, 2).forEach((g, idx) => {
      if (g !== entry.cover) {
        items.push({ slug: entry.slug, src: g, tag: `${entry.slug.toUpperCase()} #${idx + 1}` });
      }
    });
    return items;
  });

  // Sort matching clubCode first so Club Presidents see their own club's artwork immediately
  const sortedOptions = [...options].sort((a, b) => {
    const aMatch = a.slug === currentSlug ? 0 : 1;
    const bMatch = b.slug === currentSlug ? 0 : 1;
    return aMatch - bMatch || a.tag.localeCompare(b.tag);
  });

  const hasImage = Boolean(previewSrc || value.startsWith("blob:"));

  return (
    <div className="min-w-0 space-y-2">
      <FormField label={label}>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/25 p-2.5">
          <div className="flex min-w-0 items-center gap-3">
            {hasImage ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={value.startsWith("blob:") ? value : previewSrc || ""}
                alt={label}
                className={
                  kind === "logo"
                    ? "size-12 shrink-0 rounded-lg bg-white object-cover ring-1 ring-border"
                    : "h-14 w-24 shrink-0 rounded-lg object-cover ring-1 ring-border"
                }
              />
            ) : (
              <span
                className={cn(
                  "flex shrink-0 items-center justify-center rounded-lg border border-dashed border-border bg-background text-muted-foreground",
                  kind === "logo" ? "size-12" : "h-14 w-24"
                )}
              >
                <ImageIcon size={18} />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-foreground">
                {value.startsWith("blob:") && pendingFileName
                  ? pendingFileName
                  : hasImage
                    ? kind === "logo"
                      ? "Đã thiết lập logo câu lạc bộ"
                      : "Đã thiết lập ảnh bìa câu lạc bộ"
                    : kind === "logo"
                      ? "Chưa có logo câu lạc bộ"
                      : "Chưa có ảnh bìa câu lạc bộ"}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Hỗ trợ PNG, JPG, WEBP, GIF</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  void handleUploadFile(file);
                }
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {uploading ? "Đang tải lên…" : hasImage ? "Đổi ảnh" : "Tải ảnh lên"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={uploading}
              onClick={() => setPickerOpen((o) => !o)}
            >
              <Sparkles size={13} /> Kho ảnh mẫu
            </Button>
            {value && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  setPendingFileName(null);
                  onPendingFileChange?.(null);
                  setUploadNotice(null);
                  onChange("");
                }}
                aria-label={`Xoá ${label}`}
              >
                <X size={14} />
              </Button>
            )}
          </div>
        </div>
      </FormField>

      {uploadNotice && (
        <p className="text-[11.5px] font-medium text-primary">{uploadNotice}</p>
      )}
      {uploadError && (
        <p className="text-[11.5px] font-medium text-destructive">{uploadError}</p>
      )}

      {pickerOpen && (
        <div className="rounded-xl border border-border bg-muted/25 p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-foreground">
              <ImageIcon size={13} className="text-primary" /> Chọn từ kho ảnh mẫu
            </span>
            <button
              type="button"
              onClick={() => setPickerOpen(false)}
              className="text-[11px] font-semibold text-muted-foreground hover:text-foreground"
            >
              Đóng
            </button>
          </div>
          {catalog.isPending ? (
            <p className="py-3 text-center text-xs text-muted-foreground">Đang tải thư viện ảnh…</p>
          ) : sortedOptions.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">Chưa có ảnh khả dụng trong thư viện.</p>
          ) : (
            <div className="grid max-h-48 grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
              {sortedOptions.map((opt) => (
                <button
                  key={opt.src + opt.tag}
                  type="button"
                  onClick={() => {
                    void handlePickFromCatalog(opt.src, opt.tag);
                  }}
                  className={cn(
                    "group flex flex-col overflow-hidden rounded-lg border bg-background text-left transition-all hover:border-primary",
                    previewSrc === opt.src ? "border-primary ring-2 ring-primary/25" : "border-border/70"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={opt.src}
                    alt={opt.tag}
                    loading="lazy"
                    className={kind === "logo" ? "h-14 w-full object-contain bg-white p-1" : "h-14 w-full object-cover"}
                  />
                  <span className="truncate px-1.5 py-1 text-[10px] font-semibold text-foreground">{opt.tag}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
