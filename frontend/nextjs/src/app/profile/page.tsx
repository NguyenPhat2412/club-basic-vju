"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Fingerprint, LockKeyhole, Mail, Phone, ShieldCheck, UserRound } from "lucide-react";
import { apiModel } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge";
import { FormField, Input } from "@/components/ui/input";
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
    onSuccess: () => { setNotice("Mật khẩu đã được thay đổi thành công."); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); queryClient.invalidateQueries({ queryKey: ["me"] }); },
  });
  const submit = (event: FormEvent) => { event.preventDefault(); setNotice(""); if (newPassword === confirmPassword) change.mutate(); };
  const user = session.user;

  return (
    <main className="min-h-svh bg-[#f4f8f5]">
      <header className="border-b border-[#dce9df] bg-white/95">
        <div className="mx-auto flex min-h-[72px] max-w-[1180px] items-center justify-between px-5 sm:px-8">
          <Link href="/home" className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#eaf3ed] text-[10px] font-black tracking-widest text-[#176b47] ring-1 ring-inset ring-[#176b47]/15">VJU</span>
            <span className="border-l border-[#dce9df] pl-3 text-sm font-semibold tracking-wide">CLUB<span className="font-normal text-[#c8102e]">HUB</span></span>
          </Link>
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-[#52655a] transition-colors hover:bg-[#edf5ef] hover:text-[#176b47]"><ArrowLeft size={14} /> Dashboard</Link>
        </div>
      </header>
      <div className="mx-auto max-w-[1180px] px-5 py-8 sm:px-8 sm:py-11">
        <div className="border-l-4 border-[#176b47] pl-4">
          <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#c8102e]">TÀI KHOẢN VJU</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#183b2a] sm:text-4xl">Hồ sơ cá nhân</h1>
          <p className="mt-2 text-sm text-[#637267]">Thông tin tài khoản và cài đặt bảo mật của bạn.</p>
        </div>
        {!user ? (
          <section className="mt-7 rounded-2xl border border-[#dce9df] bg-white p-8 text-center shadow-sm">
            <span className="mx-auto grid size-12 place-items-center rounded-xl bg-[#eaf3ed] text-[#176b47]"><UserRound size={22} /></span>
            <h2 className="mt-4 text-xl font-semibold text-[#183b2a]">Đăng nhập để xem hồ sơ</h2>
            <p className="mt-2 text-sm text-[#637267]">Hồ sơ cá nhân dành cho thành viên VJU.</p>
            <Button className="mt-5 rounded-lg bg-[#176b47] hover:bg-[#12573a]" onClick={() => router.push("/login")}>Đăng nhập</Button>
          </section>
        ) : (
          <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_1.05fr]">
            <section className="overflow-hidden rounded-2xl border border-[#dce9df] bg-white shadow-sm">
              <div className="h-1.5 bg-gradient-to-r from-[#176b47] via-[#39865e] to-[#c8102e]" />
              <div className="p-5 sm:p-7">
                <div className="flex items-center gap-4 border-b border-[#e7eee9] pb-5">
                  <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-[#176b47] text-2xl font-semibold text-white ring-4 ring-[#eaf3ed]">{(user.fullName || user.email).slice(0, 1).toUpperCase()}</span>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#c8102e]">THÀNH VIÊN</p>
                    <h2 className="mt-1 truncate text-xl font-semibold text-[#183b2a]">{user.fullName || user.email}</h2>
                    <p className="truncate text-xs text-[#637267]">{user.email}</p>
                  </div>
                </div>
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-[#183b2a]">Thông tin cá nhân</h3>
                  <dl className="mt-3 divide-y divide-[#e7eee9] rounded-xl border border-[#e7eee9] bg-[#f9fbf9] px-4">
                    <div className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center">
                      <dt className="flex items-center gap-2 text-xs text-[#637267]"><Mail size={14} className="text-[#176b47]" /> Email</dt>
                      <dd className="break-all text-sm font-medium text-[#263d2f]">{user.email}</dd>
                    </div>
                    <div className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center">
                      <dt className="flex items-center gap-2 text-xs text-[#637267]"><UserRound size={14} className="text-[#176b47]" /> Họ và tên</dt>
                      <dd className="text-sm font-medium text-[#263d2f]">{user.fullName || "—"}</dd>
                    </div>
                    <div className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center">
                      <dt className="flex items-center gap-2 text-xs text-[#637267]"><Fingerprint size={14} className="text-[#176b47]" /> Mã sinh viên</dt>
                      <dd className="text-sm font-medium text-[#263d2f]">{user.studentCode || "—"}</dd>
                    </div>
                    <div className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center">
                      <dt className="flex items-center gap-2 text-xs text-[#637267]"><Phone size={14} className="text-[#176b47]" /> Điện thoại</dt>
                      <dd className="text-sm font-medium text-[#263d2f]">{user.phone || "—"}</dd>
                    </div>
                    <div className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] sm:items-center">
                      <dt className="flex items-center gap-2 text-xs text-[#637267]"><ShieldCheck size={14} className="text-[#176b47]" /> Trạng thái</dt>
                      <dd><StatusBadge status={user.status} /></dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-[#dce9df] bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center gap-3 border-b border-[#e7eee9] pb-5">
                <span className="grid size-10 place-items-center rounded-xl bg-[#eaf3ed] text-[#176b47]"><LockKeyhole size={17} /></span>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#c8102e]">BẢO MẬT</p>
                  <h2 className="mt-1 text-lg font-semibold text-[#183b2a]">Đổi mật khẩu</h2>
                </div>
              </div>
              <form onSubmit={submit} className="mt-5 grid gap-4">
                <FormField label="Mật khẩu hiện tại" required><Input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></FormField>
                <FormField label="Mật khẩu mới" required hint="Nên dùng ít nhất 8 ký tự."><Input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></FormField>
                <FormField label="Nhập lại mật khẩu mới" required><Input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></FormField>
                {confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-red-700">Mật khẩu mới chưa khớp.</p>}
                {notice && <p role="status" className="rounded-lg border border-[#cce5d3] bg-[#eff8f1] px-3 py-2.5 text-xs text-[#176b47]">{notice}</p>}
                {change.error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs text-red-700">{describeError(change.error)}</p>}
                <div className="flex justify-end pt-1">
                  <Button type="submit" disabled={change.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword} className="rounded-lg bg-[#c8102e] hover:bg-[#a80d26]">{change.isPending ? "Đang cập nhật…" : "Cập nhật mật khẩu"}</Button>
                </div>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
