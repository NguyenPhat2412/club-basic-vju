"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import {
  Bell,
  Building2,
  LayoutTemplate,
  Lock,
  LockOpen,
  Save,
  Send,
  Share2,
} from "lucide-react";
import { apiModel, Club, Department } from "@/lib/api";
import { clubSlugFromCode, toApiMediaUrl } from "@/lib/media";
import { useSession } from "@/hooks/useSession";
import {
  ClubAvatar,
  ClubCoverBanner,
  ClubMediaPickerField,
  useClubMediaCatalog,
} from "@/components/shared/ClubMedia";
import { describeError } from "@/components/shared/ListPage";
import { StatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField, Input, Select, Textarea } from "@/components/ui/input";
import { ClubOverviewCustomizer } from "@/components/management/ClubOverviewCustomizer";
import { ClubFacebookSettingsCard } from "@/components/management/ClubFacebookSettingsCard";
import { cn } from "@/lib/utils";

type SettingsSectionKey = "profile" | "facebook" | "appearance" | "broadcast";

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
  const canActivateClub = club.status !== "ACTIVE" && session.canInClub("club.active", club.id);
  const canDeactivateClub = club.status === "ACTIVE" && session.canInClub("club.inactive", club.id);
  const canEditProfile = canUpdateClub || canActivateClub || canDeactivateClub;
  const canSendNotif = session.canInClub("notification.send", club.id);
  const notifScope = session.departmentsWith(["notification.send"], club.id);
  const allowedNotifDepts = departments.filter((d) => notifScope.all || notifScope.ids.has(d.id));

  const sections: { key: SettingsSectionKey; label: string; icon: React.ReactNode }[] = [
    ...(canEditProfile ? [{ key: "profile" as const, label: "Hồ sơ CLB", icon: <Building2 size={14} /> }] : []),
    ...(canUpdateClub ? [{ key: "facebook" as const, label: "Fanpage Facebook", icon: <Share2 size={14} /> }] : []),
    ...(canUpdateClub ? [{ key: "appearance" as const, label: "Trang giới thiệu", icon: <LayoutTemplate size={14} /> }] : []),
    ...(canSendNotif ? [{ key: "broadcast" as const, label: "Phát thông báo", icon: <Bell size={14} /> }] : []),
  ];

  const urlSection = searchParams.get("section") as SettingsSectionKey | null;
  const hasFbReturn = Boolean(searchParams.get("fbSelect") || searchParams.get("fbError"));
  const initialSection: SettingsSectionKey =
    hasFbReturn && canUpdateClub
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
      {/* Compact sub-navigation so each setting area stays focused and clutter-free */}
      {sections.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-border/70 bg-card px-4 py-2 sm:px-6" role="tablist" aria-label="Phân mục cài đặt CLB">
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
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors",
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

      <div className="mx-auto w-full max-w-4xl flex-1 p-4 sm:p-6">
        {activeSection === "profile" && canEditProfile && (
          <section className="space-y-4 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-primary" />
                <h3 className="text-sm font-bold text-foreground">Hồ sơ &amp; Trạng thái CLB</h3>
              </div>
              <StatusBadge status={club.status} />
            </div>

            <div className="overflow-hidden rounded-xl border border-border/70">
              <ClubCoverBanner
                name={name || club.name}
                code={club.code}
                coverUrl={coverUrl || club.coverUrl}
                fallbackUrl={clubMedia?.cover}
                className="h-32 w-full"
              >
                <div className="absolute bottom-3 left-3.5 right-3.5 flex items-end gap-3">
                  <ClubAvatar
                    name={name || club.name}
                    code={club.code}
                    logoUrl={logoUrl || club.logoUrl}
                    fallbackUrl={clubMedia?.logo}
                    size="lg"
                  />
                  <div className="min-w-0 text-white drop-shadow-xs">
                    <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-white/85">{club.code}</p>
                    <p className="truncate text-sm font-extrabold">{name || club.name}</p>
                  </div>
                </div>
              </ClubCoverBanner>
            </div>

            {canUpdateClub && (
              <div className="space-y-3.5">
                <div className="grid gap-3 sm:grid-cols-3">
                  <FormField label="Mã CLB">
                    <Input value={club.code} disabled />
                  </FormField>
                  <div className="sm:col-span-2">
                    <FormField label="Tên câu lạc bộ" required>
                      <Input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
                    </FormField>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField label="Lĩnh vực">
                    <Input value={activityField} maxLength={200} onChange={(e) => setActivityField(e.target.value)} placeholder="Học thuật, Văn hoá, Nghệ thuật…" />
                  </FormField>
                  <FormField label="Email liên hệ">
                    <Input type="email" value={contactEmail} maxLength={320} onChange={(e) => setContactEmail(e.target.value)} placeholder="clb@vju.ac.vn" />
                  </FormField>
                </div>

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

                <FormField label="Giới thiệu ngắn">
                  <Textarea rows={3} value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
                </FormField>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                  <div>
                    {canActivateClub && (
                      <Button size="sm" variant="outline" disabled={changeStatus.isPending} onClick={() => changeStatus.mutate("ACTIVE")}>
                        <LockOpen size={14} /> Kích hoạt lại
                      </Button>
                    )}
                    {canDeactivateClub && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:border-destructive/40"
                        disabled={changeStatus.isPending}
                        onClick={() => confirm(`Ngừng hoạt động câu lạc bộ ${club.name}?`) && changeStatus.mutate("INACTIVE")}
                      >
                        <Lock size={14} /> Ngừng hoạt động
                      </Button>
                    )}
                  </div>
                  <Button size="sm" disabled={!name.trim() || saveClub.isPending} onClick={() => saveClub.mutate()}>
                    <Save size={14} /> {saveClub.isPending ? "Đang lưu…" : "Lưu thay đổi"}
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeSection === "facebook" && canUpdateClub && (
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
          <section className="mx-auto max-w-2xl space-y-4 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
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
      </div>
    </div>
  );
}
