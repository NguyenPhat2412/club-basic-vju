"use client";

import { useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { CloudUpload, Loader2 } from "lucide-react";
import { describeError, type User } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";

/** Avatar picker: upload a file (saved immediately) or paste a link (saved with the surrounding form). */
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
    <FormField label="Ảnh đại diện" hint="Tải ảnh lên (PNG, JPG, WEBP, GIF, tối đa 5 MB) hoặc dán đường link http(s). Để trống link để xoá ảnh.">
      <div className="flex items-center gap-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="size-12 shrink-0 rounded-full border border-border object-cover" />
        ) : (
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-base font-bold text-primary-foreground">
            {(fallbackName || "?").slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="grid min-w-0 flex-1 gap-2">
          <Input type="url" value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://example.com/avatar.png" />
          <Button type="button" variant="outline" size="sm" className="justify-self-start" disabled={mutation.isPending} onClick={() => fileInput.current?.click()}>
            {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CloudUpload size={14} />}
            {mutation.isPending ? "Đang tải lên…" : "Tải ảnh lên"}
          </Button>
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
