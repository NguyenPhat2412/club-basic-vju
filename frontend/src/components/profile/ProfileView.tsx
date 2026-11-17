"use client";
import { AvatarField } from "@/components/user/AvatarField";
import { ProfileMembershipsCard } from "./ProfileMembershipsCard";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { LockKeyhole, Save, UserRound } from "lucide-react";
import { apiModel } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { FormField, Input, PasswordInput } from "@/components/ui/input";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DetailList } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";

export function ProfileView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const user = session.user;

  const [fullNameDraft, setFullNameDraft] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [avatarUrlDraft, setAvatarUrlDraft] = useState<string | null>(null);
  const [profileNotice, setProfileNotice] = useState("");

  const fullName = fullNameDraft ?? (user?.fullName || "");
  const phone = phoneDraft ?? (user?.phone || "");
  const avatarUrl = avatarUrlDraft ?? (user?.avatarUrl || "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");

  const updateProfile = useMutation({
    mutationFn: () =>
      apiModel.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      }),
    onSuccess: (updated) => {
      setProfileNotice("Hồ sơ cá nhân đã được lưu thành công.");
      setFullNameDraft(null);
      setPhoneDraft(null);
      setAvatarUrlDraft(null);
      queryClient.setQueryData(qk.me(), updated);
      queryClient.invalidateQueries({ queryKey: qk.me() });
    },
  });

  const submitProfile = (event: FormEvent) => {
    event.preventDefault();
    setProfileNotice("");
    if (fullName.trim()) {
      updateProfile.mutate();
    }
  };

  const change = useMutation({
    mutationFn: () => apiModel.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setNotice("Mật khẩu đã được thay đổi thành công.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      queryClient.invalidateQueries({ queryKey: qk.me() });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setNotice("");
    if (newPassword === confirmPassword) change.mutate();
  };

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <BreadcrumbToolbar
        crumbs={[
          { label: "Tổng quan", href: "/dashboard" },
          { label: "Cổng cá nhân" },
          { label: "Hồ sơ cá nhân" },
        ]}
        onRefresh={() => {
          queryClient.invalidateQueries({ queryKey: qk.me() });
          queryClient.invalidateQueries({ queryKey: qk.myMemberships() });
        }}
      />
      <div className="mx-auto w-full max-w-[1220px] px-3.5 py-4 sm:px-6 sm:py-6">
        {!user ? (
          <section className="rounded-xl border border-border bg-card p-8 text-center">
            <UserRound className="mx-auto text-primary" />
            <h2 className="mt-3 text-xl font-bold tracking-tight">Đăng nhập để xem hồ sơ</h2>
            <p className="mt-2 text-sm text-muted-foreground">Hồ sơ cá nhân dành cho thành viên VJU.</p>
            <Button className="mt-5" onClick={() => router.push("/home?auth=login")}>
              Đăng nhập
            </Button>
          </section>
        ) : (
          <div className="grid items-start gap-4 @4xl:grid-cols-[minmax(0,1.04fr)_minmax(0,1fr)] @4xl:gap-6">
            <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5 @4xl:p-6">
              <div className="flex items-center gap-3.5 border-b border-border pb-4 sm:gap-4 sm:pb-5">
                {resolveMediaUrl(user.avatarUrl) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={resolveMediaUrl(user.avatarUrl)!}
                    alt={user.fullName || user.email}
                    className="size-12 shrink-0 rounded-full border border-border object-cover sm:size-14"
                  />
                ) : (
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary text-lg font-bold text-primary-foreground sm:size-14 sm:text-xl">
                    {(user.fullName || user.email).slice(0, 1).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">THÀNH VIÊN VJU (PB-03)</p>
                  <h2 className="mt-1 truncate text-lg font-bold tracking-tight sm:text-xl">{user.fullName || user.email}</h2>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <StatusBadge status={user.status} />
                {user.studentCode && <Badge tone="primary">{user.studentCode}</Badge>}
                {user.phone && <Badge>{user.phone}</Badge>}
              </div>
              <div className="mt-5">
                <DetailList
                  rows={[
                    ["Email định danh", <span key="email" className="break-all">{user.email}</span>],
                    ["Mã sinh viên", user.studentCode || "—"],
                    ["Trạng thái", <StatusBadge key="status" status={user.status} />],
                  ]}
                />
              </div>

              <form onSubmit={submitProfile} className="mt-6 grid gap-4 border-t border-border pt-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">CẬP NHẬT HỒ SƠ</p>
                  <h3 className="mt-0.5 text-base font-bold tracking-tight">Thông tin liên hệ & hiển thị</h3>
                </div>
                <FormField label="Họ và tên" required>
                  <Input
                    maxLength={200}
                    value={fullName}
                    onChange={(e) => setFullNameDraft(e.target.value)}
                    placeholder="Nhập họ và tên đầy đủ"
                  />
                </FormField>
                <FormField label="Số điện thoại" hint="Chỉ gồm chữ số, dấu +, dấu gạch ngang hoặc khoảng trắng.">
                  <Input
                    type="tel"
                    maxLength={32}
                    value={phone}
                    onChange={(e) => setPhoneDraft(e.target.value)}
                    placeholder="0901234567"
                  />
                </FormField>
                <AvatarField
                  value={avatarUrl}
                  onChange={setAvatarUrlDraft}
                  fallbackName={user.fullName || user.email}
                  upload={apiModel.uploadMyAvatar}
                  onUploaded={(updated) => {
                    setAvatarUrlDraft(null);
                    queryClient.setQueryData(qk.me(), updated);
                    queryClient.invalidateQueries({ queryKey: qk.me() });
                    queryClient.invalidateQueries({ queryKey: qk.optionalMe() });
                    setProfileNotice("Đã cập nhật ảnh đại diện.");
                  }}
                />
                {profileNotice && (
                  <p
                    role="status"
                    className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-medium text-slate-900"
                  >
                    {profileNotice}
                  </p>
                )}
                {updateProfile.error && (
                  <p role="alert" className="text-xs text-destructive">
                    {describeError(updateProfile.error)}
                  </p>
                )}
                <div className="flex justify-end">
                  <Button type="submit" className="w-full sm:w-auto" disabled={updateProfile.isPending || !fullName.trim()}>
                    <Save size={15} />
                    {updateProfile.isPending ? "Đang lưu…" : "Lưu hồ sơ cá nhân"}
                  </Button>
                </div>
              </form>
            </section>

            <div className="flex min-w-0 flex-col gap-4 @4xl:gap-6">
              <ProfileMembershipsCard />

              <section className="min-w-0 overflow-hidden rounded-xl border border-border bg-card p-4 sm:p-5 @4xl:p-6">
                <div className="flex items-center gap-3 border-b border-border pb-4 sm:pb-5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-primary/5 text-primary">
                    <LockKeyhole size={17} />
                  </span>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-primary">BẢO MẬT</p>
                    <h2 className="mt-1 text-lg font-bold tracking-tight sm:text-xl">Đổi mật khẩu</h2>
                  </div>
                </div>
                <form onSubmit={submit} className="mt-5 grid gap-4">
                  <FormField label="Mật khẩu hiện tại" required>
                    <PasswordInput
                      autoComplete="current-password"
                      maxLength={128}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Mật khẩu mới" required hint="Nên dùng ít nhất 8 ký tự.">
                    <PasswordInput
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </FormField>
                  <FormField label="Nhập lại mật khẩu mới" required>
                    <PasswordInput
                      autoComplete="new-password"
                      minLength={8}
                      maxLength={72}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                  </FormField>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">Mật khẩu mới chưa khớp.</p>
                  )}
                  {notice && (
                    <p
                      role="status"
                      className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs font-medium text-slate-900"
                    >
                      {notice}
                    </p>
                  )}
                  {change.error && (
                    <p role="alert" className="text-xs text-destructive">
                      {describeError(change.error)}
                    </p>
                  )}
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      className="w-full sm:w-auto"
                      disabled={change.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword}
                    >
                      {change.isPending ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
                    </Button>
                  </div>
                </form>
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
