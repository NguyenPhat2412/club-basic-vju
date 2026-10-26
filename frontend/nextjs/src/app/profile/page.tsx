"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, UserRound } from "lucide-react";
import { apiModel } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { FormField, Input } from "@/components/ui/input";
import { BreadcrumbToolbar } from "@/components/shared/BreadcrumbToolbar";
import { DetailList } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const change = useMutation({
    mutationFn: () => apiModel.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setNotice("Mật khẩu đã được thay đổi thành công.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setNotice("");
    if (newPassword === confirmPassword) change.mutate();
  };
  const user = session.user;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background">
      <BreadcrumbToolbar
        crumbs={[
          { label: "Tổng quan", href: "/dashboard" },
          { label: "Cổng cá nhân" },
          { label: "Hồ sơ cá nhân" },
        ]}
      />
      <div className="mx-auto w-full max-w-[1180px] px-5 py-8 sm:px-8">
        {!user ? (
          <section className="rounded-xl border border-border bg-card p-8 text-center">
            <UserRound className="mx-auto text-primary" />
            <h2 className="mt-3 text-xl font-bold tracking-tight">Đăng nhập để xem hồ sơ</h2>
            <p className="mt-2 text-sm text-muted-foreground">Hồ sơ cá nhân dành cho thành viên VJU.</p>
            <Button className="mt-5" onClick={() => router.push("/login")}>
              Đăng nhập
            </Button>
          </section>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
            <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
              <div className="flex items-center gap-4 border-b border-border pb-5">
                <span className="grid size-14 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground">
                  {(user.fullName || user.email).slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">THÀNH VIÊN VJU</p>
                  <h2 className="mt-1 truncate text-xl font-bold tracking-tight">{user.fullName || user.email}</h2>
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
                    ["Email", <span key="email">{user.email}</span>],
                    ["Họ và tên", user.fullName || "—"],
                    ["Mã sinh viên", user.studentCode || "—"],
                    ["Điện thoại", user.phone || "—"],
                    ["Trạng thái", <StatusBadge key="status" status={user.status} />],
                  ]}
                />
              </div>
            </section>

            <section className="rounded-xl border border-border bg-card p-5 sm:p-7">
              <div className="flex items-center gap-3 border-b border-border pb-5">
                <span className="grid size-10 place-items-center rounded-lg border border-border bg-primary/5 text-primary">
                  <LockKeyhole size={17} />
                </span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">BẢO MẬT</p>
                  <h2 className="mt-1 text-xl font-bold tracking-tight">Đổi mật khẩu</h2>
                </div>
              </div>
              <form onSubmit={submit} className="mt-5 grid gap-4">
                <FormField label="Mật khẩu hiện tại" required>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </FormField>
                <FormField label="Mật khẩu mới" required hint="Nên dùng ít nhất 8 ký tự.">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </FormField>
                <FormField label="Nhập lại mật khẩu mới" required>
                  <Input
                    type="password"
                    autoComplete="new-password"
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
                    className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-700 dark:text-green-300"
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
                    disabled={change.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword}
                  >
                    {change.isPending ? "Đang cập nhật…" : "Cập nhật mật khẩu"}
                  </Button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
