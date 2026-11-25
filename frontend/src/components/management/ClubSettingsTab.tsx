"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { Bell, BookOpen, Building2, Compass, ExternalLink, LayoutTemplate, Lock, LockOpen, Mail, Save, Send, Share2 } from "lucide-react";
import { apiModel, Club, Department } from "@/lib/api";
import { clubSlugFromCode, toApiMediaUrl } from "@/lib/media";
import { useSession } from "@/hooks/useSession";
import { ClubAvatar, ClubCoverBanner, ClubMediaPickerField, useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { describeError } from "@/components/shared/ListPage";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { ClubOverviewCustomizer } from "@/components/management/ClubOverviewCustomizer";
import { ClubFacebookSettingsCard } from "@/components/management/ClubFacebookSettingsCard";
import { ClubOnboardingGuideCard } from "@/components/management/ClubOnboardingGuideCard";
import { ClubUsageQuotaCard } from "@/components/management/ClubUsageQuotaCard";
import { cn } from "@/lib/utils";

type SettingsSectionKey = "profile" | "facebook" | "appearance" | "broadcast" | "guide";

export function ClubSettingsTab({
  club,
  departments,
  onNotice,
  onError,
}: {
  club: Club;
  departments: Department[];
  onNotice: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const session = useSession();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const mediaCatalog = useClubMediaCatalog(true);
  const clubMedia = mediaCatalog.data?.clubs[clubSlugFromCode(club.code)];

  const canUpdateClub = session.canInClub("club.update", club.id);
  const canManageFacebook = session.canInClub("club.facebook.manage", club.id) || canUpdateClub;
  const canActivateClub = club.status !== "ACTIVE" && session.canInClub("club.active", club.id);
  const canDeactivateClub = club.status === "ACTIVE" && session.canInClub("club.inactive", club.id);
  const canEditProfile = canUpdateClub || canActivateClub || canDeactivateClub;
  const canSendNotif = session.canInClub("notification.send", club.id);
  const notifScope = session.departmentsWith(["notification.send"], club.id);
  const allowedNotifDepts = departments.filter((d) => notifScope.all || notifScope.ids.has(d.id));

  const sections: { key: SettingsSectionKey; label: string; icon: React.ReactNode }[] = [
    ...(canEditProfile ? [{ key: "profile" as const, label: "Hồ sơ CLB", icon: <Building2 size={14} /> }] : []),
    ...(canManageFacebook ? [{ key: "facebook" as const, label: "Fanpage Facebook", icon: <Share2 size={14} /> }] : []),
    ...(canUpdateClub ? [{ key: "appearance" as const, label: "Trang giới thiệu", icon: <LayoutTemplate size={14} /> }] : []),
    ...(canSendNotif ? [{ key: "broadcast" as const, label: "Phát thông báo", icon: <Bell size={14} /> }] : []),
    { key: "guide" as const, label: "Hướng dẫn CLB mới", icon: <BookOpen size={14} /> },
  ];

  const urlSection = searchParams.get("section") as SettingsSectionKey | null;
  const hasFbReturn = Boolean(searchParams.get("fbSelect") || searchParams.get("fbError"));
  const initialSection: SettingsSectionKey =
    hasFbReturn && canManageFacebook
      ? "facebook"
      : urlSection && sections.some((s) => s.key === urlSection)
        ? urlSection
        : (sections[0]?.key ?? "profile");

  const [section, setSection] = useState<SettingsSectionKey>(initialSection);
  const activeSection: SettingsSectionKey = sections.some((s) => s.key === section)
    ? section
    : (sections[0]?.key ?? "profile");

  const [name, setName] = useState(club.name);
  const [activityField, setActivityField] = useState(club.activityField ?? "");
  const [contactEmail, setContactEmail] = useState(club.contactEmail ?? "");
  const [logoUrl, setLogoUrl] = useState(club.logoUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(club.coverUrl ?? "");
  const [description, setDescription] = useState(club.description ?? "");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifDeptId, setNotifDeptId] = useState("");

  const refreshClubs = () => {
    queryClient.invalidateQueries({ queryKey: qk.clubs() });
    queryClient.invalidateQueries({ queryKey: qk.home("public-clubs") });
    queryClient.invalidateQueries({ queryKey: qk.dashboard("public-clubs") });
  };

  const saveClub = useMutation({
    mutationFn: () =>
      apiModel.updateClub(club.id, {
        name: name.trim(),
        activityField: activityField.trim(),
        contactEmail: contactEmail.trim() || undefined,
        logoUrl: toApiMediaUrl(logoUrl),
        coverUrl: toApiMediaUrl(coverUrl),
        description: description.trim(),
      }),
    onSuccess: (updated) => {
      onNotice(`Đã lưu hồ sơ câu lạc bộ "${updated.name}".`);
      onError("");
      refreshClubs();
    },
    onError: (e) => onError(describeError(e)),
  });

  const changeStatus = useMutation({
    mutationFn: (status: "ACTIVE" | "INACTIVE") => apiModel.updateClubStatus(club.id, status),
    onSuccess: (updated) => {
      onNotice(
        updated.status === "ACTIVE"
          ? `Đã kích hoạt lại câu lạc bộ "${updated.name}".`
          : `Đã ngừng hoạt động câu lạc bộ "${updated.name}".`
      );
      onError("");
      refreshClubs();
    },
    onError: (e) => onError(describeError(e)),
  });

  const broadcast = useMutation({
    mutationFn: () =>
      apiModel.broadcastNotification(club.id, {
        title: notifTitle.trim(),
        message: notifMessage.trim(),
        departmentId: notifDeptId || (!notifScope.all && allowedNotifDepts[0]?.id) || undefined,
      }),
    onSuccess: (res) => {
      onNotice(`Đã gửi thông báo tới ${res.recipientCount} thành viên.`);
      onError("");
      setNotifTitle("");
      setNotifMessage("");
    },
    onError: (e) => onError(describeError(e)),
  });

  return (
    <div className="flex flex-1 flex-col">
      {/* Single-row header: Club settings title on left, sub-tabs aligned right */}
      <div className="relative z-30 flex min-h-10 shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border bg-white px-3 py-1.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-3.5 w-1 shrink-0 rounded-full bg-primary" />
          <span className="truncate text-[13px] font-bold text-slate-900">Cài đặt CLB</span>
          <Badge tone="primary" dot={false}>{club.code}</Badge>
        </div>
        {sections.length > 1 && (
          <div className="flex flex-wrap items-center gap-1" role="tablist" aria-label="Phân mục cài đặt CLB">
            {sections.map((item) => {
              const active = item.key === activeSection;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSection(item.key)}
                  className={cn(
                    "inline-flex h-7.5 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold transition-colors",
                    active
                      ? "bg-primary/10 text-primary ring-1 ring-inset ring-primary/25"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="w-full flex-1 px-3 py-3 sm:px-5 sm:py-4">
        {activeSection === "profile" && canEditProfile && (
          <div className="space-y-4">
            {/* Facebook Page-style Hero Card: Full cover banner + overlapping avatar + identity + action bar */}
            <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xs">
              <ClubCoverBanner
                name={name || club.name}
                code={club.code}
                coverUrl={coverUrl || club.coverUrl}
                fallbackUrl={clubMedia?.cover}
                className="h-36 w-full sm:h-44"
              >
                <div className="absolute right-3 top-3">
                  <StatusBadge status={club.status} />
                </div>
              </ClubCoverBanner>

              <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 items-center gap-3.5">
                  <ClubAvatar
                    name={name || club.name}
                    code={club.code}
                    logoUrl={logoUrl || club.logoUrl}
                    fallbackUrl={clubMedia?.logo}
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
                      {contactEmail && <span className="truncate">· {contactEmail}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Link
                    href={`/clubs/${club.id}`}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    <ExternalLink size={13} /> Xem trang công khai
                  </Link>
                  {canActivateClub && (
                    <Button size="sm" variant="outline" className="h-8" disabled={changeStatus.isPending} onClick={() => changeStatus.mutate("ACTIVE")}>
                      <LockOpen size={13} /> Kích hoạt lại
                    </Button>
                  )}
                  {canDeactivateClub && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 text-destructive hover:border-destructive/40"
                      disabled={changeStatus.isPending}
                      onClick={() => confirm(`Ngừng hoạt động câu lạc bộ ${club.name}?`) && changeStatus.mutate("INACTIVE")}
                    >
                      <Lock size={13} /> Ngừng hoạt động
                    </Button>
                  )}
                  {canUpdateClub && (
                    <Button size="sm" className="h-8" disabled={!name.trim() || saveClub.isPending} onClick={() => saveClub.mutate()}>
                      <Save size={13} /> {saveClub.isPending ? "Đang lưu…" : "Lưu thay đổi"}
                    </Button>
                  )}
                </div>
              </div>
            </section>

            {/* Facebook Page-style 2-Column Body: Left Intro Sidebar + Right Edit Feed */}
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
                        <Input value={club.code} disabled />
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
        )}

        {activeSection === "facebook" && canManageFacebook && (
          <ClubFacebookSettingsCard
            key={`facebook-${club.id}`}
            club={club}
            onNotice={onNotice}
            onError={onError}
          />
        )}

        {activeSection === "appearance" && canUpdateClub && (
          <ClubOverviewCustomizer
            key={`customizer-${club.id}`}
            club={club}
            onSaved={refreshClubs}
            onNotice={onNotice}
            onError={onError}
          />
        )}

        {activeSection === "broadcast" && canSendNotif && (
          <section className="space-y-4 rounded-xl border border-border/60 bg-card p-4 sm:p-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Bell size={16} className="text-primary" />
              <h3 className="text-sm font-bold text-foreground">Phát thông báo tới thành viên</h3>
            </div>
            <FormField label="Người nhận" required>
              <Select value={notifDeptId} onChange={(e) => setNotifDeptId(e.target.value)}>
                {notifScope.all && <option value="">Toàn bộ thành viên CLB ({club.name})</option>}
                {allowedNotifDepts.map((d) => (
                  <option key={d.id} value={d.id}>Ban: {d.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Tiêu đề" required>
              <Input value={notifTitle} maxLength={160} onChange={(e) => setNotifTitle(e.target.value)} placeholder="VD: Lịch sinh hoạt tuần này…" />
            </FormField>
            <FormField label="Nội dung" required>
              <Textarea rows={4} value={notifMessage} maxLength={2000} onChange={(e) => setNotifMessage(e.target.value)} placeholder="Nhập nội dung thông báo…" />
            </FormField>
            <div className="flex justify-end">
              <Button size="sm" disabled={!notifTitle.trim() || !notifMessage.trim() || broadcast.isPending} onClick={() => broadcast.mutate()}>
                <Send size={14} /> {broadcast.isPending ? "Đang gửi…" : "Gửi thông báo"}
              </Button>
            </div>
          </section>
        )}
        {activeSection === "guide" && (
          <ClubOnboardingGuideCard
            club={club}
            departments={departments}
            onSelectSection={(next) => setSection(next)}
          />
        )}
      </div>
    </div>
  );
}
