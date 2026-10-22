"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFetchMutation, useFetchClient } from "@/lib/fetch-hooks";
import { ArrowLeft, LockKeyhole, UserRound } from "lucide-react";
import { apiModel } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { Button } from "@/components/ui/button";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { FormField, Input } from "@/components/ui/input";
import { DetailList } from "@/components/shared/Overlays";
import { describeError } from "@/components/shared/ListPage";

export default function ProfilePage() {
  const router = useRouter();
  const queryClient = useFetchClient();
  const session = useSession();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [notice, setNotice] = useState("");
  const change = useFetchMutation({
    mutationFn: () => apiModel.changePassword(currentPassword, newPassword),
    onSuccess: () => { setNotice("Mật khẩu đã được thay đổi thành công."); setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); queryClient.invalidateQueries({ queryKey: ["me"] }); },
  });
  const submit = (event: FormEvent) => { event.preventDefault(); setNotice(""); if (newPassword === confirmPassword) change.mutate(); };
  const user = session.user;

  return (
    <main className="min-h-svh bg-[#faf9f6]">
      <header className="border-b border-[#e8e4df] bg-white"><div className="mx-auto flex min-h-[76px] max-w-[1180px] items-center justify-between px-5 sm:px-8"><Link href="/home" className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full border border-[#b58b54] text-[10px] font-black tracking-widest text-[#8e1f32]">VJU</span><span className="border-l border-[#e3ded6] pl-3 text-sm font-semibold">CLUB<span className="font-normal text-[#8e1f32]">HUB</span></span></Link><Link href="/dashboard" className="inline-flex items-center gap-2 text-[11px] text-[#716b64] hover:text-[#8e1f32]"><ArrowLeft size={14} /> Dashboard</Link></div></header>
      <div className="mx-auto max-w-[1180px] px-5 py-9 sm:px-8 sm:py-12">
        <p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#8e1f32]">TÀI KHOẢN VJU</p><h1 className="mt-2 font-serif text-[36px] sm:text-[44px]">Hồ sơ cá nhân</h1><p className="mt-2 text-[12px] text-[#77716a]">Thông tin tài khoản và cài đặt bảo mật của bạn.</p>
        {!user ? <section className="mt-7 border border-[#e8e4df] bg-white p-8 text-center"><UserRound className="mx-auto text-[#8e1f32]" /><h2 className="mt-3 font-serif text-2xl">Đăng nhập để xem hồ sơ</h2><p className="mt-2 text-sm text-[#77716a]">Hồ sơ cá nhân dành cho thành viên VJU.</p><Button className="mt-5 rounded-none bg-[#8e1f32]" onClick={() => router.push("/login")}>Đăng nhập</Button></section> : <div className="mt-7 grid gap-6 lg:grid-cols-[1fr_1.05fr]">
          <section className="border border-[#e8e4df] bg-white p-5 sm:p-7"><div className="flex items-center gap-4 border-b border-[#eee9e2] pb-5"><span className="grid size-14 place-items-center rounded-full bg-[#8e1f32] font-serif text-2xl text-white">{(user.fullName || user.email).slice(0, 1).toUpperCase()}</span><div className="min-w-0"><p className="text-[9px] font-bold uppercase tracking-[.17em] text-[#8e1f32]">THÀNH VIÊN</p><h2 className="mt-1 truncate font-serif text-[23px]">{user.fullName || user.email}</h2><p className="truncate text-[11px] text-[#77716a]">{user.email}</p></div></div><div className="mt-4 flex flex-wrap gap-2"><Badge tone="primary">{user.status}</Badge>{user.studentCode && <Badge>{user.studentCode}</Badge>}{user.phone && <Badge>{user.phone}</Badge>}</div><div className="mt-5"><DetailList rows={[["Email", <span key="email">{user.email}</span>], ["Họ và tên", user.fullName || "—"], ["Mã sinh viên", user.studentCode || "—"], ["Điện thoại", user.phone || "—"], ["Trạng thái", <StatusBadge key="status" status={user.status} />]]} /></div></section>
          <section className="border border-[#e8e4df] bg-white p-5 sm:p-7"><div className="flex items-center gap-3 border-b border-[#eee9e2] pb-5"><span className="grid size-10 place-items-center border border-[#e8e4df] text-[#8e1f32]"><LockKeyhole size={17} /></span><div><p className="text-[9px] font-bold uppercase tracking-[.17em] text-[#8e1f32]">BẢO MẬT</p><h2 className="mt-1 font-serif text-[23px]">Đổi mật khẩu</h2></div></div><form onSubmit={submit} className="mt-5 grid gap-4"><FormField label="Mật khẩu hiện tại" required><Input type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></FormField><FormField label="Mật khẩu mới" required hint="Nên dùng ít nhất 8 ký tự."><Input type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></FormField><FormField label="Nhập lại mật khẩu mới" required><Input type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} /></FormField>{confirmPassword && newPassword !== confirmPassword && <p className="text-xs text-red-700">Mật khẩu mới chưa khớp.</p>}{notice && <p role="status" className="border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">{notice}</p>}{change.error && <p role="alert" className="text-xs text-red-700">{describeError(change.error)}</p>}<div className="flex justify-end"><Button type="submit" disabled={change.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword} className="rounded-none bg-[#8e1f32]">{change.isPending ? "Đang cập nhật…" : "Cập nhật mật khẩu"}</Button></div></form></section>
        </div>}
      </div>
    </main>
  );
}
