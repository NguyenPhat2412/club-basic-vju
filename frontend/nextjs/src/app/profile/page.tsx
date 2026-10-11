"use client";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LockKeyhole, UserRound } from "lucide-react";
import { apiModel } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { useThemePreference } from "@/hooks/useThemePreference";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { FormField, Input } from "@/components/ui/input";
import { DetailList } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  useThemePreference();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");

  const change = useMutation({
    mutationFn: () => apiModel.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      setNotice("Đã đổi mật khẩu thành công. Các phiên đăng nhập khác của bạn sẽ bị đăng xuất.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setNotice("");
    if (newPassword !== confirmPassword) return;
    change.mutate();
  };

  const user = session.user;

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,rgba(11,46,111,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(200,16,46,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,250,250,1))] px-4 py-10 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(126,166,255,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,100,103,0.08),transparent_30%),linear-gradient(180deg,rgba(11,16,28,1),rgba(18,24,38,1))]">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-lg shadow-primary/25">VJU</span>
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-primary">ClubHub</p>
              <h1 className="text-2xl font-black tracking-tight">Hồ sơ cá nhân</h1>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/home" className="inline-flex h-10 items-center rounded-full border border-border/70 bg-background px-4 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
              Trang chủ
            </Link>
            <Button variant="outline" onClick={() => router.push("/clubs")} className="rounded-full"><UserRound size={15} /> Câu lạc bộ</Button>
          </div>
        </div>

        {!user ? (
          <div className="panel-modal grid gap-4 p-6 text-center">
            <h2 className="text-xl font-bold">Bạn cần đăng nhập để xem hồ sơ</h2>
            <p className="text-sm text-muted-foreground">Trang hồ sơ cá nhân hiển thị thông tin tài khoản hiện tại và cho phép đổi mật khẩu bằng API có sẵn.</p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => router.push("/login")}>Đăng nhập</Button>
              <Button variant="outline" onClick={() => router.push("/home")}>Về home</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
            <section className="panel-modal p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-lg font-black text-primary">{(user.fullName || user.email).slice(0, 1).toUpperCase()}</span>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Tài khoản hiện tại</p>
                  <h2 className="truncate text-2xl font-black tracking-tight">{user.fullName || user.email}</h2>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge tone="primary">{user.status}</Badge>
                {user.studentCode && <Badge>{user.studentCode}</Badge>}
                {user.phone && <Badge>{user.phone}</Badge>}
              </div>
              <div className="mt-6">
                <DetailList
                  rows={[
                    ["Email", <span key="email" className="font-mono">{user.email}</span>],
                    ["Họ và tên", user.fullName || "—"],
                    ["Mã sinh viên", user.studentCode || "—"],
                    ["Điện thoại", user.phone || "—"],
                    ["Trạng thái", <StatusBadge key="status" status={user.status} />],
                  ]}
                />
              </div>
            </section>

            <section className="panel-modal p-6">
              <div className="flex items-center gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary"><LockKeyhole size={18} /></span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Đổi mật khẩu</p>
                  <h2 className="text-xl font-black tracking-tight">Bảo vệ tài khoản của bạn</h2>
                </div>
              </div>
              <form onSubmit={submit} className="mt-6 grid gap-4">
                <FormField label="Mật khẩu hiện tại" required>
                  <Input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
                </FormField>
                <FormField label="Mật khẩu mới" required hint="Tối thiểu 8 ký tự.">
                  <Input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </FormField>
                <FormField label="Nhập lại mật khẩu mới" required>
                  <Input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </FormField>
                {confirmPassword && newPassword !== confirmPassword && <p className="text-xs font-medium text-destructive">Mật khẩu mới chưa khớp.</p>}
                {notice && <p className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-primary">{notice}</p>}
                {change.error && <p className="text-xs text-destructive">{describeError(change.error)}</p>}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => router.push("/home")}>Huỷ</Button>
                  <Button type="submit" disabled={change.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword}>{change.isPending ? "Đang đổi…" : "Đổi mật khẩu"}</Button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
