"use client";

import { CheckCircle2, Clock3, Compass, Eye, LogIn, Send, Settings2, Sparkles, UserPlus } from "lucide-react";
import { ApplicationSummary, Club, Membership } from "@/lib/api";
import { ClubMediaItem } from "@/lib/media";
import { ClubAvatar } from "@/components/shared/ClubMedia";
import { DataTable } from "@/components/shared/DataTable";
import { RowAction, TableRowActions } from "@/components/shared/TableRowActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function ClubDiscoveryGuestBanner({
  onLogin,
  onRegister,
}: {
  onLogin: () => void;
  onRegister: () => void;
}) {
  return (
    <section
      aria-label="Hướng dẫn 3 bước gia nhập Câu lạc bộ"
      className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-accent/55 p-4 shadow-2xs sm:p-5"
    >
      <div className="flex flex-col justify-between gap-3 border-b border-border/70 pb-4 lg:flex-row lg:items-center">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-primary">
            <Sparkles size={13} /> Cổng tuyển thành viên trực tuyến · VJU ClubHub
          </p>
          <h2 className="mt-1 text-sm font-extrabold tracking-tight text-slate-900 sm:text-base">
            Gia nhập Câu lạc bộ yêu thích chỉ với 3 bước đơn giản
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onLogin} className="flex-1 border-slate-300 bg-white font-bold text-slate-800 hover:border-primary/40 hover:text-primary sm:flex-initial">
            <LogIn size={14} /> Đăng nhập ngay
          </Button>
          <Button size="sm" onClick={onRegister} className="flex-1 font-bold shadow-xs sm:flex-initial">
            <UserPlus size={14} /> Gia nhập CLB
          </Button>
        </div>
      </div>
      <div className="mt-3.5 grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-3">
        <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/90 p-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary text-xs font-extrabold text-primary-foreground">01</span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900">1. Đăng nhập / Tạo tài khoản</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">Dùng tài khoản SV VJU hoặc bấm Google 1 chạm để mở hồ sơ cá nhân.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/90 p-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/12 text-xs font-extrabold text-primary">02</span>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-xs font-bold text-slate-900">2. Chọn CLB & Ban nguyện vọng</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">Bấm <b>Xem chi tiết</b> để xem ảnh hoạt động và các ban chuyên môn.</p>
          </div>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/90 p-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/12 text-xs font-extrabold text-primary"><Send size={13} /></span>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-xs font-bold text-slate-900">3. Nộp đơn trực tuyến <CheckCircle2 size={12} className="text-primary" /></p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-slate-600">Điền form ứng tuyển (kèm CV/minh chứng nếu có) và nhận thông báo duyệt đơn.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function ClubsDiscoveryTable({
  items,
  offset,
  currentMembershipByClub,
  pendingAppByClub,
  mediaForClub,
  canManageClub,
  onOpenDetail,
  onNavigateManage,
  onNavigateMemberships,
  onNavigatePendingApp,
}: {
  items: Club[];
  offset: number;
  currentMembershipByClub: Map<string, Membership>;
  pendingAppByClub: Map<string, ApplicationSummary>;
  mediaForClub: (club?: Club | null) => ClubMediaItem | undefined;
  canManageClub: (club: Club) => boolean;
  onOpenDetail: (club: Club) => void;
  onNavigateManage: (club: Club) => void;
  onNavigateMemberships: () => void;
  onNavigatePendingApp: (appId: string) => void;
}) {
  const relationRank = (club: Club) => {
    if (currentMembershipByClub.has(club.id)) return 1;
    if (pendingAppByClub.has(club.id)) return 2;
    return 3;
  };

  return (
    <DataTable
      ariaLabel="Bảng khám phá câu lạc bộ"
      minWidth="min-w-[840px]"
      rows={items}
      rowKey={(c) => c.id}
      onRowClick={onOpenDetail}
      columns={[
        {
          key: "index",
          header: "STT",
          className: "w-11 text-center font-mono text-muted-foreground",
          render: (c) => <span>{offset + items.indexOf(c) + 1}</span>,
        },
        {
          key: "club",
          header: "Câu lạc bộ",
          className: "min-w-[210px] max-w-[270px]",
          sortValue: (c) => c.name,
          render: (c) => {
            const media = mediaForClub(c);
            return (
              <div className="flex min-w-0 items-center gap-2.5">
                <ClubAvatar name={c.name} code={c.code} logoUrl={c.logoUrl} fallbackUrl={media?.logo} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-bold text-foreground" title={c.name}>
                    {c.name}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {c.contactEmail || "Cổng CLB Trường ĐH Việt Nhật"}
                  </p>
                </div>
              </div>
            );
          },
        },
        {
          key: "code",
          header: "Mã CLB",
          className: "whitespace-nowrap",
          sortValue: (c) => c.code,
          render: (c) => (
            <code className="rounded-md bg-primary/8 px-2 py-0.5 font-mono text-[11px] font-bold text-primary">
              {c.code}
            </code>
          ),
        },
        {
          key: "field",
          header: "Lĩnh vực",
          className: "whitespace-nowrap",
          sortValue: (c) => c.activityField ?? "",
          render: (c) =>
            c.activityField ? (
              <Badge tone="neutral" dot={false}>
                {c.activityField}
              </Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            ),
        },
        {
          key: "desc",
          header: "Giới thiệu ngắn",
          className: "min-w-[220px] max-w-[320px]",
          render: (c) => (
            <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
              {c.description || "Chưa có mô tả chi tiết."}
            </p>
          ),
        },
        {
          key: "relation",
          header: "Trạng thái của bạn",
          className: "whitespace-nowrap",
          sortValue: relationRank,
          render: (c) => {
            const member = currentMembershipByClub.get(c.id);
            const pending = pendingAppByClub.get(c.id);
            if (member) {
              return (
                <Badge tone="primary">
                  <CheckCircle2 size={11} /> Thành viên CLB
                </Badge>
              );
            }
            if (pending) {
              return (
                <Badge tone="pending">
                  <Clock3 size={11} /> Chờ duyệt đơn
                </Badge>
              );
            }
            return (
              <Badge tone="primary" dot={false}>
                <Compass size={11} /> Mở ứng tuyển
              </Badge>
            );
          },
        },
        {
          key: "actions",
          header: "Thao tác",
          className: "text-right",
          render: (c) => {
            const member = currentMembershipByClub.get(c.id);
            const pending = pendingAppByClub.get(c.id);
            const actions: RowAction[] = [
              {
                icon: member || pending ? <Eye /> : <UserPlus />,
                label: member || pending ? "Xem chi tiết CLB" : "Xem & Ứng tuyển",
                onClick: () => onOpenDetail(c),
              },
              ...(pending
                ? [{ icon: <Clock3 />, label: "Xem đơn đang chờ duyệt", onClick: () => onNavigatePendingApp(pending.id) }]
                : []),
              ...(member
                ? [{ icon: <CheckCircle2 />, label: "CLB đã tham gia", onClick: onNavigateMemberships }]
                : []),
              ...(canManageClub(c)
                ? [{ icon: <Settings2 />, label: "Quản lý CLB", onClick: () => onNavigateManage(c) }]
                : []),
            ];
            return <TableRowActions actions={actions} />;
          },
        },
      ]}
    />
  );
}
