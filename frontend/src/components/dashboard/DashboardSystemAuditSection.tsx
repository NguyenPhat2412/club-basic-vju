"use client";

import Link from "next/link";
import { Activity, ScrollText } from "lucide-react";
import { AuditLog, SystemStatistics } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

export function DashboardSystemAuditSection({
  canAdminUsers,
  systemStats,
  canAudit,
  auditLogsPending,
  auditLogs,
}: {
  canAdminUsers: boolean;
  systemStats?: SystemStatistics;
  canAudit: boolean;
  auditLogsPending: boolean;
  auditLogs: AuditLog[];
}) {
  return (
    <>
      {canAdminUsers && systemStats && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <Activity size={15} />
              </span>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Thống kê Hệ thống & Cơ cấu Vai trò
                </h2>
                <p className="text-[11px] text-slate-500">
                  Số liệu thời gian thực về tài khoản, câu lạc bộ và phân bổ người dùng theo vai trò
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <Link href="/users" className="text-primary hover:underline">
                Quản lý tài khoản
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/roles" className="text-primary hover:underline">
                Ma trận vai trò
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
              <p className="text-[11px] font-semibold text-slate-500">Tổng tài khoản</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900 tabular-nums">{systemStats.totalUsers}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {systemStats.activeUsers} hoạt động · {systemStats.lockedUsers} khoá · {systemStats.inactiveUsers} vô hiệu
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
              <p className="text-[11px] font-semibold text-slate-500">Tài khoản đã ẩn danh</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900 tabular-nums">{systemStats.anonymizedUsers}</p>
              <p className="mt-1 text-[11px] text-slate-500">Bảo toàn lịch sử vận hành</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
              <p className="text-[11px] font-semibold text-slate-500">Câu lạc bộ đang hoạt động</p>
              <p className="mt-1 text-xl font-extrabold text-primary tabular-nums">{systemStats.activeClubs}</p>
              <p className="mt-1 text-[11px] text-slate-500">Trên tổng số {systemStats.totalClubs} CLB</p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
              <p className="text-[11px] font-semibold text-slate-500">CLB tạm ngừng hoạt động</p>
              <p className="mt-1 text-xl font-extrabold text-slate-900 tabular-nums">{systemStats.inactiveClubs}</p>
              <p className="mt-1 text-[11px] text-slate-500">Đang đóng nhận đơn đăng ký</p>
            </div>
          </div>

          {systemStats.roleBreakdown.length > 0 && (
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {systemStats.roleBreakdown.map((role) => (
                <div
                  key={role.roleCode}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 px-3.5 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">{role.roleName}</p>
                    <p className="font-mono text-[10.5px] text-slate-500">
                      {role.roleCode} · {role.scope}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-extrabold text-primary tabular-nums">{role.distinctUserCount} người</p>
                    <p className="text-[10px] text-slate-500 tabular-nums">{role.activeAssignmentCount} lượt gán</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {canAudit && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-primary/10 text-primary">
                <ScrollText size={15} />
              </span>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Nhật ký hệ thống gần đây (Audit Logs)
                </h2>
                <p className="text-[11px] text-slate-500">Giám sát các thao tác quan trọng theo thời gian thực</p>
              </div>
            </div>
            <Link href="/audit-logs" className="text-[11px] font-semibold text-primary hover:underline">
              Xem tất cả
            </Link>
          </div>

          {auditLogsPending ? (
            <div className="mt-3 space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : !auditLogs.length ? (
            <p className="py-6 text-center text-xs text-slate-500">Chưa có bản ghi nhật ký nào.</p>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {auditLogs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Badge tone="primary">{log.action}</Badge>
                      <span className="truncate text-xs font-semibold text-slate-900">{log.resourceType}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[10.5px] text-slate-500">ID: {log.resourceId}</p>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-500 tabular-nums">
                    {formatDateTime(log.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </>
  );
}
