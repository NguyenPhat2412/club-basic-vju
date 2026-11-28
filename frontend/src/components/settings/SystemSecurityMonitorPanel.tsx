"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlertTriangle,
  Ban,
  LogIn,
  LogOut,
  Radio,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { apiModel } from "@/lib/api";
import { qk } from "@/lib/api/query-keys";
import { describeError } from "@/components/shared/ListPage";
import { ErrorState, LoadingRows } from "@/components/shared/States";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { toast } from "@/components/ui/toast";
import { formatDateTime, formatTime } from "@/lib/utils";
import { SystemBlockedIpsCard } from "./SystemBlockedIpsCard";
import { compactDevice, SystemSecurityEventsTable } from "./SystemSecurityEventsTable";

interface SystemSecurityMonitorPanelProps {
  currentUserId?: string;
  canEdit: boolean;
  canViewAudit: boolean;
}

export function SystemSecurityMonitorPanel({
  currentUserId,
  canEdit,
  canViewAudit,
}: SystemSecurityMonitorPanelProps) {
  const queryClient = useQueryClient();
  const [hours, setHours] = useState(24);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const overview = useQuery({
    queryKey: qk.systemSecurityOverview(hours),
    queryFn: () => apiModel.systemSecurityOverview(hours),
    refetchInterval: autoRefresh ? 30_000 : false,
  });

  const disconnect = useMutation({
    mutationFn: (userId: string) => apiModel.disconnectOnlineUser(userId),
    onSuccess: () => {
      toast.success("Đã ngắt toàn bộ phiên hoạt động của tài khoản.");
      queryClient.invalidateQueries({ queryKey: qk.systemSecurityOverview() });
    },
    onError: (err) => toast.error(describeError(err)),
  });

  const quickBlockIp = useMutation({
    mutationFn: (ipAddress: string) =>
      apiModel.blockIp({
        ipAddress,
        reason: "Chặn nhanh từ Giám sát & Bảo mật",
        durationHours: 24,
      }),
    onSuccess: (created) => {
      toast.success(`Đã chặn địa chỉ IP ${created.ipAddress} trong 24 giờ.`);
      queryClient.invalidateQueries({ queryKey: qk.blockedIps() });
      queryClient.invalidateQueries({ queryKey: qk.systemSecurityOverview() });
    },
    onError: (err) => toast.error(describeError(err)),
  });

  if (overview.isPending) {
    return <LoadingRows rows={4} />;
  }
  if (overview.isError) {
    return <ErrorState message={describeError(overview.error)} onRetry={() => overview.refetch()} />;
  }

  const data = overview.data;

  return (
    <div className="space-y-3.5">
      {/* Compact single-row toolbar + 4 inline KPI cards */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-2xs">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-primary" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-primary">
            Giám sát & Bảo mật
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            aria-label="Khoảng thời gian thống kê"
            value={String(hours)}
            onChange={(e) => setHours(Number(e.target.value) || 24)}
            className="h-8 w-40 text-xs"
          >
            <option value="1">1 giờ gần nhất</option>
            <option value="6">6 giờ gần nhất</option>
            <option value="24">24 giờ gần nhất</option>
            <option value="168">7 ngày gần nhất</option>
          </Select>
          <Button
            type="button"
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            className="h-8"
            onClick={() => setAutoRefresh((v) => !v)}
          >
            <Radio size={13} />
            {autoRefresh ? "Tự làm mới (30s)" : "Tắt tự làm mới"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8"
            disabled={overview.isFetching}
            onClick={() => overview.refetch()}
          >
            <RefreshCw size={13} className={overview.isFetching ? "animate-spin" : ""} />
            Làm mới
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Đang trực tuyến</p>
            <div className="mt-0.5 flex items-baseline gap-1.5">
              <span className="font-mono text-xl font-extrabold text-slate-900" data-no-i18n="true">
                {data.onlineUserCount}
              </span>
              <span className="text-[11px] text-slate-400">
                (<span data-no-i18n="true">{data.activeConnectionCount}</span> tab)
              </span>
            </div>
          </div>
          <Activity size={16} className="text-primary" />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Đăng nhập thành công</p>
            <p className="mt-0.5 font-mono text-xl font-extrabold text-slate-900" data-no-i18n="true">
              {data.loginSuccessCount}
            </p>
          </div>
          <LogIn size={16} className="text-slate-500" />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Đăng nhập thất bại</p>
            <p
              className={`mt-0.5 font-mono text-xl font-extrabold ${
                data.loginFailedCount > 0 ? "text-primary" : "text-slate-900"
              }`}
              data-no-i18n="true"
            >
              {data.loginFailedCount}
            </p>
          </div>
          <AlertTriangle size={16} className={data.loginFailedCount > 0 ? "text-primary" : "text-slate-400"} />
        </div>

        <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
          <div>
            <p className="text-[11px] font-semibold text-slate-500">Chặn vượt ngưỡng (429)</p>
            <p
              className={`mt-0.5 font-mono text-xl font-extrabold ${
                data.rateLimitBlockedCount > 0 ? "text-destructive" : "text-slate-900"
              }`}
              data-no-i18n="true"
            >
              {data.rateLimitBlockedCount}
            </p>
          </div>
          <ShieldAlert size={16} className={data.rateLimitBlockedCount > 0 ? "text-destructive" : "text-slate-400"} />
        </div>
      </div>

      {/* Horizontal 2-column split: Online Users | Suspicious IPs */}
      <div className="grid gap-3.5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Người dùng đang hoạt động
            </h4>
            <Badge tone="success">
              <span data-no-i18n="true">{data.onlineUsers.length}</span> tài khoản
            </Badge>
          </div>
          {data.onlineUsers.length === 0 ? (
            <p className="px-4 py-5 text-center text-xs text-slate-500">
              Chưa có phiên nào đang kết nối.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/50 text-[10.5px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3.5 py-2 font-semibold">Người dùng</th>
                    <th className="px-3.5 py-2 font-semibold">Địa chỉ IP</th>
                    <th className="px-3.5 py-2 font-semibold">Thiết bị</th>
                    <th className="px-3.5 py-2 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.onlineUsers.map((u) => {
                    const isSelf = u.userId === currentUserId;
                    return (
                      <tr key={u.userId} className="hover:bg-slate-50/60">
                        <td className="px-3.5 py-2">
                          <p className="font-semibold text-slate-900" data-no-i18n="true">
                            {u.fullName || "—"}
                          </p>
                          <p className="text-[11px] text-slate-500" data-no-i18n="true">
                            {u.email || u.userId.slice(0, 8)}
                          </p>
                        </td>
                        <td className="px-3.5 py-2">
                          <code
                            data-no-i18n="true"
                            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-800"
                          >
                            {u.ipAddress || "—"}
                          </code>
                          {u.connectedAt && (
                            <p className="mt-0.5 text-[10.5px] text-slate-400" data-no-i18n="true">
                              {formatTime(u.connectedAt)}
                            </p>
                          )}
                        </td>
                        <td className="px-3.5 py-2 text-slate-600" title={u.userAgent ?? undefined}>
                          <span data-no-i18n="true">{compactDevice(u.userAgent)}</span>
                        </td>
                        <td className="px-3.5 py-2 text-right">
                          {canEdit && !isSelf ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[11px]"
                              disabled={disconnect.isPending}
                              onClick={() => disconnect.mutate(u.userId)}
                            >
                              <LogOut size={12} />
                              Ngắt phiên
                            </Button>
                          ) : (
                            <Badge tone="neutral">{isSelf ? "Phiên của bạn" : "Chỉ xem"}</Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Địa chỉ IP đáng ngờ
            </h4>
            <Badge tone={data.suspiciousIps.length > 0 ? "danger" : "success"}>
              {data.suspiciousIps.length > 0
                ? `${data.suspiciousIps.length} IP cần chú ý`
                : "An toàn"}
            </Badge>
          </div>
          {data.suspiciousIps.length === 0 ? (
            <p className="px-4 py-5 text-center text-xs text-slate-500">
              Chưa ghi nhận IP bất thường.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/50 text-[10.5px] uppercase text-slate-500">
                  <tr>
                    <th className="px-3.5 py-2 font-semibold">Địa chỉ IP</th>
                    <th className="px-3.5 py-2 font-semibold">Sai MK / 429</th>
                    <th className="px-3.5 py-2 font-semibold">Tài khoản nhắm tới</th>
                    <th className="px-3.5 py-2 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.suspiciousIps.map((item) => (
                    <tr key={item.ipAddress} className="hover:bg-slate-50/60">
                      <td className="px-3.5 py-2">
                        <code
                          data-no-i18n="true"
                          className="rounded border border-rose-200 bg-rose-50 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-rose-700"
                        >
                          {item.ipAddress}
                        </code>
                        <p className="mt-0.5 text-[10.5px] text-slate-400" title={item.latestUserAgent ?? undefined}>
                          <span data-no-i18n="true">
                            {compactDevice(item.latestUserAgent)}
                            {item.lastSeenAt ? ` · ${formatDateTime(item.lastSeenAt)}` : ""}
                          </span>
                        </p>
                      </td>
                      <td className="px-3.5 py-2 font-mono font-semibold text-slate-800" data-no-i18n="true">
                        {item.failedLoginCount} / {item.rateLimitBlockedCount}
                      </td>
                      <td className="px-3.5 py-2 text-slate-600" data-no-i18n="true">
                        {item.targetEmails.length > 0 ? item.targetEmails.join(", ") : "—"}
                      </td>
                      <td className="px-3.5 py-2 text-right">
                        {canEdit && item.ipAddress !== "unknown" ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-[11px]"
                            disabled={quickBlockIp.isPending}
                            onClick={() => quickBlockIp.mutate(item.ipAddress)}
                          >
                            <Ban size={12} />
                            Chặn 24h
                          </Button>
                        ) : (
                          <span className="font-mono text-[11px] text-slate-400" data-no-i18n="true">
                            {item.lastSeenAt ? formatTime(item.lastSeenAt) : "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <SystemBlockedIpsCard canEdit={canEdit} />

      <SystemSecurityEventsTable events={data.recentEvents} canViewAudit={canViewAudit} />
    </div>
  );
}
