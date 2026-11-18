"use client";

import Link from "next/link";
import { Activity, ScrollText } from "lucide-react";
import { AuditLog, SystemStatistics } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateTime } from "@/lib/utils";
import type { ClubItem } from "@/types";
import { formatAuditAction, formatRoleScopeLabel, resourceLabel } from "@/utils/audit/audit-meta";

export function DashboardSystemAuditSection({
  canAdminUsers,
  systemStats,
  canAudit,
  auditLogsPending,
  auditLogs,
  allClubs = [],
  currentUserId,
  currentUserLabel,
}: {
  canAdminUsers: boolean;
  systemStats?: SystemStatistics;
  canAudit: boolean;
  auditLogsPending: boolean;
  auditLogs: AuditLog[];
  allClubs?: ClubItem[];
  currentUserId?: string;
  currentUserLabel?: string;
}) {
  const showRoles = canAdminUsers && !!systemStats;
  const showAudit = canAudit;
  if (!showRoles && !showAudit) return null;

  const clubById = new Map(allClubs.map((c) => [c.id, c]));

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4",
        showRoles && showAudit && "@4xl:grid-cols-2",
      )}
    >
      {showRoles && systemStats && (
        <section className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Activity size={15} />
              </span>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Cơ cấu Vai trò & Trạng thái Tài khoản
                </h2>
                <p className="text-[11px] text-slate-500">
                  Phân bổ nhân sự theo nhóm quyền và tình trạng vận hành
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-semibold">
              <Link href="/users" className="text-primary hover:underline">
                Tài khoản
              </Link>
              <span className="text-slate-300">·</span>
              <Link href="/roles" className="text-primary hover:underline">
                Ma trận vai trò
              </Link>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Badge tone="success">Đang hoạt động: {systemStats.activeUsers}</Badge>
            <Badge tone={systemStats.lockedUsers > 0 ? "danger" : "neutral"}>
              Tạm khoá: {systemStats.lockedUsers}
            </Badge>
            <Badge tone="neutral">Vô hiệu hoá: {systemStats.inactiveUsers}</Badge>
            <Badge tone="neutral">Đã ẩn danh: {systemStats.anonymizedUsers}</Badge>
            {systemStats.inactiveClubs > 0 && (
              <Badge tone="pending">CLB tạm ngừng: {systemStats.inactiveClubs}</Badge>
            )}
          </div>

          {systemStats.roleBreakdown.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-500">Chưa có dữ liệu phân bổ vai trò.</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {systemStats.roleBreakdown.map((role) => (
                <Link
                  key={role.roleCode}
                  href="/roles"
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-slate-50/40 px-3 py-2.5 transition-colors hover:border-primary/35 hover:bg-white"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-slate-900">{role.roleName}</p>
                    <p className="truncate text-[11px] text-slate-500">
                      {formatRoleScopeLabel(role.scope)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-extrabold text-primary tabular-nums">{role.distinctUserCount} người</p>
                    <p className="text-[10.5px] text-slate-500 tabular-nums">{role.activeAssignmentCount} lượt gán</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {showAudit && (
        <section className="flex min-w-0 flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <ScrollText size={15} />
              </span>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                  Nhật ký hệ thống gần đây
                </h2>
                <p className="text-[11px] text-slate-500">Giám sát các thao tác quản trị quan trọng</p>
              </div>
            </div>
            <Link href="/audit-logs" className="text-[11px] font-semibold text-primary hover:underline">
              Xem tất cả
            </Link>
          </div>

          {auditLogsPending ? (
            <div className="mt-3 space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : !auditLogs.length ? (
            <p className="py-6 text-center text-xs text-slate-500">Chưa có bản ghi nhật ký nào.</p>
          ) : (
            <div className="mt-3 divide-y divide-slate-100">
              {auditLogs.slice(0, 6).map((log) => {
                const club = log.clubId ? clubById.get(log.clubId) : undefined;
                const scopeText = club ? `CLB ${club.code} · ${club.name}` : "Phạm vi toàn hệ thống";
                const actorText = !log.actorUserId
                  ? "Hệ thống tự động"
                  : log.actorUserId === currentUserId && currentUserLabel
                    ? `Thực hiện bởi: ${currentUserLabel}`
                    : null;

                return (
                  <Link
                    key={log.id}
                    href="/audit-logs"
                    className="flex items-center justify-between gap-3 rounded-lg py-2.5 transition-colors first:pt-0 last:pb-0 hover:bg-slate-50/70"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone="primary" dot={false}>
                          {formatAuditAction(log.action)}
                        </Badge>
                        <span className="truncate text-xs font-bold text-slate-900">
                          {resourceLabel(log.resourceType)}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">
                        {scopeText}
                        {actorText ? ` · ${actorText}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-slate-500 tabular-nums">
                      {formatDateTime(log.createdAt)}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
