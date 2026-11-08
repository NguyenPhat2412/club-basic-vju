"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bell, Building2, Lock, LockOpen, Save, Send } from "lucide-react";
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
  const mediaCatalog = useClubMediaCatalog(true);
  const clubMedia = mediaCatalog.data?.clubs[clubSlugFromCode(club.code)];

  const [name, setName] = useState(club.name);
  const [activityField, setActivityField] = useState(club.activityField ?? "");
  const [contactEmail, setContactEmail] = useState(club.contactEmail ?? "");
  const [logoUrl, setLogoUrl] = useState(club.logoUrl ?? "");
  const [coverUrl, setCoverUrl] = useState(club.coverUrl ?? "");
  const [description, setDescription] = useState(club.description ?? "");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifDeptId, setNotifDeptId] = useState("");

  const canUpdateClub = session.canInClub("club.update", club.id);
  const canActivateClub = club.status !== "ACTIVE" && session.canInClub("club.active", club.id);
  const canDeactivateClub = club.status === "ACTIVE" && session.canInClub("club.inactive", club.id);
  const canSendNotif = session.canInClub("notification.send", club.id);
  const notifScope = session.departmentsWith(["notification.send"], club.id);
  const allowedNotifDepts = departments.filter((d) => notifScope.all || notifScope.ids.has(d.id));

  const refreshClubs = () => {
    queryClient.invalidateQueries({ queryKey: ["clubs"] });
    queryClient.invalidateQueries({ queryKey: ["home", "public-clubs"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard", "public-clubs"] });
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
      onNotice(`Đã cập nhật thông tin & hình ảnh câu lạc bộ "${updated.name}".`);
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
    <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {(canUpdateClub || canActivateClub || canDeactivateClub) && (
        <section className="min-w-0 space-y-4 rounded-xl border border-border/60 bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-primary" />
              <h3 className="text-sm font-bold">Thông tin, Hình ảnh & Trạng thái CLB</h3>
            </div>
            <StatusBadge status={club.status} />
          </div>

          <div className="overflow-hidden rounded-xl border border-border/70">
            <ClubCoverBanner
              name={name || club.name}
              code={club.code}
              coverUrl={coverUrl || club.coverUrl}
              fallbackUrl={clubMedia?.cover}
              className="h-36 w-full"
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
                  <p className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-white/85">
                    {club.code}
                  </p>
                  <p className="truncate text-sm font-extrabold">{name || club.name}</p>
                </div>
              </div>
            </ClubCoverBanner>
          </div>

          {canUpdateClub && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Mã câu lạc bộ">
                  <Input value={club.code} disabled />
                </FormField>
                <FormField label="Tên câu lạc bộ" required>
                  <Input value={name} maxLength={200} onChange={(e) => setName(e.target.value)} />
                </FormField>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Lĩnh vực hoạt động">
                  <Input
                    value={activityField}
                    maxLength={200}
                    onChange={(e) => setActivityField(e.target.value)}
                    placeholder="Học thuật, Văn hóa, Thể thao…"
                  />
                </FormField>
                <FormField label="Email liên hệ">
                  <Input
                    type="email"
                    value={contactEmail}
                    maxLength={320}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="clb@vju.ac.vn"
                  />
                </FormField>
              </div>

              <ClubMediaPickerField
                label="Logo câu lạc bộ (Tải ảnh lên Cloudflare R2 & lưu Database)"
                value={logoUrl}
                onChange={setLogoUrl}
                kind="logo"
                clubId={club.id}
                clubCode={club.code}
                onUploaded={(updated) => {
                  setLogoUrl(updated.logoUrl ?? "");
                  onNotice("Đã cập nhật Logo CLB (lưu ảnh trên Cloudflare R2 & dữ liệu trong PostgreSQL Database).");
                  onError("");
                }}
              />

              <ClubMediaPickerField
                label="Ảnh bìa câu lạc bộ (Tải ảnh lên Cloudflare R2 & lưu Database)"
                value={coverUrl}
                onChange={setCoverUrl}
                kind="cover"
                clubId={club.id}
                clubCode={club.code}
                onUploaded={(updated) => {
                  setCoverUrl(updated.coverUrl ?? "");
                  onNotice("Đã cập nhật Ảnh bìa CLB (lưu ảnh trên Cloudflare R2 & dữ liệu trong PostgreSQL Database).");
                  onError("");
                }}
              />

              <FormField label="Giới thiệu câu lạc bộ">
                <Textarea value={description} maxLength={2000} onChange={(e) => setDescription(e.target.value)} />
              </FormField>
              <div className="flex justify-end">
                <Button size="sm" disabled={!name.trim() || saveClub.isPending} onClick={() => saveClub.mutate()}>
                  <Save size={14} /> {saveClub.isPending ? "Đang lưu…" : "Lưu hồ sơ CLB"}
                </Button>
              </div>
            </div>
          )}

          {(canActivateClub || canDeactivateClub) && (
            <div className="flex items-center justify-between gap-3 border-t border-border/60 pt-3">
              <p className="text-xs text-muted-foreground">
                {club.status === "ACTIVE"
                  ? "Tạm ngừng hoạt động sẽ đóng nhận đơn đăng ký mới vào CLB."
                  : "Kích hoạt lại để mở hoạt động và nhận đơn đăng ký."}
              </p>
              {canActivateClub && (
                <Button size="sm" disabled={changeStatus.isPending} onClick={() => changeStatus.mutate("ACTIVE")}>
                  <LockOpen size={14} /> Kích hoạt CLB
                </Button>
              )}
              {canDeactivateClub && (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={changeStatus.isPending}
                  onClick={() => confirm(`Ngừng hoạt động câu lạc bộ ${club.name}?`) && changeStatus.mutate("INACTIVE")}
                >
                  <Lock size={14} /> Ngừng hoạt động CLB
                </Button>
              )}
            </div>
          )}
        </section>
      )}

      {canSendNotif && (
        <section className="min-w-0 space-y-4 rounded-xl border border-border/60 bg-card p-4 sm:p-5">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Bell size={18} className="text-primary" />
            <h3 className="text-sm font-bold">Gửi thông báo hàng loạt (Broadcast)</h3>
          </div>
          <FormField label="Đối tượng nhận thông báo">
            <Select value={notifDeptId} onChange={(e) => setNotifDeptId(e.target.value)}>
              {notifScope.all && <option value="">Toàn bộ thành viên CLB ({club.name})</option>}
              {allowedNotifDepts.map((d) => (
                <option key={d.id} value={d.id}>
                  Ban: {d.name}
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Tiêu đề thông báo" required>
            <Input
              value={notifTitle}
              maxLength={160}
              onChange={(e) => setNotifTitle(e.target.value)}
              placeholder="Ví dụ: Thông báo lịch họp định kỳ tuần này…"
            />
          </FormField>
          <FormField label="Nội dung thông báo" required>
            <Textarea
              value={notifMessage}
              maxLength={2000}
              onChange={(e) => setNotifMessage(e.target.value)}
              placeholder="Nhập nội dung thông báo gửi tới các thành viên…"
            />
          </FormField>
          <div className="flex justify-end">
            <Button
              size="sm"
              disabled={!notifTitle.trim() || !notifMessage.trim() || broadcast.isPending}
              onClick={() => broadcast.mutate()}
            >
              <Send size={14} /> {broadcast.isPending ? "Đang gửi…" : "Phát thông báo"}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
