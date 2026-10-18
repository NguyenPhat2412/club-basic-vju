"use client";

import Link from "next/link";
import { ArrowRight, Bell, ClipboardList, Compass, ShieldCheck, UsersRound } from "lucide-react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { apiModel } from "@/lib/api";
import { useOptionalSession } from "@/hooks/useOptionalSession";

const MANAGEMENT_PERMISSIONS = ["application.view", "application.review", "application.approve", "application.reject", "member.view", "department.member.add", "club.update"];

export default function DashboardPage() {
  const session = useOptionalSession();
  const memberships = useQuery({ queryKey: ["dashboard", "memberships"], queryFn: apiModel.myMemberships, enabled: !!session.user });
  const applications = useQuery({ queryKey: ["dashboard", "applications"], queryFn: apiModel.myApplications, enabled: !!session.user });
  const notifications = useQuery({ queryKey: ["dashboard", "notifications"], queryFn: apiModel.notifications, enabled: !!session.user });
  const canManage = MANAGEMENT_PERMISSIONS.some(session.can);
  const canAdmin = session.can("user.view") || session.can("role.view");
  const managedClubScope = session.clubsWith(MANAGEMENT_PERMISSIONS);
  const managedClubs = useQuery({ queryKey: ["dashboard", "manageable-clubs"], queryFn: () => apiModel.clubs("", "", 0, 100), enabled: !!session.user && canManage });
  const visibleManagedClubs = (managedClubs.data?.items ?? []).filter((club) => managedClubScope.global || managedClubScope.ids.has(club.id));
  const reviewQueues = useQueries({ queries: visibleManagedClubs.map((club) => ({ queryKey: ["dashboard", "club-applications", club.id], queryFn: () => apiModel.clubApplications(club.id), enabled: canManage })) });
  const unread = notifications.data?.items.filter((item) => !item.read).length ?? 0;
  const pending = applications.data?.items.filter((item) => item.status === "PENDING").length ?? 0;
  const pendingReview = reviewQueues.reduce((count, queue) => count + (queue.data?.items.filter((item) => item.status === "PENDING").length ?? 0), 0);

  if (!session.user) return (
    <main className="grid min-h-[calc(100svh-40px)] place-items-center bg-[#faf9f6] px-5 py-12">
      <section className="w-full max-w-xl border border-[#e8e4df] bg-white px-7 py-10 text-center sm:px-12">
        <p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#8e1f32]">KHU VỰC CÁ NHÂN</p>
        <h1 className="mt-4 font-serif text-3xl sm:text-4xl">Đăng nhập để tiếp tục</h1>
        <p className="mx-auto mt-4 max-w-md text-sm leading-7 text-[#77716a]">Dashboard tổng hợp câu lạc bộ, đơn đăng ký, thông báo và các công cụ quản lý được cấp cho tài khoản của bạn.</p>
        <div className="mt-7 flex justify-center gap-3"><Link href="/login" className="bg-[#8e1f32] px-6 py-3 text-xs font-semibold text-white hover:bg-[#711829]">Đăng nhập</Link><Link href="/home" className="border border-[#d8d1c8] px-6 py-3 text-xs font-semibold hover:border-[#8e1f32] hover:text-[#8e1f32]">Về trang chủ</Link></div>
      </section>
    </main>
  );

  const cards = [
    { title: "CLB đang tham gia", value: memberships.data?.total, icon: UsersRound, href: "/memberships", note: "Thành viên của bạn" },
    { title: canManage ? "Đơn cần xét duyệt" : "Đơn chờ phản hồi", value: canManage ? (managedClubs.isPending || reviewQueues.some((queue) => queue.isPending) ? undefined : pendingReview) : (applications.isPending ? undefined : pending), icon: ClipboardList, href: canManage ? "/management" : "/applications", note: canManage ? "Các đơn đang chờ xử lý" : "Theo dõi đơn đăng ký" },
    { title: "Thông báo chưa đọc", value: notifications.isPending ? undefined : unread, icon: Bell, href: "/notifications", note: "Cập nhật mới nhất" },
  ];

  return (
    <main className="min-h-full flex-1 overflow-y-auto bg-[#faf9f6]">
      <div className="mx-auto max-w-[1380px] px-5 py-9 sm:px-8 sm:py-12 lg:px-12">
        <div className="flex flex-col justify-between gap-5 border-b border-[#e3ded6] pb-7 sm:flex-row sm:items-end">
          <div><p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#8e1f32]">KHÔNG GIAN SINH VIÊN VJU</p><h1 className="mt-2 font-serif text-[34px] leading-tight sm:text-[44px]">Xin chào, {session.user.fullName || "bạn"}.</h1><p className="mt-2 text-[12px] text-[#77716a]">Đây là những hoạt động và cập nhật của bạn tại các câu lạc bộ.</p></div>
          <Link href="/clubs" className="inline-flex h-11 items-center justify-center gap-3 bg-[#8e1f32] px-5 text-[10px] font-semibold text-white hover:bg-[#711829]"><Compass size={15} /> KHÁM PHÁ CÂU LẠC BỘ</Link>
        </div>

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Tổng quan tài khoản">
          {cards.map(({ title, value, icon: Icon, href, note }) => <Link href={href} key={title} className="group flex min-h-[148px] items-start justify-between border border-[#e8e4df] bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-[#c8a87d] hover:shadow-lg sm:p-6">
            <div><p className="text-[10px] font-bold uppercase tracking-[.14em] text-[#716b64]">{title}</p><p className="mt-4 font-serif text-[38px] leading-none text-[#8e1f32]">{value ?? "—"}</p><p className="mt-3 text-[10px] text-[#8a837b]">{note}</p></div>
            <span className="grid size-10 place-items-center border border-[#eee9e2] text-[#8e1f32]"><Icon size={18} /></span>
          </Link>)}
        </section>

        <section className="mt-9 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
          <div className="border border-[#e8e4df] bg-white p-5 sm:p-7">
            <div className="flex items-end justify-between gap-3 border-b border-[#eee9e2] pb-4"><div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#8e1f32]">CẬP NHẬT GẦN ĐÂY</p><h2 className="mt-2 font-serif text-[25px]">Thông báo của bạn</h2></div><Link href="/notifications" className="text-[10px] font-semibold text-[#8e1f32]">TẤT CẢ <ArrowRight size={13} className="ml-1 inline" /></Link></div>
            {notifications.isPending ? <div className="grid gap-3 py-5">{[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse bg-[#f2efea]" />)}</div> : notifications.isError ? <p className="py-7 text-sm text-[#77716a]">Chưa thể tải thông báo. Bạn có thể mở trang thông báo để thử lại.</p> : notifications.data?.items.length ? <div className="divide-y divide-[#eee9e2]">{notifications.data.items.slice(0, 4).map((item) => <Link href="/notifications" key={item.id} className="flex gap-3 py-4"><span className={`mt-1.5 size-2 shrink-0 rounded-full ${item.read ? "bg-[#d5cec4]" : "bg-[#8e1f32]"}`} /><span className="min-w-0"><span className="block text-[13px] font-semibold">{item.title}</span><span className="mt-1 block line-clamp-2 text-[11px] leading-5 text-[#77716a]">{item.message}</span></span></Link>)}</div> : <p className="py-7 text-sm text-[#77716a]">Bạn chưa có thông báo mới.</p>}
          </div>

          <div className="border border-[#e8e4df] bg-[#eeeae3] p-5 sm:p-7">
            <p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#8e1f32]">LỐI TẮT</p><h2 className="mt-2 font-serif text-[25px]">Việc của bạn</h2>
            <div className="mt-5 grid gap-2.5"><DashboardLink href="/applications" title="Theo dõi đơn đăng ký" subtitle="Xem trạng thái và phản hồi" icon={<ClipboardList size={17} />} /><DashboardLink href="/memberships" title="CLB đang tham gia" subtitle="Xem các câu lạc bộ của bạn" icon={<UsersRound size={17} />} /><DashboardLink href="/notifications" title="Trung tâm thông báo" subtitle="Cập nhật từ cộng đồng VJU" icon={<Bell size={17} />} /></div>
            {(canManage || canAdmin) && <div className="mt-6 border-t border-[#d8d1c8] pt-5"><p className="mb-3 text-[9px] font-bold uppercase tracking-[.18em] text-[#716b64]">KHÔNG GIAN QUẢN LÝ</p><div className="grid gap-2">{canManage && <DashboardLink href="/management" title="Quản lý câu lạc bộ" subtitle="Đơn đăng ký và thành viên" icon={<ShieldCheck size={17} />} />}{canAdmin && <DashboardLink href={session.can("user.view") ? "/users" : "/roles"} title="Quản trị hệ thống" subtitle="Tài khoản và phân quyền" icon={<ShieldCheck size={17} />} />}</div></div>}
          </div>
        </section>
      </div>
    </main>
  );
}

function DashboardLink({ href, title, subtitle, icon }: { href: string; title: string; subtitle: string; icon: React.ReactNode }) { return <Link href={href} className="group flex items-center gap-3 border border-[#e8e4df] bg-white p-3 transition-colors hover:border-[#c8a87d]"><span className="grid size-9 shrink-0 place-items-center text-[#8e1f32]">{icon}</span><span className="min-w-0 flex-1"><span className="block text-[11px] font-semibold">{title}</span><span className="mt-0.5 block text-[10px] text-[#817a72]">{subtitle}</span></span><ArrowRight size={14} className="text-[#8e1f32] transition-transform group-hover:translate-x-1" /></Link>; }
