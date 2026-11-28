"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Check,
  Compass,
  Copy,
  ExternalLink,
  Lock,
  LockOpen,
  Mail,
  Megaphone,
  Save,
  Users,
} from "lucide-react";
import type { Club } from "@/lib/api";
import { ClubAvatar, ClubCoverBanner, ClubMediaPickerField } from "@/components/shared/ClubMedia";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Textarea } from "@/components/ui/input";
import { ClubUsageQuotaCard } from "@/components/management/ClubUsageQuotaCard";

export function ClubProfileSettingsPanel({
  club,
  clubMedia,
  followersCount,
  canUpdateClub,
  canActivateClub,
  canDeactivateClub,
  canSendNotif,
  name,
  setName,
  activityField,
  setActivityField,
  contactEmail,
  setContactEmail,
  logoUrl,
  setLogoUrl,
  coverUrl,
  setCoverUrl,
  description,
  setDescription,
  saving,
  changingStatus,
  onSave,
  onChangeStatus,
  onNotice,
  onError,
}: {
  club: Club;
  clubMedia?: { logo?: string | null; cover?: string | null };
  followersCount: number;
  canUpdateClub: boolean;
  canActivateClub: boolean;
  canDeactivateClub: boolean;
  canSendNotif: boolean;
  name: string;
  setName: (v: string) => void;
  activityField: string;
  setActivityField: (v: string) => void;
  contactEmail: string;
  setContactEmail: (v: string) => void;
  logoUrl: string;
  setLogoUrl: (v: string) => void;
  coverUrl: string;
  setCoverUrl: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  saving: boolean;
  changingStatus: boolean;
  onSave: () => void;
  onChangeStatus: (status: "ACTIVE" | "INACTIVE") => void;
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [copiedApplyLink, setCopiedApplyLink] = useState(false);

  const copyApplyLink = async () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/clubs/${club.id}/apply`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedApplyLink(true);
      onNotice("Đã sao chép liên kết tuyển quân CLB.");
      window.setTimeout(() => setCopiedApplyLink(false), 2000);
    } catch {
      onError("Không thể sao chép liên kết. Vui lòng thử lại.");
    }
  };

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xs">
        <ClubCoverBanner
          name={name || club.name}
          code={club.code}
          coverUrl={coverUrl || club.coverUrl}
          fallbackUrl={clubMedia?.cover ?? undefined}
          className="h-36 w-full sm:h-44"
        >
          <div className="absolute right-3 top-3 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-0.5 text-[11px] font-bold text-slate-800 shadow-xs">
              <Users size={11} className="text-primary" />
              <span>{followersCount} người theo dõi</span>
            </span>
            <StatusBadge status={club.status} />
          </div>
        </ClubCoverBanner>

        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex min-w-0 items-center gap-3.5">
            <ClubAvatar
              name={name || club.name}
              code={club.code}
              logoUrl={logoUrl || club.logoUrl}
              fallbackUrl={clubMedia?.logo ?? undefined}
              size="lg"
              className="relative z-10 -mt-10 shrink-0 border-4 border-card shadow-sm sm:-mt-12"
            />
            <div className="min-w-0">
              <h3 className="truncate text-base font-extrabold tracking-tight text-foreground sm:text-lg">
                {name || club.name}
              </h3>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span className="font-mono font-bold text-primary">{club.code}</span>
                {activityField && <span>· {activityField}</span>}
                <span>· {followersCount} người theo dõi</span>
              </p>
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="h-8" onClick={copyApplyLink}>
              {copiedApplyLink ? <Check size={13} className="text-primary" /> : <Copy size={13} />}
              <span>{copiedApplyLink ? "Đã sao chép" : "Link tuyển quân"}</span>
            </Button>
            {canSendNotif && (
              <Link
                href={`/notifications?tab=campaigns&clubId=${club.id}`}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-primary/25 bg-rose-50/70 px-2.5 text-xs font-semibold text-primary transition-colors hover:bg-rose-100/70"
              >
                <Megaphone size={13} /> Phát thông báo CLB
              </Link>
            )}
            <Link
              href={`/clubs/${club.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
            >
              <ExternalLink size={13} /> Xem trang công khai
            </Link>
            {canActivateClub && (
              <Button size="sm" variant="outline" className="h-8" disabled={changingStatus} onClick={() => onChangeStatus("ACTIVE")}>
                <LockOpen size={13} /> Kích hoạt lại
              </Button>
            )}
            {canDeactivateClub && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-destructive hover:border-destructive/40"
                disabled={changingStatus}
                onClick={() => confirm(`Ngừng hoạt động câu lạc bộ ${club.name}?`) && onChangeStatus("INACTIVE")}
              >
                <Lock size={13} /> Ngừng hoạt động
              </Button>
            )}
            {canUpdateClub && (
              <Button size="sm" className="h-8" disabled={!name.trim() || saving} onClick={onSave}>
                <Save size={13} /> {saving ? "Đang lưu…" : "Lưu thay đổi"}
              </Button>
            )}
          </div>
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[310px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <section className="rounded-xl border border-border/60 bg-card p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Giới thiệu</h4>
            <p className="mt-2 text-xs leading-5 text-foreground/90">
              {description.trim() || "Chưa có mô tả giới thiệu ngắn cho câu lạc bộ."}
            </p>
            <dl className="mt-3.5 space-y-2 border-t border-border/50 pt-3 text-xs">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Building2 size={14} className="shrink-0 text-primary" />
                <span>Mã đơn vị:</span>
                <strong className="font-mono font-bold text-foreground">{club.code}</strong>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Compass size={14} className="shrink-0 text-primary" />
                <span>Lĩnh vực:</span>
                <strong className="truncate font-semibold text-foreground">{activityField || "Chưa cập nhật"}</strong>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail size={14} className="shrink-0 text-primary" />
                <span className="truncate font-medium text-foreground">{contactEmail || "Chưa có email liên hệ"}</span>
              </div>
            </dl>
          </section>
          <ClubUsageQuotaCard clubId={club.id} />
        </aside>

        {canUpdateClub && (
          <section className="divide-y divide-border/50 rounded-xl border border-border/60 bg-card">
            <div className="space-y-3 p-4 sm:p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Thông tin cơ bản</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <FormField label="Tên câu lạc bộ" required>
                    <Input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} placeholder="Nhập tên câu lạc bộ" />
                  </FormField>
                </div>
                <FormField label="Mã CLB">
                  <Input value={club.code} maxLength={50} disabled />
                </FormField>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Lĩnh vực hoạt động">
                  <Input value={activityField} maxLength={200} onChange={(e) => setActivityField(e.target.value)} placeholder="Học thuật, Thể thao, Nghệ thuật…" />
                </FormField>
                <FormField label="Email liên hệ">
                  <Input type="email" value={contactEmail} maxLength={320} onChange={(e) => setContactEmail(e.target.value)} placeholder="clb@vju.ac.vn" />
                </FormField>
              </div>
            </div>

            <div className="space-y-2.5 p-4 sm:p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tiểu sử &amp; Giới thiệu ngắn</h4>
              <FormField label="Mô tả câu lạc bộ">
                <Textarea rows={3} className="min-h-20 py-2" value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} placeholder="Giới thiệu ngắn gọn về sứ mệnh và hoạt động của CLB…" />
              </FormField>
            </div>

            <div className="space-y-3 p-4 sm:p-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ảnh đại diện &amp; Ảnh bìa</h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <ClubMediaPickerField
                  label="Logo CLB"
                  value={logoUrl}
                  onChange={setLogoUrl}
                  kind="logo"
                  clubId={club.id}
                  clubCode={club.code}
                  onUploaded={(updated) => {
                    setLogoUrl(updated.logoUrl ?? "");
                    onNotice("Đã cập nhật logo.");
                    onError("");
                  }}
                />
                <ClubMediaPickerField
                  label="Ảnh bìa CLB"
                  value={coverUrl}
                  onChange={setCoverUrl}
                  kind="cover"
                  clubId={club.id}
                  clubCode={club.code}
                  onUploaded={(updated) => {
                    setCoverUrl(updated.coverUrl ?? "");
                    onNotice("Đã cập nhật ảnh bìa.");
                    onError("");
                  }}
                />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
