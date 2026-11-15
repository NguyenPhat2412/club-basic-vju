"use client";

import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Upload, X } from "lucide-react";
import { describeError, type User } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

export function AvatarField({
  value,
  onChange,
  fallbackName,
  upload,
  onUploaded,
}: {
  value: string;
  onChange: (url: string) => void;
  fallbackName: string;
  upload: (file: File) => Promise<User>;
  onUploaded: (user: User) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const mutation = useMutation({
    mutationFn: upload,
    onSuccess: (user) => {
      onChange(user.avatarUrl ?? "");
      onUploaded(user);
    },
    onError: (err) => toast.error(describeError(err)),
  });
  const url = value.trim();

  return (
    <FormField label="Ảnh đại diện">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/25 p-2.5">
        <div className="flex min-w-0 items-center gap-3">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="size-12 shrink-0 rounded-full border border-border object-cover" />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-base font-bold text-primary-foreground">
              {(fallbackName || "?").slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground">
              {url ? "Đã thiết lập ảnh đại diện" : "Chưa có ảnh đại diện"}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">Hỗ trợ PNG, JPG, WEBP, GIF (tối đa 5 MB)</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Button type="button" variant="secondary" size="sm" disabled={mutation.isPending} onClick={() => fileInput.current?.click()}>
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {mutation.isPending ? "Đang tải lên…" : url ? "Đổi ảnh" : "Tải ảnh lên"}
          </Button>
          {url && (
            <Button type="button" variant="outline" size="sm" onClick={() => onChange("")} aria-label="Xoá ảnh đại diện">
              <X size={14} />
            </Button>
          )}
        </div>
        <input
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) mutation.mutate(file);
          }}
        />
      </div>
    </FormField>
  );
}
