"use client";
import { AvatarField } from "@/components/user/AvatarField";
import { ProfileCertificatesCard } from "./ProfileCertificatesCard";
import { ProfileEventsCard } from "./ProfileEventsCard";
import { ProfileMembershipsCard } from "./ProfileMembershipsCard";
import { ProfilePasswordCard } from "./ProfilePasswordCard";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { GraduationCap, Mail, Phone, Save, ShieldCheck, UserRound } from "lucide-react";
import { ApiError, apiModel, type User } from "@/lib/api";
import { resolveMediaUrl } from "@/lib/media";
import { useSession } from "@/hooks/useSession";
import { Otp2FaChallengeModal } from "@/components/auth/Otp2FaChallengeModal";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { FormField, Input } from "@/components/ui/input";
import { describeError } from "@/components/shared/ListPage";

const TIER_1_TO_3_ROLE_CODES = new Set([
  "SYSTEM_ADMIN",
  "CLUB_PRESIDENT",
  "CLUB_VICE_PRESIDENT",
]);

function ProfileToggleRow({
  id,
  label,
  hint,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2.5">
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer break-words">
        <span className="block text-xs font-semibold text-foreground">{label}</span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span>
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`relative h-5.5 w-10 shrink-0 rounded-full transition-colors ${checked ? "bg-primary" : "bg-slate-300"}`}
      >
        <span
          className={`absolute left-0 top-0.5 size-4.5 rounded-full bg-white shadow-sm transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`}
        />
      </button>
    </div>
  );
}

export function ProfileView() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const user = session.user;

  const isTier1To3Admin =
    session.ready &&
    session.permissions.some((p) => !!p.roleCode && TIER_1_TO_3_ROLE_CODES.has(p.roleCode));

  const [fullNameDraft, setFullNameDraft] = useState<string | null>(null);
  const [phoneDraft, setPhoneDraft] = useState<string | null>(null);
  const [avatarUrlDraft, setAvatarUrlDraft] = useState<string | null>(null);
  const [emailNotificationsDraft, setEmailNotificationsDraft] = useState<boolean | null>(null);
  const [twoFactorDraft, setTwoFactorDraft] = useState<boolean | null>(null);
  const [disable2FaOpen, setDisable2FaOpen] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");

  const fullName = fullNameDraft ?? (user?.fullName || "");
  const phone = phoneDraft ?? (user?.phone || "");
  const avatarUrl = avatarUrlDraft ?? (user?.avatarUrl || "");
  const emailNotificationsEnabled = emailNotificationsDraft ?? (user?.emailNotificationsEnabled ?? true);
  const twoFactorEnabled = twoFactorDraft ?? (user?.twoFactorEnabled ?? false);

  const applyProfileSuccess = (updated: User) => {
    setProfileNotice("Hồ sơ cá nhân đã được lưu thành công.");
    setFullNameDraft(null);
    setPhoneDraft(null);
    setAvatarUrlDraft(null);
    setEmailNotificationsDraft(null);
    setTwoFactorDraft(null);
    queryClient.setQueryData(qk.me(), updated);
    queryClient.setQueryData(qk.optionalMe(), updated);
    queryClient.invalidateQueries({ queryKey: qk.me() });
    queryClient.invalidateQueries({ queryKey: qk.optionalMe() });
    queryClient.invalidateQueries({ queryKey: qk.myMemberships() });
  };

  const updateProfile = useMutation({
    mutationFn: () =>
      apiModel.updateProfile({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        emailNotificationsEnabled,
        ...(isTier1To3Admin && twoFactorDraft !== null ? { twoFactorEnabled } : {}),
      }),
    onSuccess: applyProfileSuccess,
    onError: (err) => {
      if (err instanceof ApiError && err.code === "TWO_FACTOR_REQUIRED") {
        setDisable2FaOpen(true);
      }
    },
  });

  const submitProfile = (event: FormEvent) => {
    event.preventDefault();
    setProfileNotice("");
    if (!fullName.trim()) return;
    if (user?.twoFactorEnabled && twoFactorDraft === false) {
      setDisable2FaOpen(true);
      return;
    }
    updateProfile.mutate();
  };

  const resolvedAvatar = resolveMediaUrl(avatarUrl || user?.avatarUrl);
  const displayName = fullName.trim() || user?.fullName || user?.email || "";

  return (
    <div className="flex min-h-full w-full min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
      <div className="w-full min-w-0 px-3 py-3 sm:px-5 sm:py-4">
        {!user ? (
          <section className="rounded-xl border border-border/60 bg-card p-6 text-center sm:p-8">
            <UserRound className="mx-auto text-primary" />
            <h2 className="mt-3 text-xl font-bold tracking-tight">Đăng nhập để xem hồ sơ</h2>
            <p className="mt-2 text-sm text-muted-foreground">Hồ sơ cá nhân dành cho thành viên VJU.</p>
            <Button className="mt-5" onClick={() => router.push("/home?auth=login")}>
              Đăng nhập
            </Button>
          </section>
        ) : (
          <div className="space-y-4">
            {/* Facebook Profile-style Hero Card: Cover Banner + Overlapping Avatar + Identity + Quick Save */}
            <section className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-2xs">
              <div className="relative h-28 w-full overflow-hidden bg-gradient-to-r from-primary via-primary/90 to-slate-900 sm:h-36">
                <div className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full bg-white/10 blur-2xl" />
                <div className="pointer-events-none absolute bottom-0 left-1/3 size-36 rounded-full bg-white/5 blur-xl" />
                <div className="absolute right-3 top-3">
                  <StatusBadge status={user.status} />
                </div>
                <span className="absolute bottom-2.5 right-3.5 hidden text-[11px] font-semibold tracking-wide text-white/75 sm:inline">
                  VJU ClubHub · Hồ sơ thành viên
                </span>
              </div>

              <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="flex min-w-0 items-center gap-3.5">
                  {resolvedAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={resolvedAvatar}
                      alt={displayName}
                      className="relative z-10 -mt-12 size-20 shrink-0 rounded-full border-4 border-card bg-card object-cover shadow-sm sm:-mt-14 sm:size-24"
                    />
                  ) : (
                    <span className="relative z-10 -mt-12 grid size-20 shrink-0 place-items-center rounded-full border-4 border-card bg-primary text-2xl font-extrabold text-primary-foreground shadow-sm sm:-mt-14 sm:size-24 sm:text-3xl">
                      {displayName.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-extrabold tracking-tight text-foreground sm:text-xl">
                      {displayName}
                    </h2>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                      {user.studentCode && <span className="font-mono font-bold text-primary">{user.studentCode}</span>}
                      <span className="truncate">{user.studentCode ? `· ${user.email}` : user.email}</span>
                      {phone.trim() && <span>· {phone.trim()}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    type="submit"
                    form="profile-edit-form"
                    size="sm"
                    className="h-8"
                    disabled={updateProfile.isPending || !fullName.trim()}
                  >
                    <Save size={13} />
                    {updateProfile.isPending ? "Đang lưu…" : "Lưu hồ sơ cá nhân"}
                  </Button>
                </div>
              </div>
            </section>

            {/* Facebook 2-Column Body: Left Intro + Clubs/Events Sidebar, Right Edit & Security Feed */}
            <div className="grid min-w-0 items-start gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className="min-w-0 space-y-4">
                <section className="rounded-xl border border-border/60 bg-card p-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Giới thiệu</h3>
                  <dl className="mt-3 space-y-2.5 text-xs">
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Mail size={14} className="shrink-0 text-primary" />
                      <span className="truncate font-medium text-foreground">{user.email}</span>
                    </div>
                    {user.studentCode && (
                      <div className="flex items-center gap-2.5 text-muted-foreground">
                        <GraduationCap size={14} className="shrink-0 text-primary" />
                        <span>Mã sinh viên:</span>
                        <strong className="font-mono font-bold text-foreground">{user.studentCode}</strong>
                      </div>
                    )}
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <Phone size={14} className="shrink-0 text-primary" />
                      <span className="font-medium text-foreground">{phone.trim() || "Chưa cập nhật số điện thoại"}</span>
                    </div>
                    <div className="flex items-center gap-2.5 text-muted-foreground">
                      <ShieldCheck size={14} className="shrink-0 text-primary" />
                      <span>
                        {twoFactorEnabled ? "Đã bật bảo mật 2 lớp (OTP)" : "Email thông báo: "}
                        {!twoFactorEnabled && (
                          <strong className="font-semibold text-foreground">
                            {emailNotificationsEnabled ? "Đang bật" : "Đang tắt"}
                          </strong>
                        )}
                      </span>
                    </div>
                  </dl>
                </section>
                <ProfileMembershipsCard />
                <ProfileEventsCard />
              </aside>

              <div className="min-w-0 space-y-4">
                <ProfileCertificatesCard />

                <form
                  id="profile-edit-form"
                  onSubmit={submitProfile}
                  className="divide-y divide-border/50 rounded-xl border border-border/60 bg-card"
                >
                  <div className="space-y-3 p-4 sm:p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Thông tin cơ bản</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label="Họ và tên" required>
                        <Input
                          maxLength={200}
                          value={fullName}
                          onChange={(e) => setFullNameDraft(e.target.value)}
                          placeholder="Nhập họ và tên"
                        />
                      </FormField>
                      <FormField label="Số điện thoại">
                        <Input
                          type="tel"
                          maxLength={32}
                          value={phone}
                          onChange={(e) => setPhoneDraft(e.target.value)}
                          placeholder="0901234567"
                        />
                      </FormField>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <FormField label="Email tài khoản">
                        <Input value={user.email} disabled />
                      </FormField>
                      <FormField label="Mã sinh viên">
                        <Input value={user.studentCode || "—"} disabled />
                      </FormField>
                    </div>
                  </div>

                  <div className="space-y-2.5 p-4 sm:p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ảnh đại diện</h3>
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
                  </div>

                  <div className="space-y-3 p-4 sm:p-5">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Thông báo &amp; Bảo mật tài khoản
                    </h3>
                    <div className="grid min-w-0 gap-2">
                      <ProfileToggleRow
                        id="email-notifications-toggle"
                        label="Nhận thông báo qua Email"
                        hint="Thông báo sự kiện, đơn ứng tuyển và tin từ CLB."
                        checked={emailNotificationsEnabled}
                        onToggle={() => setEmailNotificationsDraft(!emailNotificationsEnabled)}
                      />
                      {isTier1To3Admin && (
                        <ProfileToggleRow
                          id="two-factor-otp-toggle"
                          label="Xác thực 2 bước qua Email (OTP)"
                          hint="Yêu cầu OTP email khi đăng nhập hoặc thao tác trọng yếu."
                          checked={twoFactorEnabled}
                          onToggle={() => setTwoFactorDraft(!twoFactorEnabled)}
                        />
                      )}
                    </div>
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
                  </div>
                </form>

                <ProfilePasswordCard />
              </div>
            </div>
          </div>
        )}
      </div>
      <Otp2FaChallengeModal
        open={disable2FaOpen}
        onClose={() => setDisable2FaOpen(false)}
        purpose="CRITICAL_ACTION"
        actionContext="DISABLE_2FA"
        email={user?.email}
        title="Xác thực tắt bảo mật 2 lớp (2FA)"
        description="Vui lòng nhập mã OTP 6 số được gửi tới email của bạn để xác nhận tắt xác thực 2 bước."
        onSubmitOtp={async (otpCode) => {
          const disabledUser = await apiModel.setMyTwoFactor(false, otpCode);
          const updated = await apiModel.updateProfile({
            fullName: fullName.trim() || disabledUser.fullName,
            phone: phone.trim() || undefined,
            avatarUrl: avatarUrl.trim() || undefined,
            emailNotificationsEnabled,
          });
          applyProfileSuccess(updated);
        }}
      />
    </div>
  );
}
